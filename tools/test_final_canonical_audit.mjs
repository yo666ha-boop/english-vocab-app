#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-final-audit-test-'));
const build=(qb)=>`<!doctype html><html><body><script id="qb-data" type="application/json">${JSON.stringify(qb)}</script><script id="meta-data" type="application/json">${JSON.stringify({vocabCoordinateVersion:'v7-2026-08-18-1based'})}</script><script>function passesPrereqGrammar(item){return true;} function passesQualityGate(item){return true;} const v='v7-2026-08-18-1based';</script></body></html>`;
const base=Array.from({length:10001},(_,i)=>({id:`T-${String(i+1).padStart(5,'0')}`,subject:'英語',grade:'中1',category:'test',type:'選択',q:'Choose the answer.',a:'A'}));
const run=(final,source,expectOk)=>{
  const fp=path.join(dir,`final-${Math.random()}.html`), sp=path.join(dir,`source-${Math.random()}.html`);
  fs.writeFileSync(fp,build(final),'utf8');
  fs.writeFileSync(sp,build(source),'utf8');
  let ok=true;
  try{execFileSync(process.execPath,['tools/audit_final_canonical.mjs',fp,sp],{cwd:process.cwd(),stdio:'pipe'});}catch{ok=false;}
  if(ok!==expectOk) throw new Error(`audit expectation mismatch: expected ${expectOk}, got ${ok}`);
};
try{
  run(base,base,true);
  const dup=base.map(x=>({...x})); dup[10000].id=dup[9999].id; run(dup,base,false);
  const jp=base.map(x=>({...x})); jp[0]={...jp[0],id:'M2-RD2-1549',q:'本文の内容を日本語で説明しなさい。',a:'I will play soccer tomorrow.'}; const jpSource=base.map(x=>({...x})); jpSource[0]={...jpSource[0],id:'M2-RD2-1549'}; run(jp,jpSource,false);
  const comp=base.map(x=>({...x})); comp[0]={...comp[0],id:'M2-COMP2-1547',q:'( My friend / than / He / is / more beautiful )',a:'My friend is more beautiful than He.'}; const compSource=base.map(x=>({...x})); compSource[0]={...compSource[0],id:'M2-COMP2-1547'}; run(comp,compSource,false);
  console.log('Mikami final canonical invariant audit regression: OK');
}finally{
  fs.rmSync(dir,{recursive:true,force:true});
}
