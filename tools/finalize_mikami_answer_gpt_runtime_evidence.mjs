#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

function assert(c,m){if(!c)throw new Error(m)}
function run(script,args=[]){return execFileSync(process.execPath,[script,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']})}
function runVisible(script,args=[]){
  try{const out=run(script,args);if(out)process.stdout.write(out);return out}
  catch(e){if(e.stdout)process.stdout.write(String(e.stdout));if(e.stderr)process.stderr.write(String(e.stderr));throw e}
}
function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8'))}

function selfTest(){
  runVisible('tools/validate_mikami_answer_gpt_runtime_evidence_input.mjs',['--self-test']);
  runVisible('tools/assemble_mikami_answer_gpt_runtime_evidence.mjs',['--self-test']);
  console.log('PASS_RUNTIME_EVIDENCE_FINALIZER_SELF_TEST');
  console.log('ACTUAL_RUNTIME_VALIDATORS_NOT_BYPASSED=true');
  console.log('REAL_RUNTIME_EXECUTED=false');
}

function finalize(inputPath,outDir){
  assert(fs.existsSync(inputPath),'runtime evidence input file missing');
  fs.mkdirSync(outDir,{recursive:true});
  console.log('[1/5] validating explicit actual-runtime input');
  runVisible('tools/validate_mikami_answer_gpt_runtime_evidence_input.mjs',[inputPath]);
  console.log('[2/5] assembling cryptographic runtime evidence');
  const assembleRaw=runVisible('tools/assemble_mikami_answer_gpt_runtime_evidence.mjs',[inputPath,outDir]);
  const m=assembleRaw.match(/\{[\s\S]*\}\s*$/);assert(m,'assembler JSON result missing');
  const assembled=JSON.parse(m[0]);
  const runtimePath=assembled.runtimePath;
  const manifestPath=assembled.manifestPath;
  assert(fs.existsSync(runtimePath)&&fs.existsSync(manifestPath),'assembled evidence outputs missing');
  console.log('[3/5] validating exact registration asset identity');
  runVisible('tools/validate_mikami_answer_gpt_registration_asset_identity.mjs',[runtimePath]);
  console.log('[4/5] validating hardened true runtime gate');
  runVisible('tools/validate_mikami_answer_gpt_true_runtime.mjs',[runtimePath]);
  console.log('[5/5] validating non-circular evidence chain');
  runVisible('tools/validate_mikami_answer_gpt_evidence_chain.mjs',[manifestPath,runtimePath]);
  const runtime=readJson(runtimePath), manifest=readJson(manifestPath);
  const report={
    status:'PASS',
    actual_custom_gpt:true,
    gpt_url:runtime.registration.gpt_url,
    registration_kit_drive_folder_id:runtime.registration.registration_kit_drive_folder_id,
    knowledge_records:runtime.registration.knowledge_records,
    photo_cases:runtime.cases.length,
    a4_page_count:runtime.a4_report.page_count,
    a4_orientation:runtime.a4_report.orientation,
    runtime_results_sha256:manifest.runtime_results.results_json_sha256,
    evidence_binding_digest_sha256:manifest.binding.binding_digest_sha256,
    legacy_copy_paste_decision:runtime.final_gate.legacy_copy_paste_decision,
    overall_runtime_pass:runtime.final_gate.overall_runtime_pass,
    validators:{runtime_evidence_input:'PASS',registration_asset_identity:'PASS',true_runtime:'PASS',evidence_chain:'PASS'}
  };
  const reportPath=path.join(outDir,'mikami_answer_gpt_runtime_finalization.audit.json');
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n','utf8');
  console.log(JSON.stringify({...report,report_path:reportPath},null,2));
  return report;
}

try{
  const args=process.argv.slice(2);
  if(args.includes('--self-test')) selfTest();
  else {
    const inputPath=args[0], outDir=args[1]||'release/private-runtime-evidence';
    assert(inputPath,'Usage: node tools/finalize_mikami_answer_gpt_runtime_evidence.mjs <runtime-evidence-input.json> [out-dir] | --self-test');
    finalize(inputPath,outDir);
  }
}catch(e){console.error('FAIL_RUNTIME_EVIDENCE_FINALIZATION');console.error(e?.message||String(e));process.exit(1)}
