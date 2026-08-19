#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const rawArgs=process.argv.slice(2);
const reset=rawArgs.includes('--reset-checkpoints');
const args=rawArgs.filter(x=>x!=='--reset-checkpoints');
const [inputPath,outputPath='14b01a93-de5d-4c95-a655-932d2f3f2513_repaired.html']=args;
if(!inputPath){
  console.error('Usage: node tools/run_mikami_pipeline_v3_resumable.mjs <canonical.html> [output.html] [--reset-checkpoints]');
  process.exit(2);
}

const VERSION='mikami-v3-resume-1';
const dir=process.env.MIKAMI_V3_CHECKPOINT_DIR||`${outputPath}.v3-checkpoints`;
const statePath=path.join(dir,'state.json');
const sourceSha256=crypto.createHash('sha256').update(fs.readFileSync(inputPath)).digest('hex');
if(reset&&fs.existsSync(dir)) fs.rmSync(dir,{recursive:true,force:true});
fs.mkdirSync(dir,{recursive:true});

const atomicJson=(p,obj)=>{
  const tmp=`${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp,JSON.stringify(obj,null,2),'utf8');
  fs.renameSync(tmp,p);
};
const initialState=()=>({
  checkpoint_version:VERSION,
  source_sha256:sourceSha256,
  source_path:inputPath,
  output_path:outputPath,
  status:'READY',
  completed_stages:[],
  last_stage:null,
  failed_stage:null,
  updated_at:new Date().toISOString()
});
let state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):initialState();
if(state.checkpoint_version!==VERSION) throw new Error(`CHECKPOINT VERSION MISMATCH: ${state.checkpoint_version} != ${VERSION}; rerun with --reset-checkpoints`);
if(state.source_sha256!==sourceSha256) throw new Error('CHECKPOINT SOURCE MISMATCH; refusing to reuse another canonical source. Rerun with --reset-checkpoints.');
const save=(patch={})=>{
  state={...state,...patch,updated_at:new Date().toISOString()};
  atomicJson(statePath,state);
};
save();

const run=(script,args)=>execFileSync(process.execPath,[script,...args],{stdio:'inherit'});
const validHtml=p=>{
  if(!fs.existsSync(p)||fs.statSync(p).size<1000) return false;
  const s=fs.readFileSync(p,'utf8');
  return /<script\s+id=["']qb-data["']\s+type=["']application\/json["']>/i.test(s)&&/<script\s+id=["']meta-data["']\s+type=["']application\/json["']>/i.test(s);
};
const ready=(out,audits=[])=>validHtml(out)&&audits.every(a=>fs.existsSync(a)&&fs.statSync(a).size>0);
const stage=(name,script,input,output,audits=[])=>{
  if(ready(output,audits)){
    const completed=new Set(state.completed_stages||[]); completed.add(name);
    save({status:'RESUMING',last_stage:name,failed_stage:null,error:null,completed_stages:[...completed]});
    console.log(`[v3-checkpoint] SKIP ${name}`);
    return;
  }
  save({status:'RUNNING',last_stage:name,failed_stage:null,error:null});
  console.log(`[v3-checkpoint] RUN ${name}`);
  try{
    run(script,[input,output]);
    if(!ready(output,audits)) throw new Error(`stage artifacts incomplete: ${name}`);
    const completed=new Set(state.completed_stages||[]); completed.add(name);
    save({status:'RUNNING',last_stage:name,completed_stages:[...completed]});
  }catch(e){
    save({status:'FAILED',last_stage:name,failed_stage:name,error:String(e?.message||e)});
    throw e;
  }
};
const p=name=>path.join(dir,name);
const s1=p('01-targeted-pre.html');
const s2=p('02-base.html');
const s3=p('03-targeted-post.html');
const s4=p('04-gen-be-v4.html');
const s5=p('05-gen-pbe-v4.html');
const s6=p('06-gen-pdid-v4.html');
const s7=p('07-m2-infinitive-bank-v4.html');
const s8=p('08-m2-past-v4.html');
const s9=p('09-infinitive-v3.html');
const s10=p('10-m3c-review-v4.html');
const s11=p('11-present-perfect-v3.html');
const s12=p('12-reading-v3.html');
const s13=p('13-m3-word-order-v4.html');
const s14=p('14-m3-infinitive2-v4.html');
const s15=p('15-m3-review.html');
const s16=p('16-subject-case.html');
const s17=p('17-vocab-v7.html');
const s18=p('18-runtime-gates.html');
const finalAuditPath=p('19-final-canonical.audit.json');

try{
  stage('01-targeted-pre','tools/repair_targeted_patterns_v3.mjs',inputPath,s1,[s1+'.targeted-v3.audit.json']);
  stage('02-base','tools/fix_mikami_canonical.mjs',s1,s2,[s2+'.audit.json']);
  stage('03-targeted-post','tools/repair_targeted_patterns_v3.mjs',s2,s3,[s3+'.targeted-v3.audit.json']);
  stage('04-gen-be-v4','tools/repair_gen_be_v4.mjs',s3,s4,[s4+'.gen-be-v4.audit.json']);
  stage('05-gen-pbe-v4','tools/repair_gen_pbe_v4.mjs',s4,s5,[s5+'.gen-pbe-v4.audit.json']);
  stage('06-gen-pdid-v4','tools/repair_gen_pdid_v4.mjs',s5,s6,[s6+'.gen-pdid-v4.audit.json']);
  stage('07-m2-infinitive-bank-v4','tools/repair_m2_infinitive_bank_v4.mjs',s6,s7,[s7+'.m2-infinitive-bank-v4.audit.json']);
  stage('08-m2-past-v4','tools/repair_m2_past_v4.mjs',s7,s8,[s8+'.m2-past-v4.audit.json']);
  stage('09-infinitive-v3','tools/repair_infinitive_v3.mjs',s8,s9);
  stage('10-m3c-review-v4','tools/repair_m3c_review_v4.mjs',s9,s10,[s10+'.m3c-review-v4.audit.json']);
  stage('11-present-perfect-v3','tools/repair_present_perfect_v3.mjs',s10,s11);
  stage('12-reading-v3','tools/repair_reading_v3.mjs',s11,s12);
  stage('13-m3-word-order-v4','tools/repair_m3_word_order_v4.mjs',s12,s13,[s13+'.m3-word-order-v4.audit.json']);
  stage('14-m3-infinitive2-v4','tools/repair_m3_infinitive2_v4.mjs',s13,s14,[s14+'.m3-infinitive2-v4.audit.json']);
  stage('15-m3-review','tools/repair_m3_review.mjs',s14,s15,[s15+'.m3-review.audit.json']);
  stage('16-subject-case','tools/normalize_question_subject_case.mjs',s15,s16);
  stage('17-vocab-v7','tools/migrate_vocab_coordinates_v7.mjs',s16,s17,[s17+'.v7-coordinate.audit.json']);
  stage('18-runtime-gates','tools/apply_mikami_runtime_gates.mjs',s17,s18);

  save({status:'AUDITING',last_stage:'19-final-audit',failed_stage:null,error:null});
  run('tools/audit_final_canonical.mjs',[s18,inputPath,finalAuditPath]);
  const finalAudit=JSON.parse(fs.readFileSync(finalAuditPath,'utf8'));
  if(finalAudit.status!=='OK'||finalAudit.final_quality_errors!==0) throw new Error(`final canonical audit failed with ${finalAudit.final_quality_errors} errors`);
  const out=fs.readFileSync(s18,'utf8');
  for(const marker of [
    'passesPrereqGrammar(item)','passesQualityGate(item)','v7-2026-08-18-1based',
    'currentLearnerTextbook','currentLearnerSection','allCurrentLearnersGrammarPassed','allCurrentLearnersVocabPassed',
    "useVocabGate() ? 'on' : 'off'",'if (minIdx <= 0) return false;'
  ]) if(!out.includes(marker)) throw new Error(`FINAL GATE MISSING: ${marker}`);

  const readJson=f=>JSON.parse(fs.readFileSync(f,'utf8'));
  const preAudit=readJson(s1+'.targeted-v3.audit.json');
  const baseAudit=readJson(s2+'.audit.json');
  const postAudit=readJson(s3+'.targeted-v3.audit.json');
  const genBeAudit=readJson(s4+'.gen-be-v4.audit.json');
  const genPbeAudit=readJson(s5+'.gen-pbe-v4.audit.json');
  const genPdidAudit=readJson(s6+'.gen-pdid-v4.audit.json');
  const m2InfAudit=readJson(s7+'.m2-infinitive-bank-v4.audit.json');
  const m2PastAudit=readJson(s8+'.m2-past-v4.audit.json');
  const m3cAudit=readJson(s10+'.m3c-review-v4.audit.json');
  const wordOrderAudit=readJson(s13+'.m3-word-order-v4.audit.json');
  const inf2Audit=readJson(s14+'.m3-infinitive2-v4.audit.json');
  const m3Audit=readJson(s15+'.m3-review.audit.json');
  const vocabAudit=readJson(s17+'.v7-coordinate.audit.json');
  const report={
    status:'OK',input:inputPath,output:outputPath,question_count:baseAudit.question_count,
    targeted_v3_pre_changed:preAudit.changed,base_changed:baseAudit.changed_items,targeted_v3_post_changed:postAudit.changed,
    gen_be_v4_changed:genBeAudit.changed,gen_pbe_v4_changed:genPbeAudit.changed,gen_pdid_v4_changed:genPdidAudit.changed,
    m2_infinitive_bank_v4_changed:m2InfAudit.changed,m2_past_v4_changed:m2PastAudit.changed,m3c_review_v4_changed:m3cAudit.changed,
    m3_word_order_v4_changed:wordOrderAudit.changed,m3_infinitive2_v4_changed:inf2Audit.changed,m3_changed:m3Audit.changed,
    vocab_coordinate_version:vocabAudit.version,vocab_migration:vocabAudit.stats,
    gates:{vocab_v7_1based:true,vocab_unknown_fail_closed:true,vocab_prior_grade_pass:true,prerequisite:true,quality:true,gen_be:true,gen_pbe:true,gen_pdid:true,m2_infinitive_bank:true,m2_past:true,m3c_review:true},
    final_invariant_audit:finalAudit,
    resumable_checkpoint:{version:VERSION,directory:dir,source_sha256:sourceSha256,completed_stages:state.completed_stages}
  };
  fs.copyFileSync(s18,outputPath);
  fs.writeFileSync(outputPath+'.pipeline-v3.audit.json',JSON.stringify(report,null,2),'utf8');
  save({status:'COMPLETE',last_stage:'FINAL',failed_stage:null,error:null,final_output:outputPath,final_audit:outputPath+'.pipeline-v3.audit.json'});
  console.log(JSON.stringify(report,null,2));
}catch(e){
  save({status:'FAILED',failed_stage:state.failed_stage||state.last_stage||'FINAL',error:String(e?.message||e)});
  try{if(fs.existsSync(outputPath))fs.unlinkSync(outputPath);}catch{}
  console.error(`MIKAMI V3 RESUMABLE PIPELINE FAILED: ${e.message}`);
  process.exit(4);
}
