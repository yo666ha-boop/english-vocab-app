#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const [,,inputPath,outputPath='14b01a93-de5d-4c95-a655-932d2f3f2513_repaired.html']=process.argv;
if(!inputPath){console.error('Usage: node tools/run_mikami_pipeline_v3.mjs <canonical.html> [output.html]');process.exit(2);}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-v3-pipeline-'));
const s1=path.join(tmp,'01-targeted-v3.html');
const s2=path.join(tmp,'02-base.html');
const s3=path.join(tmp,'03-m3.html');
const s4=path.join(tmp,'04-case.html');
const run=(script,args)=>execFileSync(process.execPath,[script,...args],{stdio:'inherit'});
try{
  // Normalize generated families first so the strict canonical audit does not stop on known delegated defects.
  run('tools/repair_targeted_patterns_v3.mjs',[inputPath,s1]);
  run('tools/fix_mikami_canonical.mjs',[s1,s2]);
  run('tools/repair_m3_review.mjs',[s2,s3]);
  run('tools/normalize_question_subject_case.mjs',[s3,s4]);
  run('tools/apply_mikami_runtime_gates.mjs',[s4,outputPath]);

  const out=fs.readFileSync(outputPath,'utf8');
  for(const marker of ['id="qb-data"','id="meta-data"','passesPrereqGrammar(item)','passesQualityGate(item)','minIdx <= 0) return false']){
    if(!out.includes(marker)) throw new Error(`FINAL GATE MISSING: ${marker}`);
  }
  const m=out.match(/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/);
  if(!m) throw new Error('FINAL qb-data missing');
  const qb=JSON.parse(m[1]);
  const bankText=qb.map(x=>`${x.id}\n${x.q||''}\n${x.a||''}`).join('\n');
  const forbidden=[
    /This is (?:he|she|we)\b/i,
    /\bthan He\b|than\s*\/\s*He\b/,
    /否定文または疑問文/,
    /Do you have (?:visited|been|finished|lost|lived|studied|seen|done)/i,
    /\b(?:Mika|She) (?:love|begin|stop)\b/,
    /Did You ne\b|Do You\b|Do They\b|Does She\b|Does He\b/,
    /practice\s*\/\s*the\s*\/\s*tennis/i
  ];
  for(const re of forbidden) if(re.test(bankText)) throw new Error(`FINAL KNOWN-BAD QUESTION PATTERN: ${re}`);
  for(const x of qb){
    if(/日本語で説明しなさい/.test(String(x.q||''))&&/^[A-Za-z]/.test(String(x.a||''))) throw new Error(`FINAL Japanese-answer mismatch: ${x.id}`);
    if(String(x.id||'').startsWith('GEN-PRS-')&&x.type==='空所補充'&&/^[A-Z]/.test(String(x.a||''))) throw new Error(`FINAL capitalized GEN blank: ${x.id}`);
    if(String(x.id||'').startsWith('M2-GER2-')&&x.type==='空所補充'&&/^[A-Z]/.test(String(x.a||''))) throw new Error(`FINAL capitalized GER blank: ${x.id}`);
  }

  const targetedAudit=JSON.parse(fs.readFileSync(s1+'.targeted-v3.audit.json','utf8'));
  const baseAudit=JSON.parse(fs.readFileSync(s2+'.audit.json','utf8'));
  const m3Audit=JSON.parse(fs.readFileSync(s3+'.m3-review.audit.json','utf8'));
  const report={
    status:'OK',input:inputPath,output:outputPath,
    question_count:baseAudit.question_count,
    targeted_v3_changed:targetedAudit.changed,
    base_changed:baseAudit.changed_items,
    m3_changed:m3Audit.changed,
    uncertain_vocab_positions:baseAudit.audit.uncertain_vocab_positions,
    gates:{vocab_fail_closed:true,prerequisite:true,quality:true}
  };
  fs.writeFileSync(outputPath+'.pipeline-v3.audit.json',JSON.stringify(report,null,2),'utf8');
  console.log(JSON.stringify(report,null,2));
}catch(e){
  try{if(fs.existsSync(outputPath))fs.unlinkSync(outputPath);}catch{}
  console.error(`MIKAMI V3 PIPELINE FAILED: ${e.message}`);
  process.exit(4);
}finally{
  try{fs.rmSync(tmp,{recursive:true,force:true});}catch{}
}
