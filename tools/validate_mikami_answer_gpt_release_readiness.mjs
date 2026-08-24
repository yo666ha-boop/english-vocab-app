import fs from 'node:fs';

const files = {
  handoff: 'release/generated/answer_gpt_handoff_patch.status.txt',
  handoffV2: 'release/generated/answer_gpt_handoff_v2.status.txt',
  runner: 'release/generated/answer_gpt_unified_runner.status.txt',
  real: 'release/generated/answer_gpt_real_private_build.status.txt',
  runtime: 'release/generated/answer_gpt_true_runtime_gate.status.txt',
  evidence: 'release/generated/answer_gpt_evidence_chain.status.txt',
  assetIdentity: 'release/generated/answer_gpt_registration_asset_identity.status.txt',
  v2Diagnostic: 'release/generated/problem_app_handoff_v2_build_diagnostic.status.txt',
  pagesV2: 'release/generated/problem_app_handoff_v2_publication.status.txt',
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
const V1_BYTES='3812063';
const V1_SHA='6c3c5c6e42939ee701667cc18cf07d10403afa063ece557ed3052c44c95e0c81';
const V2_BYTES='3812209';
const V2_SHA='83921d1bb9b0ed3028d1151c138326e7698278906e6d01180bc1fb1f6b2044a0';
const ROOT_SHA='4d69b8f64e92bbcb22db2f74e2def78d10dc15979d66a4296be8786a0729dfc6';

req(s.handoff.STATUS === 'PASS', 'handoff v1 status must PASS');
req(s.handoff.PRIVATE_KNOWLEDGE_EMBEDDED === 'false', 'handoff must not embed private Knowledge');
req(s.handoff.LEGACY_COPY_PASTE === 'fallback_only', 'legacy copy/paste must remain fallback_only before true runtime PASS');
req(s.handoffV2.STATUS === 'PASS', 'hardened handoff v2 CI must PASS');
req(s.handoffV2.ARBITRARY_HTTPS_URL_REJECTED === 'true', 'handoff v2 must reject arbitrary HTTPS URLs');
req(s.handoffV2.PRIVATE_KNOWLEDGE_EMBEDDED === 'false', 'handoff v2 must not embed private Knowledge');
req(s.handoffV2.MAIN_ROOT_TOUCHED === 'false', 'handoff v2 must not touch vocabulary root');

// Current canonical build runner must include v2 URL hardening plus the v3 noopener fix.
req(s.runner.STATUS === 'PASS', 'unified runner status must PASS');
req(s.runner.HANDOFF_PATCH_VERSION === '3', 'unified runner must be wired to handoff v3');
req(s.runner.HANDOFF_PATCH_SELF_TEST === 'PASS', 'handoff v3 runner self-test must PASS');
req(s.runner.CUSTOM_GPT_URL_HOST_GATE === 'PASS', 'runner must enforce ChatGPT host gate');
req(s.runner.CUSTOM_GPT_URL_G_PATH_GATE === 'PASS', 'runner must enforce Custom GPT /g/ path gate');
req(s.runner.ARBITRARY_HTTPS_URL_REJECTED === 'true', 'runner must reject arbitrary HTTPS URLs');
req(s.runner.NOOPENER_FALSE_FAILURE_FIXED === 'true', 'runner must include noopener false-failure fix');
req(s.runner.SAFE_ANCHOR_NOOPENER_OPENER === 'true', 'runner must use safe anchor noopener opener');
req(s.runner.OLD_WINDOW_OPEN_NOOPENER_PATTERN_PRESENT === 'false', 'runner must reject old window.open noopener return-value pattern');
req(s.runner.OLD_IF_NOT_OPENED_BRANCH_PRESENT === 'false', 'runner must reject old if(!opened) false-failure branch');
req(s.runner.QB_DATA_PRESERVATION_CHECK === 'ENFORCED', 'runner must enforce qb-data preservation');
req(s.runner.FINAL_CANONICAL_AUDIT === 'ENFORCED', 'runner must enforce final canonical audit');
req(s.runner.PRIVATE_KNOWLEDGE_EMBEDDED === 'false', 'runner must not embed private Knowledge');
req(s.runner.REAL_CANONICAL_UNIFIED_RUN === 'PASS_PREVIOUSLY_VERIFIED_V1_ARTIFACT;V2_COMPOSED_PROOF;V3_PUBLICATION_SEPARATE', 'runner real-canonical composed proof state mismatch');

// Preserve the already-completed exact private canonical proof instead of rerunning the problem bank.
req(s.real.STATUS === 'PASS', 'real private build status must PASS');
req(s.real.BUILD_MODE === 'CONNECTED_DRIVE_EXACT_PRIVATE_CANONICAL_LOCAL_RUNTIME', 'real private build mode mismatch');
req(s.real.SOURCE_DRIVE_ID === '1MoArYnD3Npy-LePUrH8a82lg4uKyhND4', 'private canonical Drive ID mismatch');
req(s.real.SOURCE_BYTES === '4035500', 'real build source bytes mismatch');
req(s.real.SOURCE_SHA256 === '03b185974127709fa76ceac357f374d6fea99969833fa75266d3dbfa03dda432', 'real build source SHA mismatch');
req(s.real.REPAIRED_V4_SHA256 === '0f0c76c2c41500194374e43280be5d25198114a4034b1dc97a66fdad7742e66f', 'repaired V4 SHA mismatch');
req(s.real.QUESTION_COUNT === '10513', 'real build question count mismatch');
req(s.real.ENGLISH_QUESTION_COUNT === '10511', 'real build English question count mismatch');
req(s.real.UNIQUE_QUESTION_IDS === '10513', 'real build unique question ID count mismatch');
req(s.real.QB_DATA_UNCHANGED === 'true', 'real private build must preserve qb-data after handoff');
req(s.real.QUESTION_ID_ORDER_PRESERVED === 'true', 'real private build must preserve question ID order');
req(s.real.FINAL_QUALITY_ERRORS === '0', 'real private build final quality errors must be zero');
req(s.real.PRIVATE_KNOWLEDGE_EMBEDDED === 'false', 'real build must not embed private Knowledge');
req(s.real.MAIN_TOUCHED === 'false', 'real build must keep main untouched');

// v2 remains the deterministic bridge proof from the exact v1 artifact to the hardened URL-gated artifact.
req(s.v2Diagnostic.STATUS === 'PASS', 'v2 deterministic build diagnostic must PASS');
req(s.v2Diagnostic.V1_BYTES === V1_BYTES, 'v2 diagnostic source bytes mismatch');
req(s.v2Diagnostic.V1_SHA256 === V1_SHA, 'v2 diagnostic source SHA mismatch');
req(s.v2Diagnostic.PYTHON_EXIT_CODE === '0', 'v2 diagnostic transform failed');
req(s.v2Diagnostic.V2_BYTES === V2_BYTES, 'v2 diagnostic output bytes mismatch');
req(s.v2Diagnostic.V2_SHA256 === V2_SHA, 'v2 diagnostic output SHA mismatch');
req(/QB_BEFORE=([0-9a-f]{64});QB_AFTER=\1;/.test(s.v2Diagnostic.DETAILS || ''), 'v2 diagnostic must prove identical qb-data SHA before/after');
req(s.v2Diagnostic.MAIN_TOUCHED === 'false', 'v2 diagnostic must not touch main');

// Keep the previously verified exact v2 publication as historical composition evidence.
req(s.pagesV2.STATUS === 'PASS_EXACT_V2', 'historical problem-app v2 publication proof must PASS_EXACT_V2');
req(s.pagesV2.BUILD_PASS === 'true', 'v2 publication build proof must PASS');
req(s.pagesV2.V2_BYTES === V2_BYTES, 'historical v2 build bytes mismatch');
req(s.pagesV2.V2_SHA256 === V2_SHA, 'historical v2 build SHA mismatch');
req(s.pagesV2.CUSTOM_GPT_URL_HOST_GATE === 'true', 'historical v2 must enforce ChatGPT host gate');
req(s.pagesV2.CUSTOM_GPT_URL_G_PATH_GATE === 'true', 'historical v2 must enforce /g/ path gate');
req(s.pagesV2.MAIN_PROBLEM_PATH_PUBLISH_PASS === 'true', 'historical main/problem-app publication must PASS');
req(s.pagesV2.ROOT_INDEX_SHA_BEFORE === ROOT_SHA, 'vocabulary root SHA before v2 publication mismatch');
req(s.pagesV2.ROOT_INDEX_SHA_AFTER === ROOT_SHA, 'vocabulary root SHA after v2 publication mismatch');
req(s.pagesV2.PAGES_PASS === 'true', 'historical GitHub Pages exact-v2 verification must PASS');
req(s.pagesV2.PAGES_HTTP === '200', 'historical GitHub Pages v2 must return HTTP 200');
req(s.pagesV2.PAGES_BYTES === V2_BYTES, 'historical GitHub Pages v2 bytes mismatch');
req(s.pagesV2.PAGES_SHA256 === V2_SHA, 'historical GitHub Pages v2 SHA mismatch');
req(s.pagesV2.PHOTO_ATTACHMENT_LOCATION === 'MY_GPT_ONLY', 'historical v2 photo attachment route mismatch');
req(s.pagesV2.APP_PHOTO_ANALYSIS_PRIMARY === 'false', 'historical v2 must not use app-side photo analysis as primary');
req(s.pagesV2.PRIVATE_KNOWLEDGE_EMBEDDED === 'false', 'historical v2 must not expose private Knowledge');

// Exact private registration assets are part of release identity.
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
console.log('PRIVATE_CANONICAL_V4_PROOF=PASS');
console.log('HANDOFF_V2_COMPOSED_PROOF=PASS');
console.log('UNIFIED_RUNNER_V3=PASS');
console.log('NOOPENER_FALSE_FAILURE_FIX_WIRED=PASS');
console.log('HISTORICAL_GITHUB_PAGES_EXACT_V2_PROOF=PASS');
console.log('REGISTRATION_ASSET_IDENTITY=PASS');
console.log('EVIDENCE_CHAIN_V2=PASS');
console.log(`TRUE_RUNTIME=${runtimePending ? 'PENDING' : 'PASS'}`);
console.log(`TRUE_RUNTIME_GATE_VERSION=${s.runtime.GATE_VERSION}`);
console.log(`PUBLIC_INDEX=${s.publicIndex.STATUS}`);
console.log('PUBLIC_INDEX_CANONICAL=false');
console.log('PRIVATE_KNOWLEDGE_PUBLIC_EMBED=false');
console.log('VOCABULARY_ROOT_UNCHANGED=true');
