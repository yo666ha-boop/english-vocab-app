#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-gen-be-v4-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
 {id:'GEN-BE-0022',subject:'英語',grade:'中1',category:'be動詞',type:'変形',q:'I am happy. を疑問文にしなさい。',a:'Are you happy?'},
 {id:'GEN-BE-0082',subject:'英語',grade:'中1',category:'be動詞',type:'変形',q:'We are happy. を疑問文にしなさい。',a:'Are you happy?'},
 {id:'GEN-BE-0242',subject:'英語',grade:'中1',category:'be動詞',type:'変形',q:'He is happy. を疑問文にしなさい。',a:'Is He happy?'},
 {id:'GEN-BE-0084',subject:'英語',grade:'中1',category:'be動詞',type:'空所補充',q:'We (      ) happy. 「です」の意味になるように、空所に入る最も適切な語(句)を書きなさい。',a:'Are'},
 {id:'GEN-BE-0043',subject:'英語',grade:'中1',category:'be動詞',type:'答え方',q:'Are you happy? に Yes で答えなさい。',a:'Yes, you are.'},
 {id:'GEN-BE-0003',subject:'英語',grade:'中1',category:'be動詞',type:'答え方',q:'Am I happy? に Yes で答えなさい。',a:'Yes, I am.'},
 {id:'GEN-BE-0083',subject:'英語',grade:'中1',category:'be動詞',type:'答え方',q:'Are we happy? に Yes で答えなさい。',a:'Yes, we are.'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中1',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_gen_be_v4.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const by=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={
 'GEN-BE-0022':{a:'Am I happy?'},
 'GEN-BE-0082':{a:'Are we happy?'},
 'GEN-BE-0242':{a:'Is he happy?'},
 'GEN-BE-0084':{a:'are'},
 'GEN-BE-0043':{a:'Yes, I am.'},
 'GEN-BE-0003':{q:'Are you happy? に Yes で答えなさい。',a:'Yes, I am.'},
 'GEN-BE-0083':{a:'Yes, we are.'}
};
for(const [id,want] of Object.entries(expected)) for(const [k,v] of Object.entries(want)) if(by[id]?.[k]!==v) throw new Error(`${id}.${k}: expected ${v} got ${by[id]?.[k]}`);
console.log('GEN-BE V4 regression: OK');
