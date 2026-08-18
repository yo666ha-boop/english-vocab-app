#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-full-v2-'));
const input=path.join(dir,'canonical.html');
const output=path.join(dir,'final.html');

const cases=[
  {id:'R1-PRON-0001',subject:'英語',grade:'中1',category:'人称代名詞',type:'選択',q:'( I / me / my ) is my friend.',a:'I'},
  {id:'R1-PRON-0002',subject:'英語',grade:'中1',category:'人称代名詞',type:'空所補充',q:'This is he.',a:'he'},
  {id:'GEN-PRS-0729',subject:'英語',grade:'中1',category:'一般動詞（現在形）',type:'変形',q:'We practice tennis. を疑問文にしなさい。',a:'Do you practice tennis?'},
  {id:'GEN-PRS-0731',subject:'英語',grade:'中1',category:'一般動詞（現在形）',type:'空所補充',q:'We (      ) every day. 「ピアノを練習します」',a:'Practice tennis'},
  {id:'M2-GER2-1001',subject:'英語',grade:'中2',category:'動名詞',type:'間違い直し',q:'Mika love listening to music.',a:'Mika love listening to music.'},
  {id:'M2-COMP2-1001',subject:'英語',grade:'中2',category:'比較',type:'間違い直し',q:'He is smaller than He.',a:'He is smaller than He.'},
  {id:'M2X-INF-1001',subject:'英語',grade:'中2',category:'不定詞①',type:'変形',q:'We want to play tennis. を否定文または疑問文に直しなさい。',a:'Do you want to play tennis?'},
  {id:'M2-RD2-1549',subject:'英語',grade:'中2',category:'読解',type:'読解',q:'本文の内容を日本語で説明しなさい。',a:'I will play soccer tomorrow.'},
  {id:'PP-TEST-1',subject:'英語',grade:'中3',category:'現在完了形（完了・経験）',type:'変形',q:'We have finished my homework. を疑問文にしなさい。',a:'Do you have finished my homework?'},
  {id:'REL-TEST-1',subject:'英語',grade:'中3',category:'関係代名詞',type:'空所補充',q:'The girl (      ) is running is my sister.',a:'Who'},
  {id:'M3N-00124',subject:'英語',grade:'中3',category:'be動詞と一般動詞（現在形）',type:'間違い直し',q:'Do I busy? の誤りを直しなさい。',a:'Are you busy?'},
  {id:'M3N-00168',subject:'英語',grade:'中3',category:'be動詞と一般動詞（現在形）',type:'変形',q:'My mother go running. を疑問文にしなさい。',a:'Do my mother go running?'},
  {id:'M3N-00244',subject:'英語',grade:'中3',category:'be動詞と一般動詞（過去形）',type:'間違い直し',q:'Did I busy yesterday? の誤りを直しなさい。',a:'Were I busy yesterday?'},
  {id:'M3N-00246',subject:'英語',grade:'中3',category:'be動詞と一般動詞（過去形）',type:'変形',q:'I played tennis yesterday. を疑問文にしなさい。',a:'Did you play tennis yesterday?'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中3',category:'dummy',type:'dummy',q:'x',a:'x'}));
const qb=[...cases,...filler];
const passMeta=Object.fromEntries(cases.map((x,i)=>[x.id,{サンシャイン:i===0?0:3,ニューホライズン:i===1?-1:3}]));
const meta={passMeta,counts:{}};

const passesVocab=`function passesVocab(item, overrideMode) {\n  if (item.subject !== '英語') return true;\n  const mode = overrideMode || (useVocabGate() ? 'on' : 'off');\n  if (mode === 'off') return true;\n  if (item.grade !== currentGrade()) return true;\n  const rec = meta.passMeta[item.id] || {};\n  const minIdx = rec[currentTextbook()];\n  return Number.isInteger(minIdx) && minIdx >= 0 && minIdx <= currentSectionIndex();\n}`;
const baseFiltered=`function baseFiltered(overrideMode) {\n  const subj = currentSubject();\n  const grade = currentGrade();\n  const categories = selectedCategories();\n  const types = selectedValues('input[data-type]');\n  return qb.filter(item => {\n    if (item.subject !== subj) return false;\n    if (item.grade !== grade) return false;\n    if (categories.length && !categories.includes(item.category)) return false;\n    if (types.length && !types.includes(item.type)) return false;\n    if (!passesVocab(item, overrideMode)) return false;\n    return true;\n  });\n}`;
const subjectConfig=`const subjectConfig={'英語':{stagesByGrade:{'中1':['人称代名詞','一般動詞（現在形）'],'中2':['不定詞①','動名詞','比較','読解'],'中3':['be動詞と一般動詞（現在形）','be動詞と一般動詞（過去形）','現在完了形（完了・経験）','関係代名詞']},stageMap:{'中1':{'人称代名詞':['人称代名詞'],'一般動詞（現在形）':['一般動詞（現在形）']},'中2':{'不定詞①':['不定詞①'],'動名詞':['動名詞'],'比較':['比較'],'読解':['読解']},'中3':{'be動詞と一般動詞（現在形）':['be動詞と一般動詞（現在形）'],'be動詞と一般動詞（過去形）':['be動詞と一般動詞（過去形）'],'現在完了形（完了・経験）':['現在完了形（完了・経験）'],'関係代名詞':['関係代名詞']}}}};`;
const shell=`<!doctype html><html><body><script id="qb-data" type="application/json">${JSON.stringify(qb)}</script><script id="meta-data" type="application/json">${JSON.stringify(meta)}</script><script>${subjectConfig}function selectedCategories(){return [];}function selectedValues(){return [];}function currentSubject(){return '英語';}function currentGrade(){return '中3';}function currentTextbook(){return 'ニューホライズン';}function currentSectionIndex(){return 99;}function useVocabGate(){return true;}${passesVocab}${baseFiltered}</script></body></html>`;
fs.writeFileSync(input,shell);
execFileSync(process.execPath,['tools/run_mikami_pipeline_v2.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const parsed=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const byId=Object.fromEntries(parsed.map(x=>[x.id,x]));
const expected={
 'R1-PRON-0001':{a:'I'},
 'R1-PRON-0002':{a:'me'},
 'GEN-PRS-0729':{a:'Do we practice tennis?'},
 'GEN-PRS-0731':{a:'practice the piano'},
 'M2-GER2-1001':{a:'Mika enjoys listening to music.'},
 'M2-COMP2-1001':{a:'Ken is smaller than Tom.'},
 'M2X-INF-1001':{q:'We want to play tennis. を疑問文にしなさい。',a:'Do we want to play tennis?'},
 'M2-RD2-1549':{a:'明日、サッカーをします。'},
 'PP-TEST-1':{q:'We have finished our homework. を疑問文にしなさい。',a:'Have we finished our homework?'},
 'REL-TEST-1':{type:'選択',a:'who'},
 'M3N-00124':{a:'Am I busy?'},
 'M3N-00168':{q:'My mother goes running. を疑問文にしなさい。',a:'Does my mother go running?'},
 'M3N-00244':{a:'Was I busy yesterday?'},
 'M3N-00246':{a:'Did I play tennis yesterday?'}
};
for(const [id,want] of Object.entries(expected)) for(const [k,v] of Object.entries(want)) if(byId[id]?.[k]!==v) throw new Error(`${id}.${k}: expected ${v}, got ${byId[id]?.[k]}`);
for(const marker of ['minIdx <= 0) return false','passesPrereqGrammar(item)','passesQualityGate(item)']) if(!out.includes(marker)) throw new Error(`missing runtime gate: ${marker}`);
for(const bad of [/This is (?:he|she|we)\b/i,/\bthan He\b/,/否定文または疑問文/,/Do you have (?:visited|been|finished|lost|lived|studied|seen|done)/i]) if(bad.test(out)) throw new Error(`known bad pattern remains: ${bad}`);
console.log('Mikami full v2 repair regression: OK');
