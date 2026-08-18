import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const text = fs.readFileSync('index.html', 'utf8');
const decl = /\b(?:const|let|var)\s+DATA\s*=\s*/g.exec(text);
if (!decl) {
  console.error('DATA declaration not found');
  process.exit(2);
}

let i = decl.index + decl[0].length;
while (/\s/.test(text[i] ?? '')) i++;
if (text[i] !== '[') {
  console.error(`DATA does not start with [ at offset ${i}; found=${JSON.stringify(text.slice(i,i+80))}`);
  process.exit(3);
}

function findMatchingBracket(src, start) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let p = start; p < src.length; p++) {
    const c = src[p];
    const n = src[p+1];
    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && n === '/') { blockComment = false; p++; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) { quote = null; continue; }
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; p++; continue; }
    if (c === '/' && n === '*') { blockComment = true; p++; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return p;
    }
  }
  return -1;
}

const end = findMatchingBracket(text, i);
if (end < 0) {
  console.error('DATA closing bracket not found');
  process.exit(4);
}

const expr = text.slice(i, end + 1);
fs.mkdirSync('audit', {recursive: true});
fs.writeFileSync('audit/DATA_DECLARATION_SNIPPET.txt', text.slice(Math.max(0, decl.index - 120), Math.min(text.length, i + 3500)));

let data;
try {
  const sandbox = Object.create(null);
  data = vm.runInNewContext(`(${expr})`, sandbox, {timeout: 5000});
} catch (e) {
  console.error('DATA evaluation failed:', e);
  fs.writeFileSync('audit/DATA_EVAL_ERROR.txt', String(e.stack || e));
  process.exit(5);
}
if (!Array.isArray(data)) {
  console.error('DATA is not an array');
  process.exit(6);
}

const records = data.filter(r => r && typeof r === 'object' && r.dataset === 'textbook');
const by = new Map();
const inc = (map, key) => map.set(key, (map.get(key) || 0) + 1);
const stars = new Map();
const phrases = new Map();
for (const r of records) {
  const key = `${r.textbook ?? ''}\t${r.grade ?? ''}`;
  inc(by, key);
  if (String(r.star ?? '') === '1') inc(stars, key);
  if (String(r.phrase ?? '') === '1') inc(phrases, key);
}

const fields = [...new Set(records.flatMap(r => Object.keys(r)))].sort();
const fullDupMap = new Map();
for (const r of records) {
  const k = JSON.stringify([
    r.textbook ?? '', r.grade ?? '', r.major_unit ?? '', r.section ?? '',
    r.english ?? '', r.japanese ?? '', r.star ?? '', r.kana ?? ''
  ]);
  inc(fullDupMap, k);
}
const fullDups = [...fullDupMap.entries()].filter(([,n]) => n > 1).map(([k,n]) => ({count:n,key:JSON.parse(k)})).sort((a,b)=>b.count-a.count);

const knownTerms = ['sweet(s)','friend(s)','English','want to','How about you?',"don't",'Malala Yousafzai','Cafe Maria','Diane Kichijitsu','South Africa','natural gas'];
const termRows = Object.fromEntries(knownTerms.map(term => [term, records.filter(r => String(r.english ?? '').toLowerCase().includes(term.toLowerCase())).slice(0,25)]));

const counts = [...by.entries()].sort().map(([key,count]) => {
  const [textbook,grade] = key.split('\t');
  return {textbook,grade,count,star:stars.get(key)||0,phrase:phrases.get(key)||0};
});

const summary = {
  source: 'index.html const DATA',
  index_sha256: crypto.createHash('sha256').update(text,'utf8').digest('hex'),
  data_array_count: data.length,
  textbook_record_count: records.length,
  fields,
  counts_by_textbook_grade: counts,
  missing_english: records.filter(r => !String(r.english ?? '').trim()).length,
  missing_japanese: records.filter(r => !String(r.japanese ?? '').trim()).length,
  missing_kana: records.filter(r => !String(r.kana ?? '').trim()).length,
  blank_pos_raw: records.filter(r => !String(r.pos_raw ?? '').trim()).length,
  full_duplicate_group_count: fullDups.length,
  full_duplicate_groups: fullDups.slice(0,100),
  known_term_rows: termRows,
  samples: records.slice(0,20)
};
fs.writeFileSync('audit/VOCAB_EMBEDDED_DATA_SUMMARY.json', JSON.stringify(summary, null, 2));

const lines = [
  `data_array_count=${summary.data_array_count}`,
  `textbook_record_count=${summary.textbook_record_count}`,
  `missing_english=${summary.missing_english}`,
  `missing_japanese=${summary.missing_japanese}`,
  `missing_kana=${summary.missing_kana}`,
  `blank_pos_raw=${summary.blank_pos_raw}`,
  `full_duplicate_group_count=${summary.full_duplicate_group_count}`,
  `fields=${fields.join(',')}`,
  '', '[counts_by_textbook_grade]'
];
for (const r of counts) lines.push(`${r.textbook}\t中${r.grade}\tcount=${r.count}\tstar=${r.star}\tphrase=${r.phrase}`);
lines.push('', '[known_terms]');
for (const term of knownTerms) {
  const rows = termRows[term];
  lines.push(`${term}\trows=${rows.length}`);
  for (const r of rows.slice(0,5)) lines.push('  ' + JSON.stringify(r));
}
fs.writeFileSync('audit/VOCAB_EMBEDDED_DATA_SUMMARY.txt', lines.join('\n') + '\n');
console.log(lines.join('\n'));

// Hard fail only on structural impossibilities. Canonical target comparisons are reported, not assumed.
if (records.length === 0) process.exit(7);
