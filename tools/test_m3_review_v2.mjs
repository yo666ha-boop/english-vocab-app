#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-m3-v2-'));
const input=path.join(dir,'in.html'), mid=path.join(dir,'mid.html'), output=path.join(dir,'out.html');
const cases=[
{id:'M3N-00124',subject:'英語',grade:'中3',category:'be動詞と一般動詞（現在形）',type:'間違い直し',q:'Do I busy? の誤りを直しなさい。',a:'Are you busy?'},
{id:'M3N-00168',subject:'英語',grade:'中3',category:'be動詞と一般動詞（現在形）',type:'変形',q:'My mother go running. を疑問文にしなさい。',a:'Do my mother go running?'},
{id:'M3N-00166',subject:'英語',grade:'中3',category:'be動詞と一般動詞（現在形）',type:'間違い直し',q:'Do my mother sad? の誤りを直しなさい。',a:'Are my mother sad?'},
{id:'M3N-00244',subject:'英語',grade:'中3',category:'be動詞と一般動詞（過去形）',type:'間違い直し',q:'Did I busy yesterday? の誤りを直しなさい。',a:'Were I busy yesterday?'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中3',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_m3_review.mjs',input,mid],{stdio:'pipe'});
execFileSync(process.execPath,['tools/normalize_question_subject_case.mjs',mid,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const byId=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={'M3N-00124':'Am I busy?','M3N-00168':'Does my mother go running?','M3N-00166':'Is my mother sad?','M3N-00244':'Was I busy yesterday?'};
for(const [id,a] of Object.entries(expected))if(byId[id]?.a!==a)throw new Error(`${id}: expected ${a}, got ${byId[id]?.a}`);
console.log('M3 review v2: OK');
