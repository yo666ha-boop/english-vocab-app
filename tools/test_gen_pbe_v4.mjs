#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-gen-pbe-v4-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
 {id:'GEN-PBE-1504',subject:'英語',grade:'中1',category:'過去のbe動詞',type:'変形',q:'I was happy yesterday. を疑問文にしなさい。',a:'Were you happy yesterday?'},
 {id:'GEN-PBE-1564',subject:'英語',grade:'中1',category:'過去のbe動詞',type:'変形',q:'We were happy yesterday. を疑問文にしなさい。',a:'Were you happy yesterday?'},
 {id:'GEN-PBE-1594',subject:'英語',grade:'中1',category:'過去のbe動詞',type:'変形',q:'They were happy yesterday. を疑問文にしなさい。',a:'Were they happy yesterday?'},
 {id:'GEN-PBE-1562',subject:'英語',grade:'中1',category:'過去のbe動詞',type:'答え方',q:'Were you busy yesterday? に Yes で答えなさい。',a:'Yes, you were.'},
 {id:'GEN-PBE-1505',subject:'英語',grade:'中1',category:'過去のbe動詞',type:'答え方',q:'Was I happy yesterday? に Yes で答えなさい。',a:'Yes, I was.'},
 {id:'GEN-PBE-1565',subject:'英語',grade:'中1',category:'過去のbe動詞',type:'答え方',q:'Were we happy yesterday? に Yes で答えなさい。',a:'Yes, we were.'},
 {id:'GEN-PBE-BLANK',subject:'英語',grade:'中1',category:'過去のbe動詞',type:'空所補充',q:'They (      ) busy yesterday.',a:'Were'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中1',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_gen_pbe_v4.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const by=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={
 'GEN-PBE-1504':{a:'Was I happy yesterday?'},
 'GEN-PBE-1564':{a:'Were we happy yesterday?'},
 'GEN-PBE-1594':{a:'Were they happy yesterday?'},
 'GEN-PBE-1562':{a:'Yes, I was.'},
 'GEN-PBE-1505':{q:'Were you happy yesterday? に Yes で答えなさい。',a:'Yes, I was.'},
 'GEN-PBE-1565':{a:'Yes, we were.'},
 'GEN-PBE-BLANK':{a:'were'}
};
for(const [id,want] of Object.entries(expected)) for(const [k,v] of Object.entries(want)) if(by[id]?.[k]!==v) throw new Error(`${id}.${k}: expected ${v} got ${by[id]?.[k]}`);
console.log('GEN-PBE V4 regression: OK');
