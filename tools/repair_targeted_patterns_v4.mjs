#!/usr/bin/env node
import fs from 'node:fs';

const GERUND_SPECS=[
  {key:'like',main:'like',base:'play',tail:'tennis',gerund:'playing tennis',jp:'テニスをすることが好きだ',detect:/テニスをすることが好き|\blike(?:s)?\b[\s\S]*(?:play|playing)\b|\bplaying tennis\b/i},
  {key:'enjoy',main:'enjoy',base:'read',tail:'comics',gerund:'reading comics',jp:'まんがを読むことを楽しむ',detect:/まんがを読むことを楽し|\benjoy(?:s)?\b[\s\S]*(?:read|reading)\b|\breading comics\b/i},
  {key:'finish',main:'finish',base:'do',tail:'homework',gerund:'doing homework',jp:'宿題を終える',detect:/宿題を終え|\bfinish(?:es)?\b[\s\S]*(?:homework|do|doing)\b|\bdoing homework\b/i},
  {key:'practice',main:'practice',base:'speak',tail:'English',gerund:'speaking English',jp:'英語を話す練習をする',detect:/英語を話す練習|\bpractice(?:s)?\b[\s\S]*(?:speak|speaking)\b|\bspeaking English\b/i},
  {key:'start',main:'start',base:'make',tail:'lunch',gerund:'making lunch',jp:'昼食を作り始める',detect:/昼食を作り始め|\bstart(?:s)?\b[\s\S]*(?:cook|make|making)\b|\bmaking lunch\b/i},
  {key:'stop',main:'stop',base:'use',tail:'the phone',gerund:'using the phone',jp:'スマホを使うのをやめる',detect:/スマホを使うのをやめ|\bstop(?:s)?\b[\s\S]*(?:use|using|to us)\b|\busing (?:my|your|our|their|his|her|the) phone\b/i},
  {key:'love',main:'love',base:'listen',tail:'to music',gerund:'listening to music',jp:'音楽を聞くことが大好きだ',detect:/音楽を聞くことが大好き|\blove(?:s)?\b[\s\S]*(?:listen|listening)\b|\blistening to music\b/i},
  {key:'begin',main:'begin',base:'study',tail:'science',gerund:'studying science',jp:'理科を勉強し始める',detect:/理科を勉強し始め|\bbegin(?:s)?\b[\s\S]*(?:study|studying)\b|\bstudying science\b/i}
];

const [,, inputPath, outputPath=inputPath]=process.argv;
if(!inputPath){console.error('Usage: node tools/repair_targeted_patterns_v4.mjs <html> [output.html]');process.exit(2);}
let html=fs.readFileSync(inputPath,'utf8');
for(const m of ['id="qb-data"','GEN-PRS-','M2-GER2-','M2-COMP2-']) if(!html.includes(m)) throw new Error(`NOT CANONICAL: missing ${m}`);
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const match=html.match(re); if(!match) throw new Error('missing qb-data');
const qb=JSON.parse(match[1]); if(!Array.isArray(qb)||qb.length<10000) throw new Error(`NOT CANONICAL: qb count=${qb.length}`);

const changes=[];
for(const x of qb){
  const oldQ=String(x.q||''), oldA=String(x.a||''), oldType=x.type;
  if(String(x.id||'').startsWith('GEN-PRS-')) repairGen(x);
  if(String(x.id||'').startsWith('M2-GER2-')) repairGer(x);
  if(String(x.id||'').startsWith('M2-COMP2-')) repairComp(x);
  if(x.q!==oldQ||x.a!==oldA||x.type!==oldType) changes.push({id:x.id,q_before:oldQ,q_after:x.q,a_before:oldA,a_after:x.a,type_before:oldType,type_after:x.type});
}
const audit=auditFamilies(qb);
if(audit.errors.length){console.error(JSON.stringify({status:'FAILED_TARGETED_V4',...audit},null,2));process.exit(3);}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
fs.writeFileSync(outputPath+'.targeted-v3.audit.json',JSON.stringify({status:'OK',version:'v4',changed:changes.length,changes,audit},null,2),'utf8');
console.log(JSON.stringify({status:'OK',version:'v4',changed:changes.length,audit},null,2));

function repairGen(x){
  let q=String(x.q||''), a=String(x.a||'');
  q=q.replace(/「本を読みました」/g,'「本を読みます」');
  q=q.replace(/practice\s*\/\s*the\s*\/\s*tennis/gi,'practice / tennis');
  if(x.type==='空所補充'){
    const subject=subjectFromBlank(q);
    if(/ピアノを練習します/.test(q)) a=presentPhrase('practice the piano',subject);
    else if(/本を読みます/.test(q)) a=presentPhrase('read books',subject);
    else if(subject && /^[A-Z][A-Za-z]+(?:\s+.*)?$/.test(a)) a=presentPhrase(lowerFirst(a),subject);
    else a=lowerFirst(a);
  }
  if(x.type==='変形' && /を疑問文にしなさい。?$/.test(q)){
    let src=q.replace(/\s*を疑問文にしなさい。?$/,'').trim().replace(/[.。]$/,'');
    src=normalizePresentSource(src); const made=toQuestion(src);
    if(made){q=`${src}. を疑問文にしなさい。`; a=made;}
  }
  if(x.type==='変形' && /を否定文にしなさい。?$/.test(q)){
    let src=q.replace(/\s*を否定文にしなさい。?$/,'').trim().replace(/[.。]$/,'');
    src=normalizePresentSource(src); const made=toNegative(src);
    if(made){q=`${src}. を否定文にしなさい。`; a=made;}
  }
  x.q=q; x.a=a;
}

function repairGer(x){
  const q0=String(x.q||''),a0=String(x.a||'');
  const spec=gerundSpec(`${q0} ${a0}`); if(!spec) return;
  const subject=gerundSubject(x); if(!subject) return;
  const main=toPresent(spec.main,isThird(subject));
  const jp=(q0.match(/「([^」]+)」/)||[])[1]||spec.jp;
  const answer=`${subject} ${main} ${spec.gerund}.`;
  if(x.type==='空所補充'){
    x.q=`${subject} ${main} (      ). 「${jp}」`;
    x.a=spec.gerund;
  } else if(x.type==='英作文'){
    const quoted=(q0.match(/『([^』]+)』/)||[])[1];
    x.q=quoted ? `動名詞を使って、次の日本語に合う英文を書きなさい。『${quoted}』` : `動名詞を使って、次の日本語に合う英文を書きなさい。『${jp}』`;
    x.a=answer;
  } else if(x.type==='間違い直し' || x.type==='変形'){
    x.type='変形';
    x.q=`次の英文の（　）内の動詞を動名詞に直して、英文を完成させなさい。 ${subject} ${main} (${spec.base}) ${spec.tail}.`;
    x.a=answer;
  }
}
function gerundSpec(text){return GERUND_SPECS.find(s=>s.detect.test(String(text||'')))||null;}
function gerundSubject(x){
  for(const text of [String(x.a||'').trim(),String(x.q||'').trim()]){
    const s=leadingKnownSubject(text); if(s) return s;
    const embedded=text.match(/(?:^|。\s*)(My friend|Takumi|Mika|I|You|We|They|He|She)\s+/); if(embedded) return embedded[1];
  }
  return null;
}
function leadingKnownSubject(text){for(const s of ['My friend','Takumi','Mika','I','You','We','They','He','She']) if(String(text).startsWith(s+' ')) return s; return null;}

function repairComp(x){
  let q=String(x.q||''), a=String(x.a||'');
  q=q.replace(/\bthan He\b/g,'than Ken').replace(/than\s*\/\s*He\b/g,'than / Ken');
  a=a.replace(/\bthan He\b/g,'than Ken');
  if(x.type==='並びかえ'){
    const m=q.match(/\(\s*([^/()]+?)\s*\/\s*than\s*\/\s*([^/()]+?)\s*\/\s*is\s*\/\s*([^()]+?)\s*\)/i);
    if(m) a=`${clean(m[1])} is ${clean(m[3])} than ${clean(m[2])}.`;
  }
  x.q=q; x.a=a;
}

function subjectFromBlank(q){const m=String(q).match(/^(.+?)\s*\(\s*\)\s*/)||String(q).match(/^(.+?)\s*\(\s+\)\s*/);return m?m[1].trim():null;}
function normalizePresentSource(src){const p=parseSubject(src); if(!p) return src; const m=p.rest.match(/^([A-Za-z]+)(.*)$/); if(!m) return src; return `${p.subject} ${toPresent(toBase(m[1]),isThird(p.subject))}${m[2]}`;}
function toQuestion(src){const p=parseSubject(src); if(!p) return null; const m=p.rest.match(/^([A-Za-z]+)\s*(.*)$/); if(!m) return null; return `${isThird(p.subject)?'Does':'Do'} ${questionSubject(p.subject)} ${toBase(m[1])}${m[2]?' '+m[2].trim():''}?`;}
function toNegative(src){const p=parseSubject(src); if(!p) return null; const m=p.rest.match(/^([A-Za-z]+)\s*(.*)$/); if(!m) return null; return `${p.subject} ${isThird(p.subject)?'does':'do'} not ${toBase(m[1])}${m[2]?' '+m[2].trim():''}.`;}
function presentPhrase(phrase,subject){const s=lowerFirst(String(phrase||'').trim()); if(!s) return s; const [verb,...rest]=s.split(/\s+/); return [toPresent(toBase(verb),isThird(subject)),...rest].join(' ');}
function parseSubject(src){
  const s=String(src).trim();
  const known=['My mother','My father','My brother','My sister','My friend','Ken and Emi','Tom and Ken','I','You','We','They','He','She','Mika','Ken','Emi','Tom'];
  for(const sub of known.sort((a,b)=>b.length-a.length)) if(s.startsWith(sub+' ')) return {subject:sub,rest:s.slice(sub.length+1)};
  const m=s.match(/^([A-Z][A-Za-z]+)\s+(.+)$/); return m?{subject:m[1],rest:m[2]}:null;
}
function isThird(subject){return !!subject && !['I','You','We','They'].includes(subject) && !/\band\b/i.test(subject);}
function questionSubject(s){if(s==='I')return'I';return ({You:'you',We:'we',They:'they',He:'he',She:'she'})[s]||s;}
function toBase(v){const x=String(v).toLowerCase(); const irr={has:'have',does:'do',goes:'go'}; if(irr[x]) return irr[x]; if(/ies$/.test(x)) return x.replace(/ies$/,'y'); if(/(?:ches|shes|sses|xes|zes|oes)$/.test(x)) return x.replace(/es$/,''); if(/s$/.test(x)&&!/ss$/.test(x)) return x.slice(0,-1); return x;}
function toPresent(base,third){if(!third)return base;if(base==='have')return'has';if(/[^aeiou]y$/.test(base))return base.slice(0,-1)+'ies';if(/(?:ch|sh|ss|x|z|o)$/.test(base))return base+'es';return base+'s';}
function lowerFirst(s){s=String(s||'');return /^[A-Z]/.test(s)?s[0].toLowerCase()+s.slice(1):s;}
function clean(s){return String(s).trim().replace(/\s+/g,' ');}

function auditFamilies(qb){
  const errors=[];
  for(const x of qb){
    const id=String(x.id||''),q=String(x.q||''),a=String(x.a||'');
    if(id.startsWith('GEN-PRS-')){
      if(/本を読みました/.test(q)) errors.push(`${id}:past Japanese remains`);
      if(/practice\s*\/\s*the\s*\/\s*tennis/i.test(q)) errors.push(`${id}:the tennis token remains`);
      if(x.type==='変形'&&/を疑問文/.test(q)){
        const src=q.replace(/\s*を疑問文.*$/,'').replace(/[.。]$/,''); const ps=parseSubject(src); const ma=a.match(/^(?:Do|Does)\s+(.+?)\s+/i);
        if(ps&&ma&&normalizeSubject(ma[1])!==ps.subject.toLowerCase()) errors.push(`${id}:question subject drift ${ps.subject} -> ${ma[1]}`);
      }
      if(x.type==='空所補充'&&/^[A-Z]/.test(a)) errors.push(`${id}:capitalized mid-sentence answer ${a}`);
    }
    if(id.startsWith('M2-GER2-')){
      if(!gerundSpec(`${q} ${a}`)) errors.push(`${id}:unknown gerund template`);
      if(x.type==='空所補充'&&/^[A-Z]/.test(a)) errors.push(`${id}:capitalized gerund blank ${a}`);
      if(x.type==='間違い直し') errors.push(`${id}:ambiguous legacy error-correction type remains`);
      if(/\b(?:He|She|Takumi|Mika|My friend) (?:like|enjoy|finish|practice|start|stop|love|begin)\b/.test(`${q} ${a}`)) errors.push(`${id}:third-person singular main verb remains`);
      if(/using (?:my|your|our|their|his|her) phone|stop to us/i.test(`${q} ${a}`)) errors.push(`${id}:phone ownership/template defect remains`);
      if(/\b(?:like|likes|start|starts|love|loves|begin|begins) to (?:play|cook|listen|study)\b/i.test(q)) errors.push(`${id}:ambiguous infinitive-vs-gerund prompt remains`);
      if(x.type==='英作文' && !/^動名詞を使って、/.test(q)) errors.push(`${id}:composition does not explicitly require gerund`);
      if(x.type==='変形' && !/動名詞に直して/.test(q)) errors.push(`${id}:transformation does not explicitly require gerund`);
      if(!/\b(?:playing|reading|doing|speaking|making|using|listening|studying)\b/i.test(a)) errors.push(`${id}:answer lacks target gerund`);
    }
    if(id.startsWith('M2-COMP2-')){
      if(/\bthan He\b|than\s*\/\s*He\b/.test(`${q} ${a}`)) errors.push(`${id}:than He remains`);
      if(x.type==='並びかえ'&&/\bthan\b/i.test(q)){
        const m=q.match(/\(\s*([^/()]+?)\s*\/\s*than\s*\/\s*([^/()]+?)\s*\/\s*is\s*\/\s*([^()]+?)\s*\)/i);
        if(m){const want=`${clean(m[1])} is ${clean(m[3])} than ${clean(m[2])}.`; if(a!==want) errors.push(`${id}:reorder answer mismatch expected ${want} got ${a}`);}
      }
    }
  }
  return {errors};
}
function normalizeSubject(s){const t=String(s).trim();const map={i:'i',you:'you',we:'we',they:'they',he:'he',she:'she'};return map[t.toLowerCase()]||t.toLowerCase();}
