#!/usr/bin/env node
import fs from 'node:fs';

const E = {
  folder: '1J82Ur6Q-_OFRmkNq0swc6oP8bR0Z6FYj',
  knowledge_id: '1_F6scCbMtPK0jw0Hi9eExqstDz2vWahk',
  knowledge_records: 10511,
  knowledge_sha256: 'be820c3e4d5c26773d642f1c055fea33f2796d71b6fca16f4e1edf5efc6f9213',
  instructions_id: '1z_xPUgAkwcigqRzWjUB3JQy_6ATnPAik',
  instructions_sha256: '084ff607a70e679e32bc100c4081aaed7f22ebf5058d469ba20a079bd192b0be',
  schema_id: '1ceQyoCVmgHiRHS_jVppEbDBYUYpf0fvE',
  schema_sha256: '8f33784b205cafe663e0c797b806e5b37036b3b06aec987eb45a7008ff37567b'
};
const SHA=/^[0-9a-f]{64}$/;
function assert(c,m){ if(!c) throw new Error(m); }
function validate(x,{allowSynthetic=false}={}){
  const r=x?.registration||{};
  assert(r.registration_kit_drive_folder_id===E.folder,'registration kit folder mismatch');
  assert(r.knowledge_file_id===E.knowledge_id,'Knowledge file ID mismatch');
  assert(r.knowledge_records===E.knowledge_records,'Knowledge record count mismatch');
  assert(r.knowledge_sha256===E.knowledge_sha256,'Knowledge SHA mismatch');
  assert(r.instructions_file_id===E.instructions_id,'Instructions file ID mismatch');
  assert(r.instructions_sha256===E.instructions_sha256,'Instructions SHA mismatch');
  assert(r.output_schema_file_id===E.schema_id,'output schema file ID mismatch');
  assert(r.output_schema_sha256===E.schema_sha256,'output schema SHA mismatch');
  assert(r.actual_custom_gpt===true,'actual_custom_gpt must be true');
  assert(r.knowledge_registered===true,'knowledge_registered must be true');
  assert(r.instructions_applied===true,'instructions_applied must be true');
  assert(r.output_schema_applied===true,'output_schema_applied must be true');
  assert(typeof r.registration_evidence_sha256==='string'&&SHA.test(r.registration_evidence_sha256),'registration evidence SHA invalid');
  if(!allowSynthetic){
    assert(typeof r.gpt_url==='string'&&/^https:\/\/(chatgpt\.com|chat\.openai\.com)\/g\//.test(r.gpt_url),'actual Custom GPT URL required');
    assert(!/SELF_TEST|PLACEHOLDER|PENDING/i.test(r.gpt_url),'placeholder GPT URL rejected');
  }
  return {status:'PASS',registration_asset_identity:true,knowledge_records:E.knowledge_records};
}
function good(){return {registration:{
  actual_custom_gpt:true, registration_kit_drive_folder_id:E.folder,
  knowledge_registered:true, knowledge_file_id:E.knowledge_id, knowledge_records:E.knowledge_records, knowledge_sha256:E.knowledge_sha256,
  instructions_applied:true, instructions_file_id:E.instructions_id, instructions_sha256:E.instructions_sha256,
  output_schema_applied:true, output_schema_file_id:E.schema_id, output_schema_sha256:E.schema_sha256,
  gpt_url:'https://chatgpt.com/g/g-self-test', verified_at:'2026-08-24T19:45:00+09:00', registration_evidence_sha256:'1'.repeat(64)
}}}
try{
  if(process.argv.includes('--self-test')){
    const g=good(); validate(g,{allowSynthetic:true});
    const muts=[
      x=>x.registration.knowledge_sha256='2'.repeat(64),
      x=>x.registration.instructions_sha256='3'.repeat(64),
      x=>x.registration.output_schema_sha256='4'.repeat(64),
      x=>x.registration.instructions_file_id='wrong',
      x=>x.registration.output_schema_file_id='wrong'
    ];
    for(const f of muts){const b=structuredClone(g);f(b);let rejected=false;try{validate(b,{allowSynthetic:true})}catch{rejected=true}assert(rejected,'negative case accepted')}
    console.log('PASS_REGISTRATION_ASSET_IDENTITY_SELF_TEST');
    console.log(`NEGATIVE_CASES_REJECTED=${muts.length}`);
  } else {
    const p=process.argv[2]; assert(p,'Usage: node tools/validate_mikami_answer_gpt_registration_asset_identity.mjs <runtime-results.json>');
    console.log(JSON.stringify(validate(JSON.parse(fs.readFileSync(p,'utf8'))),null,2));
  }
}catch(e){console.error('FAIL_REGISTRATION_ASSET_IDENTITY');console.error(e?.message||String(e));process.exit(1)}
