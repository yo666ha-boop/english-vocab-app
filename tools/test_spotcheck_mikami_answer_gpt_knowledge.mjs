#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-answer-gpt-spotcheck-test-'));
const input=path.join(dir,'canonical.html');
const knowledge=path.join(dir,'knowledge.jsonl');
const manifest=path.join(dir,'manifest.json');
const spot=path.join(dir,'spotcheck.json');
const records=[];

function add(id, grade, category, type='選択'){
  records.push({id,subject:'英語',grade,category,type,q:`Q ${id}`,a:`A ${id}`,meta:`meta-${id}`});
}
for(let i=1;i<=12;i++) add(`R1-PRON-${String(i).padStart(4,'0')}`,'中1','代名詞');
for(let i=1;i<=5;i++) add(`GEN-PRS-${String(i).padStart(4,'0')}`,'中1','一般動詞（現在）');
for(let i=1;i<=5;i++) add(`M2-GER2-${String(i).padStart(4,'0')}`,'中2','動名詞');
for(let i=1;i<=5;i++) add(`M2-COMP2-${String(i).padStart(4,'0')}`,'中2','比較');
for(let i=1;i<=5;i++) add(`M2X-INF-${String(i).padStart(4,'0')}`,'中2','不定詞');
for(let i=1;i<=5;i++) add(`M2-RD2-${String(i).padStart(4,'0')}`,'中2','読解');
for(let i=1;i<=5;i++) add(`M3-PP-${String(i).padStart(4,'0')}`,'中3',`現在完了形${i%2?'（経験）':'（継続）'}`);
for(let i=1;i<=5;i++) add(`M3-REL-${String(i).padStart(4,'0')}`,'中3','関係代名詞');
for(let i=1;i<=5;i++) add(`M3N-${String(i).padStart(4,'0')}`,'中3','復習');

let filler=1;
while(records.length<10511){
  add(`FILL-${String(filler++).padStart(5,'0')}`,'中2','回帰テスト','空所補充');
}
records.push({id:'JP-0001',subject:'国語',grade:'中1',category:'test',type:'test',q:'x',a:'x'});
records.push({id:'MATH-0001',subject:'数学',grade:'中1',category:'test',type:'test',q:'x',a:'x'});
if(records.length!==10513) throw new Error(`synthetic total mismatch ${records.length}`);

fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify(records)}</script>`,'utf8');
execFileSync(process.execPath,['tools/export_mikami_answer_gpt_knowledge.mjs',input,knowledge,manifest],{stdio:'inherit'});
execFileSync(process.execPath,['tools/spotcheck_mikami_answer_gpt_knowledge.mjs',input,knowledge,spot],{stdio:'inherit'});
const report=JSON.parse(fs.readFileSync(spot,'utf8'));
if(report.status!=='OK'||report.families_required!==9||report.families_passed!==9) throw new Error('spotcheck family gate failed');
if(report.representative_records_checked<20) throw new Error('too few representative records checked');
for(const family of report.families){
  if(!family.samples.length||family.samples.some(x=>x.exact_record_match!==true)) throw new Error(`family did not exact-match: ${family.key}`);
}

// Negative regression: remove one critical family record from Knowledge and require rejection.
const lines=fs.readFileSync(knowledge,'utf8').trimEnd().split('\n');
const filtered=lines.filter(line=>JSON.parse(line).id!=='R1-PRON-0001');
filtered.push(lines.find(line=>JSON.parse(line).id.startsWith('FILL-'))); // keep 10511 lines, force duplicate ID instead of count-only failure
const bad=path.join(dir,'knowledge-bad.jsonl');
fs.writeFileSync(bad,filtered.join('\n')+'\n','utf8');
let rejected=false;
try{execFileSync(process.execPath,['tools/spotcheck_mikami_answer_gpt_knowledge.mjs',input,bad,path.join(dir,'bad-spot.json')],{stdio:'pipe'});}catch{rejected=true;}
if(!rejected) throw new Error('spotcheck accepted missing critical family ID');
console.log('Mikami answer GPT representative family spot-check regression: OK');
