#!/usr/bin/env node
import fs from 'node:fs';

const [,, inputPath, outputPath=inputPath]=process.argv;
if(!inputPath){
  console.error('Usage: node tools/repair_relative_pronouns_v4.mjs <html> [output.html]');
  process.exit(2);
}
let html=fs.readFileSync(inputPath,'utf8');
for(const marker of ['id="qb-data"','M3C-','M3N-']) if(!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re); if(!m) throw new Error('missing qb-data');
const qb=JSON.parse(m[1]); if(!Array.isArray(qb)||qb.length<10000) throw new Error(`NOT CANONICAL: qb count=${qb.length}`);

const changes=[];
for(const x of qb){
  if(x?.subject!=='英語'||x?.grade!=='中3'||x?.category!=='関係代名詞') continue;
  const before={q:String(x.q||''),a:String(x.a||'')};
  repairRelative(x);
  if(x.q!==before.q||x.a!==before.a) changes.push({id:x.id,q_before:before.q,q_after:x.q,a_before:before.a,a_after:x.a});
}

const audit=auditBank(qb);
if(audit.errors.length){
  console.error(JSON.stringify({status:'FAILED_RELATIVE_PRONOUN_V4',changed:changes.length,errors:audit.errors.slice(0,200)},null,2));
  process.exit(3);
}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
fs.writeFileSync(outputPath+'.relative-pronoun-v4.audit.json',JSON.stringify({status:'OK',changed:changes.length,changes,audit},null,2),'utf8');
console.log(JSON.stringify({status:'OK',changed:changes.length,audit},null,2));

function repairRelative(x){
  let q=String(x.q||''), a=String(x.a||'');

  if(String(x.id||'').startsWith('M3C-')){
    if(/^The dog\s*\(/i.test(q)) q=q.replace(/^The dog\b/i,'The boy');
    q=q.replace(/^(This is the (?:chair|picture|bag|bike)\s*\([^)]*\)\s*)you read last week\./i,'$1you used last week.');
    q=q.replace(/^(This is the (?:chair|bike)\s*\([^)]*\)\s*)is on the desk\./i,'$1is in this room.');
  }

  if(String(x.id||'').startsWith('M3C-') && x.type==='空所補充'){
    if(/^The dog\s*\(/i.test(q)) q=q.replace(/^The dog\b/i,'The boy');
    q=q.replace(/^(This is the (?:chair|picture|bag|bike)\s*\([^)]*\)\s*)you read last week\./i,'$1you used last week.');
    q=q.replace(/^(This is the (?:chair|bike)\s*\([^)]*\)\s*)is on the desk\./i,'$1is in this room.');

    const antecedent=detectAntecedent(q);
    if(antecedent==='person') a='who';
    else if(antecedent==='thing') a='which';
    if(/\(\s*\)/.test(q) && !/who\s*\/\s*which/i.test(q)){
      q=q.replace(/\s*(?:空所に入る[^。]*。)?\s*$/,'').trim();
      q += ' 空所に入る語を who / which から選びなさい。';
    }
  }

  if(String(x.id||'').startsWith('M3N-') && x.type==='空所補充' && /\(\s*\)/.test(q)){
    const antecedent=detectAntecedent(q);
    if(antecedent==='person') a='who';
    else if(antecedent==='thing') a='which';
    q=q.replace(/\s*空所に入る最も適切な語を書きなさい。?\s*$/,'').trim();
    if(!/who\s*\/\s*which/i.test(q)) q += ' 空所に入る語を who / which から選びなさい。';
  }

  if(String(x.id||'').startsWith('M3N-') && /『[^』]*』/.test(q)){
    const jp={
      bike:'自転車',book:'本',bag:'かばん',picture:'写真',camera:'カメラ',chair:'いす',
      boy:'少年',girl:'少女',teacher:'先生',student:'生徒',dog:'犬',man:'男性',woman:'女性'
    };
    q=q.replace(/『([^』]*)』/g,(_,inside)=>{
      let s=inside;
      for(const [en,ja] of Object.entries(jp)) s=s.replace(new RegExp(`\\b${en}\\b`,'gi'),ja);
      return `『${s}』`;
    });
  }

  x.q=q; x.a=a;
}

function detectAntecedent(q){
  if(/\b(?:boy|girl|man|woman|teacher|student|person)\s*\(/i.test(q)) return 'person';
  if(/\b(?:book|chair|picture|bag|bike|camera|dog)\s*\(/i.test(q)) return 'thing';
  return 'unknown';
}

function auditBank(qb){
  const errors=[];
  for(const x of qb){
    if(x?.subject!=='英語'||x?.grade!=='中3'||x?.category!=='関係代名詞') continue;
    const id=String(x.id||''),q=String(x.q||''),a=String(x.a||'');
    if(x.type==='空所補充'&&/\(\s*\)/.test(q)){
      if(!/who\s*\/\s*which/i.test(q)) errors.push(`${id}:ambiguous open relative-pronoun blank`);
      if(!/^(?:who|which)$/i.test(a)) errors.push(`${id}:blank answer is not who/which: ${a}`);
      const ant=detectAntecedent(q);
      if(ant==='person'&&!/^who$/i.test(a)) errors.push(`${id}:person antecedent without who`);
      if(ant==='thing'&&!/^which$/i.test(a)) errors.push(`${id}:thing antecedent without which`);
    }
    if(/^The dog\s*\([^)]*\)/i.test(q)&&/^who$/i.test(a)) errors.push(`${id}:dog treated as person with who`);
    if(/^This is the (?:chair|picture|bag|bike)\s*\([^)]*\)\s*you read last week\./i.test(q)) errors.push(`${id}:non-readable object uses read`);
    if(/^This is the (?:chair|bike)\s*\([^)]*\)\s*is on the desk\./i.test(q)) errors.push(`${id}:large object on desk`);
    if(/『[^』]*(?:\bbike\b|\bbook\b|\bbag\b|\bpicture\b|\bcamera\b|\bchair\b|\bboy\b|\bgirl\b|\bteacher\b|\bstudent\b|\bdog\b)[^』]*』/i.test(q)) errors.push(`${id}:English noun leaked into Japanese quotation`);
  }
  return {errors};
}
