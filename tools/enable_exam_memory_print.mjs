import fs from 'node:fs';

const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');
const before = html;

const exactBlocks = [
  `    if (state.dataset === 'exam') {\n      alert('高校入試版は暗記プリントではなく、問題印刷または解答印刷を使ってください。');\n      return;\n    }\n`,
  `    if (state.dataset === 'exam') { alert('高校入試版は暗記プリントではなく、問題印刷または解答印刷を使ってください。'); return; }\n`
];

let removed = 0;
for (const block of exactBlocks) {
  while (html.includes(block)) {
    html = html.replace(block, '');
    removed++;
  }
}

// Fallback for formatting differences, but only for the exact exam-memory prohibition text.
const prohibition = /\s*if \(state\.dataset === 'exam'\) \{\s*alert\('高校入試版は暗記プリントではなく、問題印刷または解答印刷を使ってください。'\);\s*return;\s*\}\s*/g;
html = html.replace(prohibition, () => { removed++; return '\n'; });

if (html.includes('高校入試版は暗記プリントではなく、問題印刷または解答印刷を使ってください。')) {
  throw new Error('exam memory-print prohibition still remains');
}
if (removed < 1) throw new Error('no exam memory-print prohibition was removed');
if (html === before) throw new Error('index.html was not changed');
if (!html.includes("return r.exam_subcategory || r.exam_category || 'その他';")) {
  throw new Error('exam memory grouping logic is missing');
}
if (!html.includes('MEMORY_PRINT_ROWS_PER_PAGE = 18')) throw new Error('memory pagination missing');
if (!html.includes('MEMORY_PRINT_MAX_ROWS = 1000')) throw new Error('memory print safety limit missing');

fs.writeFileSync(path, html, 'utf8');
console.log(JSON.stringify({status:'pass', removed_exam_blocks:removed, rows_per_page:18, max_rows:1000, bytes:Buffer.byteLength(html)}, null, 2));
