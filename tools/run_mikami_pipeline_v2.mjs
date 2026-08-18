#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const [,, inputPath, outputPath='14b01a93-de5d-4c95-a655-932d2f3f2513_repaired.html']=process.argv;
if(!inputPath){console.error('Usage: node tools/run_mikami_pipeline_v2.mjs <canonical.html> [output.html]');process.exit(2);}
const tmpDir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-pipeline-'));
const s1=path.join(tmpDir,'01-bank.html');
const s2=path.join(tmpDir,'02-m3.html');
const s3=path.join(tmpDir,'03-case.html');
const run=(script,args)=>execFileSync(process.execPath,[script,...args],{stdio:'inherit'});
try{
  run('tools/fix_mikami_canonical.mjs',[inputPath,s1]);
  run('tools/repair_m3_review.mjs',[s1,s2]);
  run('tools/normalize_question_subject_case.mjs',[s2,s3]);
  run('tools/apply_mikami_runtime_gates.mjs',[s3,outputPath]);

  const out=fs.readFileSync(outputPath,'utf8');
  for(const marker of ['id="qb-data"','id="meta-data"','passesPrereqGrammar(item)','passesQualityGate(item)','minIdx <= 0) return false']){
    if(!out.includes(marker))throw new Error(`FINAL GATE MISSING: ${marker}`);
  }

  const qbMatch=out.match(/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/);
  if(!qbMatch)throw new Error('FINAL qb-data missing');
  const qb=JSON.parse(qbMatch[1]);
  const bankText=qb.map(x=>`${x.id}\n${x.q||''}\n${x.a||''}`).join('\n');

  const forbidden=[
    /This is (?:he|she|we)\b/i,
    /\bthan He\b/,
    /否定文または疑問文/,
    /Do you have (?:visited|been|finished|lost|lived|studied|seen|done)/i,
    /\b(?:Mika|She) (?:love|begin|stop)\b/,
    /Did You ne\b|Do You\b|Do They\b|Does She\b|Does He\b/
  ];
  for(const re of forbidden)if(re.test(bankText))throw new Error(`FINAL KNOWN-BAD QUESTION PATTERN: ${re}`);
  for(const x of qb){
    if(/日本語で説明しなさい/.test(String(x.q||'')) && /^[A-Za-z]/.test(String(x.a||''))) throw new Error(`FINAL Japanese-answer mismatch: ${x.id}`);
  }

  const bankAudit=JSON.parse(fs.readFileSync(s1+'.audit.json','utf8'));
  const m3Audit=JSON.parse(fs.readFileSync(s2+'.m3-review.audit.json','utf8'));
  const report={
    status:'OK',input:inputPath,output:outputPath,
    bank_changed:bankAudit.changed_items,
    m3_changed:m3Audit.changed,
    question_count:bankAudit.question_count,
    uncertain_vocab_positions:bankAudit.audit.uncertain_vocab_positions,
    gates:{vocab_fail_closed:true,prerequisite:true,quality:true}
  };
  fs.writeFileSync(outputPath+'.pipeline.audit.json',JSON.stringify(report,null,2),'utf8');
  console.log(JSON.stringify(report,null,2));
}catch(e){
  try{if(fs.existsSync(outputPath))fs.unlinkSync(outputPath);}catch{}
  console.error(`MIKAMI PIPELINE FAILED: ${e.message}`);
  process.exit(4);
}finally{
  try{fs.rmSync(tmpDir,{recursive:true,force:true});}catch{}
}
