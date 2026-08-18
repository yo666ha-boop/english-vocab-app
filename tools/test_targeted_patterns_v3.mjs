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

  {id:'M2-GER2-0001',subject:'英語',grade:'中2',category:'動名詞',type:'空所補充',q:'I stop (      ). 「スマホを使うのをやめる」',a:'Using my phone'},
  {id:'M2-GER2-0002',subject:'英語',grade:'中2',category:'動名詞',type:'英作文',q:'次の日本語に合う英文を書きなさい。『あなたは スマホを使うのをやめる。』',a:'You stop using my phone.'},
  {id:'M2-GER2-0003',subject:'英語',grade:'中2',category:'動名詞',type:'間違い直し',q:'We like to play. の誤りを直しなさい。',a:'We like playing tennis.'},
  {id:'M2-GER2-0004',subject:'英語',grade:'中2',category:'動名詞',type:'間違い直し',q:'They enjoy to read. の誤りを直しなさい。',a:'They enjoy reading comics.'},
  {id:'M2-GER2-0005',subject:'英語',grade:'中2',category:'動名詞',type:'空所補充',q:'He stop (      ). 「スマホを使うのをやめる」',a:'Using my phone'},
  {id:'M2-GER2-0006',subject:'英語',grade:'中2',category:'動名詞',type:'英作文',q:'次の日本語に合う英文を書きなさい。『彼女は 音楽を聞くことが大好きだ。』',a:'She love listening to music.'},
  {id:'M2-GER2-0007',subject:'英語',grade:'中2',category:'動名詞',type:'英作文',q:'次の日本語に合う英文を書きなさい。『タクミは 理科を勉強し始める。』',a:'Takumi begin studying science.'},
  {id:'M2-GER2-0008',subject:'英語',grade:'中2',category:'動名詞',type:'英作文',q:'次の日本語に合う英文を書きなさい。『ミカは スマホを使うのをやめる。』',a:'Mika stop using my phone.'},
  {id:'M2-GER2-0009',subject:'英語',grade:'中2',category:'動名詞',type:'間違い直し',q:'My friend begin to study. の誤りを直しなさい。',a:'My friend begin studying science.'},
  {id:'M2-GER2-0010',subject:'英語',grade:'中2',category:'動名詞',type:'英作文',q:'次の日本語に合う英文を書きなさい。『彼は 宿題を終える。』',a:'He finishes homework.'},

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

  'M2-GER2-0001':{q:'I stop (      ). 「スマホを使うのをやめる」',a:'using the phone'},
  'M2-GER2-0002':{q:'動名詞を使って、次の日本語に合う英文を書きなさい。『あなたは スマホを使うのをやめる。』',a:'You stop using the phone.'},
  'M2-GER2-0003':{type:'変形',q:'次の英文の（　）内の動詞を動名詞に直して、英文を完成させなさい。 We like (play) tennis.',a:'We like playing tennis.'},
  'M2-GER2-0004':{type:'変形',q:'次の英文の（　）内の動詞を動名詞に直して、英文を完成させなさい。 They enjoy (read) comics.',a:'They enjoy reading comics.'},
  'M2-GER2-0005':{q:'He stops (      ). 「スマホを使うのをやめる」',a:'using the phone'},
  'M2-GER2-0006':{q:'動名詞を使って、次の日本語に合う英文を書きなさい。『彼女は 音楽を聞くことが大好きだ。』',a:'She loves listening to music.'},
  'M2-GER2-0007':{q:'動名詞を使って、次の日本語に合う英文を書きなさい。『タクミは 理科を勉強し始める。』',a:'Takumi begins studying science.'},
  'M2-GER2-0008':{q:'動名詞を使って、次の日本語に合う英文を書きなさい。『ミカは スマホを使うのをやめる。』',a:'Mika stops using the phone.'},
  'M2-GER2-0009':{type:'変形',q:'次の英文の（　）内の動詞を動名詞に直して、英文を完成させなさい。 My friend begins (study) science.',a:'My friend begins studying science.'},
  'M2-GER2-0010':{q:'動名詞を使って、次の日本語に合う英文を書きなさい。『彼は 宿題を終える。』',a:'He finishes doing homework.'},

  'M2-COMP2-0001':{q:'She is popularer than Ken. の誤りを直しなさい。',a:'She is more popular than Ken.'},
  'M2-COMP2-0002':{q:'( She / than / Ken / is / easier )',a:'She is easier than Ken.'}
};
for(const [id,want] of Object.entries(expected)){
  for(const [k,v] of Object.entries(want)){
    if(byId[id]?.[k]!==v) throw new Error(`${id}.${k}: expected ${v}, got ${byId[id]?.[k]}`);
  }
}
console.log('Targeted generated-family V3 regression: OK');
