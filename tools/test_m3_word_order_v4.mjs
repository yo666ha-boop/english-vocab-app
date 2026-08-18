#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-m3-order-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
 {id:'M3N-00008',subject:'英語',grade:'中3',category:'英語の語順',type:'間違い直し',q:'You the park go every day. の誤りを直しなさい。',a:'You go to the park every day.'},
 {id:'M3N-00009',subject:'英語',grade:'中3',category:'英語の語順',type:'英作文',q:'次の日本語に合う英文を書きなさい。『Youはevery dayにthe parkへ行きます。』',a:'You go to the park every day.'},
 {id:'M3N-00010',subject:'英語',grade:'中3',category:'英語の語順',type:'選択',q:'次のうち正しい英文を選びなさい。 (A) You soccer play. (B) You play soccer. (C) Play you soccer.',a:'B'},
 {id:'M3N-00011',subject:'英語',grade:'中3',category:'英語の語順',type:'空所補充',q:'You (      ) to the park every day. 「行きます」の意味になるように、空所に入る最も適切な語を書きなさい。',a:'Go'},
 {id:'M3N-00012',subject:'英語',grade:'中3',category:'英語の語順',type:'読解',q:'You play soccer every day. 問い：この英文の意味を書きなさい。',a:'Youはevery dayにsoccerをします。'},
 {id:'M3N-00070',subject:'英語',grade:'中3',category:'英語の語順',type:'選択',q:'次のうち正しい英文を選びなさい。 (A) Yuki tennis play. (B) Yuki play tennis. (C) Play Yuki tennis.',a:'B'},
 {id:'M3N-00071',subject:'英語',grade:'中3',category:'英語の語順',type:'空所補充',q:'Yuki (      ) to the pool every evening. 「行きます」の意味になるように、空所に入る最も適切な語を書きなさい。',a:'Go'},
 {id:'M3N-00072',subject:'英語',grade:'中3',category:'英語の語順',type:'読解',q:'Yuki play tennis every evening. 問い：この英文の意味を書きなさい。',a:'Yukiはevery eveningにtennisをします。'},
 {id:'M3N-00073',subject:'英語',grade:'中3',category:'英語の語順',type:'並びかえ',q:'次の語(句)を正しい順に並べかえなさい。 ( Tom / baseball / play / after class )',a:'Tom plays baseball after class.'},
 {id:'M3N-00074',subject:'英語',grade:'中3',category:'英語の語順',type:'間違い直し',q:'Tom the office go after class. の誤りを直しなさい。',a:'Tom goes to the office after class.'},
 {id:'M3N-00075',subject:'英語',grade:'中3',category:'英語の語順',type:'英作文',q:'次の日本語に合う英文を書きなさい。『Tomはafter classにthe officeへ行きます。』',a:'Tom goes to the office after class.'},
 {id:'M3N-00081',subject:'英語',grade:'中3',category:'英語の語順',type:'英作文',q:'次の日本語に合う英文を書きなさい。『Emiはbefore breakfastにthe zooへ行きます。』',a:'Emi goes to the zoo before breakfast.'},
 {id:'M3N-00100',subject:'英語',grade:'中3',category:'英語の語順',type:'選択',q:'次のうち正しい英文を選びなさい。 (A) The student running play. (B) The student go running. (C) Play the student running.',a:'B'},
 {id:'M3N-00101',subject:'英語',grade:'中3',category:'英語の語順',type:'空所補充',q:'The student (      ) to the station at noon. 「行きます」の意味になるように、空所に入る最も適切な語を書きなさい。',a:'Go'},
 {id:'M3N-00102',subject:'英語',grade:'中3',category:'英語の語順',type:'読解',q:'The student go running at noon. 問い：この英文の意味を書きなさい。',a:'The studentはat noonにrunningをします。'},
 {id:'M3N-00106',subject:'英語',grade:'中3',category:'英語の語順',type:'選択',q:'次のうち正しい英文を選びなさい。 (A) The teacher swimming play. (B) The teacher go swimming. (C) Play the teacher swimming.',a:'B'},
 {id:'M3N-00107',subject:'英語',grade:'中3',category:'英語の語順',type:'空所補充',q:'The teacher (      ) to the library at seven. 「行きます」の意味になるように、空所に入る最も適切な語を書きなさい。',a:'Go'},
 {id:'M3N-00108',subject:'英語',grade:'中3',category:'英語の語順',type:'読解',q:'The teacher go swimming at seven. 問い：この英文の意味を書きなさい。',a:'The teacherはat sevenにswimmingをします。'},
 {id:'M3N-00114',subject:'英語',grade:'中3',category:'英語の語順',type:'読解',q:'Our team play soccer at eight. 問い：この英文の意味を書きなさい。',a:'Our teamはat eightにsoccerをします。'},
 {id:'M3N-00118',subject:'英語',grade:'中3',category:'英語の語順',type:'選択',q:'次のうち正しい英文を選びなさい。 (A) This dog tennis play. (B) This dog play tennis. (C) Play this dog tennis.',a:'B'},
 {id:'M3N-00119',subject:'英語',grade:'中3',category:'英語の語順',type:'空所補充',q:'This dog (      ) to the room at six. 「行きます」の意味になるように、空所に入る最も適切な語を書きなさい。',a:'Go'},
 {id:'M3N-00120',subject:'英語',grade:'中3',category:'英語の語順',type:'読解',q:'This dog play tennis at six. 問い：この英文の意味を書きなさい。',a:'This dogはat sixにtennisをします。'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中3',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`,'utf8');
execFileSync(process.execPath,['tools/repair_m3_word_order_v4.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const by=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={
 'M3N-00008':{a:'You go to the park every day.'},
 'M3N-00009':{q:'次の日本語に合う英文を書きなさい。『あなたは毎日公園へ行きます。』'},
 'M3N-00011':{a:'go'},
 'M3N-00012':{q:'You play soccer every day. 問い：この英文の意味を書きなさい。',a:'あなたは毎日サッカーをします。'},
 'M3N-00070':{q:'次のうち正しい英文を選びなさい。 (A) Yuki tennis play. (B) Yuki plays tennis (C) Play Yuki tennis.',a:'B'},
 'M3N-00071':{a:'goes'},
 'M3N-00072':{q:'Yuki plays tennis every evening. 問い：この英文の意味を書きなさい。',a:'ユキは毎晩テニスをします。'},
 'M3N-00073':{q:'次の語(句)を正しい順に並べかえなさい。 ( Tom / baseball / plays / after class )',a:'Tom plays baseball after class.'},
 'M3N-00075':{q:'次の日本語に合う英文を書きなさい。『トムは授業の後に事務所へ行きます。』'},
 'M3N-00081':{q:'次の日本語に合う英文を書きなさい。『エミは朝食前に動物園へ行きます。』'},
 'M3N-00100':{q:'次のうち正しい英文を選びなさい。 (A) The student running play. (B) The student goes running (C) Play the student running.',a:'B'},
 'M3N-00101':{a:'goes'},
 'M3N-00102':{q:'The student goes running at noon. 問い：この英文の意味を書きなさい。',a:'その生徒は正午に走りに行きます。'},
 'M3N-00106':{q:'次のうち正しい英文を選びなさい。 (A) The teacher swimming play. (B) The teacher goes swimming (C) Play the teacher swimming.',a:'B'},
 'M3N-00107':{a:'goes'},
 'M3N-00108':{q:'The teacher goes swimming at seven. 問い：この英文の意味を書きなさい。',a:'その先生は7時に泳ぎに行きます。'},
 'M3N-00114':{q:'Our team plays soccer at eight. 問い：この英文の意味を書きなさい。',a:'私たちのチームは8時にサッカーをします。'},
 'M3N-00118':{q:'次のうち正しい英文を選びなさい。 (A) This dog tennis play. (B) This dog plays tennis (C) Play this dog tennis.',a:'B'},
 'M3N-00119':{a:'goes'},
 'M3N-00120':{q:'This dog plays tennis at six. 問い：この英文の意味を書きなさい。',a:'この犬は6時にテニスをします。'}
};
for(const [id,want] of Object.entries(expected))for(const [k,v] of Object.entries(want))if(by[id]?.[k]!==v)throw new Error(`${id}.${k}: expected ${v} got ${by[id]?.[k]}`);
console.log('M3 word-order V4 regression: OK');
