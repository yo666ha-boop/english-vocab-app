#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const EXPECTED = {
  drive_folder_id: '1J82Ur6Q-_OFRmkNq0swc6oP8bR0Z6FYj',
  knowledge_file_id: '1_F6scCbMtPK0jw0Hi9eExqstDz2vWahk',
  knowledge_records: 10511,
  knowledge_sha256: 'be820c3e4d5c26773d642f1c055fea33f2796d71b6fca16f4e1edf5efc6f9213',
  instructions_file_id: '1z_xPUgAkwcigqRzWjUB3JQy_6ATnPAik',
  schema_file_id: '1ceQyoCVmgHiRHS_jVppEbDBYUYpf0fvE',
  case_ids: ['correct_original','multi_category_errors','unreadable_answer','school_test']
};
const SCHEMA_VERSION='mikami-answer-gpt-evidence-chain-v2';
const BINDING_ALGORITHM='sha256-stable-json-excluding-runtime-results-sha-and-binding-digest';
const SHA_RE = /^[0-9a-f]{64}$/;
function assert(c,m){ if(!c) throw new Error(m); }
function isIso(v){ return typeof v === 'string' && v && !Number.isNaN(Date.parse(v)); }
function validSha(v){ return typeof v === 'string' && SHA_RE.test(v) && !/^0{64}$/.test(v); }
function noPlaceholder(v){
  const s = String(v || '').toUpperCase();
  return s && !s.includes('SELF_TEST') && !s.includes('PLACEHOLDER') && !s.includes('TODO') && !s.includes('PENDING');
}
function sha256(buf){ return crypto.createHash('sha256').update(buf).digest('hex'); }
function stable(value){
  if(Array.isArray(value)) return value.map(stable);
  if(value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
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

function validate(m, runtimeRaw, runtime){
  assert(m?.schema_version === SCHEMA_VERSION,'schema_version mismatch');
  assert(m?.binding?.algorithm===BINDING_ALGORITHM,'binding algorithm mismatch');
  assert(validSha(m?.binding?.binding_digest_sha256),'binding digest invalid');
  const computedBinding=bindingDigest(m);
  assert(m.binding.binding_digest_sha256===computedBinding,'binding digest mismatch');

  const k=m.registration_kit||{};
  for(const key of ['drive_folder_id','knowledge_file_id','knowledge_sha256','instructions_file_id','schema_file_id']) assert(k[key]===EXPECTED[key],`registration kit mismatch: ${key}`);
  assert(k.knowledge_records===EXPECTED.knowledge_records,'registration kit mismatch: knowledge_records');

  assert(runtimeRaw && runtime && typeof runtime === 'object','actual runtime-results JSON is required');
  const actualRuntimeSha=sha256(runtimeRaw);
  const r=m.runtime_results||{};
  assert(validSha(r.results_json_sha256),'runtime results SHA invalid');
  assert(r.results_json_sha256===actualRuntimeSha,'runtime results file SHA mismatch');

  const g=m.custom_gpt||{};
  assert(/^https:\/\/(chatgpt\.com|chat\.openai\.com)\/g\/[A-Za-z0-9_-]+/.test(g.gpt_url||''),'invalid actual Custom GPT URL');
  assert(isIso(g.registration_verified_at),'registration_verified_at invalid');
  assert(validSha(g.registration_evidence_sha256),'registration_evidence_sha256 invalid');
  assert(noPlaceholder(g.gpt_url),'Custom GPT URL placeholder rejected');

  const reg=runtime.registration||{};
  assert(reg.actual_custom_gpt===true,'runtime registration must confirm actual_custom_gpt=true');
  assert(reg.knowledge_registered===true,'runtime registration must confirm Knowledge registration');
  assert(reg.knowledge_records===EXPECTED.knowledge_records,'runtime registration knowledge_records mismatch');
  assert(reg.knowledge_sha256===EXPECTED.knowledge_sha256,'runtime registration Knowledge SHA mismatch');
  assert(reg.instructions_applied===true,'runtime registration must confirm Instructions');
  assert(reg.output_schema_applied===true,'runtime registration must confirm output schema');
  assert(reg.gpt_url===g.gpt_url,'manifest/runtime GPT URL mismatch');
  assert(reg.verified_at===g.registration_verified_at,'manifest/runtime registration timestamp mismatch');
  assert(reg.registration_evidence_sha256===g.registration_evidence_sha256,'manifest/runtime registration evidence SHA mismatch');

  const cases=m.photo_cases||[];
  assert(Array.isArray(cases)&&cases.length===4,'photo_cases must contain exactly 4 cases');
  const ids=cases.map(x=>x?.id);
  assert(new Set(ids).size===4,'duplicate photo case id');
  assert(EXPECTED.case_ids.every(id=>ids.includes(id)),'photo case set mismatch');
  const runtimeCases=runtime.cases||[];
  assert(Array.isArray(runtimeCases)&&runtimeCases.length===4,'runtime cases must contain exactly 4 cases');
  const runtimeById=new Map(runtimeCases.map(c=>[c?.id,c]));
  assert(runtimeById.size===4,'runtime cases contain duplicate ids');

  const hashes=[g.registration_evidence_sha256,m.binding.binding_digest_sha256];
  for(const c of cases){
    assert(validSha(c.photo_sha256),`${c.id}: photo_sha256 invalid`);
    assert(validSha(c.response_transcript_sha256),`${c.id}: response_transcript_sha256 invalid`);
    assert(c.photo_sha256!==c.response_transcript_sha256,`${c.id}: photo/response hash collision`);
    assert(isIso(c.executed_at),`${c.id}: executed_at invalid`);
    const rc=runtimeById.get(c.id);
    assert(rc,`${c.id}: missing from runtime results`);
    assert(rc.executed_in_actual_custom_gpt===true,`${c.id}: runtime not executed in actual Custom GPT`);
    assert(rc.photo_attached===true,`${c.id}: runtime photo attachment not confirmed`);
    assert(rc.photo_sha256===c.photo_sha256,`${c.id}: manifest/runtime photo SHA mismatch`);
    assert(rc.response_transcript_sha256===c.response_transcript_sha256,`${c.id}: manifest/runtime transcript SHA mismatch`);
    assert(rc.executed_at===c.executed_at,`${c.id}: manifest/runtime execution timestamp mismatch`);
    hashes.push(c.photo_sha256,c.response_transcript_sha256);
  }

  const a=m.a4_report||{};
  assert(validSha(a.rendered_pdf_sha256),'A4 rendered_pdf_sha256 invalid');
  assert(isIso(a.checked_at),'A4 checked_at invalid');
  assert(Number.isInteger(a.page_count)&&a.page_count>=1&&a.page_count<=2,'A4 page_count must be 1-2');
  assert(a.orientation==='portrait','A4 orientation must be portrait');
  assert(noPlaceholder(a.evidence_ref),'A4 evidence_ref missing/placeholder');
  const ra=runtime.a4_report||{};
  assert(ra.actual_render_or_print_test===true,'runtime A4 actual render/print test not confirmed');
  assert(ra.rendered_pdf_sha256===a.rendered_pdf_sha256,'manifest/runtime A4 PDF SHA mismatch');
  assert(ra.checked_at===a.checked_at,'manifest/runtime A4 timestamp mismatch');
  assert(ra.page_count===a.page_count,'manifest/runtime A4 page_count mismatch');
  assert(ra.orientation===a.orientation,'manifest/runtime A4 orientation mismatch');
  assert(ra.render_or_print_evidence_ref===a.evidence_ref,'manifest/runtime A4 evidence ref mismatch');
  hashes.push(a.rendered_pdf_sha256,r.results_json_sha256);

  assert(runtime.final_gate?.evidence_manifest_sha256===m.binding.binding_digest_sha256,'runtime final_gate evidence_manifest_sha256 must equal non-circular binding digest');
  assert(new Set(hashes).size===hashes.length,'evidence SHA collision detected');
  assert(runtime.final_gate?.overall_runtime_pass===true,'runtime final gate overall_runtime_pass must be true');
  return {status:'PASS',photo_cases:4,evidence_hashes:hashes.length,registration_kit_bound:true,runtime_file_bound:true,non_circular_binding:true,a4_pages:a.page_count};
}

function synthetic(){
  const h=n=>n.toString(16).padStart(64,'0');
  const gptUrl='https://chatgpt.com/g/g-abc123/mikami';
  const verifiedAt='2026-08-20T16:40:00+09:00';
  const registrationEvidence=h(1);
  const cases=EXPECTED.case_ids.map((id,i)=>({
    id,
    source_mode:id==='school_test'?'school_test':'mikami_canonical',
    executed_in_actual_custom_gpt:true,
    photo_attached:true,
    executed_at:`2026-08-20T16:4${i}:00+09:00`,
    photo_sha256:h(10+i*2),
    response_transcript_sha256:h(11+i*2),
    behaviors:{ok:true},
    result_summary:'synthetic-validator-self-test'
  }));
  const manifest={
    schema_version:SCHEMA_VERSION,
    binding:{algorithm:BINDING_ALGORITHM,binding_digest_sha256:''},
    registration_kit:{...EXPECTED},
    custom_gpt:{gpt_url:gptUrl,registration_verified_at:verifiedAt,registration_evidence_sha256:registrationEvidence},
    photo_cases:cases.map(c=>({id:c.id,photo_sha256:c.photo_sha256,response_transcript_sha256:c.response_transcript_sha256,executed_at:c.executed_at})),
    a4_report:{rendered_pdf_sha256:h(30),checked_at:'2026-08-20T16:50:00+09:00',page_count:1,orientation:'portrait',evidence_ref:'private-drive://a4-proof'},
    runtime_results:{results_json_sha256:''}
  };
  manifest.binding.binding_digest_sha256=bindingDigest(manifest);
  const runtime={
    registration:{actual_custom_gpt:true,knowledge_registered:true,knowledge_records:EXPECTED.knowledge_records,knowledge_sha256:EXPECTED.knowledge_sha256,instructions_applied:true,output_schema_applied:true,gpt_url:gptUrl,verified_at:verifiedAt,registration_evidence_sha256:registrationEvidence},
    cases,
    a4_report:{actual_render_or_print_test:true,orientation:'portrait',page_count:1,checked_at:'2026-08-20T16:50:00+09:00',rendered_pdf_sha256:h(30),render_or_print_evidence_ref:'private-drive://a4-proof',sections_present:[],rules:{}},
    final_gate:{evidence_manifest_sha256:manifest.binding.binding_digest_sha256,overall_runtime_pass:true}
  };
  const raw=Buffer.from(JSON.stringify(runtime,null,2)+'\n','utf8');
  manifest.runtime_results.results_json_sha256=sha256(raw);
  return {manifest,runtime,raw};
}

const args=process.argv.slice(2);
try{
  if(args.includes('--self-test')){
    const good=synthetic(); validate(good.manifest,good.raw,good.runtime);
    const tests=[
      x=>x.manifest.custom_gpt.gpt_url='SELF_TEST_ONLY',
      x=>x.manifest.registration_kit.knowledge_file_id='wrong',
      x=>x.manifest.photo_cases[1].photo_sha256=x.manifest.photo_cases[0].photo_sha256,
      x=>x.manifest.a4_report.page_count=3,
      x=>x.manifest.runtime_results.results_json_sha256='f'.repeat(64),
      x=>x.manifest.photo_cases[0].response_transcript_sha256='e'.repeat(64),
      x=>x.manifest.binding.binding_digest_sha256='d'.repeat(64),
      x=>x.runtime.final_gate.evidence_manifest_sha256='c'.repeat(64)
    ];
    for(const mutate of tests){
      const bad=structuredClone({manifest:good.manifest,runtime:good.runtime});
      bad.raw=good.raw;
      mutate(bad);
      let rejected=false;
      try{ validate(bad.manifest,bad.raw,bad.runtime); }catch{ rejected=true; }
      assert(rejected,'self-test negative case accepted');
    }
    console.log('PASS_ANSWER_GPT_EVIDENCE_CHAIN_SELF_TEST');
    console.log('RUNTIME_RESULTS_FILE_BINDING=PASS');
    console.log('NON_CIRCULAR_MANIFEST_BINDING=PASS');
    console.log(`NEGATIVE_CASES_REJECTED=${tests.length}`);
  } else {
    assert(args[0]&&args[1],'Usage: node tools/validate_mikami_answer_gpt_evidence_chain.mjs <manifest.json> <runtime-results.json>');
    const runtimeRaw=fs.readFileSync(args[1]);
    console.log(JSON.stringify(validate(JSON.parse(fs.readFileSync(args[0],'utf8')),runtimeRaw,JSON.parse(runtimeRaw.toString('utf8'))),null,2));
  }
}catch(e){ console.error('FAIL_ANSWER_GPT_EVIDENCE_CHAIN'); console.error(e?.message||String(e)); process.exit(1); }
