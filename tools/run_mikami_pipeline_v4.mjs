#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const [,,inputPath,outputPath='app_zero_vocab_gate_single_latest_repaired_v4.html']=process.argv;
if(!inputPath){
  console.error('Usage: node tools/run_mikami_pipeline_v4.mjs <canonical.html> [output.html]');
  process.exit(2);
}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-v4-pipeline-'));
const v3=path.join(tmp,'01-v3.html');
const rel=path.join(tmp,'02-relative.html');
const run=(script,args)=>execFileSync(process.execPath,[script,...args],{stdio:'inherit'});
try{
  run('tools/run_mikami_pipeline_v3.mjs',[inputPath,v3]);
  run('tools/repair_relative_pronouns_v4.mjs',[v3,rel]);
  run('tools/fix_relative_runtime_gate_v4.mjs',[rel,outputPath]);

  const out=fs.readFileSync(outputPath,'utf8');
  const m=out.match(/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/);
  if(!m) throw new Error('FINAL V4 qb-data missing');
  const qb=JSON.parse(m[1]);
  const errors=[];
  for(const x of qb){
    if(x?.subject!=='英語'||x?.grade!=='中3'||x?.category!=='関係代名詞') continue;
    const id=String(x.id||''),q=String(x.q||''),a=String(x.a||'');
    if(x.type==='空所補充'&&/\(\s*\)/.test(q)){
      if(!/who\s*\/\s*which/i.test(q)) errors.push(`${id}: ambiguous relative-pronoun blank`);
      if(!/^(?:who|which)$/i.test(a)) errors.push(`${id}: invalid blank answer ${a}`);
    }
    if(/^The dog\s*\([^)]*\)/i.test(q)&&/^who$/i.test(a)) errors.push(`${id}: dog treated as person`);
    if(/^This is the (?:chair|picture|bag|bike)\s*\([^)]*\)\s*you read last week\./i.test(q)) errors.push(`${id}: semantic mismatch read`);
    if(/^This is the (?:chair|bike)\s*\([^)]*\)\s*is on the desk\./i.test(q)) errors.push(`${id}: semantic mismatch on desk`);
    if(/『[^』]*(?:\bbike\b|\bbook\b|\bbag\b|\bpicture\b|\bcamera\b|\bchair\b|\bboy\b|\bgirl\b|\bteacher\b|\bstudent\b|\bdog\b)[^』]*』/i.test(q)) errors.push(`${id}: English noun in Japanese quotation`);
  }
  if(errors.length) throw new Error(`FINAL V4 relative-pronoun audit failed: ${errors.slice(0,20).join(' | ')}`);
  if(!out.includes("if (!/who\\s*\\/\\s*which/i.test(q)) return false;")) throw new Error('FINAL V4 relative runtime gate missing');

  const v3Audit=JSON.parse(fs.readFileSync(v3+'.pipeline-v3.audit.json','utf8'));
  const relAudit=JSON.parse(fs.readFileSync(rel+'.relative-pronoun-v4.audit.json','utf8'));
  const report={
    status:'OK',
    input:inputPath,
    output:outputPath,
    question_count:v3Audit.question_count,
    inherited_pipeline:'V3',
    v3:v3Audit,
    relative_pronoun_v4_changed:relAudit.changed,
    gates:{...v3Audit.gates,relative_pronoun_unique_blank:true},
    final_relative_errors:0
  };
  fs.writeFileSync(outputPath+'.pipeline-v4.audit.json',JSON.stringify(report,null,2),'utf8');
  console.log(JSON.stringify(report,null,2));
}catch(e){
  try{if(fs.existsSync(outputPath))fs.unlinkSync(outputPath);}catch{}
  console.error(`MIKAMI V4 PIPELINE FAILED: ${e.message}`);
  process.exit(4);
}finally{
  try{fs.rmSync(tmp,{recursive:true,force:true});}catch{}
}
