#!/usr/bin/env node
import fs from 'node:fs';

const [,,inputPath,outputPath=inputPath]=process.argv;
if(!inputPath){console.error('Usage: node tools/repair_present_perfect_v3.mjs <html> [output.html]');process.exit(2);}
let html=fs.readFileSync(inputPath,'utf8');
for(const marker of ['id="qb-data"','現在完了形']) if(!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re);if(!m)throw new Error('missing qb-data');
const qb=JSON.parse(m[1]);if(!Array.isArray(qb)||qb.length<10000)throw new Error(`NOT CANONICAL: qb count=${qb.length}`);
let changed=0;
for(const x of qb){
  if(x.subject!=='英語'||!String(x.category||'').startsWith('現在完了形'))continue;
  const oldQ=String(x.q||''),oldA=String(x.a||'');
  let q=oldQ;
  const suffix='を疑問文にしなさい。';
  if(q.endsWith(suffix)){
    let src=q.slice(0,-suffix.length).trim().replace(/[.。]$/,'');
    src=fixGeneratedPossessive(src);
    const ans=makePresentPerfectQuestion(src);
    if(ans){q=`${src}. ${suffix}`;x.a=ans;}
  }else{
    q=fixGeneratedPossessive(q);
  }
  x.q=q;
  if(x.q!==oldQ||x.a!==oldA)changed++;
}
const errors=[];
for(const x of qb){
  if(x.subject!=='英語'||!String(x.category||'').startsWith('現在完了形'))continue;
  const q=String(x.q||''),a=String(x.a||'');
  if(/^You have (?:finished my homework|lost my key)\b/.test(q))errors.push(`${x.id}:You possessive`);
  if(/^We have (?:finished my homework|lost my key)\b/.test(q))errors.push(`${x.id}:We possessive`);
  if(/^They have (?:finished my homework|lost my key)\b/.test(q))errors.push(`${x.id}:They possessive`);
  if(/^He has (?:finished my homework|lost my key)\b/.test(q))errors.push(`${x.id}:He possessive`);
  if(/^She has (?:finished my homework|lost my key)\b/.test(q))errors.push(`${x.id}:She possessive`);
  if(/^(?:Do|Does)\s+.+\s+have\s+(?:finished|visited|been|lost|lived|studied)/i.test(a))errors.push(`${x.id}:wrong auxiliary ${a}`);
  if(x.type==='変形'&&/を疑問文にしなさい。$/.test(q)){
    const src=q.replace(/\s*を疑問文にしなさい。$/,'').replace(/[.。]$/,'');
    const want=makePresentPerfectQuestion(src);
    if(want&&a!==want)errors.push(`${x.id}:question mismatch expected ${want} got ${a}`);
  }
}
if(errors.length){console.error(JSON.stringify({status:'FAILED_PRESENT_PERFECT_V3',errors},null,2));process.exit(3);}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
console.log(JSON.stringify({status:'OK',changed}));

function fixGeneratedPossessive(src){
  const rules=[
    [/^You have finished my homework\b/,'You have finished your homework'],
    [/^You have lost my key\b/,'You have lost your key'],
    [/^We have finished my homework\b/,'We have finished our homework'],
    [/^We have lost my key\b/,'We have lost our key'],
    [/^They have finished my homework\b/,'They have finished their homework'],
    [/^They have lost my key\b/,'They have lost their key'],
    [/^He has finished my homework\b/,'He has finished his homework'],
    [/^He has lost my key\b/,'He has lost his key'],
    [/^She has finished my homework\b/,'She has finished her homework'],
    [/^She has lost my key\b/,'She has lost her key']
  ];
  let s=String(src);
  for(const [r,to] of rules)s=s.replace(r,to);
  return s;
}
function makePresentPerfectQuestion(src){
  const s=String(src).trim().replace(/[.。]$/,'');
  let m=s.match(/^(I|You|We|They|[A-Z][A-Za-z]+) have (.+)$/);
  if(m)return `Have ${questionSubject(m[1])} ${m[2]}?`;
  m=s.match(/^(He|She|[A-Z][A-Za-z]+) has (.+)$/);
  if(m)return `Has ${questionSubject(m[1])} ${m[2]}?`;
  return null;
}
function questionSubject(s){if(s==='I')return'I';return({You:'you',We:'we',They:'they',He:'he',She:'she'})[s]||s;}
