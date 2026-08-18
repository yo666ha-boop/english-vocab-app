#!/usr/bin/env node
import fs from 'node:fs';

const [,, inputPath, outputPath = inputPath] = process.argv;
if (!inputPath) { console.error('Usage: node tools/repair_m3_review.mjs <canonical-or-repaired.html> [output.html]'); process.exit(2); }
let html=fs.readFileSync(inputPath,'utf8');
for(const m of ['id="qb-data"','M3N-001','M3N-002','be動詞と一般動詞（現在形）','be動詞と一般動詞（過去形）']) if(!html.includes(m)) throw new Error(`NOT CANONICAL: missing ${m}`);
const block=extractJsonScript(html,'qb-data');
const qb=JSON.parse(block.json);
if(!Array.isArray(qb)||qb.length<10000) throw new Error(`NOT CANONICAL: qb count=${qb.length}`);

const changes=[];
for(const x of qb){
  const oldQ=x.q,oldA=x.a;
  if(String(x.id||'').startsWith('M3N-')){
    if(x.category==='be動詞と一般動詞（現在形）') repairCurrent(x);
    if(x.category==='be動詞と一般動詞（過去形）') repairPast(x);
  }
  if(x.subject==='英語') x.a=normalizeAuxPronounCase(String(x.a||''));
  if(x.q!==oldQ||x.a!==oldA) changes.push({id:x.id,q_before:oldQ,q_after:x.q,a_before:oldA,a_after:x.a});
}
const audit=auditM3(qb);
if(audit.errors.length){console.error(JSON.stringify({status:'FAILED_M3_REVIEW_GATE',...audit},null,2));process.exit(3);}
html=replaceJsonScript(html,'qb-data',JSON.stringify(qb));
fs.writeFileSync(outputPath,html,'utf8');
fs.writeFileSync(outputPath+'.m3-review.audit.json',JSON.stringify({status:'OK',changed:changes.length,changes,audit},null,2),'utf8');
console.log(JSON.stringify({status:'OK',changed:changes.length,audit},null,2));

function repairCurrent(x){
  const q=String(x.q||'');
  if(x.type==='変形'&&/を疑問文にしなさい。?$/.test(q)){
    let src=q.replace(/\s*を疑問文にしなさい。?$/,'').trim().replace(/[.。]$/,'');
    src=repairCurrentAffirmative(src);
    const ans=currentQuestion(src);
    if(ans){x.q=`${src}. を疑問文にしなさい。`;x.a=ans;return;}
  }
  if(x.type==='見分け'){
    const m=q.match(/^(.*?)\s+は be動詞の文か、一般動詞の文か答えなさい。?$/);
    if(m){const src=repairCurrentAffirmative(m[1].replace(/[.。]$/,''));x.q=`${src}. は be動詞の文か、一般動詞の文か答えなさい。`;}
    return;
  }
  if(x.type==='間違い直し'){
    // Intentionally-wrong Do/Does + adjective question: only the model answer is corrected.
    let m=q.match(/^(?:Do|Does)\s+(.+?)\s+([^?]+)\?\s*の誤りを直しなさい。?$/i);
    if(m&&looksAdjectivalPredicate(m[2])){const s=canonicalSubjectCase(m[1]);x.a=`${presentBe(s,true)} ${questionSubject(s)} ${m[2].trim()}?`;return;}
    // Intentionally-wrong be + lexical verb sentence: keep the error prompt and regenerate its correction.
    m=q.match(/^(.+?)\s+(?:am|is|are)\s+([A-Za-z]+)(.*?)[.]?\s*の誤りを直しなさい。?$/i);
    if(m&&!looksAdjectivalPredicate(m[2]+m[3])){const s=canonicalSubjectCase(m[1]);x.a=`${s} ${toPresentVerb(m[2],isThirdSingular(s))}${m[3].trimEnd()}.`;}
  }
}
function repairPast(x){
  const q=String(x.q||'');
  if(x.type==='変形'&&/を疑問文にしなさい。?$/.test(q)){
    let src=q.replace(/\s*を疑問文にしなさい。?$/,'').trim().replace(/[.。]$/,'');
    src=repairPastAffirmative(src);
    const ans=pastQuestion(src);
    if(ans){x.q=`${src}. を疑問文にしなさい。`;x.a=ans;return;}
  }
  if(x.type==='見分け'){
    const m=q.match(/^(.*?)\s+は be動詞の文か、一般動詞の文か答えなさい。?$/);
    if(m){const src=repairPastAffirmative(m[1].replace(/[.。]$/,''));x.q=`${src}. は be動詞の文か、一般動詞の文か答えなさい。`;}
    return;
  }
  if(x.type==='間違い直し'){
    const m=q.match(/^Did\s+(.+?)\s+([^?]+)\?\s*の誤りを直しなさい。?$/i);
    if(m&&looksAdjectivalPredicate(m[2])){const s=canonicalSubjectCase(m[1]);x.a=`${pastBe(s,true)} ${questionSubject(s)} ${m[2].trim()}?`;}
  }
}
function repairCurrentAffirmative(src){
  const p=parseSubject(src);if(!p)return src;const {subject,rest}=p;
  if(/^(am|is|are)\b/i.test(rest)){const pred=rest.replace(/^(am|is|are)\s+/i,'');return `${subject} ${presentBe(subject,false)} ${pred}`;}
  const m=rest.match(/^([A-Za-z]+)(.*)$/);if(!m)return src;
  return `${subject} ${toPresentVerb(m[1],isThirdSingular(subject))}${m[2]}`;
}
function repairPastAffirmative(src){
  const p=parseSubject(src);if(!p)return src;const {subject,rest}=p;
  if(/^(was|were)\b/i.test(rest)){const pred=rest.replace(/^(was|were)\s+/i,'');return `${subject} ${pastBe(subject,false)} ${pred}`;}
  return src;
}
function currentQuestion(src){
  const p=parseSubject(src);if(!p)return null;const {subject,rest}=p;
  let m=rest.match(/^(am|is|are)\s+(.+)$/i);if(m)return `${presentBe(subject,true)} ${questionSubject(subject)} ${m[2]}?`;
  m=rest.match(/^([A-Za-z]+)\s*(.*)$/);if(!m)return null;
  return `${isThirdSingular(subject)?'Does':'Do'} ${questionSubject(subject)} ${toBaseVerb(m[1])}${m[2]?' '+m[2].trim():''}?`;
}
function pastQuestion(src){
  const p=parseSubject(src);if(!p)return null;const {subject,rest}=p;
  let m=rest.match(/^(was|were)\s+(.+)$/i);if(m)return `${pastBe(subject,true)} ${questionSubject(subject)} ${m[2]}?`;
  m=rest.match(/^([A-Za-z]+)\s*(.*)$/);if(!m)return null;
  return `Did ${questionSubject(subject)} ${pastToBase(m[1])}${m[2]?' '+m[2].trim():''}?`;
}

const knownSubjects=['My mother','My brother','My father','My sister','My friend','Ken and I','Ken and Emi','Tom and Ken','I','You','We','They','He','She','Ken','Mika','Emi','Tom'];
function parseSubject(src){const s=src.trim();for(const sub of [...knownSubjects].sort((a,b)=>b.length-a.length)){if(s.startsWith(sub+' '))return{subject:sub,rest:s.slice(sub.length+1)};}const m=s.match(/^([A-Z][A-Za-z]+)\s+(.+)$/);return m?{subject:m[1],rest:m[2]}:null;}
function canonicalSubjectCase(s){const t=s.trim();return({i:'I',you:'You',we:'We',they:'They',he:'He',she:'She'})[t.toLowerCase()]||t;}
function questionSubject(s){if(s==='I')return'I';return({You:'you',We:'we',They:'they',He:'he',She:'she'})[s]||s;}
function isThirdSingular(s){return !['I','You','We','They'].includes(s)&&!/\band\b/i.test(s);}
function presentBe(s,question){let b=s==='I'?'am':(['You','We','They'].includes(s)||/\band\b/i.test(s)?'are':'is');return question?cap(b):b;}
function pastBe(s,question){let b=(['You','We','They'].includes(s)||/\band\b/i.test(s))?'were':'was';return question?cap(b):b;}
function cap(s){return s[0].toUpperCase()+s.slice(1);}
function looksAdjectivalPredicate(s){const f=String(s).trim().split(/\s+/)[0].toLowerCase();return new Set(['busy','kind','happy','sad','tired','old','young','small','tall','cold','hot','hungry','ready','free','late','early','fine','sick']).has(f);}
function toBaseVerb(v){const x=v.toLowerCase(),irr={has:'have',does:'do',goes:'go'};if(irr[x])return irr[x];if(/ies$/.test(x))return x.replace(/ies$/,'y');if(/(?:ches|shes|sses|xes|zes|oes)$/.test(x))return x.replace(/es$/,'');if(/s$/.test(x)&&!/ss$/.test(x))return x.slice(0,-1);return x;}
function toPresentVerb(v,third){const b=toBaseVerb(v);if(!third)return b;if(b==='have')return'has';if(/[^aeiou]y$/.test(b))return b.slice(0,-1)+'ies';if(/(?:ch|sh|ss|x|z|o)$/.test(b))return b+'es';return b+'s';}
function pastToBase(v){const x=v.toLowerCase(),irr={went:'go',had:'have',saw:'see',ate:'eat',made:'make',took:'take',came:'come',did:'do',wrote:'write',bought:'buy',spoke:'speak',ran:'run',got:'get',gave:'give',knew:'know',thought:'think',found:'find',lost:'lose',read:'read'};if(irr[x])return irr[x];if(/ied$/.test(x))return x.replace(/ied$/,'y');if(/ed$/.test(x)){let b=x.slice(0,-2);if(/([bcdfghjklmnpqrstvwxyz])\1$/.test(b))b=b.slice(0,-1);return b;}return x;}
function normalizeAuxPronounCase(s){return s.replace(/^(Do|Does|Did|Have|Has|Had|Can|Will|Would|Should|Must|Am|Is|Are|Was|Were)\s+(You|We|They|He|She)\b/,(_,a,p)=>`${a} ${p.toLowerCase()}`);}
function auditM3(qb){
  const errors=[];
  for(const x of qb){
    if(!String(x.id||'').startsWith('M3N-'))continue;
    const a=String(x.a||'');
    if(/^(?:Are|Were) (?:he|she|my mother|my brother|my father|Tom|Emi)\b/i.test(a))errors.push(`${x.id}:wrong be agreement:${a}`);
    if(/^Do (?:he|she|my mother|my brother|my father|Tom|Emi)\b/i.test(a))errors.push(`${x.id}:wrong do agreement:${a}`);
    if(/^Does (?:I|we|they|you)\b/i.test(a))errors.push(`${x.id}:wrong does agreement:${a}`);
    if(/^Were I\b/.test(a))errors.push(`${x.id}:Were I:${a}`);
    if(x.type==='変形'&&/を疑問文にしなさい/.test(x.q||'')){
      const src=String(x.q).split(/\s+を疑問文にしなさい/)[0].replace(/[.。]$/,'');const ps=parseSubject(src),pa=parseAnswerQuestionSubject(a);
      if(ps&&pa&&ps.subject.toLowerCase()!==pa.toLowerCase())errors.push(`${x.id}:subject changed ${ps.subject} -> ${pa}`);
    }
    if(x.category==='be動詞と一般動詞（現在形）'&&x.type!=='間違い直し'){
      const src=String(x.q||'').split(/\s+(?:は be動詞|を疑問文)/)[0].replace(/[.。]$/,'');const p=parseSubject(src);
      if(p&&/^(Am|Is|Are)\b/.test(p.rest))errors.push(`${x.id}:capitalized be in affirmative:${src}`);
      if(p&&!/^(am|is|are)\b/i.test(p.rest)){const m=p.rest.match(/^([A-Za-z]+)/);if(m&&isThirdSingular(p.subject)&&m[1]===toBaseVerb(m[1]))errors.push(`${x.id}:unfixed 3sg source:${src}`);}
    }
  }
  return{errors};
}
function parseAnswerQuestionSubject(a){const m=String(a).match(/^(?:Do|Does|Did|Am|Is|Are|Was|Were|Have|Has|Had|Can|Will|Would|Should|Must)\s+(.+?)\s+/i);return m?canonicalSubjectCase(m[1]):null;}
function extractJsonScript(src,id){const re=new RegExp(`<script\\s+id=["']${id}["']\\s+type=["']application/json["']>([\\s\\S]*?)<\\/script>`),m=src.match(re);if(!m)throw new Error(`missing JSON script ${id}`);return{json:m[1]};}
function replaceJsonScript(src,id,json){const re=new RegExp(`(<script\\s+id=["']${id}["']\\s+type=["']application/json["']>)[\\s\\S]*?(<\\/script>)`);if(!re.test(src))throw new Error(`missing JSON script ${id}`);return src.replace(re,`$1${json}$2`);}
