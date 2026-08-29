import fs from 'node:fs';

const html = fs.readFileSync('problem-app/index.html', 'utf8');
const needles = [
  'function renderQuestions',
  'function saveState',
  'function restoreState',
  'currentQuestions',
  'questionPreview',
  'printBothBtn',
  'function printQuestions',
  '保存データを書き出す',
  '保存データを読み',
  'exportBtn',
  'importBtn',
  'localStorage'
];

function snippetsFor(needle) {
  const out = [];
  let from = 0;
  while (out.length < 4) {
    const idx = html.indexOf(needle, from);
    if (idx < 0) break;
    out.push({
      index: idx,
      snippet: html.slice(Math.max(0, idx - 1800), Math.min(html.length, idx + 5000))
    });
    from = idx + needle.length;
  }
  return out;
}

const result = {
  generated_at: new Date().toISOString(),
  html_bytes: Buffer.byteLength(html),
  contexts: Object.fromEntries(needles.map(n => [n, snippetsFor(n)]))
};

fs.mkdirSync('audit', { recursive: true });
fs.writeFileSync('audit/PROBLEM_APP_PRINT_HISTORY_CONTEXT.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(result.contexts).map(([k,v]) => [k, v.length])), null, 2));
