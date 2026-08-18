#!/usr/bin/env node
import fs from 'node:fs';

const [,, inputPath, outputPath=inputPath]=process.argv;
if(!inputPath){
  console.error('Usage: node tools/repair_m2_infinitive_bank_v4.mjs <html> [output.html]');
  process.exit(2);
}
let html=fs.readFileSync(inputPath,'utf8');
for(const marker of ['id="qb-data"','M2-INF2-']) if(!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re); if(!m) throw new Error('missing qb-data');
const qb=JSON.parse(m[1]); if(!Array.isArray(qb)||qb.length<10000) throw new Error(`NOT CANONICAL: qb count=${qb.length}`);

const changes=[];
for(const x of qb){
  if(!String(x.id||'').startsWith('M2-INF2-') || x.category!=='不定詞') continue;
  const before={q:String(x.q||''),a:String(x.a||'')};
  repair(x);
  if(x.q!==before.q||x.a!==before.a) changes.push({id:x.id,q_before:before.q,q_after:x.q,a_before:before.a,a_after:x.a});
}

const audit=auditBank(qb);
if(audit.errors.length){
  console.error(JSON.stringify({status:'FAILED_M2_INFINITIVE_BANK_V4',changed:changes.length,errors:audit.errors},null,2));
  process.exit(3);
}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
fs.writeFileSync(outputPath+'.m2-infinitive-bank-v4.audit.json',JSON.stringify({status:'OK',changed:changes.length,changes,audit},null,2),'utf8');
console.log(JSON.stringify({status:'OK',changed:changes.length,audit},null,2));

function repair(x){
  let q=String(x.q||''),a=String(x.a||'');

  // The generated bank frequently produced "... to ( ) verb" with answer "To".
  // Filling the blank makes "to to".  The intended target is the infinitive marker,
  // so move the blank into the position occupied by the existing "to".
  if(x.type==='空所補充' && /^to$/i.test(a)){
    const moved=q.replace(/\bto\s*\(\s*\)\s*(?=[A-Za-z])/i,'(      ) ');
    q=moved;
    a='to';
    q=normalizeLeadingInfinitiveVerb(q);
  }

  // Correct answers must not preserve generated third-person singular errors such
  // as "Takumi need to ..." or "Mika need to ...".
  a=normalizeLeadingInfinitiveVerb(a);

  x.q=q;
  x.a=a;
}

function normalizeLeadingInfinitiveVerb(s){
  const text=String(s||'');
  const m=text.match(/^(.+?)\s+(want|wants|need|needs|like|likes)\b([\s\S]*)$/i);
  if(!m) return text;
  const subject=clean(m[1]);
  const base=toBase(m[2]);
  const verb=isThirdSingular(subject)?toThird(base):base;
  return `${subject} ${verb}${m[3]}`;
}

function clean(s){return String(s||'').trim().replace(/\s+/g,' ');}
function toBase(v){const x=String(v||'').toLowerCase();return x.replace(/s$/,'');}
function toThird(v){return `${v}s`;}
function isThirdSingular(subject){
  const s=clean(subject);
  if(/^(?:I|You|We|They)$/i.test(s)) return false;
  if(/\band\b/i.test(s)) return false;
  if(/^(?:My friends|The students|The boys|The girls)$/i.test(s)) return false;
  return true;
}

function hasBadAgreement(s){
  const m=String(s||'').match(/^(.+?)\s+(want|wants|need|needs|like|likes)\b/i);
  if(!m) return false;
  const subject=clean(m[1]),verb=String(m[2]).toLowerCase(),base=toBase(verb);
  const expected=isThirdSingular(subject)?toThird(base):base;
  return verb!==expected;
}

function auditBank(qb){
  const errors=[];
  for(const x of qb){
    if(!String(x.id||'').startsWith('M2-INF2-') || x.category!=='不定詞') continue;
    const q=String(x.q||''),a=String(x.a||'');
    if(x.type==='空所補充'){
      if(/^To$/.test(a)) errors.push(`${x.id}:capitalized infinitive-marker answer`);
      if(/^to$/i.test(a) && /\bto\s*\(\s*\)\s*(?=[A-Za-z])/i.test(q)) errors.push(`${x.id}:double-to blank remains`);
      const formed=q.replace(/\(\s*\)/,a);
      if(/\bto\s+to\b/i.test(formed)) errors.push(`${x.id}:formed sentence contains to to`);
      if(hasBadAgreement(formed)) errors.push(`${x.id}:bad agreement in formed blank sentence`);
    }
    if(hasBadAgreement(a)) errors.push(`${x.id}:bad agreement in answer: ${a}`);
  }
  return {errors};
}
