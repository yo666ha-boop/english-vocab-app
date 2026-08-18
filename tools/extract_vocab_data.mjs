#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const input = process.argv[2] || 'index.html';
const html = fs.readFileSync(input, 'utf8');
fs.mkdirSync('audit', { recursive: true });

const starts = [
  /\b(?:const|let|var)\s+DATA\s*=\s*/g,
  /\bwindow\.DATA\s*=\s*/g,
  /\bglobalThis\.DATA\s*=\s*/g,
];
let match = null;
for (const re of starts) {
  const m = re.exec(html);
  if (m && (!match || m.index < match.index)) match = { index: m.index, end: re.lastIndex, decl: m[0] };
}
if (!match) throw new Error('Embedded DATA declaration not found in index.html');

let i = match.end;
while (/\s/.test(html[i] || '')) i++;
const opener = html[i];
if (opener !== '[' && opener !== '{') throw new Error(`DATA does not start with [ or { at byte ${i}`);
const closer = opener === '[' ? ']' : '}';
const end = findBalancedEnd(html, i, opener, closer);
const expr = html.slice(i, end + 1);
let data;
try {
  data = JSON.parse(expr);
} catch {
  data = vm.runInNewContext(`(${expr})`, Object.create(null), { timeout: 3000 });
}

const rows = flattenRows(data);
const keys = new Set();
for (const r of rows.slice(0, 5000)) if (r && typeof r === 'object') Object.keys(r).forEach(k => keys.add(k));
const interesting = ['textbook','book','grade','section','unit','lesson','part','word','english','jp','japanese','meaning','status','current_confirmed','source'];
const valueCounts = {};
for (const key of interesting) {
  const counts = new Map();
  for (const r of rows) {
    if (!r || typeof r !== 'object' || !(key in r)) continue;
    const v = String(r[key]);
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  if (counts.size) valueCounts[key] = Object.fromEntries([...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,50));
}

const summary = {
  input,
  declaration: match.decl.trim(),
  declaration_index: match.index,
  expression_chars: expr.length,
  root_type: Array.isArray(data) ? 'array' : typeof data,
  root_keys: data && !Array.isArray(data) && typeof data === 'object' ? Object.keys(data) : [],
  flattened_row_count: rows.length,
  observed_row_keys: [...keys].sort(),
  value_counts: valueCounts,
};

const snippetStart = Math.max(0, match.index - 120);
const snippetEnd = Math.min(html.length, end + 1 + 120);
fs.writeFileSync('audit/DATA_DECLARATION_SNIPPET.txt', html.slice(snippetStart, snippetEnd), 'utf8');
fs.writeFileSync('audit/VOCAB_EMBEDDED_DATA_SUMMARY.json', JSON.stringify(summary, null, 2), 'utf8');
fs.writeFileSync('audit/VOCAB_EMBEDDED_DATA_SUMMARY.txt', renderSummary(summary), 'utf8');
console.log(renderSummary(summary));

function findBalancedEnd(s, start, open, close) {
  let depth = 0, quote = null, escape = false, templateExprDepth = 0;
  for (let p = start; p < s.length; p++) {
    const c = s[p];
    if (quote) {
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === quote) { quote = null; continue; }
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return p;
    }
  }
  throw new Error('Unbalanced DATA expression');
}

function flattenRows(root) {
  if (Array.isArray(root)) return root;
  if (!root || typeof root !== 'object') return [];
  const directArrays = Object.values(root).filter(Array.isArray);
  if (directArrays.length) {
    const primitiveRows = directArrays.flatMap(a => a.filter(x => x && typeof x === 'object'));
    if (primitiveRows.length) return primitiveRows;
  }
  const rows = [];
  const visit = (v, depth=0) => {
    if (depth > 6 || v == null) return;
    if (Array.isArray(v)) {
      for (const x of v) {
        if (x && typeof x === 'object' && !Array.isArray(x) && Object.values(x).some(y => typeof y !== 'object' || y == null)) rows.push(x);
        else visit(x, depth+1);
      }
    } else if (typeof v === 'object') {
      for (const x of Object.values(v)) visit(x, depth+1);
    }
  };
  visit(root);
  return rows;
}

function renderSummary(s) {
  const lines = [
    'VOCAB EMBEDDED DATA AUDIT',
    `input: ${s.input}`,
    `declaration: ${s.declaration}`,
    `expression_chars: ${s.expression_chars}`,
    `root_type: ${s.root_type}`,
    `flattened_row_count: ${s.flattened_row_count}`,
    `observed_row_keys: ${s.observed_row_keys.join(', ')}`,
  ];
  for (const [k,v] of Object.entries(s.value_counts)) lines.push(`${k}: ${JSON.stringify(v)}`);
  return lines.join('\n') + '\n';
}
