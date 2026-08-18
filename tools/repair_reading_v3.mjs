#!/usr/bin/env node
import fs from 'node:fs';

const [,,inputPath,outputPath=inputPath]=process.argv;
if(!inputPath){console.error('Usage: node tools/repair_reading_v3.mjs <html> [output.html]');process.exit(2);}
let html=fs.readFileSync(inputPath,'utf8');
for(const marker of ['id="qb-data"','M2-RD2-']) if(!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re);if(!m)throw new Error('missing qb-data');
const qb=JSON.parse(m[1]);if(!Array.isArray(qb)||qb.length<10000)throw new Error(`NOT CANONICAL: qb count=${qb.length}`);
const answers={
'M2-RD2-1549':'明日、サッカーをします。',
'M2-RD2-1551':'病気だったからです。',
'M2-RD2-1553':'ミカは先週、京都を訪れました。',
'M2-RD2-1555':'タクミは図書館で勉強する予定です。',
'M2-RD2-1557':'自転車で学校へ行けます。',
'M2-RD2-1559':'放課後、マンガを読むことを楽しんでいます。'
};
let changed=0;
for(const x of qb){
  if(answers[x.id]&&/日本語で説明しなさい/.test(String(x.q||''))){if(x.a!==answers[x.id]){x.a=answers[x.id];changed++;}}
}
const errors=[];
for(const x of qb){
  if(!String(x.id||'').startsWith('M2-RD2-'))continue;
  const q=String(x.q||''),a=String(x.a||'');
  if(/日本語で説明しなさい/.test(q)&&/^[A-Za-z]/.test(a))errors.push(`${x.id}:Japanese prompt has English answer`);
  if(/空所に入る答えを書きなさい/.test(q)&&!/^[A-Za-z]/.test(a))errors.push(`${x.id}:English conversation blank has non-English answer`);
}
if(errors.length){console.error(JSON.stringify({status:'FAILED_READING_V3',errors},null,2));process.exit(3);}
html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
console.log(JSON.stringify({status:'OK',changed}));
