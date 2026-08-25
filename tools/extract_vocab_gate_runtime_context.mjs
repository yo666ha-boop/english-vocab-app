import fs from 'node:fs';

const html = fs.readFileSync('problem-app/index.html','utf8');
const needles = [
  'function passesVocab',
  'passesVocab =',
  'function passesPrereqGrammar',
  'passesPrereqGrammar =',
  'useVocabGate',
  'requiredGrammarStageIndex',
  'passMeta'
];
const out = { generated_at: new Date().toISOString(), html_bytes: Buffer.byteLength(html), hits: [] };
for (const needle of needles) {
  let from = 0, count = 0;
  while (count < 8) {
    const i = html.indexOf(needle, from);
    if (i < 0) break;
    const start = Math.max(0, i - 1800);
    const end = Math.min(html.length, i + needle.length + 3600);
    out.hits.push({ needle, index: i, context: html.slice(start,end) });
    from = i + needle.length;
    count++;
  }
}
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/VOCAB_GATE_RUNTIME_CONTEXT.json', JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({hits: out.hits.length, needles: [...new Set(out.hits.map(x=>x.needle))]}, null, 2));
if (!out.hits.some(x=>x.needle.includes('passesVocab'))) process.exitCode = 2;
