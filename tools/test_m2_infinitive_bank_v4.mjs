#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-m2-inf-v4-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
  {id:'M2-INF2-1097',subject:'英語',grade:'中2',category:'不定詞',type:'空所補充',q:'He need to (      ) study harder.',a:'To'},
  {id:'M2-INF2-1100',subject:'英語',grade:'中2',category:'不定詞',type:'空所補充',q:'He likes to (      ) read books.',a:'To'},
  {id:'M2-INF2-1049',subject:'英語',grade:'中2',category:'不定詞',type:'空所補充',q:'She went to the library to (      ) study.',a:'To'},
  {id:'M2-INF2-1052',subject:'英語',grade:'中2',category:'不定詞',type:'空所補充',q:'She uses this box to (      ) keep letters.',a:'To'},
  {id:'M2-INF2-1098',subject:'英語',grade:'中2',category:'不定詞',type:'英作文',q:'次の日本語に合う英文を書きなさい。『タクミは もっと一生けん命勉強する必要がある。』',a:'Takumi need to study harder.'},
  {id:'M2-INF2-1152',subject:'英語',grade:'中2',category:'不定詞',type:'英作文',q:'次の日本語に合う英文を書きなさい。『ミカは もっと一生けん命勉強する必要がある。』',a:'Mika need to study harder.'},
  {id:'M2-INF2-1099',subject:'英語',grade:'中2',category:'不定詞',type:'間違い直し',q:'He need to study harder . の誤りを直しなさい。',a:'He needs to study harder.'},
  {id:'M2-INF2-0823',subject:'英語',grade:'中2',category:'不定詞',type:'英作文',q:'次の日本語に合う英文を書きなさい。『あなたはテニスをしたい。』',a:'You want to play tennis.'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中2',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_m2_infinitive_bank_v4.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const by=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={
  'M2-INF2-1097':{q:'He needs (      ) study harder.',a:'to'},
  'M2-INF2-1100':{q:'He likes (      ) read books.',a:'to'},
  'M2-INF2-1049':{q:'She went to the library (      ) study.',a:'to'},
  'M2-INF2-1052':{q:'She uses this box (      ) keep letters.',a:'to'},
  'M2-INF2-1098':{a:'Takumi needs to study harder.'},
  'M2-INF2-1152':{a:'Mika needs to study harder.'},
  'M2-INF2-1099':{q:'He need to study harder . の誤りを直しなさい。',a:'He needs to study harder.'},
  'M2-INF2-0823':{a:'You want to play tennis.'}
};
for(const [id,want] of Object.entries(expected)){
  for(const [k,v] of Object.entries(want)) if(by[id]?.[k]!==v) throw new Error(`${id}.${k}: expected ${v} got ${by[id]?.[k]}`);
}
console.log('M2 infinitive bank V4 regression: OK');
