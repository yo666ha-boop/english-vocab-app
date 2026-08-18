#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-m2-past-v4-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
 {id:'M2-PAST-0331',subject:'英語',grade:'中2',category:'一般動詞の過去形',type:'変形',q:'I use the internet. を yesterday を使って過去の文にしなさい。',a:'I used the internet yesterday.'},
 {id:'M2-PAST-0332',subject:'英語',grade:'中2',category:'過去の疑問文・否定文',type:'変形',q:'I used the internet yesterday. を疑問文にしなさい。',a:'Did you us the internet yesterday?'},
 {id:'M2-PAST-0337',subject:'英語',grade:'中2',category:'一般動詞の過去形',type:'変形',q:'I play tennis. を yesterday を使って過去の文にしなさい。',a:'I visited Kyoto yesterday.'},
 {id:'M2-PAST-0401',subject:'英語',grade:'中2',category:'一般動詞の過去形',type:'変形',q:'We go to the park. を yesterday を使って過去の文にしなさい。',a:'We went to the park yesterday.'},
 {id:'M2-PAST-0402',subject:'英語',grade:'中2',category:'過去の疑問文・否定文',type:'変形',q:'We went to the park yesterday. を疑問文にしなさい。',a:'Did you go to the park yesterday?'},
 {id:'M2-PAST-0403',subject:'英語',grade:'中2',category:'過去の疑問文・否定文',type:'変形',q:'They had lunch at school yesterday. を否定文にしなさい。',a:'They did not have lunch at school yesterday.'},
 {id:'M2-PAST-0404',subject:'英語',grade:'中2',category:'一般動詞の過去形',type:'変形',q:'She studies English. を yesterday を使って過去の文にしなさい。',a:'She studied English yesterday.'},
 {id:'M2-PAST-0405',subject:'英語',grade:'中2',category:'一般動詞の過去形',type:'変形',q:'He watches TV. を yesterday を使って過去の文にしなさい。',a:'He watched TV yesterday.'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中2',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_m2_past_v4.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const by=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={
 'M2-PAST-0331':{a:'I used the internet yesterday.'},
 'M2-PAST-0332':{a:'Did I use the internet yesterday?'},
 'M2-PAST-0337':{a:'I played tennis yesterday.'},
 'M2-PAST-0401':{a:'We went to the park yesterday.'},
 'M2-PAST-0402':{a:'Did we go to the park yesterday?'},
 'M2-PAST-0403':{a:'They did not have lunch at school yesterday.'},
 'M2-PAST-0404':{a:'She studied English yesterday.'},
 'M2-PAST-0405':{a:'He watched TV yesterday.'}
};
for(const [id,want] of Object.entries(expected)) for(const [k,v] of Object.entries(want)) if(by[id]?.[k]!==v) throw new Error(`${id}.${k}: expected ${v} got ${by[id]?.[k]}`);
console.log('M2 past V4 regression: OK');
