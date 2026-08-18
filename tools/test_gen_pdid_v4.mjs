#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-gen-pdid-v4-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
 {id:'GEN-PDID-2083',subject:'英語',grade:'中1',category:'過去の疑問文・否定文',type:'変形',q:'I got up at six yesterday. を疑問文にしなさい。',a:'Do you got up at six yesterday?'},
 {id:'GEN-PDID-2084',subject:'英語',grade:'中1',category:'過去の疑問文・否定文',type:'変形',q:'I got up at six yesterday. を否定文にしなさい。',a:'I did not get up at six yesterday.'},
 {id:'GEN-PDID-2149',subject:'英語',grade:'中1',category:'過去の疑問文・否定文',type:'変形',q:'We made a cake yesterday. を疑問文にしなさい。',a:'Did you make a cake yesterday?'},
 {id:'GEN-PDID-2173',subject:'英語',grade:'中1',category:'過去の疑問文・否定文',type:'変形',q:'They came to my house yesterday. を疑問文にしなさい。',a:'Did they come to my house yesterday?'},
 {id:'GEN-PDID-2091',subject:'英語',grade:'中1',category:'過去の疑問文・否定文',type:'変形',q:'You studied English yesterday. を疑問文にしなさい。',a:'Did you study English yesterday?'},
 {id:'GEN-PDID-2145',subject:'英語',grade:'中1',category:'過去の疑問文・否定文',type:'変形',q:'We did our homework yesterday. を疑問文にしなさい。',a:'Did you do your homework yesterday?'},
 {id:'GEN-PDID-2176',subject:'英語',grade:'中1',category:'過去の疑問文・否定文',type:'変形',q:'They had a test yesterday. を否定文にしなさい。',a:'They did not have a test yesterday.'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中1',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_gen_pdid_v4.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const by=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={
 'GEN-PDID-2083':{a:'Did I get up at six yesterday?'},
 'GEN-PDID-2084':{a:'I did not get up at six yesterday.'},
 'GEN-PDID-2149':{a:'Did we make a cake yesterday?'},
 'GEN-PDID-2173':{a:'Did they come to my house yesterday?'},
 'GEN-PDID-2091':{a:'Did you study English yesterday?'},
 'GEN-PDID-2145':{a:'Did we do our homework yesterday?'},
 'GEN-PDID-2176':{a:'They did not have a test yesterday.'}
};
for(const [id,want] of Object.entries(expected)) for(const [k,v] of Object.entries(want)) if(by[id]?.[k]!==v) throw new Error(`${id}.${k}: expected ${v} got ${by[id]?.[k]}`);
console.log('GEN-PDID V4 regression: OK');
