#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-m3-inf2-v4-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
 {id:'M3N-01958',subject:'英語',grade:'中3',category:'不定詞②',type:'空所補充',q:'I have a book (      ) read. 「読むための本」になるように、空所に入る最も適切な語を書きなさい。',a:'To'},
 {id:'M3N-01960',subject:'英語',grade:'中3',category:'不定詞②',type:'間違い直し',q:'My father went there to played swimming. の誤りを直しなさい。',a:'My father went there to go swimming.'},
 {id:'M3N-02002',subject:'英語',grade:'中3',category:'不定詞②',type:'間違い直し',q:'Emi went there to played basketball. の誤りを直しなさい。',a:'Emi went there to play basketball.'},
 {id:'M3N-02020',subject:'英語',grade:'中3',category:'不定詞②',type:'間違い直し',q:'The student went there to played running. の誤りを直しなさい。',a:'The student went there to go running.'},
 {id:'M3N-01962',subject:'英語',grade:'中3',category:'不定詞②',type:'読解',q:'He gots up early to catch the first train 問い：この文の意味として最も適切なものを書きなさい。',a:'彼は始発電車に乗るために早く起きました。'},
 {id:'M3N-01957',subject:'英語',grade:'中3',category:'不定詞②',type:'英作文',q:'次の日本語に合う英文を書きなさい。『私は英語を勉強するために図書館へ行きました。』',a:'I went to the library to study English.'},
 {id:'M3N-01961',subject:'英語',grade:'中3',category:'不定詞②',type:'並びかえ',q:'次の語(句)を正しい順に並べかえなさい。 ( to / I / a / friend / have / talk / with )',a:'I have a friend to talk with.'},
 {id:'M3N-01959',subject:'英語',grade:'中3',category:'不定詞②',type:'選択',q:'I have a lot of homework to do. の to do のはたらきとして最も適切なものを選びなさい。 (A) 名詞を説明する (B) 理由を表す (C) 結果を表す',a:'A'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中3',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_m3_infinitive2_v4.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const by=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={
 'M3N-01958':{a:'to'},
 'M3N-01960':{q:'My father went there to swam. の誤りを直しなさい。',a:'My father went there to swim.'},
 'M3N-02002':{q:'Emi went there to played basketball. の誤りを直しなさい。',a:'Emi went there to play basketball.'},
 'M3N-02020':{q:'The student went there to ran. の誤りを直しなさい。',a:'The student went there to run.'},
 'M3N-01962':{q:'He got up early to catch the first train. 問い：この文の意味として最も適切なものを書きなさい。',a:'彼は始発電車に乗るために早く起きました。'},
 'M3N-01961':{q:'次の語(句)を正しい順に並べかえなさい。 ( I / have / a / friend / to / talk / with )',a:'I have a friend to talk with.'}
};
for(const [id,want] of Object.entries(expected)) for(const [k,v] of Object.entries(want)) if(by[id]?.[k]!==v) throw new Error(`${id}.${k}: expected ${v} got ${by[id]?.[k]}`);
console.log('M3 infinitive II V4 regression: OK');
