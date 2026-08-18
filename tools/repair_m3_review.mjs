#!/usr/bin/env node
import fs from 'node:fs';

const [,, inputPath, outputPath = inputPath] = process.argv;
if (!inputPath) {
  console.error('Usage: node tools/repair_m3_review.mjs <canonical-or-repaired.html> [output.html]');
  process.exit(2);
}
let html = fs.readFileSync(inputPath, 'utf8');
for (const marker of ['id="qb-data"','M3N-001','M3N-002','be動詞と一般動詞（現在形）','be動詞と一般動詞（過去形）']) {
  if (!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
}

const block = extractJsonScript(html, 'qb-data');
const qb = JSON.parse(block.json);
if (!Array.isArray(qb) || qb.length < 10000) throw new Error(`NOT CANONICAL: qb count=${qb.length}`);

const changes=[];
for (const item of qb) {
  if (!String(item.id||'').startsWith('M3N-')) continue;
  const oldQ=item.q, oldA=item.a;
  if (item.category === 'be動詞と一般動詞（現在形）') repairCurrentReview(item);
  if (item.category === 'be動詞と一般動詞（過去形）') repairPastReview(item);
  item.a = normalizeAuxPronounCase(String(item.a||''));
  if (item.q!==oldQ || item.a!==oldA) changes.push({id:item.id,q_before:oldQ,q_after:item.q,a_before:oldA,a_after:item.a});
}

// Normalize the same subject-case artifacts in already repaired target groups.
for (const item of qb) {
  if (item.subject !== '英語') continue;
  const old=item.a;
  item.a=normalizeAuxPronounCase(String(item.a||''));
  if (item.a!==old && !changes.some(x=>x.id===item.id)) changes.push({id:item.id,q_before:item.q,q_after:item.q,a_before:old,a_after:item.a});
}

const audit=auditM3(qb);
if (audit.errors.length) {
  console.error(JSON.stringify({status:'FAILED_M3_REVIEW_GATE',...audit},null,2));
  process.exit(3);
}
html=replaceJsonScript(html,'qb-data',JSON.stringify(qb));
fs.writeFileSync(outputPath,html,'utf8');
fs.writeFileSync(outputPath+'.m3-review.audit.json',JSON.stringify({status:'OK',changed:changes.length,changes,audit},null,2),'utf8');
console.log(JSON.stringify({status:'OK',changed:changes.length,audit},null,2));

function repairCurrentReview(item) {
  let q=String(item.q||''), a=String(item.a||'');

  if (item.type==='変形' && /を疑問文にしなさい。?$/.test(q)) {
    let src=q.replace(/\s*を疑問文にしなさい。?$/,'').trim().replace(/[.。]$/,'');
    src=repairCurrentAffirmative(src);
    const made=currentQuestion(src);
    if (made) {
      item.q=`${src}. を疑問文にしなさい。`;
      item.a=made;
      return;
    }
  }

  if (item.type==='見分け') {
    const m=q.match(/^(.*?)\s+は be動詞の文か、一般動詞の文か答えなさい。?$/);
    if (m) {
      const fixed=repairCurrentAffirmative(m[1].replace(/[.。]$/,''));
      item.q=`${fixed}. は be動詞の文か、一般動詞の文か答えなさい。`;
    }
  }

  if (item.type==='間違い直し') {
    const bad=q.match(/^(?:Do|Does)\s+(.+?)\s+([^?]+)\?\s*の誤りを直しなさい。?$/i);
    if (bad && looksAdjectivalPredicate(bad[2])) {
      const subject=canonicalSubjectCase(bad[1]);
      item.a=`${presentBe(subject,true)} ${questionSubject(subject)} ${bad[2].trim()}?`;
      return;
    }
    // Existing wrong sentence such as "He is play baseball." is pedagogically valid;
    // regenerate only its answer from the general-verb portion.
    const mix=q.match(/^(.+?)\s+(?:am|is|are)\s+([A-Za-z]+)(.*?)[.]?\s*の誤りを直しなさい。?$/i);
    if (mix && !looksAdjectivalPredicate(mix[2]+mix[3])) {
      const subject=canonicalSubjectCase(mix[1]);
      item.a=`${subject} ${toPresentVerb(mix[2],isThirdSingular(subject))}${mix[3].trimEnd()}.`;
    }
  }
  item.q=q; item.a=a===item.a?item.a:a;
}

function repairPastReview(item) {
  const q=String(item.q||'');
  if (item.type==='変形' && /を疑問文にしなさい。?$/.test(q)) {
    let src=q.replace(/\s*を疑問文にしなさい。?$/,'').trim().replace(/[.。]$/,'');
    src=repairPastAffirmative(src);
    const made=pastQuestion(src);
    if (made) {
      item.q=`${src}. を疑問文にしなさい。`;
      item.a=made;
      return;
    }
  }
  if (item.type==='見分け') {
    const m=q.match(/^(.*?)\s+は be動詞の文か、一般動詞の文か答えなさい。?$/);
    if (m) {
      const fixed=repairPastAffirmative(m[1].replace(/[.。]$/,''));
      item.q=`${fixed}. は be動詞の文か、一般動詞の文か答えなさい。`;
    }
  }
  if (item.type==='間違い直し') {
    const bad=q.match(/^Did\s+(.+?)\s+([^?]+)\?\s*の誤りを直しなさい。?$/i);
    if (bad && looksAdjectivalPredicate(bad[2])) {
      const subject=canonicalSubjectCase(bad[1]);
      item.a=`${pastBe(subject,true)} ${questionSubject(subject)} ${bad[2].trim()}?`;
      return;
    }
  }
}

function repairCurrentAffirmative(src) {
  const p=parseSubject(src); if(!p) return src;
  const {subject,rest}=p;
  if (/^(am|is|are)\b/i.test(rest)) {
    const pred=rest.replace(/^(am|is|are)\s+/i,'');
    return `${subject} ${presentBe(subject,false)} ${pred}`;
  }
  const m=rest.match(/^([A-Za-z]+)(.*)$/); if(!m) return src;
  return `${subject} ${toPresentVerb(m[1],isThirdSingular(subject))}${m[2]}`;
}
function repairPastAffirmative(src) {
  const p=parseSubject(src); if(!p) return src;
  const {subject,rest}=p;
  if (/^(was|were)\b/i.test(rest)) {
    const pred=rest.replace(/^(was|were)\s+/i,'');
    return `${subject} ${pastBe(subject,false)} ${pred}`;
  }
  return src;
}
function currentQuestion(src) {
  const p=parseSubject(src); if(!p) return null;
  const {subject,rest}=p;
  const bm=rest.match(/^(am|is|are)\s+(.+)$/i);
  if (bm) return `${presentBe(subject,true)} ${questionSubject(subject)} ${bm[2]}?`;
  const vm=rest.match(/^([A-Za-z]+)\s*(.*)$/); if(!vm) return null;
  const aux=isThirdSingular(subject)?'Does':'Do';
  return `${aux} ${questionSubject(subject)} ${toBaseVerb(vm[1])}${vm[2]?' '+vm[2].trim():''}?`;
}
function pastQuestion(src) {
  const p=parseSubject(src); if(!p) return null;
  const {subject,rest}=p;
  const bm=rest.match(/^(was|were)\s+(.+)$/i);
  if (bm) return `${pastBe(subject,true)} ${questionSubject(subject)} ${bm[2]}?`;
  const vm=rest.match(/^([A-Za-z]+)\s*(.*)$/); if(!vm) return null;
  return `Did ${questionSubject(subject)} ${pastToBase(vm[1])}${vm[2]?' '+vm[2].trim():''}?`;
}

const knownSubjects=['My mother','My brother','My father','My sister','My friend','Ken and I','Ken and Emi','Tom and Ken','I','You','We','They','He','She','Ken','Mika','Emi','Tom'];
function parseSubject(src) {
  const s=src.trim();
  for(const sub of knownSubjects.sort((a,b)=>b.length-a.length)) {
    if(s===sub) return {subject:sub,rest:''};
    if(s.startsWith(sub+' ')) return {subject:sub,rest:s.slice(sub.length+1)};
  }
  // Fall back to a single capitalized proper name.
  const m=s.match(/^([A-Z][A-Za-z]+)\s+(.+)$/); return m?{subject:m[1],rest:m[2]}:null;
}
function canonicalSubjectCase(s) {
  const t=s.trim();
  const map={i:'I',you:'You',we:'We',they:'They',he:'He',she:'She'};
  return map[t.toLowerCase()]||t;
}
function questionSubject(s) {
  if(s==='I') return 'I';
  const map={You:'you',We:'we',They:'they',He:'he',She:'she'};
  return map[s]||s;
}
function isThirdSingular(s){return !['I','You','We','They'].includes(s) && !/\band\b/i.test(s);}
function presentBe(s){if(s==='I')return 'Am'; if(['You','We','They'].includes(s)||/\band\b/i.test(s))return 'Are'; return 'Is';}
function pastBe(s){if(['You','We','They'].includes(s)||/\band\b/i.test(s))return 'Were'; return 'Was';}
function looksAdjectivalPredicate(rest){
  const first=String(rest).trim().split(/\s+/)[0].toLowerCase();
  return new Set(['busy','kind','happy','sad','tired','old','young','small','tall','cold','hot','hungry','ready','free','late','early','fine','sick']).has(first);
}
function toBaseVerb(v){
  const x=v.toLowerCase();
  const irregular={has:'have',does:'do',goes:'go'}; if(irregular[x]) return irregular[x];
  if(/ies$/.test(x)) return x.replace(/ies$/,'y');
  if(/(?:ches|shes|sses|xes|zes|oes)$/.test(x)) return x.replace(/es$/,'');
  if(/s$/.test(x)&&!/ss$/.test(x)) return x.slice(0,-1);
  return x;
}
function toPresentVerb(v,third){
  const base=toBaseVerb(v); if(!third) return base;
  if(base==='have')return 'has';
  if(/[^aeiou]y$/.test(base))return base.slice(0,-1)+'ies';
  if(/(?:ch|sh|ss|x|z|o)$/.test(base))return base+'es';
  return base+'s';
}
function pastToBase(v){
  const x=v.toLowerCase();
  const irr={went:'go',had:'have',saw:'see',ate:'eat',made:'make',took:'take',came:'come',did:'do',wrote:'write',bought:'buy',spoke:'speak',ran:'run',got:'get',gave:'give',knew:'know',thought:'think',found:'find',lost:'lose',read:'read'};
  if(irr[x])return irr[x];
  if(/ied$/.test(x))return x.replace(/ied$/,'y');
  if(/ed$/.test(x)){
    let b=x.slice(0,-2);
    if(/(?:at|it|iz|ov|us|ak|iv|ik|ac|ic|ag|ur)$/.test(b)) b+='e';
    if(/([bcdfghjklmnpqrstvwxyz])\1$/.test(b)) b=b.slice(0,-1);
    return b;
  }
  return x;
}
function normalizeAuxPronounCase(s){
  return s
    .replace(/^(Do|Does|Did|Have|Has|Had|Can|Will|Would|Should|Must)\s+(You|We|They|He|She)\b/,(_,a,p)=>`${a} ${p.toLowerCase()}`)
    .replace(/^(Am|Is|Are|Was|Were)\s+(You|We|They|He|She)\b/,(_,a,p)=>`${a} ${p.toLowerCase()}`);
}
function auditM3(qb){
  const errors=[];
  for(const x of qb){
    if(!String(x.id||'').startsWith('M3N-')) continue;
    const both=`${x.q} ${x.a}`;
    if(/\b(?:Are|Were) (?:he|she|my mother|my brother|my father|Tom|Emi)\b/i.test(x.a||'')) errors.push(`${x.id}:wrong be agreement:${x.a}`);
    if(/\b(?:Do) (?:he|she|my mother|my brother|my father|Tom|Emi)\b/i.test(x.a||'')) errors.push(`${x.id}:wrong do agreement:${x.a}`);
    if(/\b(?:Does) (?:I|we|they|you)\b/i.test(x.a||'')) errors.push(`${x.id}:wrong does agreement:${x.a}`);
    if(/\bWere I\b/.test(x.a||'')) errors.push(`${x.id}:Were I:${x.a}`);
    if(x.type==='変形' && /を疑問文にしなさい/.test(x.q||'')){
      const src=(x.q||'').split(/\s+を疑問文にしなさい/)[0].replace(/[.。]$/,'');
      const ps=parseSubject(src); const pa=parseAnswerQuestionSubject(x.a||'');
      if(ps && pa && ps.subject.toLowerCase()!==pa.toLowerCase()) errors.push(`${x.id}:subject changed ${ps.subject} -> ${pa}`);
    }
    if(x.category==='be動詞と一般動詞（現在形）' && x.type!=='間違い直し'){
      const sentence=(x.q||'').split(/\s+(?:は be動詞|を疑問文)/)[0].replace(/[.。]$/,'');
      const p=parseSubject(sentence); if(p && !/^(am|is|are)\b/i.test(p.rest)){
        const vm=p.rest.match(/^([A-Za-z]+)/);
        if(vm && isThirdSingular(p.subject) && vm[1]===toBaseVerb(vm[1])) errors.push(`${x.id}:unfixed 3sg source:${sentence}`);
      }
    }
  }
  return {errors};
}
function parseAnswerQuestionSubject(a){
  const m=String(a).match(/^(?:Do|Does|Did|Am|Is|Are|Was|Were|Have|Has|Had|Can|Will|Would|Should|Must)\s+(.+?)\s+/i);
  return m?canonicalSubjectCase(m[1]):null;
}
function extractJsonScript(src,id){const re=new RegExp(`<script\\s+id=["']${id}["']\\s+type=["']application/json["']>([\\s\\S]*?)<\\/script>`);const m=src.match(re);if(!m)throw new Error(`missing JSON script ${id}`);return {json:m[1]};}
function replaceJsonScript(src,id,json){const re=new RegExp(`(<script\\s+id=["']${id}["']\\s+type=["']application/json["']>)[\\s\\S]*?(<\\/script>)`);if(!re.test(src))throw new Error(`missing JSON script ${id}`);return src.replace(re,`$1${json}$2`);}
