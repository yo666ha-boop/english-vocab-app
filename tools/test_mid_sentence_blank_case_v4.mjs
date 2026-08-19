#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-blank-case-v4-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
 {id:'E1-BQ-012',subject:'英語',grade:'中1',category:'be動詞',type:'空所補充',q:'We (      ) in the classroom. 「教室にいます」',a:'Are'},
 {id:'E1-DQ-011',subject:'英語',grade:'中1',category:'一般動詞',type:'空所補充',q:'I (      ) basketball after school. 「バスケットボールをします」',a:'Play'},
 {id:'START-1',subject:'英語',grade:'中1',category:'be動詞',type:'空所補充',q:'(      ) she from Canada?',a:'Is'},
 {id:'START-2',subject:'英語',grade:'中1',category:'一般動詞',type:'空所補充',q:'問い：(      ) you have a dog?',a:'Do'},
 {id:'PROPER',subject:'英語',grade:'中1',category:'一般動詞',type:'空所補充',q:'I live in (      ).',a:'Japan'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中1',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_mid_sentence_blank_case_v4.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const by=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={'E1-BQ-012':'are','E1-DQ-011':'play','START-1':'Is','START-2':'Do','PROPER':'Japan'};
for(const [id,a] of Object.entries(expected)) if(by[id]?.a!==a) throw new Error(`${id}: expected ${a}, got ${by[id]?.a}`);
console.log('Mid-sentence blank case V4 regression: OK');
