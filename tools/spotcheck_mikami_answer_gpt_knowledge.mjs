#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const [repairedHtmlPath, knowledgePath, outputPath='dist/gpt/mikami_english_question_bank_knowledge.spotcheck.json'] = process.argv.slice(2);
if (!repairedHtmlPath || !knowledgePath) {
  console.error('Usage: node tools/spotcheck_mikami_answer_gpt_knowledge.mjs <repaired-canonical.html> <knowledge.jsonl> [spotcheck.json]');
  process.exit(2);
}

const html = fs.readFileSync(repairedHtmlPath, 'utf8');
const match = html.match(/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/i);
if (!match) throw new Error('qb-data not found in repaired canonical');
const qb = JSON.parse(match[1]);
if (!Array.isArray(qb)) throw new Error('qb-data is not an array');

const sourceEnglish = qb.filter(x => x?.subject === '英語');
assert.equal(qb.length, 10513, 'canonical total must be 10513');
assert.equal(sourceEnglish.length, 10511, 'canonical English total must be 10511');

const knowledge = fs.readFileSync(knowledgePath, 'utf8').trimEnd().split('\n').map((line, i) => {
  try { return JSON.parse(line); }
  catch (e) { throw new Error(`invalid knowledge JSONL line ${i + 1}: ${e.message}`); }
});
assert.equal(knowledge.length, 10511, 'knowledge total must be 10511');
const byId = new Map(knowledge.map(x => [String(x?.id ?? ''), x]));
assert.equal(byId.size, 10511, 'knowledge IDs must be unique');

const families = [
  {key:'R1_PRON', label:'中1 代名詞', select:x=>String(x?.id||'').startsWith('R1-PRON-'), min:12},
  {key:'GEN_PRS', label:'中1 一般動詞・現在', select:x=>String(x?.id||'').startsWith('GEN-PRS-'), min:1},
  {key:'M2_GER2', label:'中2 動名詞', select:x=>String(x?.id||'').startsWith('M2-GER2-'), min:1},
  {key:'M2_COMP2', label:'中2 比較', select:x=>String(x?.id||'').startsWith('M2-COMP2-'), min:1},
  {key:'M2X_INF', label:'中2 不定詞', select:x=>String(x?.id||'').startsWith('M2X-INF-'), min:1},
  {key:'M2_RD2', label:'中2 読解', select:x=>String(x?.id||'').startsWith('M2-RD2-'), min:1},
  {key:'M3_PRESENT_PERFECT', label:'中3 現在完了', select:x=>String(x?.category||'').startsWith('現在完了形'), min:1},
  {key:'M3_RELATIVE', label:'中3 関係代名詞', select:x=>String(x?.category||'')==='関係代名詞', min:1},
  {key:'M3N_REVIEW', label:'中3 復習系', select:x=>String(x?.id||'').startsWith('M3N-'), min:1}
];

function sampleAcross(items, n=3) {
  if (items.length <= n) return items;
  const idx = [...new Set([0, Math.floor((items.length - 1) / 2), items.length - 1])];
  return idx.map(i => items[i]);
}

const familyReports = [];
let checked = 0;
for (const family of families) {
  const source = sourceEnglish.filter(family.select);
  if (source.length < family.min) {
    throw new Error(`${family.key}: expected at least ${family.min} canonical records, found ${source.length}`);
  }
  const samples = sampleAcross(source);
  const sampleReports = [];
  for (const src of samples) {
    const id = String(src.id);
    const got = byId.get(id);
    if (!got) throw new Error(`${family.key}: knowledge missing canonical ID ${id}`);
    assert.deepEqual(got, src, `${family.key}: full-record mismatch for ${id}`);
    for (const field of ['q','a','grade','category','type']) {
      assert.deepEqual(got[field], src[field], `${family.key}: ${field} mismatch for ${id}`);
    }
    sampleReports.push({
      id,
      grade: src.grade ?? null,
      category: src.category ?? null,
      type: src.type ?? null,
      q: src.q ?? null,
      a: src.a ?? null,
      exact_record_match: true
    });
    checked++;
  }
  familyReports.push({
    key: family.key,
    label: family.label,
    canonical_family_count: source.length,
    sample_count: samples.length,
    samples: sampleReports
  });
}

const report = {
  status:'OK',
  purpose:'representative family spot-check for Mikami answer-analysis GPT Knowledge',
  canonical_total_questions: qb.length,
  canonical_english_questions: sourceEnglish.length,
  knowledge_records: knowledge.length,
  families_required: families.length,
  families_passed: familyReports.length,
  representative_records_checked: checked,
  selection_method:'first/middle/last record of each required family when available',
  full_record_match_required:true,
  families: familyReports
};

fs.mkdirSync(new URL('.', `file://${process.cwd()}/${outputPath}`).pathname, {recursive:true});
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
