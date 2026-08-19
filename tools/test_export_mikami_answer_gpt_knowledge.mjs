#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mikami-answer-gpt-export-test-'));
const input = path.join(dir, 'canonical.html');
const out = path.join(dir, 'knowledge.jsonl');
const manifest = path.join(dir, 'manifest.json');

const records = [];
for (let i = 1; i <= 10511; i++) {
  records.push({
    id: `TEST-ENG-${String(i).padStart(5, '0')}`,
    subject: '英語',
    grade: i % 3 === 1 ? '中1' : i % 3 === 2 ? '中2' : '中3',
    category: i % 2 ? '一般動詞' : '比較',
    type: i % 2 ? '空所補充' : '選択',
    q: `Synthetic question ${i}`,
    a: `answer-${i}`,
    choices: [`answer-${i}`, `distractor-${i}`],
    source_tag: 'synthetic-regression'
  });
}
records.push({id: 'TEST-JP-00001', subject: '国語', grade: '中1', category: 'test', type: 'test', q: 'x', a: 'x'});
records.push({id: 'TEST-MATH-00001', subject: '数学', grade: '中1', category: 'test', type: 'test', q: 'x', a: 'x'});

const html = `<!doctype html><html><body><script id="qb-data" type="application/json">${JSON.stringify(records)}</script></body></html>`;
fs.writeFileSync(input, html, 'utf8');
execFileSync(process.execPath, ['tools/export_mikami_answer_gpt_knowledge.mjs', input, out, manifest], {stdio: 'inherit'});

const lines = fs.readFileSync(out, 'utf8').trimEnd().split('\n');
if (lines.length !== 10511) throw new Error(`expected 10511 lines, got ${lines.length}`);
const first = JSON.parse(lines[0]);
const last = JSON.parse(lines.at(-1));
if (first.id !== 'TEST-ENG-00001' || first.q !== 'Synthetic question 1' || first.a !== 'answer-1') {
  throw new Error('first record not preserved');
}
if (last.id !== 'TEST-ENG-10511' || last.source_tag !== 'synthetic-regression') {
  throw new Error('last record/additional metadata not preserved');
}
const man = JSON.parse(fs.readFileSync(manifest, 'utf8'));
if (man.status !== 'OK' || man.canonical_total_questions !== 10513 || man.canonical_english_questions !== 10511 || man.canonical_unique_ids !== 10513 || man.exported_records !== 10511) {
  throw new Error(`manifest invariant failed: ${JSON.stringify(man)}`);
}
if (!/^[a-f0-9]{64}$/.test(man.source_sha256) || !/^[a-f0-9]{64}$/.test(man.knowledge_sha256)) {
  throw new Error('manifest SHA256 missing');
}

console.log('Mikami answer GPT knowledge exporter regression: OK');
