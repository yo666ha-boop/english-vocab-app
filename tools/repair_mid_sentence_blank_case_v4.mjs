#!/usr/bin/env node
import fs from 'node:fs';

const [,,inputPath,outputPath=inputPath]=process.argv;
if(!inputPath){
  console.error('Usage: node tools/repair_mid_sentence_blank_case_v4.mjs <html> [output.html]');
  process.exit(2);
}
let html=fs.readFileSync(inputPath,'utf8');
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re); if(!m) throw new Error('NOT CANONICAL: missing qb-data');
const qb=JSON.parse(m[1]); if(!Array.isArray(qb)||qb.length<10000) throw new Error(`NOT CANONICAL: qb count=${qb.length}`);

const lowerable=new Set([
 'am','is','are','was','were','do','does','did','have','has','can','will','must','should','may','to','who','which','that',
 'play','plays','study','studies','like','likes','love','loves','want','wants','need','needs','read','reads','use','uses',
 'go','goes','come','comes','visit','visits','practice','practices','speak','speaks','finish','finishes','enjoy','enjoys',
 'watch','watches','help','helps','make','makes','take','takes','live','lives','work','works','run','runs','swim','swims',
 'write','writes','eat','eats','drink','drinks','buy','buys','call','calls','join','joins','listen','listens','start','starts','stop','stops'
]);
const changes=[];
for(const x of qb){
  if(x?.subject!=='英語'||x?.type!=='空所補充') continue;
  const q=String(x.q||''),a=String(x.a||'').trim();
  if(!/^[A-Z][A-Za-z]*$/.test(a)) continue;
  if(!lowerable.has(a.toLowerCase())) continue;
  const bm=q.match(/\(\s*\)/); if(!bm) continue;
  const prefix=q.slice(0,bm.index).trimEnd();
  if(!prefix) continue;
  // If punctuation/instruction immediately precedes the blank, it may be the
  // first word of an embedded English sentence and capitalization is valid.
  if(/[。.!?！？:：『「]$/.test(prefix)) continue;
  const before=a;
  x.a=a.toLowerCase();
  changes.push({id:x.id,q,a_before:before,a_after:x.a});
}

const errors=[];
for(const x of qb){
  if(x?.subject!=='英語'||x?.type!=='空所補充') continue;
  const q=String(x.q||''),a=String(x.a||'').trim();
  const bm=q.match(/\(\s*\)/); if(!bm) continue;
  const prefix=q.slice(0,bm.index).trimEnd();
  if(!prefix||/[。.!?！？:：『「]$/.test(prefix)) continue;
  if(/^[A-Z][A-Za-z]*$/.test(a)&&lowerable.has(a.toLowerCase())) errors.push(`${x.id}:capitalized mid-sentence blank ${a}`);
}
if(errors.length){
  console.error(JSON.stringify({status:'FAILED_MID_SENTENCE_BLANK_CASE_V4',errors:errors.slice(0,200)},null,2));
  process.exit(3);
}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
fs.writeFileSync(outputPath+'.mid-sentence-blank-case-v4.audit.json',JSON.stringify({status:'OK',changed:changes.length,changes,errors:[]},null,2),'utf8');
console.log(JSON.stringify({status:'OK',changed:changes.length},null,2));
