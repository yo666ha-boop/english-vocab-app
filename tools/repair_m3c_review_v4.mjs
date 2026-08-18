#!/usr/bin/env node
import fs from 'node:fs';

const [,, inputPath, outputPath=inputPath]=process.argv;
if(!inputPath){console.error('Usage: node tools/repair_m3c_review_v4.mjs <html> [output.html]');process.exit(2);}
let html=fs.readFileSync(inputPath,'utf8');
for(const marker of ['id="qb-data"','M3C-']) if(!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re); if(!m) throw new Error('missing qb-data');
const qb=JSON.parse(m[1]); if(!Array.isArray(qb)||qb.length<10000) throw new Error(`NOT CANONICAL: qb count=${qb.length}`);

const allowed=new Set(['be動詞と一般動詞（現在形）','be動詞と一般動詞（過去形）','進行形','未来の文','助動詞']);
const changes=[];
for(const x of qb){
  if(!String(x.id||'').startsWith('M3C-')||x.type!=='変形'||!allowed.has(String(x.category||''))) continue;
  const before={q:String(x.q||''),a:String(x.a||'')};
  repair(x);
  if(x.q!==before.q||x.a!==before.a) changes.push({id:x.id,category:x.category,q_before:before.q,q_after:x.q,a_before:before.a,a_after:x.a});
}
const audit=auditBank(qb);
if(audit.errors.length){console.error(JSON.stringify({status:'FAILED_M3C_REVIEW_V4',changed:changes.length,errors:audit.errors.slice(0,300)},null,2));process.exit(3);}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
fs.writeFileSync(outputPath+'.m3c-review-v4.audit.json',JSON.stringify({status:'OK',changed:changes.length,changes,audit},null,2),'utf8');
console.log(JSON.stringify({status:'OK',changed:changes.length,audit},null,2));

function repair(x){
  const q=String(x.q||'');
  if(/を疑問文にしなさい。?$/.test(q)){
    let src=sourceOf(q,'を疑問文にしなさい。');
    src=normalizePossessiveForSubject(src);
    const ans=makeQuestion(src,x.category);
    if(ans){x.q=`${src}. を疑問文にしなさい。`;x.a=ans;}
    return;
  }
  if(/を否定文にしなさい。?$/.test(q)){
    let src=sourceOf(q,'を否定文にしなさい。');
    src=normalizePossessiveForSubject(src);
    const ans=makeNegative(src,x.category);
    if(ans){x.q=`${src}. を否定文にしなさい。`;x.a=ans;}
  }
}
function sourceOf(q,suffix){return String(q).replace(new RegExp(`\\s*${escapeRegExp(suffix)}?$`),'').trim().replace(/[.。]$/,'');}
function escapeRegExp(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function parse(src){
  const s=canonicalLeadingSubject(String(src||'').trim());
  const subjects=['The student','The teacher','My mother','My father','My brother','My sister','My friend','Ken and Emi','Tom and Ken','I','You','We','They','He','She','Ken','Mika','Emi','Tom','Yuki','Takumi'].sort((a,b)=>b.length-a.length);
  for(const subject of subjects) if(s.startsWith(subject+' ')) return {subject,rest:s.slice(subject.length+1)};
  const mm=s.match(/^([A-Z][A-Za-z]+)\s+(.+)$/);return mm?{subject:mm[1],rest:mm[2]}:null;
}
function canonicalLeadingSubject(s){return s.replace(/^(i)\b/i,'I').replace(/^(you)\b/i,'You').replace(/^(we)\b/i,'We').replace(/^(they)\b/i,'They').replace(/^(he)\b/i,'He').replace(/^(she)\b/i,'She');}
function questionSubject(s){if(s==='I')return'I';return({You:'you',We:'we',They:'they',He:'he',She:'she'})[s]||s;}
function isThird(s){return !['I','You','We','They'].includes(s)&&!/\band\b/i.test(s);}
function bePresent(s){return s==='I'?'am':(['You','We','They'].includes(s)||/\band\b/i.test(s)?'are':'is');}
function bePast(s){return ['You','We','They'].includes(s)||/\band\b/i.test(s)?'were':'was';}
function cap(s){return s[0].toUpperCase()+s.slice(1);}

function makeQuestion(src,category){
  const p=parse(src);if(!p)return null;const {subject,rest}=p;const qs=questionSubject(subject);
  let mm;
  if(category==='未来の文'){
    if((mm=rest.match(/^will\s+(.+)$/i))) return `Will ${qs} ${mm[1]}?`;
    if((mm=rest.match(/^(am|is|are)\s+going to\s+(.+)$/i))) return `${cap(bePresent(subject))} ${qs} going to ${mm[2]}?`;
  }
  if(category==='助動詞'&&(mm=rest.match(/^(can|must|should|may)\s+(.+)$/i))) return `${cap(mm[1].toLowerCase())} ${qs} ${mm[2]}?`;
  if(category==='進行形'&&(mm=rest.match(/^(am|is|are|was|were)\s+(.+)$/i))){
    const aux=/^(was|were)$/i.test(mm[1])?bePast(subject):bePresent(subject);
    return `${cap(aux)} ${qs} ${mm[2]}?`;
  }
  if(category==='be動詞と一般動詞（現在形）'){
    if((mm=rest.match(/^(am|is|are)\s+(.+)$/i))) return `${cap(bePresent(subject))} ${qs} ${mm[2]}?`;
    mm=rest.match(/^([A-Za-z]+)\s*(.*)$/);if(!mm)return null;
    return `${isThird(subject)?'Does':'Do'} ${qs} ${toBasePresent(mm[1])}${mm[2].trim()?' '+mm[2].trim():''}?`;
  }
  if(category==='be動詞と一般動詞（過去形）'){
    if((mm=rest.match(/^(was|were)\s+(.+)$/i))) return `${cap(bePast(subject))} ${qs} ${mm[2]}?`;
    mm=rest.match(/^([A-Za-z]+)\s*(.*)$/);if(!mm)return null;
    return `Did ${qs} ${pastToBase(mm[1])}${mm[2].trim()?' '+mm[2].trim():''}?`;
  }
  return null;
}
function makeNegative(src,category){
  const p=parse(src);if(!p)return null;const {subject,rest}=p;let mm;
  if(category==='未来の文'){
    if((mm=rest.match(/^will\s+(.+)$/i))) return `${subject} will not ${mm[1]}.`;
    if((mm=rest.match(/^(am|is|are)\s+going to\s+(.+)$/i))) return `${subject} ${bePresent(subject)} not going to ${mm[2]}.`;
  }
  if(category==='助動詞'&&(mm=rest.match(/^(can|must|should|may)\s+(.+)$/i))) return `${subject} ${mm[1].toLowerCase()} not ${mm[2]}.`;
  if(category==='進行形'&&(mm=rest.match(/^(am|is|are|was|were)\s+(.+)$/i))){
    const aux=/^(was|were)$/i.test(mm[1])?bePast(subject):bePresent(subject);
    return `${subject} ${aux} not ${mm[2]}.`;
  }
  if(category==='be動詞と一般動詞（現在形）'){
    if((mm=rest.match(/^(am|is|are)\s+(.+)$/i))) return `${subject} ${bePresent(subject)} not ${mm[2]}.`;
    mm=rest.match(/^([A-Za-z]+)\s*(.*)$/);if(!mm)return null;
    return `${subject} ${isThird(subject)?'does':'do'} not ${toBasePresent(mm[1])}${mm[2].trim()?' '+mm[2].trim():''}.`;
  }
  if(category==='be動詞と一般動詞（過去形）'){
    if((mm=rest.match(/^(was|were)\s+(.+)$/i))) return `${subject} ${bePast(subject)} not ${mm[2]}.`;
    mm=rest.match(/^([A-Za-z]+)\s*(.*)$/);if(!mm)return null;
    return `${subject} did not ${pastToBase(mm[1])}${mm[2].trim()?' '+mm[2].trim():''}.`;
  }
  return null;
}
function normalizePossessiveForSubject(src){
  const p=parse(src);if(!p)return src;
  const poss={I:'my',You:'your',We:'our',They:'their',He:'his',She:'her'}[p.subject];
  if(!poss)return src;
  let rest=p.rest;
  rest=rest.replace(/\b(?:my|your|our|their|his|her)\s+(homework|key|mother|father|brother|sister|friend|book|bag|pen|room|house)\b/gi,(_,noun)=>`${poss} ${noun.toLowerCase()}`);
  return `${p.subject} ${rest}`;
}
function toBasePresent(v){
  const x=String(v||'').toLowerCase(),irr={has:'have',does:'do',goes:'go'};if(irr[x])return irr[x];
  if(/ies$/.test(x))return x.replace(/ies$/,'y');
  if(/(?:ches|shes|sses|xes|zes|oes)$/.test(x))return x.replace(/es$/,'');
  if(/s$/.test(x)&&!/ss$/.test(x))return x.slice(0,-1);return x;
}
function pastToBase(v){
  const x=String(v||'').toLowerCase();
  const irr={went:'go',came:'come',saw:'see',made:'make',took:'take',had:'have',did:'do',got:'get',ate:'eat',wrote:'write',bought:'buy',spoke:'speak',ran:'run',gave:'give',knew:'know',thought:'think',found:'find',lost:'lose',read:'read'};
  if(irr[x])return irr[x];
  const known={played:'play',watched:'watch',studied:'study',cleaned:'clean',listened:'listen',helped:'help',used:'use',cooked:'cook',visited:'visit',worked:'work',lived:'live',liked:'like',wanted:'want',needed:'need',started:'start',finished:'finish',called:'call',joined:'join',practiced:'practice',danced:'dance',closed:'close'};
  if(known[x])return known[x];
  if(/ied$/.test(x))return x.replace(/ied$/,'y');
  if(/ed$/.test(x)){let b=x.slice(0,-2);if(/([bcdfghjklmnpqrstvwxyz])\1$/.test(b))b=b.slice(0,-1);if(/(?:us|iz|at)$/.test(b))return b+'e';return b;}
  return x;
}
function auditBank(qb){
  const errors=[];
  for(const x of qb){
    if(!String(x.id||'').startsWith('M3C-')||x.type!=='変形'||!allowed.has(String(x.category||'')))continue;
    const q=String(x.q||''),a=String(x.a||'');
    if(/を疑問文にしなさい/.test(q)){
      const src=sourceOf(q,'を疑問文にしなさい。');const expected=makeQuestion(src,x.category);
      if(expected&&a!==expected)errors.push(`${x.id}:question mismatch expected=${expected} got=${a}`);
      if(/^(?:Will|Can|Must|Should|May|Are|Were|Do|Does|Did)\s+you\b/i.test(a)&&/^(?:I|We)\b/.test(src))errors.push(`${x.id}:subject changed to you:${a}`);
    }
    if(/を否定文にしなさい/.test(q)){
      const src=sourceOf(q,'を否定文にしなさい。');const expected=makeNegative(src,x.category);
      if(expected&&a!==expected)errors.push(`${x.id}:negative mismatch expected=${expected} got=${a}`);
    }
  }
  return {errors};
}
