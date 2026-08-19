#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-relative-v4-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
 {id:'M3C-01342',subject:'英語',grade:'中3',category:'関係代名詞',type:'空所補充',q:'The dog (      ) plays tennis is my friend.',a:'Who'},
 {id:'M3C-01362',subject:'英語',grade:'中3',category:'関係代名詞',type:'空所補充',q:'This is the chair (      ) is on the desk.',a:'Which'},
 {id:'M3C-01364',subject:'英語',grade:'中3',category:'関係代名詞',type:'空所補充',q:'This is the chair (      ) you read last week.',a:'Which'},
 {id:'M3C-01374',subject:'英語',grade:'中3',category:'関係代名詞',type:'空所補充',q:'This is the bag (      ) you read last week.',a:'Which'},
 {id:'M3N-02203',subject:'英語',grade:'中3',category:'関係代名詞',type:'空所補充',q:'The boy (      ) is running is my friend. 空所に入る最も適切な語を書きなさい。',a:'Who'},
 {id:'M3N-02204',subject:'英語',grade:'中3',category:'関係代名詞',type:'空所補充',q:'This is the bike (      ) I bought yesterday. 空所に入る最も適切な語を書きなさい。',a:'Which'},
 {id:'M3N-02205',subject:'英語',grade:'中3',category:'関係代名詞',type:'英作文',q:'次の日本語に合う英文を書きなさい。『あれは私の父が作ったbikeです。』',a:'That is the bike which my father made.'},
 {id:'M3N-02200',subject:'英語',grade:'中3',category:'関係代名詞',type:'間違い直し',q:'The girl which lives next door is kind. の誤りを直しなさい。',a:'The girl who lives next door is kind.'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中3',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_relative_pronouns_v4.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const by=Object.fromEntries(qb.map(x=>[x.id,x]));
const checks={
 'M3C-01342':{q:'The boy (      ) plays tennis is my friend. 空所に入る語を who / which から選びなさい。',a:'who'},
 'M3C-01362':{q:'This is the chair (      ) is in this room. 空所に入る語を who / which から選びなさい。',a:'which'},
 'M3C-01364':{q:'This is the chair (      ) you used last week. 空所に入る語を who / which から選びなさい。',a:'which'},
 'M3C-01374':{q:'This is the bag (      ) you used last week. 空所に入る語を who / which から選びなさい。',a:'which'},
 'M3N-02203':{q:'The boy (      ) is running is my friend. 空所に入る語を who / which から選びなさい。',a:'who'},
 'M3N-02204':{q:'This is the bike (      ) I bought yesterday. 空所に入る語を who / which から選びなさい。',a:'which'},
 'M3N-02205':{q:'次の日本語に合う英文を書きなさい。『あれは私の父が作った自転車です。』',a:'That is the bike which my father made.'},
 'M3N-02200':{q:'The girl which lives next door is kind. の誤りを直しなさい。',a:'The girl who lives next door is kind.'}
};
for(const [id,want] of Object.entries(checks)) for(const [k,v] of Object.entries(want)) if(by[id]?.[k]!==v) throw new Error(`${id}.${k}: expected ${v} got ${by[id]?.[k]}`);
console.log('Relative-pronoun V4 regression: OK');
