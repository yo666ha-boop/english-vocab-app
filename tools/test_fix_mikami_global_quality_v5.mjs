#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-global-v5-'));
const input=path.join(dir,'canonical.html');
const output=path.join(dir,'fixed.html');
const fillers=Array.from({length:10010},(_,i)=>({id:`SAFE-${String(i).padStart(5,'0')}`,subject:'英語',grade:'中1',category:'一般',type:'選択',q:`Safe question ${i}.`,a:'safe'}));
const cases=[
  {id:'R1-PRON-0001',subject:'英語',grade:'中1',category:'代名詞',type:'選択',q:'( I / me / my ) am a student.',a:'I'},
  {id:'GEN-PRS-0001',subject:'英語',grade:'中1',category:'一般動詞',type:'変形',q:'Do You play tennis?',a:'Do You play tennis?'},
  {id:'M2-GER2-0001',subject:'英語',grade:'中2',category:'動名詞',type:'空所補充',q:'I enjoy (play) tennis.',a:'playing'},
  {id:'M2-COMP2-0001',subject:'英語',grade:'中2',category:'比較',type:'選択',q:'Ken is taller than Tom.',a:'taller'},
  {id:'M2X-INF-0001',subject:'英語',grade:'中2',category:'不定詞',type:'変形',q:'We want to play tennis. を疑問文にしなさい。',a:'Do we want to play tennis?'},
  {id:'M2-RD2-1549',subject:'英語',grade:'中2',category:'読解',type:'読解',q:'本文の内容を日本語で説明しなさい。',a:'明日、サッカーをします。'},
  {id:'M2-COMP-0651',subject:'英語',grade:'中2',category:'比較',type:'選択',q:'He is smaller than He.',a:'He is smaller than He.'},
  {id:'M2X-COMP-0661',subject:'英語',grade:'中2',category:'比較',type:'選択',q:'My friend is taller than He.',a:'My friend is taller than He.'},
  {id:'M2X-GER-0605',subject:'英語',grade:'中2',category:'動名詞',type:'選択',q:'She love listening to music.',a:'She love listening to music.'},
  {id:'M2Y-GER-0329',subject:'英語',grade:'中2',category:'動名詞',type:'選択',q:'Mika begin studying English.',a:'Mika begin studying English.'},
  {id:'R2-PRON-0067',subject:'英語',grade:'中2',category:'代名詞',type:'選択',q:'Choose ( she / her / her ).',a:'hers'}
];
const qb=[...cases,...fillers];
const meta={passMeta:{}};
const gate=`function passesVocab(item, overrideMode) {\n  if (item.subject !== '英語') return true;\n  const mode = overrideMode || (useVocabGate() ? 'on' : 'off');\n  if (mode === 'off') return true;\n  if (item.grade !== currentGrade()) return true;\n  const rec = meta.passMeta[item.id] || {};\n  const minIdx = rec[currentTextbook()];\n  return Number.isInteger(minIdx) && minIdx >= 0 && minIdx <= currentSectionIndex();\n}`;
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify(qb)}</script><script id="meta-data" type="application/json">${JSON.stringify(meta)}</script><script>${gate}</script>`,'utf8');
try{
  execFileSync(process.execPath,['tools/fix_mikami_canonical.mjs',input,output],{stdio:'inherit',cwd:process.cwd()});
  const html=fs.readFileSync(output,'utf8');
  const m=html.match(/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/);
  if(!m) throw new Error('qb-data missing after repair');
  const out=JSON.parse(m[1]);
  const byId=new Map(out.map(x=>[x.id,x]));
  const expect={
    'M2-COMP-0651':['Ken is smaller than Tom.','Ken is smaller than Tom.'],
    'M2X-COMP-0661':['My friend is taller than Ken.','My friend is taller than Ken.'],
    'M2X-GER-0605':['She loves listening to music.','She loves listening to music.'],
    'M2Y-GER-0329':['Mika begins studying English.','Mika begins studying English.'],
    'R2-PRON-0067':['Choose ( she / her / hers ).','hers']
  };
  for(const [id,[q,a]] of Object.entries(expect)){
    const x=byId.get(id); if(!x||x.q!==q||x.a!==a) throw new Error(`${id} mismatch: ${JSON.stringify(x)}`);
  }
  const valid=byId.get('GEN-PRS-0001');
  if(!valid || valid.a!=='Do You play tennis?') throw new Error('valid sentence-initial Do You was incorrectly rejected/rewritten');
  if(!html.includes('minIdx <= 0) return false')) throw new Error('vocab fail-closed gate missing');
  console.log('Mikami global legacy quality V5 regression: OK');
} finally {
  fs.rmSync(dir,{recursive:true,force:true});
}
