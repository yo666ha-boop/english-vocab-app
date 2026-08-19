#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const rawArgs=process.argv.slice(2);
const resetCheckpoints=rawArgs.includes('--reset-checkpoints');
const args=rawArgs.filter(x=>x!=='--reset-checkpoints');
const [inputPath,outputPath='app_zero_vocab_gate_single_latest_repaired_v4.html']=args;
if(!inputPath){
  console.error('Usage: node tools/run_mikami_pipeline_v4.mjs <canonical.html> [output.html] [--reset-checkpoints]');
  process.exit(2);
}

const CHECKPOINT_VERSION='mikami-v4-resume-1';
const checkpointDir=process.env.MIKAMI_CHECKPOINT_DIR||`${outputPath}.checkpoints`;
const statePath=path.join(checkpointDir,'state.json');
const sourceSha256=crypto.createHash('sha256').update(fs.readFileSync(inputPath)).digest('hex');
if(resetCheckpoints&&fs.existsSync(checkpointDir)) fs.rmSync(checkpointDir,{recursive:true,force:true});
fs.mkdirSync(checkpointDir,{recursive:true});

const atomicJson=(p,obj)=>{
  const tmp=`${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp,JSON.stringify(obj,null,2),'utf8');
  fs.renameSync(tmp,p);
};
const loadState=()=>{
  if(!fs.existsSync(statePath)) return {
    checkpoint_version:CHECKPOINT_VERSION,
    source_sha256:sourceSha256,
    source_path:inputPath,
    output_path:outputPath,
    status:'READY',
    completed_stages:[],
    last_stage:null,
    failed_stage:null,
    updated_at:new Date().toISOString()
  };
  const s=JSON.parse(fs.readFileSync(statePath,'utf8'));
  if(s.checkpoint_version!==CHECKPOINT_VERSION) throw new Error(`CHECKPOINT VERSION MISMATCH: ${s.checkpoint_version} != ${CHECKPOINT_VERSION}; rerun with --reset-checkpoints`);
  if(s.source_sha256!==sourceSha256) throw new Error('CHECKPOINT SOURCE MISMATCH; refusing to reuse checkpoints from a different canonical file. Rerun with --reset-checkpoints.');
  return s;
};
let state=loadState();
const saveState=(patch={})=>{
  state={...state,...patch,updated_at:new Date().toISOString()};
  atomicJson(statePath,state);
};
saveState();

const v3=path.join(checkpointDir,'01-v3.html');
const targeted=path.join(checkpointDir,'02-targeted-v4.html');
const rel=path.join(checkpointDir,'03-relative.html');
const blankCase=path.join(checkpointDir,'04-blank-case.html');
const finalCheckpoint=path.join(checkpointDir,'05-relative-gate-final.html');
const run=(script,args)=>execFileSync(process.execPath,[script,...args],{stdio:'inherit'});
const validHtml=(p)=>{
  if(!fs.existsSync(p)||fs.statSync(p).size<1000) return false;
  const text=fs.readFileSync(p,'utf8');
  return /<script\s+id=["']qb-data["']\s+type=["']application\/json["']>/i.test(text)&&/<\/html>\s*$/i.test(text.trim());
};
const stageReady=(out,audits=[])=>validHtml(out)&&audits.every(a=>fs.existsSync(a)&&fs.statSync(a).size>0);
const stageRun=(name,script,inPath,outPath,audits=[])=>{
  if(stageReady(outPath,audits)){
    const completed=new Set(state.completed_stages||[]);
    completed.add(name);
    saveState({status:'RESUMING',last_stage:name,failed_stage:null,completed_stages:[...completed]});
    console.log(`[checkpoint] SKIP completed stage: ${name}`);
    return;
  }
  saveState({status:'RUNNING',last_stage:name,failed_stage:null});
  console.log(`[checkpoint] RUN stage: ${name}`);
  try{
    run(script,[inPath,outPath]);
    if(!stageReady(outPath,audits)) throw new Error(`stage artifacts incomplete after ${name}`);
    const completed=new Set(state.completed_stages||[]);
    completed.add(name);
    saveState({status:'RUNNING',last_stage:name,failed_stage:null,completed_stages:[...completed]});
  }catch(e){
    saveState({status:'FAILED',failed_stage:name,last_stage:name,error:String(e?.message||e)});
    throw e;
  }
};

try{
  stageRun('01-v3','tools/run_mikami_pipeline_v3.mjs',inputPath,v3,[v3+'.pipeline-v3.audit.json']);
  stageRun('02-targeted-v4','tools/repair_targeted_patterns_v4.mjs',v3,targeted,[targeted+'.targeted-v3.audit.json']);
  stageRun('03-relative-v4','tools/repair_relative_pronouns_v4.mjs',targeted,rel,[rel+'.relative-pronoun-v4.audit.json']);
  stageRun('04-blank-case-v4','tools/repair_mid_sentence_blank_case_v4.mjs',rel,blankCase,[blankCase+'.mid-sentence-blank-case-v4.audit.json']);
  stageRun('05-relative-runtime-gate-v4','tools/fix_relative_runtime_gate_v4.mjs',blankCase,finalCheckpoint);
  fs.copyFileSync(finalCheckpoint,outputPath);

  const out=fs.readFileSync(outputPath,'utf8');
  const m=out.match(/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/);
  if(!m) throw new Error('FINAL V4 qb-data missing');
  const qb=JSON.parse(m[1]);
  const errors=[];
  const lowerable=new Set(['am','is','are','was','were','do','does','did','have','has','had','can','will','must','should','may','to','who','which','that','play','plays','study','studies','like','likes','love','loves','want','wants','need','needs','read','reads','use','uses','go','goes','come','comes','visit','visits','practice','practices','speak','speaks','finish','finishes','enjoy','enjoys','watch','watches','help','helps','make','makes','take','takes','live','lives','work','works','run','runs','swim','swims','write','writes','eat','eats','drink','drinks','buy','buys','call','calls','join','joins','listen','listens','start','starts','stop','stops']);
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
    final_quality_errors:0,
    resumable_checkpoint:{version:CHECKPOINT_VERSION,directory:checkpointDir,source_sha256:sourceSha256,completed_stages:state.completed_stages}
  };
  fs.writeFileSync(outputPath+'.pipeline-v4.audit.json',JSON.stringify(report,null,2),'utf8');
  saveState({status:'COMPLETE',failed_stage:null,error:null,last_stage:'FINAL_AUDIT',final_output:outputPath,final_audit:outputPath+'.pipeline-v4.audit.json'});
  console.log(JSON.stringify(report,null,2));
}catch(e){
  try{if(fs.existsSync(outputPath))fs.unlinkSync(outputPath);}catch{}
  if(state.status!=='FAILED') saveState({status:'FAILED',failed_stage:state.failed_stage||'FINAL_AUDIT',error:String(e?.message||e)});
  console.error(`MIKAMI V4 PIPELINE FAILED: ${e.message}`);
  process.exit(4);
}
