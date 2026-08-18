#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-v3-'));
const input=path.join(dir,'in.html'), output=path.join(dir,'out.html');
const cases=[
  {id:'GEN-PRS-0001',subject:'英語',grade:'中1',category:'一般動詞',type:'空所補充',q:'I (      ) every day. 「テニスをします」の意味になるように、空所に入る最も適切な語(句)を書きなさい。',a:'Play tennis'},
  {id:'GEN-PRS-0002',subject:'英語',grade:'中1',category:'一般動詞',type:'空所補充',q:'He (      ) every day. 「ピアノを練習します」の意味になるように、空所に入る最も適切な語(句)を書きなさい。',a:'Practice tennis'},
  {id:'GEN-PRS-0003',subject:'英語',grade:'中1',category:'一般動詞',type:'空所補充',q:'She (      ) every day. 「本を読みました」の意味になるように、空所に入る最も適切な語(句)を書きなさい。',a:'Read books'},
  {id:'GEN-PRS-0004',subject:'英語',grade:'中1',category:'一般動詞',type:'変形',q:'I practice tennis. を疑問文にしなさい。',a:'Do you practice tennis?'},
  {id:'GEN-PRS-0005',subject:'英語',grade:'中1',category:'一般動詞',type:'変形',q:'We clean the room. を疑問文にしなさい。',a:'Do you clean the room?'},
  {id:'GEN-PRS-0006',subject:'英語',grade:'中1',category:'一般動詞',type:'変形',q:'He play tennis. を疑問文にしなさい。',a:'Do he play tennis?'},
  {id:'GEN-PRS-0007',subject:'英語',grade:'中1',category:'一般動詞',type:'変形',q:'He play tennis. を否定文にしなさい。',a:'He do not play tennis.'},
  {id:'GEN-PRS-0008',subject:'英語',grade:'中1',category:'一般動詞',type:'並びかえ',q:'次の語(句)を正しい順に並べかえなさい。 ( practice / the / tennis / I )',a:'I practice tennis.'},
  {id:'M2-GER2-0001',subject:'英語',grade:'中2',category:'動名詞',type:'空所補充',q:'She enjoys (      ). 「音楽を聞くことを楽しみます」',a:'Listening to music'},
  {id:'M2-GER2-0002',subject:'英語',grade:'中2',category:'動名詞',type:'英作文',q:'次の日本語に合う英文を書きなさい。『ミカは音楽を聞くことを楽しみます。』',a:'Mika love listening to music.'},
  {id:'M2-COMP2-0001',subject:'英語',grade:'中2',category:'比較',type:'間違い直し',q:'She is popularer than He. の誤りを直しなさい。',a:'She is more popular than He.'},
  {id:'M2-COMP2-0002',subject:'英語',grade:'中2',category:'比較',type:'並びかえ',q:'( She / than / He / is / easier )',a:'She is easier than that one.'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中3',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_targeted_patterns_v3.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const byId=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={
  'GEN-PRS-0001':{a:'play tennis'},
  'GEN-PRS-0002':{a:'practices the piano'},
  'GEN-PRS-0003':{q:'She (      ) every day. 「本を読みます」の意味になるように、空所に入る最も適切な語(句)を書きなさい。',a:'reads books'},
  'GEN-PRS-0004':{q:'I practice tennis. を疑問文にしなさい。',a:'Do I practice tennis?'},
  'GEN-PRS-0005':{q:'We clean the room. を疑問文にしなさい。',a:'Do we clean the room?'},
  'GEN-PRS-0006':{q:'He plays tennis. を疑問文にしなさい。',a:'Does he play tennis?'},
  'GEN-PRS-0007':{q:'He plays tennis. を否定文にしなさい。',a:'He does not play tennis.'},
  'GEN-PRS-0008':{q:'次の語(句)を正しい順に並べかえなさい。 ( practice / tennis / I )',a:'I practice tennis.'},
  'M2-GER2-0001':{a:'listening to music'},
  'M2-GER2-0002':{a:'Mika enjoys listening to music.'},
  'M2-COMP2-0001':{q:'She is popularer than Ken. の誤りを直しなさい。',a:'She is more popular than Ken.'},
  'M2-COMP2-0002':{q:'( She / than / Ken / is / easier )',a:'She is easier than Ken.'}
};
for(const [id,want] of Object.entries(expected)){
  for(const [k,v] of Object.entries(want)){
    if(byId[id]?.[k]!==v) throw new Error(`${id}.${k}: expected ${v}, got ${byId[id]?.[k]}`);
  }
}
console.log('Targeted generated-family V3 regression: OK');
