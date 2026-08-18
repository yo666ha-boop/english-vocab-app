import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const CSV_PATH = process.argv[2] || 'data/v7_master.csv';
const HTML_PATH = 'index.html';

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else {
      if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

function findMatchingBracket(src, start) {
  let depth = 0, quote = null, escaped = false, lineComment = false, blockComment = false;
  for (let p = start; p < src.length; p++) {
    const c = src[p], n = src[p + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; p++; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; p++; continue; }
    if (c === '/' && n === '*') { blockComment = true; p++; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return p; }
  }
  return -1;
}

function extractData(html) {
  const decl = /\b(?:const|let|var)\s+DATA\s*=\s*/g.exec(html);
  if (!decl) throw new Error('DATA declaration not found');
  let start = decl.index + decl[0].length;
  while (/\s/.test(html[start] ?? '')) start++;
  if (html[start] !== '[') throw new Error('DATA does not start with [');
  const end = findMatchingBracket(html, start);
  if (end < 0) throw new Error('DATA closing bracket not found');
  const data = vm.runInNewContext(`(${html.slice(start, end + 1)})`, Object.create(null), { timeout: 10000 });
  if (!Array.isArray(data)) throw new Error('DATA is not array');
  return { decl, start, end, data };
}

const csvText = fs.readFileSync(CSV_PATH, 'utf8').replace(/^\uFEFF/, '');
const table = parseCsv(csvText);
if (table.length < 2) throw new Error('canonical CSV is empty');
const headers = table[0];
const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
const required = ['ID','教科書','学年','大単元','単元名','英語','日本語','重要語フラグ','読みの目安','語句構造','複数語フラグ','v7確認状態'];
for (const h of required) if (!(h in idx)) throw new Error(`missing canonical column: ${h}`);

const sourceRows = table.slice(1).filter(r => r.some(v => String(v).trim() !== ''));
if (sourceRows.length !== 3975) throw new Error(`canonical row count ${sourceRows.length} != 3975`);
const ids = sourceRows.map(r => Number(r[idx.ID]));
if (ids.some((id, i) => id !== i + 1)) throw new Error('canonical IDs are not continuous 1..3975');
if (new Set(ids).size !== 3975) throw new Error('canonical IDs are duplicated');

const html = fs.readFileSync(HTML_PATH, 'utf8');
const extracted = extractData(html);
const oldTextbook = extracted.data.filter(r => r && r.dataset === 'textbook');
const preserved = extracted.data.filter(r => r && r.dataset !== 'textbook');

const norm = v => String(v ?? '').trim();
const key6 = r => [r.textbook,r.grade,r.major_unit,r.section,r.english,r.japanese].map(norm).join('\u241f');
const key4 = r => [r.textbook,r.grade,r.english,r.japanese].map(norm).join('\u241f');
const key3 = r => [r.textbook,r.grade,r.english].map(norm).join('\u241f');
const mapUnique = (rows, keyFn) => {
  const tmp = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!tmp.has(k)) tmp.set(k, r); else tmp.set(k, null);
  }
  return tmp;
};
const m6 = mapUnique(oldTextbook, key6);
const m4 = mapUnique(oldTextbook, key4);
const m3 = mapUnique(oldTextbook, key3);
let metaExact = 0, metaFallback = 0, metaNew = 0;

function sourceObject(r) {
  return {
    textbook: norm(r[idx['教科書']]),
    grade: norm(r[idx['学年']]),
    major_unit: norm(r[idx['大単元']]),
    section: norm(r[idx['単元名']]),
    english: norm(r[idx['英語']]),
    japanese: norm(r[idx['日本語']])
  };
}

const textbook = sourceRows.map(r => {
  const s = sourceObject(r);
  let old = m6.get(key6(s));
  if (old) metaExact++;
  if (!old) { old = m4.get(key4(s)); if (old) metaFallback++; }
  if (!old) { old = m3.get(key3(s)); if (old) metaFallback++; }
  if (!old) metaNew++;
  const phrase = norm(r[idx['複数語フラグ']]) === '1' ? '1' : '0';
  const status = norm(r[idx['v7確認状態']]);
  const termType = norm(r[idx['語句構造']]);
  return {
    dataset: 'textbook',
    textbook: s.textbook,
    grade: s.grade,
    major_unit: s.major_unit,
    section: s.section,
    english: s.english,
    japanese: s.japanese,
    star: norm(r[idx['重要語フラグ']]) === '1' ? '1' : '0',
    phrase,
    pos: old?.pos ?? (phrase === '1' || termType !== '単語' ? '熟語・表現' : ''),
    pos_raw: old?.pos_raw ?? '',
    exam_category: '',
    exam_subcategory: '',
    current_confirmed: old?.current_confirmed ?? (status === '現行確認済み' ? '1' : '0'),
    kana: norm(r[idx['読みの目安']])
  };
});

const nonTextbookCounts = preserved.reduce((a, r) => { const k = String(r.dataset ?? '(blank)'); a[k] = (a[k] || 0) + 1; return a; }, {});
if (nonTextbookCounts.exam !== 534) throw new Error(`exam count changed: ${nonTextbookCounts.exam}`);
if (nonTextbookCounts.elementary !== 104) throw new Error(`elementary count changed: ${nonTextbookCounts.elementary}`);
if (textbook.some(r => !r.english)) throw new Error('blank English in canonical textbook rows');
if (textbook.some(r => !r.japanese)) throw new Error('blank Japanese in canonical textbook rows');
if (textbook.some(r => !r.kana)) throw new Error('blank kana in canonical textbook rows');

const newData = [...textbook, ...preserved];
if (newData.length !== 4613) throw new Error(`total record count ${newData.length} != 4613`);
const replacement = JSON.stringify(newData);
const newHtml = html.slice(0, extracted.start) + replacement + html.slice(extracted.end + 1);
fs.writeFileSync(HTML_PATH, newHtml, 'utf8');

const byTextbookGrade = {};
for (const r of textbook) {
  const k = `${r.textbook}\t${r.grade}`;
  byTextbookGrade[k] = (byTextbookGrade[k] || 0) + 1;
}
const result = {
  canonical_csv_sha256: crypto.createHash('sha256').update(csvText, 'utf8').digest('hex'),
  canonical_count: sourceRows.length,
  canonical_id_min: Math.min(...ids),
  canonical_id_max: Math.max(...ids),
  old_textbook_count: oldTextbook.length,
  new_textbook_count: textbook.length,
  preserved_dataset_counts: nonTextbookCounts,
  final_total_count: newData.length,
  missing_english: textbook.filter(r => !r.english).length,
  missing_japanese: textbook.filter(r => !r.japanese).length,
  missing_kana: textbook.filter(r => !r.kana).length,
  metadata_matches: { exact: metaExact, fallback: metaFallback, new_without_old_metadata: metaNew },
  counts_by_textbook_grade: byTextbookGrade,
  generated_at_utc: new Date().toISOString(),
  policy: {
    direction: 'canonical-v7-to-app-only',
    canonical_fields: ['textbook','grade','major_unit','section','english','japanese','star','phrase','kana'],
    preserved_datasets: ['exam','elementary'],
    pos_policy: 'reuse existing metadata when uniquely matched; never guess single-word POS for new rows'
  }
};
fs.mkdirSync('audit', { recursive: true });
fs.writeFileSync('audit/V7_SYNC_RESULT.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
