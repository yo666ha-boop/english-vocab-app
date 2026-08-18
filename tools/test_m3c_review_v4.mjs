#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-m3c-review-v4-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
 {id:'M3C-00001',subject:'英語',grade:'中3',category:'be動詞と一般動詞（現在形）',type:'変形',q:'I play tennis. を疑問文にしなさい。',a:'Do you play tennis?'},
 {id:'M3C-00003',subject:'英語',grade:'中3',category:'be動詞と一般動詞（過去形）',type:'変形',q:'I played tennis yesterday. を疑問文にしなさい。',a:'Did you play tennis yesterday?'},
 {id:'M3C-00005',subject:'英語',grade:'中3',category:'進行形',type:'変形',q:'I am playing tennis now. を疑問文にしなさい。',a:'Are you playing tennis now?'},
 {id:'M3C-00007',subject:'英語',grade:'中3',category:'未来の文',type:'変形',q:'I will play tennis. を疑問文にしなさい。',a:'Will you play tennis?'},
 {id:'M3C-00008',subject:'英語',grade:'中3',category:'未来の文',type:'変形',q:'I am going to play tennis. を疑問文にしなさい。',a:'Are you going to play tennis?'},
 {id:'M3C-00009',subject:'英語',grade:'中3',category:'助動詞',type:'変形',q:'I can play tennis. を疑問文にしなさい。',a:'Can you play tennis?'},
 {id:'M3C-00927',subject:'英語',grade:'中3',category:'未来の文',type:'変形',q:'We will help my mother. を疑問文にしなさい。',a:'Will you help your mother?'},
 {id:'M3C-00929',subject:'英語',grade:'中3',category:'助動詞',type:'変形',q:'We can help my mother. を疑問文にしなさい。',a:'Can you help your mother?'},
 {id:'M3C-N1',subject:'英語',grade:'中3',category:'be動詞と一般動詞（現在形）',type:'変形',q:'He watches TV. を否定文にしなさい。',a:'He does not watch TV.'},
 {id:'M3C-N2',subject:'英語',grade:'中3',category:'未来の文',type:'変形',q:'We are going to help my mother. を否定文にしなさい。',a:'We are not going to help your mother.'},
 {id:'M3C-PP-SKIP',subject:'英語',grade:'中3',category:'現在完了形（完了・経験）',type:'変形',q:'I have finished my homework. を疑問文にしなさい。',a:'Do you have finished your homework?'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中3',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_m3c_review_v4.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const by=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={
 'M3C-00001':{a:'Do I play tennis?'},
 'M3C-00003':{a:'Did I play tennis yesterday?'},
 'M3C-00005':{a:'Am I playing tennis now?'},
 'M3C-00007':{a:'Will I play tennis?'},
 'M3C-00008':{a:'Am I going to play tennis?'},
 'M3C-00009':{a:'Can I play tennis?'},
 'M3C-00927':{q:'We will help our mother. を疑問文にしなさい。',a:'Will we help our mother?'},
 'M3C-00929':{q:'We can help our mother. を疑問文にしなさい。',a:'Can we help our mother?'},
 'M3C-N1':{a:'He does not watch TV.'},
 'M3C-N2':{q:'We are going to help our mother. を否定文にしなさい。',a:'We are not going to help our mother.'},
 'M3C-PP-SKIP':{a:'Do you have finished your homework?'}
};
for(const [id,want] of Object.entries(expected)) for(const [k,v] of Object.entries(want)) if(by[id]?.[k]!==v) throw new Error(`${id}.${k}: expected ${v} got ${by[id]?.[k]}`);
console.log('M3C review V4 regression: OK');
