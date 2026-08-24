import fs from 'node:fs';

const files = {
  handoff: 'release/generated/answer_gpt_handoff_patch.status.txt',
  handoffV2: 'release/generated/answer_gpt_handoff_v2.status.txt',
  runner: 'release/generated/answer_gpt_unified_runner.status.txt',
  real: 'release/generated/answer_gpt_real_private_build.status.txt',
  runtime: 'release/generated/answer_gpt_true_runtime_gate.status.txt',
  evidence: 'release/generated/answer_gpt_evidence_chain.status.txt',
  assetIdentity: 'release/generated/answer_gpt_registration_asset_identity.status.txt',
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

req(s.handoff.STATUS === 'PASS', 'handoff v1 status must PASS');
req(s.handoff.PRIVATE_KNOWLEDGE_EMBEDDED === 'false', 'handoff must not embed private Knowledge');
req(s.handoff.LEGACY_COPY_PASTE === 'fallback_only', 'legacy copy/paste must remain fallback_only before true runtime PASS');
req(s.handoffV2.STATUS === 'PASS', 'hardened handoff v2 CI must PASS');
req(s.handoffV2.ARBITRARY_HTTPS_URL_REJECTED === 'true', 'handoff v2 must reject arbitrary HTTPS URLs');
req(s.handoffV2.PRIVATE_KNOWLEDGE_EMBEDDED === 'false', 'handoff v2 must not embed private Knowledge');
req(s.handoffV2.MAIN_ROOT_TOUCHED === 'false', 'handoff v2 must not touch vocabulary root');

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

// Exact private registration assets are now part of release identity.
req(s.assetIdentity.STATUS === 'PASS', 'registration asset identity CI must PASS');
req(s.assetIdentity.REGISTRATION_KIT_DRIVE_FOLDER_ID === '1J82Ur6Q-_OFRmkNq0swc6oP8bR0Z6FYj', 'registration kit folder mismatch');
req(s.assetIdentity.KNOWLEDGE_FILE_ID === '1_F6scCbMtPK0jw0Hi9eExqstDz2vWahk', 'Knowledge file ID mismatch');
req(s.assetIdentity.KNOWLEDGE_RECORDS === '10511', 'Knowledge record count mismatch');
req(s.assetIdentity.KNOWLEDGE_SHA256 === 'be820c3e4d5c26773d642f1c055fea33f2796d71b6fca16f4e1edf5efc6f9213', 'Knowledge SHA mismatch');
req(s.assetIdentity.INSTRUCTIONS_FILE_ID === '1z_xPUgAkwcigqRzWjUB3JQy_6ATnPAik', 'Instructions file ID mismatch');
req(s.assetIdentity.INSTRUCTIONS_SHA256 === '084ff607a70e679e32bc100c4081aaed7f22ebf5058d469ba20a079bd192b0be', 'Instructions SHA mismatch');
req(s.assetIdentity.OUTPUT_SCHEMA_FILE_ID === '1ceQyoCVmgHiRHS_jVppEbDBYUYpf0fvE', 'output schema file ID mismatch');
req(s.assetIdentity.OUTPUT_SCHEMA_SHA256 === '8f33784b205cafe663e0c797b806e5b37036b3b06aec987eb45a7008ff37567b', 'output schema SHA mismatch');
req(s.assetIdentity.RUNTIME_TEMPLATE_IDENTITY === 'PASS', 'runtime template asset identity must PASS');
req(s.assetIdentity.EVIDENCE_TEMPLATE_IDENTITY === 'PASS', 'evidence template asset identity must PASS');
req(s.assetIdentity.MAIN_TOUCHED === 'false', 'asset identity gate must not touch main');

// Evidence-chain self-test must be healthy; actual runtime is still separately required.
req(s.evidence.STATUS === 'PASS', 'evidence-chain v2 CI must PASS');
req(s.evidence.GATE_VERSION === 'evidence-chain-v2', 'evidence-chain gate version mismatch');
req(s.evidence.REGISTRATION_KIT_BOUND === 'true', 'evidence-chain must bind registration kit');
req(s.evidence.RUNTIME_RESULTS_FILE_REQUIRED === 'true', 'evidence-chain must require actual runtime-results file');
req(s.evidence.NON_CIRCULAR_MANIFEST_BINDING_REQUIRED === 'true', 'evidence-chain non-circular binding must remain required');
req(s.evidence.RUNTIME_OVERALL_PASS_REQUIRED === 'true', 'evidence-chain must require runtime overall PASS');
req(s.evidence.MAIN_TOUCHED === 'false', 'evidence-chain must keep main untouched');

// The release gate must stay aligned with the hardened true-runtime contract.
req(s.runtime.GATE_VERSION === 'evidence-backed-v3-hardened', 'true runtime gate must be evidence-backed-v3-hardened');
req(s.runtime.VALIDATOR_HARDENING_COMMIT === '192ee8e72fa767c38efa1986d35a2edb3312ba26', 'runtime gate hardening commit mismatch');
req(s.runtime.VALIDATOR_CI_STATUS === 'PASS', 'hardened runtime validator CI must PASS');
req(s.runtime.SELF_TEST_PLACEHOLDER_REJECTION_REQUIRED === 'true', 'runtime gate must reject self-test placeholders');
req(s.runtime.CUSTOM_GPT_URL_VALIDATION_REQUIRED === 'true', 'runtime gate must validate actual Custom GPT URL');
req(s.runtime.ACTUAL_CUSTOM_GPT_REGISTRATION_REQUIRED === 'true', 'actual Custom GPT registration must remain required');
req(s.runtime.ACTUAL_PHOTO_ATTACHMENT_REQUIRED === 'true', 'actual photo attachment must remain required');
req(s.runtime.ACTUAL_A4_RENDER_OR_PRINT_REQUIRED === 'true', 'actual A4 render/print must remain required');
req(s.runtime.ALL_EVIDENCE_HASHES_UNIQUE_REQUIRED === 'true', 'all runtime evidence hashes must remain unique');
req(s.runtime.OVERALL_RUNTIME_PASS_REQUIRED === 'true', 'overall runtime PASS must remain required');
req(s.runtime.MAIN_TOUCHED === 'false', 'runtime gate must keep main untouched');

// Cross-file consistency.
req(s.runner.REAL_CANONICAL_SOURCE_SHA256 === s.real.SOURCE_SHA256, 'runner/real source SHA disagree');
req(s.runner.REAL_CANONICAL_UNIFIED_HTML_SHA256 === s.real.UNIFIED_HTML_SHA256, 'runner/real HTML SHA disagree');
req(s.runner.REAL_CANONICAL_UNIFIED_ZIP_SHA256 === s.real.UNIFIED_ZIP_SHA256, 'runner/real ZIP SHA disagree');

// A public branch index is not a substitute for the authenticated private canonical source.
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
console.log('REGISTRATION_ASSET_IDENTITY=PASS');
console.log('EVIDENCE_CHAIN_V2=PASS');
console.log('HANDOFF_V2=PASS');
console.log(`TRUE_RUNTIME=${runtimePending ? 'PENDING' : 'PASS'}`);
console.log(`TRUE_RUNTIME_GATE_VERSION=${s.runtime.GATE_VERSION}`);
console.log(`PUBLIC_INDEX=${s.publicIndex.STATUS}`);
console.log('PUBLIC_INDEX_CANONICAL=false');
console.log('PRIVATE_KNOWLEDGE_PUBLIC_EMBED=false');
console.log('MAIN_TOUCHED=false');
