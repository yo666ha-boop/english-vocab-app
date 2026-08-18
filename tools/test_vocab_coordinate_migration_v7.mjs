#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-vocab-v7-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
 {id:'T-NH1-EXACT',subject:'英語',grade:'中1',category:'x',type:'x',q:'x',a:'x'},
 {id:'T-NH1-COMBINE',subject:'英語',grade:'中1',category:'x',type:'x',q:'x',a:'x'},
 {id:'T-NH1-OBSOLETE',subject:'英語',grade:'中1',category:'x',type:'x',q:'x',a:'x'},
 {id:'T-SS1-COMBINE',subject:'英語',grade:'中1',category:'x',type:'x',q:'x',a:'x'},
 {id:'T-NH3-BLOCK',subject:'英語',grade:'中3',category:'x',type:'x',q:'x',a:'x'},
 {id:'T-UNKNOWN0',subject:'英語',grade:'中2',category:'x',type:'x',q:'x',a:'x'},
 {id:'T-UNKNOWNM1',subject:'英語',grade:'中2',category:'x',type:'x',q:'x',a:'x'},
 {id:'T-PRIOR',subject:'英語',grade:'中2',category:'x',type:'x',q:'x',a:'x'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`D-${i}`,subject:'数学',grade:'中3',category:'x',type:'x',q:'x',a:'x'}));
const qb=[...cases,...filler];
const nh1=['Unit 0','Sounds and Letters 0','Unit 1-1','Unit 1-2','Unit 1-3','Sounds and Letters 1','Unit 2-1','Unit 2-2','Unit 2-3','Sounds and Letters 2','Unit 3-1','Unit 3-2','Unit 3-3','Sounds and Letters 3','Unit 4-1','Unit 4-2','Unit 4-3','Sounds and Letters 4','Stage Activity 1','Unit 5-1','Unit 5-2','Unit 5-3','Unit 6-1','Unit 6-2','Unit 6-3','Real Life English 2','Unit 7-1','Unit 7-2','Unit 7-3','Real Life English 3','Unit 8-1','Unit 8-2','Unit 8-3','Real Life English 4','Stage Activity 2','Unit 9-1','Unit 9-2','Unit 9-3','Real Life English 5','Unit 10-1','Unit 10-2','Unit 10-3','Real Life English 6','Stage Activity 3',"Let's Read 1","Let's Read 2"];
const ss1=['Get Ready 2','Get Ready 3','Get Ready 4','Get Ready 5','Get Ready 6','PROGRAM 1-1','PROGRAM 1-2','PROGRAM 1-3','PROGRAM 2-1','PROGRAM 2-2','PROGRAM 2-3','アクションコーナー','PROGRAM 3-1','PROGRAM 3-2','PROGRAM 3-3','Step 2 / Our Project 1','Power-Up 1','PROGRAM 4-1','PROGRAM 4-2','PROGRAM 4-3','PROGRAM 5-1','PROGRAM 5-2','PROGRAM 5-3','Power-Up 2','PROGRAM 6-1','PROGRAM 6-2','PROGRAM 6-3','Step 3','PROGRAM 7-1','PROGRAM 7-2','PROGRAM 7-3','疑問詞のまとめ','Power-Up 3','Our Project 2','PROGRAM 8-1','PROGRAM 8-2','PROGRAM 8-3','Power-Up 4','PROGRAM 9-1','PROGRAM 9-2','PROGRAM 9-3','PROGRAM 9-4','Step 5 / Power-Up 5','PROGRAM 10-1','PROGRAM 10-2','PROGRAM 10-3','PROGRAM 10-4','Step 6 / Our Project 3 / Power-Up 6'];
const nh3=['Unit 0','Unit 1-1','Unit 1-2','Unit 1-3','Unit 1-4','Unit 2-1','Unit 2-2','Unit 2-3','Unit 2-4','Unit 3-1','Unit 3-2','Unit 3-3','Unit 3-4','Real Life English 3','Stage Activity 1',"Let's Read 1-1","Let's Read 1-2",'Unit 4-1','Unit 4-2','Unit 4-3','Real Life English 4','Unit 5-1','Unit 5-2','Unit 5-3','Real Life English 5','Stage Activity 2','Unit 6-1','Unit 6-2','Unit 6-3','Stage Activity 3',"Let's Read 2-1","Let's Read 2-2","Let's Read 3-1","Let's Read 3-2"];
const meta={textbooks:['サンシャイン','ニューホライズン'],sections:{'ニューホライズン':{'1':nh1,'2':['Unit 0'],'3':nh3},'サンシャイン':{'1':ss1,'2':['PROGRAM 1-1'],'3':['PROGRAM 1-1']}},passMeta:{
 'T-NH1-EXACT':{'ニューホライズン':2},
 'T-NH1-COMBINE':{'ニューホライズン':31},
 'T-NH1-OBSOLETE':{'ニューホライズン':5},
 'T-SS1-COMBINE':{'サンシャイン':40},
 'T-NH3-BLOCK':{'ニューホライズン':33},
 'T-UNKNOWN0':{'ニューホライズン':0},
 'T-UNKNOWNM1':{'ニューホライズン':-1},
 'T-PRIOR':{'ニューホライズン':-2}
}};
const pass=`function passesVocab(item, overrideMode) {\n  if (item.subject !== '英語') return true;\n  const mode = overrideMode || (useVocabGate() ? 'on' : 'off');\n  if (mode === 'off') return true;\n  if (item.grade !== currentGrade()) return true;\n  const rec = meta.passMeta[item.id] || {};\n  const minIdx = rec[currentTextbook()];\n  return Number.isInteger(minIdx) && minIdx >= 0 && minIdx <= currentSectionIndex();\n}`;
const shell=`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify(qb)}</script><script id="meta-data" type="application/json">${JSON.stringify(meta)}</script><script>function renderSectionOptions(){} function currentSectionIndex(){return 0;} function currentGrade(){return '中1';} function currentTextbook(){return 'ニューホライズン';} function useVocabGate(){return true;} ${pass}</script>`;
fs.writeFileSync(input,shell);
execFileSync(process.execPath,['tools/migrate_vocab_coordinates_v7.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const m=JSON.parse(out.match(/<script id="meta-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const expect={
 'T-NH1-EXACT':10,             // old index2 = Unit1-1 -> new pos10
 'T-NH1-COMBINE':34,           // old index31 = Unit8-2 -> combined pos34
 'T-NH1-OBSOLETE':-1,          // old index5 = Sounds and Letters1 -> block
 'T-SS1-COMBINE':35,           // old index40 = PROGRAM9-3 -> combined pos35
 'T-NH3-BLOCK':-1,             // old index33 = Let's Read3-2 -> block
 'T-UNKNOWN0':0,
 'T-UNKNOWNM1':-1,
 'T-PRIOR':-2
};
for(const [id,want] of Object.entries(expect)){
 const tb=id.startsWith('T-SS')?'サンシャイン':'ニューホライズン';
 const got=m.passMeta[id][tb];if(got!==want)throw new Error(`${id}: expected ${want}, got ${got}`);
}
if(m.vocabCoordinateVersion!=='v7-2026-08-18-1based')throw new Error('version missing');
if(m.sections['ニューホライズン']['1'][0]!=='プレステップ2')throw new Error('NH1 v7 sections not installed');
if(!out.includes('if (minIdx === -2) return true'))throw new Error('-2 prior-grade gate missing');
if(!out.includes('const selectedOrdinal = currentSectionIndex() + 1'))throw new Error('1-based selection gate missing');
console.log('V7 coordinate migration regression: OK');
