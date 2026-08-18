#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-m3-'));
const input=path.join(dir,'in.html'), output=path.join(dir,'out.html');
const cases=[
  {id:'M3N-00124',subject:'英語',grade:'中3',category:'be動詞と一般動詞（現在形）',type:'間違い直し',q:'Do I busy? の誤りを直しなさい。',a:'Are you busy?'},
  {id:'M3N-00125',subject:'英語',grade:'中3',category:'be動詞と一般動詞（現在形）',type:'変形',q:'I am busy. を疑問文にしなさい。',a:'Are you busy?'},
  {id:'M3N-00136',subject:'英語',grade:'中3',category:'be動詞と一般動詞（現在形）',type:'間違い直し',q:'Do he tired? の誤りを直しなさい。',a:'Are he tired?'},
  {id:'M3N-00138',subject:'英語',grade:'中3',category:'be動詞と一般動詞（現在形）',type:'変形',q:'He play baseball. を疑問文にしなさい。',a:'Do he play baseball?'},
  {id:'M3N-00166',subject:'英語',grade:'中3',category:'be動詞と一般動詞（現在形）',type:'間違い直し',q:'Do my mother sad? の誤りを直しなさい。',a:'Are my mother sad?'},
  {id:'M3N-00168',subject:'英語',grade:'中3',category:'be動詞と一般動詞（現在形）',type:'変形',q:'My mother go running. を疑問文にしなさい。',a:'Do my mother go running?'},
  {id:'M3N-00244',subject:'英語',grade:'中3',category:'be動詞と一般動詞（過去形）',type:'間違い直し',q:'Did I busy yesterday? の誤りを直しなさい。',a:'Were I busy yesterday?'},
  {id:'M3N-00246',subject:'英語',grade:'中3',category:'be動詞と一般動詞（過去形）',type:'変形',q:'I played tennis yesterday. を疑問文にしなさい。',a:'Did you play tennis yesterday?'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中3',category:'dummy',type:'dummy',q:'x',a:'x'}));
const qb=[...cases,...filler];
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
execFileSync(process.execPath,['tools/repair_m3_review.mjs',input,output],{stdio:'pipe'});
const html=fs.readFileSync(output,'utf8');
const parsed=JSON.parse(html.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const byId=Object.fromEntries(parsed.map(x=>[x.id,x]));
const expected={
 'M3N-00124':{a:'Am I busy?'},
 'M3N-00125':{q:'I am busy. を疑問文にしなさい。',a:'Am I busy?'},
 'M3N-00136':{a:'Is he tired?'},
 'M3N-00138':{q:'He plays baseball. を疑問文にしなさい。',a:'Does he play baseball?'},
 'M3N-00166':{a:'Is my mother sad?'},
 'M3N-00168':{q:'My mother goes running. を疑問文にしなさい。',a:'Does my mother go running?'},
 'M3N-00244':{a:'Was I busy yesterday?'},
 'M3N-00246':{q:'I played tennis yesterday. を疑問文にしなさい。',a:'Did I play tennis yesterday?'}
};
for(const [id,want] of Object.entries(expected)) for(const [k,v] of Object.entries(want)) if(byId[id]?.[k]!==v) throw new Error(`${id}.${k}: expected ${v} got ${byId[id]?.[k]}`);
console.log('M3 review functional regression: OK');
