import fs from 'node:fs';

const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');

const oldRun = `async function runPrint(mode) {
  const oldClasses = ['test-print', 'answer-print', 'memory-print', 'print-sheet'];
  document.body.classList.remove(...oldClasses);
  const sheet = document.getElementById('printSheet');

  if (mode === 'memory') {
    if (state.dataset === 'exam') {
      alert('高校入試版は暗記プリントではなく、問題印刷または解答印刷を使ってください。');
      return;
    }
    if (!state.currentList.length) {
      alert('印刷する単語がありません。条件を確認してください。');
      return;
    }
    sheet.innerHTML = buildMemoryPrintHtml();
  } else {
    if (!state.currentTest.length) {
      alert('先に「テスト作成」を押してください。');
      return;
    }
    sheet.innerHTML = buildTestPrintHtml(mode === 'answer');
  }

  document.body.classList.add('print-sheet');
  if (mode === 'answer') document.body.classList.add('answer-sheet');

  await waitForPrintImages(sheet);
  await nextPaint();
  window.print();
}`;

const newRun = `const MEMORY_PRINT_MAX_ROWS = 300;
const MEMORY_PRINT_ROWS_PER_PAGE = 18;

async function runPrint(mode) {
  const oldClasses = ['test-print', 'answer-print', 'memory-print', 'print-sheet'];
  document.body.classList.remove(...oldClasses);
  const sheet = document.getElementById('printSheet');

  if (mode === 'memory') {
    if (state.dataset === 'exam') {
      alert('高校入試版は暗記プリントではなく、問題印刷または解答印刷を使ってください。');
      return;
    }
    if (!state.currentList.length) {
      alert('印刷する単語がありません。条件を確認してください。');
      return;
    }
    if (state.currentList.length > MEMORY_PRINT_MAX_ROWS) {
      alert('現在 ' + state.currentList.length + ' 語が選択されています。\\nこのまま印刷するとページ数が多くなり、ブラウザが重くなるため印刷を止めました。\\n教科書・学年・単元などで 300 語以下に絞ってから「暗記プリントを印刷」を押してください。');
      return;
    }
    sheet.innerHTML = buildMemoryPrintHtml();
  } else {
    if (!state.currentTest.length) {
      alert('先に「テスト作成」を押してください。');
      return;
    }
    sheet.innerHTML = buildTestPrintHtml(mode === 'answer');
  }

  document.body.classList.add('print-sheet');
  if (mode === 'answer') document.body.classList.add('answer-sheet');

  await waitForPrintImages(sheet);
  await nextPaint();
  window.print();
}`;

if (!html.includes('const MEMORY_PRINT_MAX_ROWS = 300;')) {
  if (!html.includes(oldRun)) throw new Error('active runPrint block not found');
  html = html.replace(oldRun, newRun);
}

const oldBuilder = `buildMemoryPrintHtml = function() {
  const rows = state.currentList.slice();
  const groups = new Map();
  rows.forEach(r => {
    const key = state.dataset === 'textbook' ? (r.section || r.major_unit || 'その他') : (r.level || r.unit || r.category || r.type || 'その他');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });
  const body = Array.from(groups.entries()).map(([g, arr]) => \`
    <div class="rb-memory-group">
      <h3>\${esc(g)}</h3>
      \${arr.map(r => \`<div class="rb-mem-row"><div class="rb-mem-en">\${esc(r.english)}</div><div class="rb-mem-ja">\${esc(r.japanese)}</div><div class="rb-mem-kana">\${esc(r.kana || '')}</div></div>\`).join('')}
    </div>\`).join('');
  return \`<div class="rb-page"><img class="rb-headimg" src="\${RB_HEAD_SRC}" alt="暗記練習ヘッダー"><div class="rb-memory-title">暗記練習プリント</div><div class="rb-memory-sub">範囲：\${esc(buildPrintRangeLine())}</div>\${body}\${rbFooter()}</div>\`;
};`;

const newBuilder = `buildMemoryPrintHtml = function() {
  const rows = state.currentList.slice();
  const pageSize = MEMORY_PRINT_ROWS_PER_PAGE;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const groupKey = r => {
    if (state.dataset === 'textbook') return r.section || r.major_unit || 'その他';
    if (state.dataset === 'elementary') return r.elem_category_short || r.elem_category || r.elem_type || 'その他';
    return r.exam_subcategory || r.exam_category || 'その他';
  };

  const pages = [];
  for (let start = 0, pageNo = 1; start < rows.length; start += pageSize, pageNo++) {
    const chunk = rows.slice(start, start + pageSize);
    const groups = new Map();
    chunk.forEach(r => {
      const key = groupKey(r);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    const body = Array.from(groups.entries()).map(([g, arr]) => \`
      <div class="rb-memory-group">
        <h3>\${esc(g)}</h3>
        \${arr.map(r => \`<div class="rb-mem-row"><div class="rb-mem-en">\${esc(r.english)}</div><div class="rb-mem-ja">\${esc(r.japanese)}</div><div class="rb-mem-kana">\${esc(r.kana || '')}</div></div>\`).join('')}
      </div>\`).join('');
    const pageHead = pageNo === 1
      ? \`<img class="rb-headimg" src="\${RB_HEAD_SRC}" alt="暗記練習ヘッダー"><div class="rb-memory-title">暗記練習プリント</div><div class="rb-memory-sub">範囲：\${esc(buildPrintRangeLine())}</div>\`
      : \`<div class="rb-minihead"><strong>暗記練習プリント</strong><span>\${pageNo} / \${pageCount}</span></div>\`;
    pages.push(\`<div class="rb-page rb-memory-page" data-memory-page="\${pageNo}">\${pageHead}\${body}\${rbFooter()}</div>\`);
  }
  return pages.join('');
};`;

if (!html.includes('data-memory-page="${pageNo}"')) {
  if (!html.includes(oldBuilder)) throw new Error('active memory builder block not found');
  html = html.replace(oldBuilder, newBuilder);
}

function replaceLastAssignedFunction(marker, replacement, doneMarker) {
  if (html.includes(doneMarker)) return false;
  const start = html.lastIndexOf(marker);
  if (start < 0) throw new Error(`final override not found: ${marker}`);
  const brace = html.indexOf('{', start);
  if (brace < 0) throw new Error('final override opening brace missing');
  let depth = 0;
  let quote = '';
  let escape = false;
  let close = -1;
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
      if (depth === 0) { close = i; break; }
    }
  }
  if (close < 0) throw new Error('final override closing brace missing');
  let end = close + 1;
  if (html[end] === ';') end++;
  html = html.slice(0, start) + replacement + html.slice(end);
  return true;
}

const finalRun = `/* memory-print-safe-final */
runPrint = async function(mode) {
  const oldClasses = ['test-print', 'answer-print', 'memory-print', 'print-sheet'];
  document.body.classList.remove(...oldClasses);
  const sheet = document.getElementById('printSheet');
  if (mode === 'memory') {
    if (state.dataset === 'exam') { alert('高校入試版は暗記プリントではなく、問題印刷または解答印刷を使ってください。'); return; }
    if (!state.currentList.length) { alert('印刷する単語がありません。条件を確認してください。'); return; }
    if (state.currentList.length > MEMORY_PRINT_MAX_ROWS) {
      alert('現在 ' + state.currentList.length + ' 語が選択されています。\\nこのまま印刷するとページ数が多くなり、ブラウザが重くなるため印刷を止めました。\\n教科書・学年・単元などで 300 語以下に絞ってから「暗記プリントを印刷」を押してください。');
      return;
    }
    sheet.innerHTML = buildMemoryPrintHtml();
  } else {
    if (!state.currentTest.length) { alert('先に「テスト作成」を押してください。'); return; }
    sheet.innerHTML = buildTestPrintHtml(mode === 'answer');
  }
  document.body.classList.add('print-sheet');
  if (mode === 'answer') document.body.classList.add('answer-sheet');
  await rbWaitImages(sheet); await rbNextPaint(); window.print();
};`;

replaceLastAssignedFunction('runPrint = async function(mode)', finalRun, '/* memory-print-safe-final */');

if (!html.includes('MEMORY_PRINT_ROWS_PER_PAGE = 18')) throw new Error('pagination marker missing');
if (!html.includes('state.currentList.length > MEMORY_PRINT_MAX_ROWS')) throw new Error('large selection guard missing');
if (!html.includes('r.elem_category_short || r.elem_category || r.elem_type')) throw new Error('elementary group key fix missing');
if (!html.includes('/* memory-print-safe-final */')) throw new Error('final runtime guard missing');

fs.writeFileSync(path, html, 'utf8');
console.log(JSON.stringify({status:'pass', bytes:Buffer.byteLength(html), max_rows:300, rows_per_page:18, final_runtime_guard:true}, null, 2));
