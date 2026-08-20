#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const [inputPath, outputPath='みかみ塾英語問題アプリ_正本修正版_MyGPT連携.html'] = process.argv.slice(2);
if (!inputPath) {
  console.error('Usage: node tools/run_mikami_pipeline_v4_answer_gpt.mjs <canonical.html> [output.html]');
  process.exit(2);
}

const sha256 = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run = (script, args) => execFileSync(process.execPath, [script, ...args], {stdio:'inherit'});
const extractQb = p => {
  const html = fs.readFileSync(p, 'utf8');
  const m = html.match(/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/i);
  if (!m) throw new Error(`qb-data not found: ${p}`);
  return JSON.parse(m[1]);
};
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mikami-v4-answer-gpt-'));
const repaired = path.join(tmpDir, '01-repaired-v4.html');
const finalAudit = outputPath + '.final-audit.json';
const integrationAudit = outputPath + '.answer-gpt-integration.audit.json';

try {
  // 1) Build the already-audited V4 repaired canonical app.
  run('tools/run_mikami_pipeline_v4.mjs', [inputPath, repaired, '--reset-checkpoints']);
  assert(fs.existsSync(repaired + '.pipeline-v4.audit.json'), 'V4 audit missing');
  const v4Audit = JSON.parse(fs.readFileSync(repaired + '.pipeline-v4.audit.json', 'utf8'));
  assert(v4Audit.status === 'OK', 'V4 pipeline is not PASS');
  assert(v4Audit.final_quality_errors === 0, 'V4 final quality errors are not zero');

  // 2) Change only the photo-analysis handoff UI. The patcher preserves the old
  // copy/paste flow inside a fallback section until true Custom GPT runtime PASS.
  run('tools/patch_mikami_answer_gpt_handoff.mjs', [repaired, outputPath]);

  // 3) Prove that the problem bank itself is byte-for-byte equivalent after
  // JSON parsing and that all IDs/order remain unchanged.
  const beforeQb = extractQb(repaired);
  const afterQb = extractQb(outputPath);
  assert(beforeQb.length === afterQb.length, 'question count changed by My GPT handoff patch');
  assert(JSON.stringify(beforeQb) === JSON.stringify(afterQb), 'qb-data changed by My GPT handoff patch');
  const idsBefore = beforeQb.map(q => q?.id);
  const idsAfter = afterQb.map(q => q?.id);
  assert(JSON.stringify(idsBefore) === JSON.stringify(idsAfter), 'question ID order changed by My GPT handoff patch');
  assert(new Set(idsAfter).size === afterQb.length, 'duplicate IDs introduced after My GPT handoff patch');

  const html = fs.readFileSync(outputPath, 'utf8');
  const requiredMarkers = [
    'id="openAnswerGptBtn"',
    '答案分析My GPTを開く',
    'id="copyAnswerGptHandoffBtn"',
    'id="setAnswerGptUrlBtn"',
    'id="legacyPhotoAnalysisFallback"',
    '旧方式（予備）',
    'mikami-answer-gpt-handoff-v1',
    'question_ids: ids'
  ];
  for (const marker of requiredMarkers) assert(html.includes(marker), `missing My GPT marker: ${marker}`);

  // Handoff must never publish the private Knowledge payload or its verified hash.
  assert(!html.includes('be820c3e4d5c26773d642f1c055fea33f2796d71b6fca16f4e1edf5efc6f9213'), 'private Knowledge hash leaked into HTML');
  assert(!html.includes('1t51uacLDfzhv8gBsyi9H_czRnbGsuCaC'), 'private Knowledge Drive ID leaked into HTML');

  // 4) Re-run the canonical invariant audit against the original canonical
  // source. This protects all previously completed problem-bank gates.
  run('tools/audit_final_canonical.mjs', [outputPath, inputPath, finalAudit, '--canonical']);
  const audit = JSON.parse(fs.readFileSync(finalAudit, 'utf8'));
  assert(audit.status === 'OK', 'final canonical audit failed after My GPT handoff patch');
  assert(audit.canonical_mode === true, 'final audit not run in canonical mode');
  assert(audit.question_count === 10513, `unexpected question count: ${audit.question_count}`);
  assert(audit.english_question_count === 10511, `unexpected English count: ${audit.english_question_count}`);
  assert(audit.unique_question_ids === 10513, `unexpected unique ID count: ${audit.unique_question_ids}`);
  assert(audit.final_quality_errors === 0, `final quality errors: ${audit.final_quality_errors}`);

  // Keep the original V4 audit beside the unified artifact for release packaging.
  fs.copyFileSync(repaired + '.pipeline-v4.audit.json', outputPath + '.pipeline-v4.audit.json');

  const report = {
    status: 'PASS',
    runner: 'run_mikami_pipeline_v4_answer_gpt.mjs',
    canonical_source_sha256: sha256(inputPath),
    repaired_v4_sha256: sha256(repaired),
    unified_output_sha256: sha256(outputPath),
    question_count: afterQb.length,
    english_question_count: afterQb.filter(q => q?.subject === '英語').length,
    unique_question_ids: new Set(idsAfter).size,
    qb_data_unchanged_after_handoff_patch: true,
    question_id_order_preserved: true,
    final_quality_errors: 0,
    my_gpt_primary_ui: true,
    handoff_fields: ['source_mode','target','question_ids','question_count'],
    private_knowledge_embedded: false,
    legacy_copy_paste: 'fallback_only',
    custom_gpt_runtime_test: false,
    real_photo_test_pending: true
  };
  fs.writeFileSync(integrationAudit, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
  try { if (fs.existsSync(finalAudit)) fs.unlinkSync(finalAudit); } catch {}
  try { if (fs.existsSync(integrationAudit)) fs.unlinkSync(integrationAudit); } catch {}
  console.error(`MIKAMI V4 + ANSWER GPT PIPELINE FAILED: ${e.message}`);
  process.exit(4);
} finally {
  fs.rmSync(tmpDir, {recursive:true, force:true});
}
