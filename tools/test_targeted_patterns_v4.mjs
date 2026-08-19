#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-targeted-v4-'));
const input=path.join(dir,'input.html');
const output=path.join(dir,'output.html');
try{
  const qb=[];
  for(let i=0;i<10000;i++) qb.push({id:`FILL-${String(i).padStart(5,'0')}`,subject:'英語',grade:'中1',category:'その他',type:'選択',q:'Choose A.',a:'A'});
  qb.push({id:'GEN-PRS-TEST1',subject:'英語',grade:'中1',category:'一般動詞',type:'空所補充',q:'I (      ) basketball after school. 「バスケットボールをします」',a:'Play'});
  qb.push({id:'M2-GER2-TEST1',subject:'英語',grade:'中2',category:'動名詞',type:'間違い直し',q:'She love to listen to music. の誤りを直しなさい。',a:'She love listening to music.'});
  qb.push({id:'M2-COMP2-TEST1',subject:'英語',grade:'中2',category:'比較',type:'間違い直し',q:'He is more small than He. の誤りを直しなさい。',a:'He is smaller than He.'});
  fs.writeFileSync(input,`<!doctype html><html><body><script id="qb-data" type="application/json">${JSON.stringify(qb)}</script></body></html>`,'utf8');
  execFileSync(process.execPath,['tools/repair_targeted_patterns_v4.mjs',input,output],{stdio:'inherit'});
  const html=fs.readFileSync(output,'utf8');
  const m=html.match(/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/);
  if(!m) throw new Error('qb-data missing after targeted V4');
  const out=JSON.parse(m[1]);
  const byId=new Map(out.map(x=>[x.id,x]));
  const gen=byId.get('GEN-PRS-TEST1');
  if(gen?.a!=='play') throw new Error(`GEN-PRS lowercase repair failed: ${gen?.a}`);
  const ger=byId.get('M2-GER2-TEST1');
  if(ger?.type!=='変形') throw new Error(`M2-GER2 type repair failed: ${ger?.type}`);
  if(ger?.a!=='She loves listening to music.') throw new Error(`M2-GER2 repair failed: ${ger?.a}`);
  if(!/動名詞に直して/.test(ger?.q||'')) throw new Error(`M2-GER2 explicit instruction missing: ${ger?.q}`);
  const comp=byId.get('M2-COMP2-TEST1');
  if(/than He\b/.test(`${comp?.q} ${comp?.a}`)) throw new Error(`M2-COMP2 than He remains: ${comp?.q} / ${comp?.a}`);
  if(comp?.a!=='He is smaller than Ken.') throw new Error(`M2-COMP2 repair failed: ${comp?.a}`);
  const audit=JSON.parse(fs.readFileSync(output+'.targeted-v3.audit.json','utf8'));
  if(audit.status!=='OK'||audit.version!=='v4'||audit.audit?.errors?.length) throw new Error(`targeted V4 audit failed: ${JSON.stringify(audit)}`);
  console.log('Mikami targeted patterns V4 regression: OK');
}finally{
  fs.rmSync(dir,{recursive:true,force:true});
}
