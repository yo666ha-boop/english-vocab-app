#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const instructionsPath = path.join(root, 'gpt', 'mikami_answer_analysis_gpt_instructions.md');
const schemaPath = path.join(root, 'gpt', 'mikami_answer_analysis_output_schema.json');
const readmePath = path.join(root, 'gpt', 'README.md');

const instructions = fs.readFileSync(instructionsPath, 'utf8');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const readme = fs.readFileSync(readmePath, 'utf8');

const requireText = (text, needle, label) => {
  if (!text.includes(needle)) throw new Error(`${label}: missing required text: ${needle}`);
};

for (const needle of [
  '問題IDが見える場合は、必ずIDでKnowledgeを照合する。',
  '写真が読めない箇所を推測採点しない。「判定保留」にする。',
  '問題IDがKnowledgeに見つからない場合、似た問題を代用しない。',
  '学校テストなど正本外の問題は、写真に実際に写っている問題文・生徒答案・採点記号だけを根拠に分析する。',
  '今回の誤答` → `必要な文法操作` → `その前提` → `最も早く直すべき戻り地点',
  '改善項目は原則3つまでに絞る。',
  '### みかみ塾 英語答案分析レポート',
  '**1. 今回できていたこと**',
  '**2. 間違いが集中したところ**',
  '**3. いちばん大きな原因**',
  '**4. 戻るならここ**',
  '**5. 次にやること**',
  '**6. 生徒へのひとこと**',
  'A4縦1〜2枚',
  '横に広い表は避ける。',
  '問題を大量に全文転載しない。'
]) requireText(instructions, needle, 'instructions');

for (const needle of [
  '修正版canonicalからKnowledge JSONLを生成',
  '10,511件をmanifestで確認',
  '正答答案写真で誤判定しない',
  '複数カテゴリの誤答案で、共通原因と戻り地点を出せる',
  '不鮮明答案を無理に採点しない',
  '学校テスト写真も正本外モードで分析できる',
  'A4印刷用レポートがそのまま使える',
  '旧アプリへのコピペ往復なしで運用できる'
]) requireText(readme, needle, 'README');

if (schema?.properties?.schema_version?.const !== 'mikami-answer-analysis-v1') {
  throw new Error('schema_version invariant mismatch');
}
const sourceModes = schema?.properties?.source_mode?.enum || [];
for (const mode of ['mikami_canonical', 'school_test', 'mixed']) {
  if (!sourceModes.includes(mode)) throw new Error(`missing source_mode ${mode}`);
}
const qItem = schema?.properties?.question_results?.items;
const statuses = qItem?.properties?.status?.enum || [];
for (const status of ['correct', 'wrong', 'blank', 'held']) {
  if (!statuses.includes(status)) throw new Error(`missing question status ${status}`);
}
const confidences = qItem?.properties?.confidence?.enum || [];
for (const c of ['high', 'medium', 'low']) {
  if (!confidences.includes(c)) throw new Error(`missing confidence ${c}`);
}
const errors = qItem?.properties?.error_class?.enum || [];
for (const e of ['grammar', 'prerequisite_grammar', 'vocabulary', 'reading', 'instruction_processing', 'spelling', 'blank', 'held']) {
  if (!errors.includes(e)) throw new Error(`missing error_class ${e}`);
}
if (schema?.properties?.root_causes?.maxItems !== 3) throw new Error('root_causes must be capped at 3');
if (schema?.properties?.return_points?.maxItems !== 3) throw new Error('return_points must be capped at 3');
if (schema?.properties?.next_actions?.maxItems !== 3) throw new Error('next_actions must be capped at 3');

const requiredTop = new Set(schema.required || []);
for (const k of ['schema_version','source_mode','summary','question_results','root_causes','return_points','next_actions']) {
  if (!requiredTop.has(k)) throw new Error(`schema missing required top-level key ${k}`);
}
const requiredQuestion = new Set(qItem?.required || []);
for (const k of ['question_no','status','confidence']) {
  if (!requiredQuestion.has(k)) throw new Error(`question_results item missing required ${k}`);
}

console.log(JSON.stringify({
  status: 'OK',
  instructions_contract: true,
  printable_report_contract: true,
  no_guessing_contract: true,
  school_test_mode_contract: true,
  schema_contract: true,
  max_priorities: 3
}, null, 2));
