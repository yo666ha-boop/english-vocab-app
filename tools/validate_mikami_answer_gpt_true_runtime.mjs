#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONTRACT = path.join(ROOT, 'gpt/tests/mikami_answer_gpt_photo_acceptance_cases.json');
const EXPECTED_KNOWLEDGE_SHA256 = 'be820c3e4d5c26773d642f1c055fea33f2796d71b6fca16f4e1edf5efc6f9213';
const EXPECTED_RECORDS = 10511;

function fail(msg){ throw new Error(msg); }
function readJson(p){ return JSON.parse(fs.readFileSync(p, 'utf8')); }
function assert(cond, msg){ if(!cond) fail(msg); }

export function validateRuntimeResult(result, contract){
  assert(result && typeof result === 'object', 'runtime result must be an object');
  const reg = result.registration || {};
  assert(reg.actual_custom_gpt === true, 'registration.actual_custom_gpt must be true');
  assert(reg.knowledge_registered === true, 'registration.knowledge_registered must be true');
  assert(reg.knowledge_records === EXPECTED_RECORDS, `knowledge_records must be ${EXPECTED_RECORDS}`);
  assert(reg.knowledge_sha256 === EXPECTED_KNOWLEDGE_SHA256, 'knowledge SHA256 mismatch');
  assert(reg.instructions_applied === true, 'formal Instructions not confirmed');
  assert(reg.output_schema_applied === true, 'output schema not confirmed');
  assert(typeof reg.gpt_url === 'string' && reg.gpt_url.trim().length > 0, 'gpt_url missing');

  const byId = new Map((result.cases || []).map(c => [c.id, c]));
  for(const expected of contract.cases){
    const actual = byId.get(expected.id);
    assert(actual, `missing runtime case: ${expected.id}`);
    assert(actual.executed_in_actual_custom_gpt === true, `${expected.id}: not executed in actual Custom GPT`);
    assert(actual.photo_attached === true, `${expected.id}: photo not attached`);
    assert(actual.source_mode === expected.source_mode, `${expected.id}: source_mode mismatch`);
    const behaviors = actual.behaviors || {};
    for(const key of expected.required_behaviors){
      assert(behaviors[key] === true, `${expected.id}: required behavior failed/not verified: ${key}`);
    }
    assert(typeof actual.result_summary === 'string' && actual.result_summary.trim().length > 0,
      `${expected.id}: result_summary missing`);
  }

  const a4 = result.a4_report || {};
  assert(a4.actual_render_or_print_test === true, 'A4 actual render/print test not executed');
  assert(a4.orientation === contract.a4_report_acceptance.orientation, 'A4 orientation mismatch');
  assert(Number.isInteger(a4.page_count), 'A4 page_count must be integer');
  assert(a4.page_count >= contract.a4_report_acceptance.target_pages_min && a4.page_count <= contract.a4_report_acceptance.target_pages_max,
    `A4 page_count must be ${contract.a4_report_acceptance.target_pages_min}-${contract.a4_report_acceptance.target_pages_max}`);
  const sections = new Set(a4.sections_present || []);
  for(const section of contract.a4_report_acceptance.required_sections){
    assert(sections.has(section), `A4 missing required section: ${section}`);
  }
  const a4Rules = a4.rules || {};
  for(const rule of contract.a4_report_acceptance.rules){
    assert(a4Rules[rule] === true, `A4 rule failed/not verified: ${rule}`);
  }

  const finalGate = result.final_gate || {};
  assert(finalGate.exact_id_lookup_verified === true, 'final gate: exact ID lookup not verified');
  assert(finalGate.prerequisite_return_point_verified === true, 'final gate: prerequisite return point not verified');
  assert(finalGate.held_handling_verified === true, 'final gate: held handling not verified');
  assert(finalGate.school_test_separation_verified === true, 'final gate: school-test separation not verified');
  assert(['remove_legacy', 'permanent_fallback'].includes(finalGate.legacy_copy_paste_decision),
    'final gate: legacy copy/paste decision must be remove_legacy or permanent_fallback');
  assert(finalGate.overall_runtime_pass === true, 'overall_runtime_pass must be true');

  return {
    status: 'PASS',
    cases: contract.cases.length,
    knowledge_records: EXPECTED_RECORDS,
    a4_pages: a4.page_count,
    legacy_copy_paste_decision: finalGate.legacy_copy_paste_decision
  };
}

function syntheticPass(contract){
  return {
    registration: {
      actual_custom_gpt: true,
      knowledge_registered: true,
      knowledge_records: EXPECTED_RECORDS,
      knowledge_sha256: EXPECTED_KNOWLEDGE_SHA256,
      instructions_applied: true,
      output_schema_applied: true,
      gpt_url: 'SELF_TEST_ONLY'
    },
    cases: contract.cases.map(c => ({
      id: c.id,
      source_mode: c.source_mode,
      executed_in_actual_custom_gpt: true,
      photo_attached: true,
      behaviors: Object.fromEntries(c.required_behaviors.map(k => [k, true])),
      result_summary: 'SELF_TEST_ONLY'
    })),
    a4_report: {
      actual_render_or_print_test: true,
      orientation: contract.a4_report_acceptance.orientation,
      page_count: 1,
      sections_present: [...contract.a4_report_acceptance.required_sections],
      rules: Object.fromEntries(contract.a4_report_acceptance.rules.map(k => [k, true]))
    },
    final_gate: {
      exact_id_lookup_verified: true,
      prerequisite_return_point_verified: true,
      held_handling_verified: true,
      school_test_separation_verified: true,
      legacy_copy_paste_decision: 'permanent_fallback',
      overall_runtime_pass: true
    }
  };
}

function main(){
  const contract = readJson(CONTRACT);
  const args = process.argv.slice(2);
  if(args.includes('--self-test')){
    const good = syntheticPass(contract);
    validateRuntimeResult(good, contract);
    const bad = structuredClone(good);
    bad.cases[2].behaviors.unreadable_text_is_not_guessed = false;
    let rejected = false;
    try { validateRuntimeResult(bad, contract); } catch { rejected = true; }
    assert(rejected, 'self-test failed: invalid runtime result was accepted');
    console.log('PASS_TRUE_RUNTIME_GATE_SELF_TEST');
    return;
  }
  const resultPath = args[0];
  if(!resultPath){
    console.error('Usage: node tools/validate_mikami_answer_gpt_true_runtime.mjs <runtime-results.json>');
    process.exit(2);
  }
  try {
    const out = validateRuntimeResult(readJson(resultPath), contract);
    console.log(JSON.stringify(out, null, 2));
  } catch(err){
    console.error('FAIL_TRUE_RUNTIME_GATE');
    console.error(err?.message || String(err));
    process.exit(1);
  }
}

main();
