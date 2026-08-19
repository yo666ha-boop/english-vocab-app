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
const targeted=path.join(tmp,'02-targeted-v4.html');
const rel=path.join(tmp,'03-relative.html');
const blankCase=path.join(tmp,'04-blank-case.html');
const run=(script,args)=>execFileSync(process.execPath,[script,...args],{stdio:'inherit'});
try{
  run('tools/run_mikami_pipeline_v3.mjs',[inputPath,v3]);
  run('tools/repair_targeted_patterns_v4.mjs',[v3,targeted]);
  run('tools/repair_relative_pronouns_v4.mjs',[targeted,rel]);
  run('tools/repair_mid_sentence_blank_case_v4.mjs',[rel,blankCase]);
  run('tools/fix_relative_runtime_gate_v4.mjs',[blankCase,outputPath]);

  const out=fs.readFileSync(outputPath,'utf8');
  const m=out.match(/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/);
  if(!m) throw new Error('FINAL V4 qb-data missing');
  const qb=JSON.parse(m[1]);
  const errors=[];
  const lowerable=new Set(['am','is','are','was','were','do','does','did','have','has','can','will','must','should','may','to','who','which','that','play','plays','study','studies','like','likes','love','loves','want','wants','need','needs','read','reads','use','uses','go','goes','come','comes','visit','visits','practice','practices','speak','speaks','finish','finishes','enjoy','enjoys','watch','watches','help','helps','make','makes','take','takes','live','lives','work','works','run','runs','swim','swims','write','writes','eat','eats','drink','drinks','buy','buys','call','calls','join','joins','listen','listens','start','starts','stop','stops']);
  for(const x of qb){
    const id=String(x.id||''),q=String(x.q||''),a=String(x.a||'').trim();
    if(x?.subject==='英語'&&x?.grade==='中3'&&x?.category==='関係代名詞'){
      if(x.type==='空所補充'&&/\(\s*\)/.test(q)){
        if(!/who\s*\/\s*which/i.test(q)) errors.push(`${id}: ambiguous relative-pronoun blank`);
        if(!/^(?:who|which)$/i.test(a)) errors.push(`${id}: invalid blank answer ${a}`);
      }
      if(/^The dog\s*\([^)]*\)/i.test(q)&&/^who$/i.test(a)) errors.push(`${id}: dog treated as person`);
      if(/^This is the (?:chair|picture|bag|bike)\s*\([^)]*\)\s*you read last week\./i.test(q)) errors.push(`${id}: semantic mismatch read`);
      if(/^This is the (?:chair|bike)\s*\([^)]*\)\s*is on the desk\./i.test(q)) errors.push(`${id}: semantic mismatch on desk`);
      if(/『[^』]*(?:\bbike\b|\bbook\b|\bbag\b|\bpicture\b|\bcamera\b|\bchair\b|\bboy\b|\bgirl\b|\bteacher\b|\bstudent\b|\bdog\b)[^』]*』/i.test(q)) errors.push(`${id}: English noun in Japanese quotation`);
    }
    if(x?.subject==='英語'&&x?.type==='空所補充'&&/^[A-Z][A-Za-z]*$/.test(a)&&lowerable.has(a.toLowerCase())){
      const bm=q.match(/\(\s*\)/);
      if(bm){
        const prefix=q.slice(0,bm.index).trimEnd();
        if(prefix&&!/[。.!?！？:：『「]$/.test(prefix)) errors.push(`${id}: capitalized mid-sentence blank ${a}`);
      }
    }
  }
  if(errors.length) throw new Error(`FINAL V4 quality audit failed: ${errors.slice(0,20).join(' | ')}`);
  if(!out.includes("if (!/who\\s*\\/\\s*which/i.test(q)) return false;")) throw new Error('FINAL V4 relative runtime gate missing');

  const v3Audit=JSON.parse(fs.readFileSync(v3+'.pipeline-v3.audit.json','utf8'));
  const targetedAudit=JSON.parse(fs.readFileSync(targeted+'.targeted-v3.audit.json','utf8'));
  const relAudit=JSON.parse(fs.readFileSync(rel+'.relative-pronoun-v4.audit.json','utf8'));
  const blankAudit=JSON.parse(fs.readFileSync(blankCase+'.mid-sentence-blank-case-v4.audit.json','utf8'));
  const report={
    status:'OK',
    input:inputPath,
    output:outputPath,
    question_count:v3Audit.question_count,
    inherited_pipeline:'V3',
    targeted_patterns_v4_changed:targetedAudit.changed,
    relative_pronoun_v4_changed:relAudit.changed,
    mid_sentence_blank_case_v4_changed:blankAudit.changed,
    gates:{...v3Audit.gates,targeted_patterns_v4:true,relative_pronoun_unique_blank:true,mid_sentence_blank_case:true},
    final_quality_errors:0
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
