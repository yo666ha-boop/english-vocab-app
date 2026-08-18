#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-inf-v3-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
{id:'M2X-INF-0001',subject:'英語',grade:'中2',category:'不定詞',type:'変形',q:'You went to the library to study. を否定文または疑問文に直しなさい。',a:'You do not went to the library to study.'},
{id:'M2X-INF-0002',subject:'英語',grade:'中2',category:'不定詞',type:'変形',q:'I went to the library to study. を否定文または疑問文に直しなさい。',a:'Do you went to the library to study?'},
{id:'M2X-INF-0003',subject:'英語',grade:'中2',category:'不定詞',type:'変形',q:'We went to the library to study. を否定文または疑問文に直しなさい。',a:'Do you went to the library to study?'},
{id:'M2X-INF-0004',subject:'英語',grade:'中2',category:'不定詞',type:'変形',q:'He went to the library to study. を否定文または疑問文に直しなさい。',a:'Does he went to the library to study?'},
{id:'M2X-INF-0005',subject:'英語',grade:'中2',category:'不定詞',type:'変形',q:'You want to be a teacher. を否定文または疑問文に直しなさい。',a:'Do You want to be a teacher?'},
{id:'M2X-INF-0006',subject:'英語',grade:'中2',category:'不定詞',type:'変形',q:'He wants to be a teacher. を否定文または疑問文に直しなさい。',a:'Do he wants to be a teacher?'},
{id:'M2X-INF-0007',subject:'英語',grade:'中2',category:'不定詞',type:'変形',q:'They use this box to keep letters. を否定文または疑問文に直しなさい。',a:'Do You use this box to keep letters?'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中3',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_infinitive_v3.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const by=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={
'M2X-INF-0001':{q:'You went to the library to study. を疑問文にしなさい。',a:'Did you go to the library to study?'},
'M2X-INF-0002':{q:'I went to the library to study. を疑問文にしなさい。',a:'Did I go to the library to study?'},
'M2X-INF-0003':{q:'We went to the library to study. を疑問文にしなさい。',a:'Did we go to the library to study?'},
'M2X-INF-0004':{q:'He went to the library to study. を疑問文にしなさい。',a:'Did he go to the library to study?'},
'M2X-INF-0005':{q:'You want to be a teacher. を疑問文にしなさい。',a:'Do you want to be a teacher?'},
'M2X-INF-0006':{q:'He wants to be a teacher. を疑問文にしなさい。',a:'Does he want to be a teacher?'},
'M2X-INF-0007':{q:'They use this box to keep letters. を疑問文にしなさい。',a:'Do they use this box to keep letters?'}
};
for(const [id,want] of Object.entries(expected))for(const [k,v] of Object.entries(want))if(by[id]?.[k]!==v)throw new Error(`${id}.${k}: expected ${v}, got ${by[id]?.[k]}`);
console.log('Infinitive V3 regression: OK');
