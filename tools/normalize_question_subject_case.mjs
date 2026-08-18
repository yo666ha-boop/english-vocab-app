#!/usr/bin/env node
import fs from 'node:fs';
const [,, inputPath, outputPath=inputPath]=process.argv;
if(!inputPath){console.error('Usage: node tools/normalize_question_subject_case.mjs <html> [output.html]');process.exit(2);}
let html=fs.readFileSync(inputPath,'utf8');
for(const m of ['id="qb-data"','M3N-001','M3N-002']) if(!html.includes(m)) throw new Error(`NOT CANONICAL: missing ${m}`);
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re); if(!m) throw new Error('missing qb-data');
const qb=JSON.parse(m[1]); if(!Array.isArray(qb)||qb.length<10000) throw new Error(`NOT CANONICAL: qb count=${qb.length}`);
let changed=0;
for(const x of qb){
  if(x.subject!=='英語') continue;
  const old=String(x.a||'');
  x.a=old.replace(/^(Am|Is|Are|Was|Were|Do|Does|Did|Have|Has|Had|Can|Will|Would|Should|Must) My\b/,(_,aux)=>`${aux} my`);
  if(x.a!==old) changed++;
}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
console.log(JSON.stringify({status:'OK',changed}));
