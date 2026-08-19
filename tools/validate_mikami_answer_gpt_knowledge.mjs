#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [repairedHtmlPath, knowledgePath, manifestPath] = process.argv.slice(2);
if (!repairedHtmlPath || !knowledgePath || !manifestPath) {
  console.error('Usage: node tools/validate_mikami_answer_gpt_knowledge.mjs <repaired-canonical.html> <knowledge.jsonl> <manifest.json>');
  process.exit(2);
}

const sha256File = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const html = fs.readFileSync(repairedHtmlPath, 'utf8');
const match = html.match(/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/i);
if (!match) throw new Error('qb-data not found in repaired canonical');
const qb = JSON.parse(match[1]);
if (!Array.isArray(qb)) throw new Error('qb-data is not an array');

const english = qb.filter(x => x?.subject === '英語');
const allUniqueIds = new Set(qb.map(x => String(x?.id ?? '')));
const englishUniqueIds = new Set(english.map(x => String(x?.id ?? '')));

assert.equal(qb.length, 10513, 'canonical total must be 10513');
assert.equal(english.length, 10511, 'canonical English total must be 10511');
assert.equal(allUniqueIds.size, 10513, 'canonical all IDs must be unique');
assert.equal(englishUniqueIds.size, 10511, 'canonical English IDs must be unique');

const rawKnowledge = fs.readFileSync(knowledgePath, 'utf8');
const lines = rawKnowledge.trimEnd().split('\n');
assert.equal(lines.length, 10511, 'knowledge JSONL line count must be 10511');
const exported = lines.map((line, i) => {
  try { return JSON.parse(line); }
  catch (e) { throw new Error(`invalid JSONL at line ${i + 1}: ${e.message}`); }
});

const exportedIds = new Set(exported.map(x => String(x?.id ?? '')));
assert.equal(exportedIds.size, 10511, 'knowledge IDs must be unique');
assert.ok(exported.every(x => x?.subject === '英語'), 'knowledge must contain English records only');

// Exporter is intentionally lossless: every English record must be present once,
// in canonical order, with exactly the same key/value data. Property order is irrelevant.
for (let i = 0; i < english.length; i++) {
  assert.equal(exported[i]?.id, english[i]?.id, `ID/order mismatch at English index ${i}`);
  assert.deepEqual(exported[i], english[i], `record content mismatch for ${english[i]?.id ?? `index-${i}`}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(manifest.status, 'OK', 'manifest status');
assert.equal(manifest.canonical_total_questions, 10513, 'manifest canonical total');
assert.equal(manifest.canonical_english_questions, 10511, 'manifest English total');
assert.equal(manifest.canonical_unique_ids, 10513, 'manifest unique IDs');
assert.equal(manifest.exported_records, 10511, 'manifest exported records');
assert.equal(manifest.source_sha256, sha256File(repairedHtmlPath), 'manifest source SHA256');
assert.equal(manifest.knowledge_sha256, sha256File(knowledgePath), 'manifest knowledge SHA256');
assert.equal(manifest.matching_key, 'id', 'manifest matching key');

console.log(JSON.stringify({
  status: 'OK',
  canonical_total_questions: qb.length,
  canonical_english_questions: english.length,
  canonical_unique_ids: allUniqueIds.size,
  knowledge_records: exported.length,
  knowledge_unique_ids: exportedIds.size,
  source_sha256: manifest.source_sha256,
  knowledge_sha256: manifest.knowledge_sha256,
  full_record_equality: true,
  canonical_order_preserved: true
}, null, 2));
