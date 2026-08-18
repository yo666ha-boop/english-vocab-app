#!/usr/bin/env node
import fs from 'node:fs';

const [,, inputPath, outputPath=inputPath]=process.argv;
if(!inputPath){console.error('Usage: node tools/repair_m2_past_v4.mjs <html> [output.html]');process.exit(2);}
let html=fs.readFileSync(inputPath,'utf8');
for(const marker of ['id="qb-data"','M2-PAST-']) if(!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re);if(!m)throw new Error('missing qb-data');
const qb=JSON.parse(m[1]);if(!Array.isArray(qb)||qb.length<10000)throw new Error(`NOT CANONICAL: qb count=${qb.length}`);

const changes=[];
for(const x of qb){
  if(!String(x.id||'').startsWith('M2-PAST-')||x.type!=='変形')continue;
  if(!['一般動詞の過去形','過去の疑問文・否定文'].includes(String(x.category||'')))continue;
  const before={q:String(x.q||''),a:String(x.a||'')};
  repair(x);
  if(x.q!==before.q||x.a!==before.a)changes.push({id:x.id,category:x.category,q_before:before.q,q_after:x.q,a_before:before.a,a_after:x.a});
}
const audit=auditBank(qb);
if(audit.errors.length){console.error(JSON.stringify({status:'FAILED_M2_PAST_V4',changed:changes.length,errors:audit.errors.slice(0,300)},null,2));process.exit(3);}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
fs.writeFileSync(outputPath+'.m2-past-v4.audit.json',JSON.stringify({status:'OK',changed:changes.length,changes,audit},null,2),'utf8');
console.log(JSON.stringify({status:'OK',changed:changes.length,audit},null,2));

function repair(x){
  const q=String(x.q||'');
  if(x.category==='一般動詞の過去形'&&/を\s*yesterday\s*を使って過去の文にしなさい。?$/.test(q)){
    const src=q.replace(/\s*を\s*yesterday\s*を使って過去の文にしなさい。?$/,'').trim().replace(/[.。]$/,'');
    const ans=makePastSentence(src);
    if(ans){x.q=`${normalizeSubject(src)}. を yesterday を使って過去の文にしなさい。`;x.a=ans;}
    return;
  }
  if(x.category==='過去の疑問文・否定文'&&/を疑問文にしなさい。?$/.test(q)){
    const src=sourceOf(q,'を疑問文にしなさい。');const ans=makePastQuestion(src);
    if(ans){x.q=`${normalizeSubject(src)}. を疑問文にしなさい。`;x.a=ans;}
    return;
  }
  if(x.category==='過去の疑問文・否定文'&&/を否定文にしなさい。?$/.test(q)){
    const src=sourceOf(q,'を否定文にしなさい。');const ans=makePastNegative(src);
    if(ans){x.q=`${normalizeSubject(src)}. を否定文にしなさい。`;x.a=ans;}
  }
}
function sourceOf(q,suffix){return String(q).replace(new RegExp(`\\s*${escapeRegExp(suffix)}?$`),'').trim().replace(/[.。]$/,'');}
function escapeRegExp(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function parse(src){
  const s=normalizeSubject(src);
  const subjects=['The student','The teacher','My mother','My father','My brother','My sister','My friend','Ken and Emi','Tom and Ken','I','You','We','They','He','She','Ken','Mika','Emi','Tom','Yuki','Takumi'].sort((a,b)=>b.length-a.length);
  let subject=null,rest=null;
  for(const sub of subjects)if(s.startsWith(sub+' ')){subject=sub;rest=s.slice(sub.length+1);break;}
  if(!subject){const mm=s.match(/^([A-Z][A-Za-z]+)\s+(.+)$/);if(!mm)return null;subject=mm[1];rest=mm[2];}
  const vm=rest.match(/^([A-Za-z]+)\b\s*(.*)$/);if(!vm)return null;
  return {subject,verb:vm[1],tail:vm[2].trim()};
}
function normalizeSubject(s){return String(s||'').trim().replace(/^(i)\b/i,'I').replace(/^(you)\b/i,'You').replace(/^(we)\b/i,'We').replace(/^(they)\b/i,'They').replace(/^(he)\b/i,'He').replace(/^(she)\b/i,'She');}
function questionSubject(s){if(s==='I')return'I';return({You:'you',We:'we',They:'they',He:'he',She:'she'})[s]||s;}
function makePastSentence(src){
  const p=parse(src);if(!p)return null;
  let tail=p.tail.replace(/\s+yesterday$/i,'').trim();
  return `${p.subject} ${toPast(toBasePresent(p.verb))}${tail?' '+tail:''} yesterday.`;
}
function makePastQuestion(src){
  const p=parse(src);if(!p)return null;
  return `Did ${questionSubject(p.subject)} ${pastToBase(p.verb)}${p.tail?' '+p.tail:''}?`;
}
function makePastNegative(src){
  const p=parse(src);if(!p)return null;
  return `${p.subject} did not ${pastToBase(p.verb)}${p.tail?' '+p.tail:''}.`;
}
function toBasePresent(v){
  const x=String(v||'').toLowerCase(),irr={has:'have',does:'do',goes:'go'};if(irr[x])return irr[x];
  if(/ies$/.test(x))return x.replace(/ies$/,'y');
  if(/(?:ches|shes|sses|xes|zes|oes)$/.test(x))return x.replace(/es$/,'');
  if(/s$/.test(x)&&!/ss$/.test(x))return x.slice(0,-1);return x;
}
function toPast(base){
  const b=String(base||'').toLowerCase();
  const irr={go:'went',come:'came',see:'saw',make:'made',take:'took',have:'had',do:'did',get:'got',eat:'ate',write:'wrote',buy:'bought',speak:'spoke',run:'ran',give:'gave',know:'knew',think:'thought',find:'found',lose:'lost',read:'read'};
  if(irr[b])return irr[b];
  if(/e$/.test(b))return b+'d';
  if(/[^aeiou]y$/.test(b))return b.slice(0,-1)+'ied';
  if(/^[a-z]*[aeiou][bcdfghjklmnpqrstvwxyz]$/.test(b)&&!/[wxy]$/.test(b))return b+b.at(-1)+'ed';
  return b+'ed';
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
    if(!String(x.id||'').startsWith('M2-PAST-')||x.type!=='変形'||!['一般動詞の過去形','過去の疑問文・否定文'].includes(String(x.category||'')))continue;
    const q=String(x.q||''),a=String(x.a||'');
    if(x.category==='一般動詞の過去形'&&/を\s*yesterday\s*を使って過去の文にしなさい/.test(q)){
      const src=q.replace(/\s*を\s*yesterday\s*を使って過去の文にしなさい。?$/,'').trim().replace(/[.。]$/,'');const expected=makePastSentence(src);
      if(expected&&a!==expected)errors.push(`${x.id}:past sentence mismatch expected=${expected} got=${a}`);
    }
    if(x.category==='過去の疑問文・否定文'&&/を疑問文にしなさい/.test(q)){
      const src=sourceOf(q,'を疑問文にしなさい。');const expected=makePastQuestion(src);
      if(expected&&a!==expected)errors.push(`${x.id}:question mismatch expected=${expected} got=${a}`);
      if(/^(?:Do|Does)\b/.test(a))errors.push(`${x.id}:present auxiliary remains:${a}`);
      if(/^Did\s+(?:you|You)\b/.test(a)&&/^(?:I|We)\b/.test(src))errors.push(`${x.id}:subject changed to you:${a}`);
      if(/^Did\s+.+\s+(?:went|came|saw|made|took|had|did|got|ate|wrote|bought|used)\b/i.test(a))errors.push(`${x.id}:past form after Did:${a}`);
    }
    if(x.category==='過去の疑問文・否定文'&&/を否定文にしなさい/.test(q)){
      const src=sourceOf(q,'を否定文にしなさい。');const expected=makePastNegative(src);
      if(expected&&a!==expected)errors.push(`${x.id}:negative mismatch expected=${expected} got=${a}`);
    }
  }
  return {errors};
}
