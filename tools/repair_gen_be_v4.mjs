#!/usr/bin/env node
import fs from 'node:fs';

const [,, inputPath, outputPath=inputPath]=process.argv;
if(!inputPath){console.error('Usage: node tools/repair_gen_be_v4.mjs <html> [output.html]');process.exit(2);}
let html=fs.readFileSync(inputPath,'utf8');
for(const marker of ['id="qb-data"','GEN-BE-']) if(!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re); if(!m) throw new Error('missing qb-data');
const qb=JSON.parse(m[1]); if(!Array.isArray(qb)||qb.length<10000) throw new Error(`NOT CANONICAL: qb count=${qb.length}`);

const changes=[];
for(const x of qb){
  if(!String(x.id||'').startsWith('GEN-BE-') || x.category!=='be動詞') continue;
  const before={q:String(x.q||''),a:String(x.a||'')};
  repair(x);
  if(x.q!==before.q||x.a!==before.a) changes.push({id:x.id,q_before:before.q,q_after:x.q,a_before:before.a,a_after:x.a});
}

const audit=auditBank(qb);
if(audit.errors.length){console.error(JSON.stringify({status:'FAILED_GEN_BE_V4',changed:changes.length,errors:audit.errors.slice(0,200)},null,2));process.exit(3);}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
fs.writeFileSync(outputPath+'.gen-be-v4.audit.json',JSON.stringify({status:'OK',changed:changes.length,changes,audit},null,2),'utf8');
console.log(JSON.stringify({status:'OK',changed:changes.length,audit},null,2));

function repair(x){
  let q=String(x.q||''),a=String(x.a||'');

  if(x.type==='変形' && /を疑問文にしなさい。?$/.test(q)){
    const src=q.replace(/\s*を疑問文にしなさい。?$/,'').trim().replace(/[.。]$/,'');
    const ans=makeBeQuestion(src);
    if(ans){
      q=`${normalizeSentenceSubject(src)}. を疑問文にしなさい。`;
      a=ans;
    }
  }

  if(x.type==='空所補充' && /^(Am|Is|Are)$/i.test(a)) a=a.toLowerCase();

  if(x.type==='答え方'){
    const p=parseYesPrompt(q);
    if(p){
      // "Am I ...?" is an unnatural self-check item for this drill. Recast it
      // as the ordinary second-person question so the learner can answer "Yes, I am.".
      if(p.aux==='Am' && p.subject==='I'){
        q=`Are you ${p.predicate}? に Yes で答えなさい。`;
        a='Yes, I am.';
      }else{
        const expected=yesAnswer(p.aux,p.subject);
        if(expected) a=expected;
        q=normalizeQuestionPronounCase(q);
      }
    }
  }

  q=normalizeQuestionPronounCase(q);
  a=normalizeQuestionPronounCase(a);
  x.q=q; x.a=a;
}

function normalizeSentenceSubject(src){
  const s=String(src||'').trim();
  return s.replace(/^(i)\b/i,'I').replace(/^(you)\b/i,'You').replace(/^(we)\b/i,'We').replace(/^(they)\b/i,'They').replace(/^(he)\b/i,'He').replace(/^(she)\b/i,'She');
}
function normalizeQuestionPronounCase(s){
  return String(s||'').replace(/^(Am|Is|Are)\s+(You|We|They|He|She)\b/,(_,aux,p)=>`${aux} ${p.toLowerCase()}`);
}
function makeBeQuestion(src){
  const mm=String(src||'').trim().match(/^(.+?)\s+(am|is|are)\s+(.+)$/i);
  if(!mm) return null;
  const subject=canonicalSubject(mm[1]);
  const predicate=mm[3].trim();
  const aux=beFor(subject);
  return `${cap(aux)} ${questionSubject(subject)} ${predicate}?`;
}
function canonicalSubject(s){
  const t=String(s||'').trim().replace(/\s+/g,' ');
  const p={i:'I',you:'You',we:'We',they:'They',he:'He',she:'She'}[t.toLowerCase()];
  return p||t;
}
function questionSubject(s){
  if(s==='I') return 'I';
  return ({You:'you',We:'we',They:'they',He:'he',She:'she'})[s]||s;
}
function beFor(subject){
  if(subject==='I') return 'am';
  if(['You','We','They'].includes(subject)||/\band\b/i.test(subject)) return 'are';
  return 'is';
}
function cap(s){return s[0].toUpperCase()+s.slice(1);}
function parseYesPrompt(q){
  const mm=String(q||'').match(/^(Am|Is|Are)\s+(.+?)\s+(.+?)\?\s*に Yes で答えなさい。?$/);
  if(!mm) return null;
  return {aux:mm[1],subject:canonicalSubject(mm[2]),predicate:mm[3].trim()};
}
function yesAnswer(aux,subject){
  if(subject==='You') return 'Yes, I am.';
  if(subject==='I') return 'Yes, you are.';
  if(subject==='We') return 'Yes, we are.';
  if(subject==='They') return 'Yes, they are.';
  if(subject==='He') return 'Yes, he is.';
  if(subject==='She') return 'Yes, she is.';
  return null;
}

function auditBank(qb){
  const errors=[];
  for(const x of qb){
    if(!String(x.id||'').startsWith('GEN-BE-') || x.category!=='be動詞') continue;
    const q=String(x.q||''),a=String(x.a||'');
    if(x.type==='空所補充' && /^(Am|Is|Are)$/.test(a)) errors.push(`${x.id}:capitalized be blank:${a}`);
    if(/^(?:Am|Is|Are) (?:You|We|They|He|She)\b/.test(a)) errors.push(`${x.id}:capitalized question pronoun in answer:${a}`);
    if(/^(?:Am|Is|Are) (?:You|We|They|He|She)\b/.test(q)) errors.push(`${x.id}:capitalized question pronoun in prompt:${q}`);
    if(x.type==='変形' && /を疑問文にしなさい/.test(q)){
      const src=q.replace(/\s*を疑問文にしなさい。?$/,'').trim().replace(/[.。]$/,'');
      const expected=makeBeQuestion(src);
      if(expected && a!==expected) errors.push(`${x.id}:subject/agreement mismatch expected=${expected} got=${a}`);
    }
    if(x.type==='答え方'){
      const p=parseYesPrompt(q);
      if(p){
        const expected=yesAnswer(p.aux,p.subject);
        if(expected && a!==expected) errors.push(`${x.id}:yes-answer mismatch expected=${expected} got=${a}`);
      }
    }
  }
  return {errors};
}
