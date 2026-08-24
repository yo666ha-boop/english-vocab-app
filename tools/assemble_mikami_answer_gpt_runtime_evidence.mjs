#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const KIT = {
  drive_folder_id: '1J82Ur6Q-_OFRmkNq0swc6oP8bR0Z6FYj',
  knowledge_file_id: '1_F6scCbMtPK0jw0Hi9eExqstDz2vWahk',
  knowledge_records: 10511,
  knowledge_sha256: 'be820c3e4d5c26773d642f1c055fea33f2796d71b6fca16f4e1edf5efc6f9213',
  instructions_file_id: '1z_xPUgAkwcigqRzWjUB3JQy_6ATnPAik',
  instructions_sha256: '084ff607a70e679e32bc100c4081aaed7f22ebf5058d469ba20a079bd192b0be',
  schema_file_id: '1ceQyoCVmgHiRHS_jVppEbDBYUYpf0fvE',
  schema_sha256: '8f33784b205cafe663e0c797b806e5b37036b3b06aec987eb45a7008ff37567b'
};
const CASE_IDS=['correct_original','multi_category_errors','unreadable_answer','school_test'];
const SCHEMA_VERSION='mikami-answer-gpt-evidence-chain-v2';
const BINDING_ALGORITHM='sha256-stable-json-excluding-runtime-results-sha-and-binding-digest';
const REQUIRED_SECTIONS=[
  'みかみ塾 英語答案分析レポート','基本情報','1. 今回できていたこと','2. 間違いが集中したところ',
  '3. いちばん大きな原因','4. 戻るならここ','5. 次にやること','6. 生徒へのひとこと'
];
const REQUIRED_A4_RULES=['avoid_wide_tables','do_not_reprint_large_numbers_of_full_questions','show_held_or_unreadable_items','use_short_headings_and_paragraphs'];

function assert(c,m){if(!c)throw new Error(m)}
function sha256(data){return crypto.createHash('sha256').update(data).digest('hex')}
function fileSha(p){assert(fs.existsSync(p),`evidence file missing: ${p}`);return sha256(fs.readFileSync(p))}
function isIso(v){return typeof v==='string'&&v&&!Number.isNaN(Date.parse(v))}
function stable(value){
  if(Array.isArray(value)) return value.map(stable);
  if(value&&typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
}
function bindingDigest(manifest){
  const copy=structuredClone(manifest);
  copy.binding ||= {};
  copy.binding.binding_digest_sha256='';
  copy.runtime_results ||= {};
  copy.runtime_results.results_json_sha256='';
  return sha256(Buffer.from(JSON.stringify(stable(copy)),'utf8'));
}
function actualGptUrl(v,{allowSelfTest=false}={}){
  if(allowSelfTest&&v==='SELF_TEST_ONLY')return true;
  try{const u=new URL(v);return u.protocol==='https:'&&['chatgpt.com','chat.openai.com'].includes(u.hostname)&&/^\/g\/[A-Za-z0-9_-]+/.test(u.pathname)}catch{return false}
}
function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8'))}
function resolveEvidence(base,p){assert(typeof p==='string'&&p.trim(),'evidence path missing');return path.resolve(base,p)}

export function assemble(inputPath,outDir,{allowSelfTest=false}={}){
  const input=readJson(inputPath); const base=path.dirname(path.resolve(inputPath));
  assert(actualGptUrl(input.gpt_url,{allowSelfTest}),'actual Custom GPT /g/ URL required');
  assert(isIso(input.registration_verified_at),'registration_verified_at must be ISO datetime');
  const regProof=resolveEvidence(base,input.registration_evidence_file);
  const registrationEvidenceSha=fileSha(regProof);

  assert(Array.isArray(input.cases)&&input.cases.length===4,'exactly four runtime cases required');
  const ids=input.cases.map(x=>x?.id);assert(new Set(ids).size===4&&CASE_IDS.every(id=>ids.includes(id)),'runtime case set mismatch');
  const cases=[];
  for(const id of CASE_IDS){
    const c=input.cases.find(x=>x.id===id); assert(c,`missing case ${id}`);
    assert(c.source_mode===(id==='school_test'?'school_test':'mikami_canonical'),`${id}: source_mode mismatch`);
    assert(isIso(c.executed_at),`${id}: executed_at must be ISO datetime`);
    assert(c.behaviors&&typeof c.behaviors==='object'&&Object.values(c.behaviors).every(v=>v===true),`${id}: all recorded behaviors must be true before assembly`);
    assert(typeof c.result_summary==='string'&&c.result_summary.trim(),`${id}: result_summary missing`);
    const photo=resolveEvidence(base,c.photo_file); const transcript=resolveEvidence(base,c.response_transcript_file);
    cases.push({...c,photo_sha256:fileSha(photo),response_transcript_sha256:fileSha(transcript)});
  }

  const a=input.a4_report||{};
  assert(a.actual_render_or_print_test===true,'A4 actual render/print confirmation required');
  assert(a.orientation==='portrait','A4 must be portrait');
  assert(Number.isInteger(a.page_count)&&a.page_count>=1&&a.page_count<=2,'A4 page_count must be 1-2');
  assert(isIso(a.checked_at),'A4 checked_at must be ISO datetime');
  assert(typeof a.evidence_ref==='string'&&a.evidence_ref.trim(),'A4 evidence_ref missing');
  const sections=new Set(a.sections_present||[]);for(const s of REQUIRED_SECTIONS)assert(sections.has(s),`A4 missing section: ${s}`);
  for(const r of REQUIRED_A4_RULES)assert(a.rules?.[r]===true,`A4 rule not verified: ${r}`);
  const a4Pdf=resolveEvidence(base,a.rendered_pdf_file); const a4Sha=fileSha(a4Pdf);

  const f=input.final_gate||{};
  for(const key of ['exact_id_lookup_verified','prerequisite_return_point_verified','held_handling_verified','school_test_separation_verified']) assert(f[key]===true,`final_gate.${key} must be true`);
  assert(['remove_legacy','permanent_fallback'].includes(f.legacy_copy_paste_decision),'legacy_copy_paste_decision invalid');
  assert(typeof f.private_evidence_ref==='string'&&f.private_evidence_ref.trim(),'private_evidence_ref missing');
  assert(f.overall_runtime_pass===true,'overall_runtime_pass must be true before assembly');

  const manifest={
    schema_version:SCHEMA_VERSION,
    binding:{algorithm:BINDING_ALGORITHM,binding_digest_sha256:''},
    registration_kit:{...KIT},
    custom_gpt:{gpt_url:input.gpt_url,registration_verified_at:input.registration_verified_at,registration_evidence_sha256:registrationEvidenceSha},
    photo_cases:cases.map(c=>({id:c.id,photo_sha256:c.photo_sha256,response_transcript_sha256:c.response_transcript_sha256,executed_at:c.executed_at})),
    a4_report:{rendered_pdf_sha256:a4Sha,checked_at:a.checked_at,page_count:a.page_count,orientation:a.orientation,evidence_ref:a.evidence_ref},
    runtime_results:{results_json_sha256:''}
  };
  manifest.binding.binding_digest_sha256=bindingDigest(manifest);

  const runtime={
    registration:{
      actual_custom_gpt:true,
      registration_kit_drive_folder_id:KIT.drive_folder_id,
      knowledge_registered:true,knowledge_file_id:KIT.knowledge_file_id,knowledge_records:KIT.knowledge_records,knowledge_sha256:KIT.knowledge_sha256,
      instructions_applied:true,instructions_file_id:KIT.instructions_file_id,instructions_sha256:KIT.instructions_sha256,
      output_schema_applied:true,output_schema_file_id:KIT.schema_file_id,output_schema_sha256:KIT.schema_sha256,
      gpt_url:input.gpt_url,verified_at:input.registration_verified_at,registration_evidence_sha256:registrationEvidenceSha
    },
    cases:cases.map(c=>({
      id:c.id,source_mode:c.source_mode,executed_in_actual_custom_gpt:true,photo_attached:true,executed_at:c.executed_at,
      photo_sha256:c.photo_sha256,response_transcript_sha256:c.response_transcript_sha256,behaviors:c.behaviors,result_summary:c.result_summary
    })),
    a4_report:{
      actual_render_or_print_test:true,orientation:a.orientation,page_count:a.page_count,checked_at:a.checked_at,rendered_pdf_sha256:a4Sha,
      render_or_print_evidence_ref:a.evidence_ref,sections_present:a.sections_present,rules:a.rules
    },
    final_gate:{...f,evidence_manifest_sha256:manifest.binding.binding_digest_sha256}
  };
  const runtimeRaw=Buffer.from(JSON.stringify(runtime,null,2)+'\n','utf8');
  manifest.runtime_results.results_json_sha256=sha256(runtimeRaw);

  const hashes=[registrationEvidenceSha,manifest.binding.binding_digest_sha256,a4Sha,manifest.runtime_results.results_json_sha256,...cases.flatMap(c=>[c.photo_sha256,c.response_transcript_sha256])];
  assert(new Set(hashes).size===hashes.length,'evidence hash collision detected');

  fs.mkdirSync(outDir,{recursive:true});
  const runtimePath=path.join(outDir,'mikami_answer_gpt_true_runtime_results.actual.json');
  const manifestPath=path.join(outDir,'mikami_answer_gpt_evidence_manifest.actual.json');
  fs.writeFileSync(runtimePath,runtimeRaw);
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n','utf8');
  return {status:'PASS',runtimePath,manifestPath,runtime_sha256:manifest.runtime_results.results_json_sha256,binding_digest_sha256:manifest.binding.binding_digest_sha256,evidence_hashes:hashes.length};
}

function selfTest(){
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-runtime-evidence-assembler-'));
  try{
    const touch=(name,text)=>{const p=path.join(d,name);fs.writeFileSync(p,text);return name};
    touch('registration.png','registration-proof'); touch('report.pdf','pdf-proof');
    const cases=CASE_IDS.map((id,i)=>({
      id,source_mode:id==='school_test'?'school_test':'mikami_canonical',executed_at:`2026-08-24T20:0${i}:00+09:00`,
      photo_file:touch(`${id}.jpg`,`photo-${id}`),response_transcript_file:touch(`${id}.txt`,`response-${id}`),behaviors:{self_test_verified:true},result_summary:'SELF_TEST_ONLY'
    }));
    const input={
      gpt_url:'SELF_TEST_ONLY',registration_verified_at:'2026-08-24T20:00:00+09:00',registration_evidence_file:'registration.png',cases,
      a4_report:{actual_render_or_print_test:true,orientation:'portrait',page_count:1,checked_at:'2026-08-24T20:10:00+09:00',rendered_pdf_file:'report.pdf',evidence_ref:'SELF_TEST_ONLY',sections_present:REQUIRED_SECTIONS,rules:Object.fromEntries(REQUIRED_A4_RULES.map(x=>[x,true]))},
      final_gate:{exact_id_lookup_verified:true,prerequisite_return_point_verified:true,held_handling_verified:true,school_test_separation_verified:true,legacy_copy_paste_decision:'permanent_fallback',private_evidence_ref:'SELF_TEST_ONLY',overall_runtime_pass:true}
    };
    const inputPath=path.join(d,'input.json');fs.writeFileSync(inputPath,JSON.stringify(input,null,2));
    const out=assemble(inputPath,path.join(d,'out'),{allowSelfTest:true});
    assert(fs.existsSync(out.runtimePath)&&fs.existsSync(out.manifestPath),'assembler outputs missing');
    const m=readJson(out.manifestPath);const r=readJson(out.runtimePath);
    assert(m.binding.binding_digest_sha256===r.final_gate.evidence_manifest_sha256,'binding digest not propagated to runtime');
    assert(m.runtime_results.results_json_sha256===fileSha(out.runtimePath),'runtime SHA binding mismatch');
    let rejected=false; const bad=structuredClone(input);bad.cases[0].behaviors={self_test_verified:false};fs.writeFileSync(inputPath,JSON.stringify(bad));
    try{assemble(inputPath,path.join(d,'bad'),{allowSelfTest:true})}catch{rejected=true}assert(rejected,'false behavior was accepted');
    console.log('PASS_RUNTIME_EVIDENCE_ASSEMBLER_SELF_TEST');
    console.log(`EVIDENCE_HASHES=${out.evidence_hashes}`);
    console.log('REAL_RUNTIME_EXECUTED=false');
  }finally{fs.rmSync(d,{recursive:true,force:true})}
}

try{
  const args=process.argv.slice(2);
  if(args.includes('--self-test')) selfTest();
  else {
    const [inputPath,outDir='release/private-runtime-evidence']=args;
    assert(inputPath,'Usage: node tools/assemble_mikami_answer_gpt_runtime_evidence.mjs <runtime-evidence-input.json> [out-dir] | --self-test');
    console.log(JSON.stringify(assemble(inputPath,outDir),null,2));
  }
}catch(e){console.error('FAIL_RUNTIME_EVIDENCE_ASSEMBLER');console.error(e?.message||String(e));process.exit(1)}
