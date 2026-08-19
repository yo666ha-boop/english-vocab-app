#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [inputPath, outputPath='dist/gpt/mikami_english_question_bank_knowledge.jsonl', manifestPath='dist/gpt/mikami_english_question_bank_knowledge.manifest.json'] = process.argv.slice(2);
if (!inputPath) {
  console.error('Usage: node tools/export_mikami_answer_gpt_knowledge.mjs <repaired-canonical.html> [knowledge.jsonl] [manifest.json]');
  process.exit(2);
}

const html = fs.readFileSync(inputPath, 'utf8');
const m = html.match(/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/i);
if (!m) throw new Error('qb-data not found');
const qb = JSON.parse(m[1]);
if (!Array.isArray(qb)) throw new Error('qb-data is not an array');

const total = qb.length;
const english = qb.filter(x => x?.subject === '英語');
const uniqueIds = new Set(qb.map(x => String(x?.id ?? ''))).size;
if (total !== 10513) throw new Error(`canonical total mismatch: ${total}`);
if (english.length !== 10511) throw new Error(`canonical English count mismatch: ${english.length}`);
if (uniqueIds !== 10513) throw new Error(`canonical unique ID count mismatch: ${uniqueIds}`);
if (english.some(x => !x?.id || !x?.q || x?.a === undefined || x?.a === null)) {
  throw new Error('English bank contains a record missing id/q/a');
}

const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(inputPath)).digest('hex');
const stable = (x) => {
  // Preserve the repaired canonical record exactly, while moving retrieval keys first.
  const first = {
    id: x.id,
    subject: x.subject,
    grade: x.grade,
    category: x.category,
    type: x.type,
    q: x.q,
    a: x.a
  };
  const rest = {};
  for (const [k, v] of Object.entries(x)) {
    if (!(k in first)) rest[k] = v;
  }
  return {...first, ...rest};
};

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.mkdirSync(path.dirname(manifestPath), {recursive: true});
fs.writeFileSync(outputPath, english.map(x => JSON.stringify(stable(x))).join('\n') + '\n', 'utf8');

const knowledgeSha256 = crypto.createHash('sha256').update(fs.readFileSync(outputPath)).digest('hex');
const manifest = {
  status: 'OK',
  purpose: 'みかみ塾 答案分析GPT knowledge export',
  source_file: inputPath,
  source_sha256: sourceSha256,
  canonical_total_questions: total,
  canonical_english_questions: english.length,
  canonical_unique_ids: uniqueIds,
  exported_records: english.length,
  knowledge_file: outputPath,
  knowledge_sha256: knowledgeSha256,
  matching_key: 'id',
  source_of_truth: 'repaired canonical qb-data; do not infer a different correct answer',
  generated_at: new Date().toISOString()
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(manifest, null, 2));
