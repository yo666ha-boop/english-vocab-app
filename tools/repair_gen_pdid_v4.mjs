#!/usr/bin/env node
import fs from 'node:fs';

const [,, inputPath, outputPath=inputPath]=process.argv;
if(!inputPath){console.error('Usage: node tools/repair_gen_pdid_v4.mjs <html> [output.html]');process.exit(2);}
let html=fs.readFileSync(inputPath,'utf8');
for(const marker of ['id="qb-data"','GEN-PDID-']) if(!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re); if(!m) throw new Error('missing qb-data');
const qb=JSON.parse(m[1]); if(!Array.isArray(qb)||qb.length<10000) throw new Error(`NOT CANONICAL: qb count=${qb.length}`);

const changes=[];
for(const x of qb){
  if(!String(x.id||'').startsWith('GEN-PDID-') || x.category!=='過去の疑問文・否定文') continue;
  const before={q:String(x.q||''),a:String(x.a||'')};
  repair(x);
  if(x.q!==before.q||x.a!==before.a) changes.push({id:x.id,q_before:before.q,q_after:x.q,a_before:before.a,a_after:x.a});
}
const audit=auditBank(qb);
if(audit.errors.length){console.error(JSON.stringify({status:'FAILED_GEN_PDID_V4',changed:changes.length,errors:audit.errors.slice(0,200)},null,2));process.exit(3);}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
fs.writeFileSync(outputPath+'.gen-pdid-v4.audit.json',JSON.stringify({status:'OK',changed:changes.length,changes,audit},null,2),'utf8');
console.log(JSON.stringify({status:'OK',changed:changes.length,audit},null,2));

function repair(x){
  const q=String(x.q||'');
  if(x.type!=='変形') return;
  if(/を疑問文にしなさい。?$/.test(q)){
    const src=sourceOf(q,'を疑問文にしなさい。');
    const ans=makeQuestion(src);
    if(ans){x.q=`${normalizeSentenceSubject(src)}. を疑問文にしなさい。`;x.a=ans;}
    return;
  }
  if(/を否定文にしなさい。?$/.test(q)){
    const src=sourceOf(q,'を否定文にしなさい。');
    const ans=makeNegative(src);
    if(ans){x.q=`${normalizeSentenceSubject(src)}. を否定文にしなさい。`;x.a=ans;}
  }
}
function sourceOf(q,suffix){return String(q).replace(new RegExp(`\\s*${escapeRegExp(suffix)}?$`),'').trim().replace(/[.。]$/,'');}
function escapeRegExp(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function makeQuestion(src){
  const p=parseSubjectVerb(src);if(!p)return null;
  return `Did ${questionSubject(p.subject)} ${pastToBase(p.verb)}${p.tail?' '+p.tail:''}?`;
}
function makeNegative(src){
  const p=parseSubjectVerb(src);if(!p)return null;
  return `${p.subject} did not ${pastToBase(p.verb)}${p.tail?' '+p.tail:''}.`;
}
function parseSubjectVerb(src){
  const s=normalizeSentenceSubject(src);
  const subjects=['The student','The teacher','My mother','My father','My brother','My sister','My friend','Ken and Emi','Tom and Ken','I','You','We','They','He','She','Ken','Mika','Emi','Tom','Yuki','Takumi'].sort((a,b)=>b.length-a.length);
  let subject=null,rest=null;
  for(const sub of subjects){if(s.startsWith(sub+' ')){subject=sub;rest=s.slice(sub.length+1);break;}}
  if(!subject){const mm=s.match(/^([A-Z][A-Za-z]+)\s+(.+)$/);if(!mm)return null;subject=mm[1];rest=mm[2];}
  const vm=rest.match(/^([A-Za-z]+)\b\s*(.*)$/);if(!vm)return null;
  return {subject,verb:vm[1],tail:vm[2].trim()};
}
function normalizeSentenceSubject(src){
  return String(src||'').trim().replace(/^(i)\b/i,'I').replace(/^(you)\b/i,'You').replace(/^(we)\b/i,'We').replace(/^(they)\b/i,'They').replace(/^(he)\b/i,'He').replace(/^(she)\b/i,'She');
}
function questionSubject(s){if(s==='I')return'I';return({You:'you',We:'we',They:'they',He:'he',She:'she'})[s]||s;}
function pastToBase(v){
  const x=String(v||'').toLowerCase();
  const irr={went:'go',came:'come',saw:'see',made:'make',took:'take',had:'have',did:'do',got:'get',ate:'eat',wrote:'write',bought:'buy',spoke:'speak',ran:'run',gave:'give',knew:'know',thought:'think',found:'find',lost:'lose',read:'read'};
  if(irr[x])return irr[x];
  const known={played:'play',watched:'watch',studied:'study',cleaned:'clean',listened:'listen',helped:'help',used:'use',cooked:'cook',visited:'visit',worked:'work',lived:'live',liked:'like',wanted:'want',needed:'need',started:'start',finished:'finish',called:'call',joined:'join',practiced:'practice',danced:'dance',closed:'close'};
  if(known[x])return known[x];
  if(/ied$/.test(x))return x.replace(/ied$/,'y');
  if(/ed$/.test(x)){
    let b=x.slice(0,-2);
    if(/([bcdfghjklmnpqrstvwxyz])\1$/.test(b))b=b.slice(0,-1);
    if(/(?:us|iz|at)$/.test(b)) return b+'e';
    return b;
  }
  return x;
}
function auditBank(qb){
  const errors=[];
  for(const x of qb){
    if(!String(x.id||'').startsWith('GEN-PDID-')||x.category!=='過去の疑問文・否定文'||x.type!=='変形')continue;
    const q=String(x.q||''),a=String(x.a||'');
    if(/を疑問文にしなさい/.test(q)){
      const src=sourceOf(q,'を疑問文にしなさい。');const expected=makeQuestion(src);
      if(expected&&a!==expected)errors.push(`${x.id}:question mismatch expected=${expected} got=${a}`);
      if(/^(?:Do|Does)\b/.test(a))errors.push(`${x.id}:present auxiliary in past question:${a}`);
      if(/^Did\s+(?:you|You)\b/.test(a)&&/^(?:I|We)\b/.test(src))errors.push(`${x.id}:subject changed to you:${a}`);
      if(/^Did\s+.+\s+(?:went|came|saw|made|took|had|did|got|ate|wrote|bought)\b/i.test(a))errors.push(`${x.id}:past form after Did:${a}`);
    }
    if(/を否定文にしなさい/.test(q)){
      const src=sourceOf(q,'を否定文にしなさい。');const expected=makeNegative(src);
      if(expected&&a!==expected)errors.push(`${x.id}:negative mismatch expected=${expected} got=${a}`);
      if(/\bdid not\s+(?:went|came|saw|made|took|had|did|got|ate|wrote|bought)\b/i.test(a))errors.push(`${x.id}:past form after did not:${a}`);
    }
  }
  return {errors};
}
