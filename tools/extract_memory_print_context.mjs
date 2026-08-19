import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');

function extractBalanced(startIdx) {
  const brace = html.indexOf('{', startIdx);
  if (brace < 0) return '';
  let depth = 0;
  let quote = '';
  let escape = false;
  let templateDepth = 0;
  for (let i = brace; i < html.length; i++) {
    const ch = html[i];
    if (escape) { escape = false; continue; }
    if (quote) {
      if (ch === '\\') { escape = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return html.slice(startIdx, i + 1);
    }
  }
  return html.slice(startIdx, Math.min(html.length, startIdx + 30000));
}

const targets = [
  'function buildMemoryPrintHtml()',
  'buildMemoryPrintHtml = function()',
  'async function runPrint(mode)',
  "els.memoryPrintBtn.addEventListener('click'"
];

const out = [];
for (const t of targets) {
  let p = 0;
  let n = 0;
  while ((p = html.indexOf(t, p)) >= 0) {
    n++;
    let block;
    if (t.startsWith('els.')) block = html.slice(Math.max(0,p-1200), Math.min(html.length,p+1600));
    else block = extractBalanced(p);
    out.push(`\n===== ${t} occurrence ${n} @ ${p} =====\n${block}\n`);
    p += t.length;
  }
}

if (!out.length) throw new Error('No target functions found');
fs.mkdirSync('audit', {recursive:true});
fs.writeFileSync('audit/MEMORY_PRINT_CONTEXT.txt', out.join('\n'), 'utf8');
console.log(JSON.stringify({status:'pass', html_bytes:Buffer.byteLength(html), blocks:out.length}, null, 2));
