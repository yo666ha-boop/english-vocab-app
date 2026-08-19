import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const terms = [
  'memoryPrintBtn',
  'memoryPrint',
  'memoryMode',
  'window.print',
  '暗記',
  'printMemory',
  'memoryGroupedArea'
];

const chunks = [];
const seen = new Set();
for (const term of terms) {
  let from = 0;
  let count = 0;
  while (true) {
    const idx = html.indexOf(term, from);
    if (idx < 0) break;
    const key = `${Math.floor(idx / 2000)}`;
    if (!seen.has(key)) {
      seen.add(key);
      const start = Math.max(0, idx - 5000);
      const end = Math.min(html.length, idx + 9000);
      chunks.push(`\n===== ${term} @ ${idx} =====\n${html.slice(start, end)}\n`);
    }
    count++;
    if (count >= 20) break;
    from = idx + term.length;
  }
}

if (!chunks.length) throw new Error('No memory/print markers found');
fs.mkdirSync('audit', {recursive:true});
fs.writeFileSync('audit/MEMORY_PRINT_CONTEXT.txt', chunks.join('\n'), 'utf8');
console.log(JSON.stringify({status:'pass', html_bytes:Buffer.byteLength(html), chunks:chunks.length, terms}, null, 2));
