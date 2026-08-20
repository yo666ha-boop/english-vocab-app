import fs from 'node:fs';

const files = {
  handoff: 'release/generated/answer_gpt_handoff_patch.status.txt',
  runner: 'release/generated/answer_gpt_unified_runner.status.txt',
  real: 'release/generated/answer_gpt_real_private_build.status.txt',
  runtime: 'release/generated/answer_gpt_true_runtime_gate.status.txt',
  publicIndex: 'release/generated/answer_gpt_public_index_probe.status.txt',
};

function parse(path) {
  const out = {};
  for (const raw of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const i = raw.indexOf('=');
    if (i < 1) continue;
    out[raw.slice(0, i)] = raw.slice(i + 1);
  }
  return out;
}

const s = Object.fromEntries(Object.entries(files).map(([k, p]) => [k, parse(p)]));
const errors = [];
const req = (cond, msg) => { if (!cond) errors.push(msg); };

req(s.handoff.STATUS === 'PASS', 'handoff status must PASS');
req(s.handoff.PRIVATE_KNOWLEDGE_EMBEDDED === 'false', 'handoff must not embed private Knowledge');
req(s.handoff.LEGACY_COPY_PASTE === 'fallback_only', 'legacy copy/paste must remain fallback_only before true runtime PASS');
req(s.runner.STATUS === 'PASS', 'unified runner status must PASS');
req(s.runner.REAL_CANONICAL_UNIFIED_RUN === 'PASS', 'runner must acknowledge real canonical unified run PASS');
req(s.runner.PRIVATE_KNOWLEDGE_EMBEDDED === 'false', 'runner must not embed private Knowledge');
req(s.runner.MAIN_TOUCHED === 'false', 'runner must keep main untouched');
req(s.real.STATUS === 'PASS', 'real private build status must PASS');
req(s.real.SOURCE_BYTES === '4035500', 'real build source bytes mismatch');
req(s.real.SOURCE_SHA256 === '03b185974127709fa76ceac357f374d6fea99969833fa75266d3dbfa03dda432', 'real build source SHA mismatch');
req(s.real.UNIFIED_HTML_SHA256 === 'c9ac67b8063efff248fd2b4913503ef712ad268e0a475d4c541bc12fc024c83f', 'unified HTML SHA mismatch');
req(s.real.UNIFIED_ZIP_SHA256 === '79d7707b606d1f32e235f10997f62146178638cb0738dd8c41e6a085011747b6', 'unified ZIP SHA mismatch');
req(s.real.PRIVATE_KNOWLEDGE_EMBEDDED === 'false', 'real build must not embed private Knowledge');
req(s.real.MAIN_TOUCHED === 'false', 'real build must keep main untouched');
req(s.runtime.GATE_VERSION === 'evidence-backed-v2', 'true runtime gate must be evidence-backed-v2');
req(s.runtime.ACTUAL_CUSTOM_GPT_REGISTRATION_REQUIRED === 'true', 'actual Custom GPT registration must remain required');
req(s.runtime.ACTUAL_PHOTO_ATTACHMENT_REQUIRED === 'true', 'actual photo attachment must remain required');
req(s.runtime.ACTUAL_A4_RENDER_OR_PRINT_REQUIRED === 'true', 'actual A4 render/print must remain required');
req(s.runtime.OVERALL_RUNTIME_PASS_REQUIRED === 'true', 'overall runtime PASS must remain required');
req(s.runtime.MAIN_TOUCHED === 'false', 'runtime gate must keep main untouched');

// Cross-file consistency.
req(s.runner.REAL_CANONICAL_SOURCE_SHA256 === s.real.SOURCE_SHA256, 'runner/real source SHA disagree');
req(s.runner.REAL_CANONICAL_UNIFIED_HTML_SHA256 === s.real.UNIFIED_HTML_SHA256, 'runner/real HTML SHA disagree');
req(s.runner.REAL_CANONICAL_UNIFIED_ZIP_SHA256 === s.real.UNIFIED_ZIP_SHA256, 'runner/real ZIP SHA disagree');

// A public branch index is not a substitute for the authenticated private canonical source.
// If one is present, explicitly require that it is treated as non-canonical when hashes differ.
req(s.publicIndex.PRIVATE_CANONICAL_EXPOSED === 'false', 'public probe must confirm private canonical is not exposed');
if (s.publicIndex.STATUS === 'HASH_MISMATCH') {
  req(s.publicIndex.REPAIRED_SHA_MATCH === 'false', 'public index HASH_MISMATCH must record REPAIRED_SHA_MATCH=false');
  req(s.publicIndex.ACTUAL_INDEX_SHA256 !== s.publicIndex.EXPECTED_REPAIRED_SHA256, 'public index mismatch hashes unexpectedly equal');
} else {
  req(s.publicIndex.STATUS === 'PASS', 'public index probe must be PASS or explicit HASH_MISMATCH');
  req(s.publicIndex.REPAIRED_SHA_MATCH === 'true', 'public index PASS must record repaired SHA match');
}

if (errors.length) {
  console.error('MIKAMI_ANSWER_GPT_RELEASE_READINESS=FAIL');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

const runtimePending = s.real.CUSTOM_GPT_RUNTIME_TEST !== 'true' || s.real.REAL_PHOTO_TEST_PENDING === 'true';
console.log('MIKAMI_ANSWER_GPT_RELEASE_READINESS=PASS');
console.log('REAL_CANONICAL_BUILD=PASS');
console.log(`TRUE_RUNTIME=${runtimePending ? 'PENDING' : 'PASS'}`);
console.log(`PUBLIC_INDEX=${s.publicIndex.STATUS}`);
console.log('PUBLIC_INDEX_CANONICAL=false');
console.log('PRIVATE_KNOWLEDGE_PUBLIC_EMBED=false');
console.log('MAIN_TOUCHED=false');
