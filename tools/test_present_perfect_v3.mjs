#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-pp-v3-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
{id:'PP-I',subject:'英語',grade:'中3',category:'現在完了形（完了・経験）',type:'変形',q:'I have finished my homework. を疑問文にしなさい。',a:'Do you have finished your homework?'},
{id:'PP-YOU',subject:'英語',grade:'中3',category:'現在完了形（完了・経験）',type:'変形',q:'You have lost my key. を疑問文にしなさい。',a:'Have you lost my key?'},
{id:'PP-WE',subject:'英語',grade:'中3',category:'現在完了形（完了・経験）',type:'変形',q:'We have finished my homework. を疑問文にしなさい。',a:'Do you have finished your homework?'},
{id:'PP-THEY',subject:'英語',grade:'中3',category:'現在完了形（完了・経験）',type:'変形',q:'They have lost my key. を疑問文にしなさい。',a:'Have they lost my key?'},
{id:'PP-HE',subject:'英語',grade:'中3',category:'現在完了形（完了・経験）',type:'変形',q:'He has finished my homework. を疑問文にしなさい。',a:'Has he finished my homework?'},
{id:'PP-SHE',subject:'英語',grade:'中3',category:'現在完了形（完了・経験）',type:'変形',q:'She has lost my key. を疑問文にしなさい。',a:'Has she lost my key?'},
{id:'PP-PROG',subject:'英語',grade:'中3',category:'現在完了形（継続），現在完了進行形',type:'変形',q:'They have been playing tennis for two hours. を疑問文にしなさい。',a:'Do you have been playing tennis for two hours?'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中3',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_present_perfect_v3.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const by=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={
'PP-I':{q:'I have finished my homework. を疑問文にしなさい。',a:'Have I finished my homework?'},
'PP-YOU':{q:'You have lost your key. を疑問文にしなさい。',a:'Have you lost your key?'},
'PP-WE':{q:'We have finished our homework. を疑問文にしなさい。',a:'Have we finished our homework?'},
'PP-THEY':{q:'They have lost their key. を疑問文にしなさい。',a:'Have they lost their key?'},
'PP-HE':{q:'He has finished his homework. を疑問文にしなさい。',a:'Has he finished his homework?'},
'PP-SHE':{q:'She has lost her key. を疑問文にしなさい。',a:'Has she lost her key?'},
'PP-PROG':{a:'Have they been playing tennis for two hours?'}
};
for(const [id,want] of Object.entries(expected))for(const [k,v] of Object.entries(want))if(by[id]?.[k]!==v)throw new Error(`${id}.${k}: expected ${v}, got ${by[id]?.[k]}`);
console.log('Present perfect V3 regression: OK');
