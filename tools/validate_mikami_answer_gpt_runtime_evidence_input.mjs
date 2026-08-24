#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT=process.cwd();
const CONTRACT_PATH=path.join(ROOT,'gpt/tests/mikami_answer_gpt_photo_acceptance_cases.json');
const SELF_TEST='SELF_TEST_ONLY';
const KIT={
  drive_folder_id:'1J82Ur6Q-_OFRmkNq0swc6oP8bR0Z6FYj',
  knowledge_file_id:'1_F6scCbMtPK0jw0Hi9eExqstDz2vWahk',
  knowledge_records:10511,
  knowledge_sha256:'be820c3e4d5c26773d642f1c055fea33f2796d71b6fca16f4e1edf5efc6f9213',
  instructions_file_id:'1z_xPUgAkwcigqRzWjUB3JQy_6ATnPAik',
  instructions_sha256:'084ff607a70e679e32bc100c4081aaed7f22ebf5058d469ba20a079bd192b0be',
  output_schema_file_id:'1ceQyoCVmgHiRHS_jVppEbDBYUYpf0fvE',
  output_schema_sha256:'8f33784b205cafe663e0c797b806e5b37036b3b06aec987eb45a7008ff37567b'
};
function assert(c,m){if(!c)throw new Error(m)}
function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8'))}
function isIso(v){return typeof v==='string'&&v.trim()&&!Number.isNaN(Date.parse(v))}
function nonPlaceholder(v,{allowSelfTest=false}={}){const s=String(v||'');return !!s.trim()&&(allowSelfTest||!/(SELF_TEST|PLACEHOLDER|TODO|PENDING)/i.test(s))}
function validGptUrl(v,{allowSelfTest=false}={}){
  if(allowSelfTest&&v===SELF_TEST)return true;
  try{const u=new URL(v);return u.protocol==='https:'&&['chatgpt.com','chat.openai.com'].includes(u.hostname)&&/^\/g\/[A-Za-z0-9_-]+/.test(u.pathname)}catch{return false}
}
function existingEvidence(base,p,label,{allowSelfTest=false}={}){
  assert(nonPlaceholder(p,{allowSelfTest}),`${label} path missing/placeholder`);
  const full=path.resolve(base,p);assert(fs.existsSync(full)&&fs.statSync(full).isFile()&&fs.statSync(full).size>0,`${label} file missing/empty: ${full}`);return full;
}

export function validateInput(inputPath,{allowSelfTest=false}={}){
  const x=readJson(inputPath);const base=path.dirname(path.resolve(inputPath));const contract=readJson(CONTRACT_PATH);
  assert(validGptUrl(x.gpt_url,{allowSelfTest}),'actual Custom GPT /g/ URL required');
  assert(isIso(x.registration_verified_at),'registration_verified_at invalid');
  existingEvidence(base,x.registration_evidence_file,'registration evidence',{allowSelfTest});
  const r=x.registration||{};
  assert(r.actual_custom_gpt===true,'registration.actual_custom_gpt must be explicitly true');
  assert(r.knowledge_registered===true,'registration.knowledge_registered must be explicitly true');
  assert(r.instructions_applied===true,'registration.instructions_applied must be explicitly true');
  assert(r.output_schema_applied===true,'registration.output_schema_applied must be explicitly true');
  assert(r.registration_kit_drive_folder_id===KIT.drive_folder_id,'registration kit folder ID mismatch');
  assert(r.knowledge_file_id===KIT.knowledge_file_id,'Knowledge file ID mismatch');
  assert(r.knowledge_records===KIT.knowledge_records,'Knowledge record count mismatch');
  assert(r.knowledge_sha256===KIT.knowledge_sha256,'Knowledge SHA mismatch');
  assert(r.instructions_file_id===KIT.instructions_file_id,'Instructions file ID mismatch');
  assert(r.instructions_sha256===KIT.instructions_sha256,'Instructions SHA mismatch');
  assert(r.output_schema_file_id===KIT.output_schema_file_id,'output schema file ID mismatch');
  assert(r.output_schema_sha256===KIT.output_schema_sha256,'output schema SHA mismatch');

  assert(Array.isArray(x.cases)&&x.cases.length===contract.cases.length,`exactly ${contract.cases.length} cases required`);
  const ids=x.cases.map(c=>c?.id);assert(new Set(ids).size===ids.length,'duplicate runtime case id');
  const expectedIds=new Set(contract.cases.map(c=>c.id));for(const id of ids)assert(expectedIds.has(id),`unknown runtime case: ${id}`);
  for(const expected of contract.cases){
    const c=x.cases.find(y=>y.id===expected.id);assert(c,`missing case ${expected.id}`);
    assert(c.source_mode===expected.source_mode,`${expected.id}: source_mode mismatch`);
    assert(c.executed_in_actual_custom_gpt===true,`${expected.id}: actual Custom GPT execution must be explicitly true`);
    assert(c.photo_attached===true,`${expected.id}: photo_attached must be explicitly true`);
    assert(isIso(c.executed_at),`${expected.id}: executed_at invalid`);
    existingEvidence(base,c.photo_file,`${expected.id} photo`,{allowSelfTest});
    existingEvidence(base,c.response_transcript_file,`${expected.id} transcript`,{allowSelfTest});
    const behaviors=c.behaviors||{};
    for(const key of expected.required_behaviors)assert(behaviors[key]===true,`${expected.id}: required behavior not explicitly true: ${key}`);
    assert(Object.keys(behaviors).every(k=>expected.required_behaviors.includes(k)),`${expected.id}: unknown behavior key present`);
    assert(nonPlaceholder(c.result_summary,{allowSelfTest}),`${expected.id}: result_summary missing/placeholder`);
  }

  const a=x.a4_report||{}, ac=contract.a4_report_acceptance;
  assert(a.actual_render_or_print_test===true,'A4 actual render/print test must be explicitly true');
  assert(a.orientation===ac.orientation,'A4 orientation mismatch');
  assert(Number.isInteger(a.page_count)&&a.page_count>=ac.target_pages_min&&a.page_count<=ac.target_pages_max,`A4 page_count must be ${ac.target_pages_min}-${ac.target_pages_max}`);
  assert(isIso(a.checked_at),'A4 checked_at invalid');
  existingEvidence(base,a.rendered_pdf_file,'A4 rendered PDF',{allowSelfTest});
  assert(nonPlaceholder(a.evidence_ref,{allowSelfTest}),'A4 evidence_ref missing/placeholder');
  const sections=new Set(a.sections_present||[]);for(const s of ac.required_sections)assert(sections.has(s),`A4 missing required section: ${s}`);
  assert(sections.size===ac.required_sections.length,'A4 sections_present must contain exactly the acceptance sections');
  for(const rule of ac.rules)assert(a.rules?.[rule]===true,`A4 rule not explicitly true: ${rule}`);
  assert(Object.keys(a.rules||{}).every(k=>ac.rules.includes(k)),'A4 contains unknown rule key');

  const f=x.final_gate||{};
  for(const key of ['exact_id_lookup_verified','prerequisite_return_point_verified','held_handling_verified','school_test_separation_verified'])assert(f[key]===true,`final_gate.${key} must be explicitly true`);
  assert(['remove_legacy','permanent_fallback'].includes(f.legacy_copy_paste_decision),'legacy_copy_paste_decision invalid');
  assert(nonPlaceholder(f.private_evidence_ref,{allowSelfTest}),'private_evidence_ref missing/placeholder');
  assert(f.overall_runtime_pass===true,'overall_runtime_pass must be explicitly true');
  return {status:'PASS',cases:contract.cases.length,registration_confirmed:true,a4_acceptance_confirmed:true,final_gate_confirmed:true};
}

function selfTest(){
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-runtime-input-'));
  try{
    const put=(p,s)=>{const full=path.join(d,p);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,s);return p};
    const contract=readJson(CONTRACT_PATH);
    put('registration.png','registration');put('a4/report.pdf','pdf');
    const cases=contract.cases.map((e,i)=>({id:e.id,source_mode:e.source_mode,executed_in_actual_custom_gpt:true,photo_attached:true,executed_at:`2026-08-24T20:0${i}:00+09:00`,photo_file:put(`cases/${e.id}/photo.jpg`,`photo-${e.id}`),response_transcript_file:put(`cases/${e.id}/response.txt`,`response-${e.id}`),behaviors:Object.fromEntries(e.required_behaviors.map(k=>[k,true])),result_summary:SELF_TEST}));
    const good={gpt_url:SELF_TEST,registration_verified_at:'2026-08-24T20:00:00+09:00',registration_evidence_file:'registration.png',registration:{actual_custom_gpt:true,registration_kit_drive_folder_id:KIT.drive_folder_id,knowledge_registered:true,knowledge_file_id:KIT.knowledge_file_id,knowledge_records:KIT.knowledge_records,knowledge_sha256:KIT.knowledge_sha256,instructions_applied:true,instructions_file_id:KIT.instructions_file_id,instructions_sha256:KIT.instructions_sha256,output_schema_applied:true,output_schema_file_id:KIT.output_schema_file_id,output_schema_sha256:KIT.output_schema_sha256},cases,a4_report:{actual_render_or_print_test:true,orientation:contract.a4_report_acceptance.orientation,page_count:1,checked_at:'2026-08-24T20:10:00+09:00',rendered_pdf_file:'a4/report.pdf',evidence_ref:SELF_TEST,sections_present:[...contract.a4_report_acceptance.required_sections],rules:Object.fromEntries(contract.a4_report_acceptance.rules.map(k=>[k,true]))},final_gate:{exact_id_lookup_verified:true,prerequisite_return_point_verified:true,held_handling_verified:true,school_test_separation_verified:true,legacy_copy_paste_decision:'permanent_fallback',private_evidence_ref:SELF_TEST,overall_runtime_pass:true}};
    const p=path.join(d,'input.json');fs.writeFileSync(p,JSON.stringify(good,null,2));validateInput(p,{allowSelfTest:true});
    const mutations=[x=>x.registration.knowledge_registered=false,x=>x.registration.instructions_sha256='wrong',x=>x.cases[0].photo_attached=false,x=>x.cases[1].behaviors[contract.cases[1].required_behaviors[0]]=false,x=>x.a4_report.page_count=3,x=>x.final_gate.overall_runtime_pass=false];
    for(const mutate of mutations){const bad=structuredClone(good);mutate(bad);fs.writeFileSync(p,JSON.stringify(bad));let rejected=false;try{validateInput(p,{allowSelfTest:true})}catch{rejected=true}assert(rejected,'negative runtime input case accepted')}
    console.log('PASS_RUNTIME_EVIDENCE_INPUT_SELF_TEST');console.log(`NEGATIVE_CASES_REJECTED=${mutations.length}`);console.log('REAL_RUNTIME_EXECUTED=false');
  }finally{fs.rmSync(d,{recursive:true,force:true})}
}

const args=process.argv.slice(2);
try{
  if(args.includes('--self-test')) selfTest();
  else {assert(args[0],'Usage: node tools/validate_mikami_answer_gpt_runtime_evidence_input.mjs <runtime-evidence-input.json>');console.log(JSON.stringify(validateInput(args[0]),null,2))}
}catch(e){console.error('FAIL_RUNTIME_EVIDENCE_INPUT');console.error(e?.message||String(e));process.exit(1)}
