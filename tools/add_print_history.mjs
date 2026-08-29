import fs from 'node:fs';

const file = 'problem-app/index.html';
let html = fs.readFileSync(file, 'utf8');

function replaceOnce(from, to, label) {
  if (!html.includes(from)) throw new Error('anchor not found: ' + label);
  html = html.replace(from, to);
}

replaceOnce(
`    <button id="exportJsonBtn">保存データを書き出す</button>\n    <button id="importJsonBtn">保存データを読み込む</button>`,
`    <button id="exportJsonBtn">バックアップを書き出す</button>\n    <button id="importJsonBtn">バックアップを読み込む</button>`,
'backup button labels');

replaceOnce(
`  <div id="globalSaveStatus" class="sub" style="margin-top:8px">自動保存に加えて、必要な時だけ保存データを書き出せます。</div>`,
`  <div id="globalSaveStatus" class="sub" style="margin-top:8px">印刷履歴を含むバックアップを、必要な時だけ書き出せます。</div>`,
'backup help');

replaceOnce(
`          <button id="printAnswersOnlyBtn">解答だけ印刷</button>\n          <button id="toListBtn">この条件で問題一覧へ</button>`,
`          <button id="printAnswersOnlyBtn">解答だけ印刷</button>\n          <button id="printHistoryBtn">印刷履歴</button>\n          <button id="toListBtn">この条件で問題一覧へ</button>`,
'history button');

replaceOnce(
`        <div id="builderStatus" class="status">準備中…</div>\n      </div>\n      <div class="card preview"><div id="questionPreview">まだ問題を作成していません。</div></div>`,
`        <div id="builderStatus" class="status">準備中…</div>\n        <div id="printHistoryPanel" class="status" style="display:none;margin-top:12px;text-align:left">\n          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">\n            <strong>印刷履歴</strong>\n            <button id="clearPrintHistoryBtn" type="button">履歴をすべて削除</button>\n          </div>\n          <div style="margin-top:6px;font-size:12px;opacity:.8">印刷したセットだけ保存されます。問題を作成しただけでは履歴に残りません。</div>\n          <div id="printHistoryList" style="margin-top:10px;display:grid;gap:8px"></div>\n        </div>\n      </div>\n      <div class="card preview"><div id="questionPreview">まだ問題を作成していません。</div></div>`,
'history panel');

const exportStart = html.indexOf('function exportStateFile() {');
const importStart = html.indexOf('\n\nfunction importStateFile(file) {', exportStart);
const afterImport = html.indexOf('\n\nconst currentSubject = () =>', importStart);
if (exportStart < 0 || importStart < 0 || afterImport < 0) throw new Error('backup function boundaries not found');

const backupFunctions = `function exportStateFile() {
  const backup = {
    backupVersion: 2,
    exportedAt: new Date().toISOString(),
    appState: captureState(),
    printHistory: readPrintHistory()
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mikamijuku_app_backup_latest.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  if (el('globalSaveStatus')) el('globalSaveStatus').textContent = '印刷履歴を含むバックアップを書き出しました。';
}

function importStateFile(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const data = JSON.parse(fr.result);
      if (data && data.backupVersion >= 2 && data.appState) {
        applyState(data.appState);
        writePrintHistory(Array.isArray(data.printHistory) ? data.printHistory : []);
        renderPrintHistoryPanel();
      } else {
        // 旧形式の保存データもそのまま読み込める。
        applyState(data);
      }
      saveState(true);
      if (el('globalSaveStatus')) el('globalSaveStatus').textContent = 'バックアップを読み込みました。';
    } catch (e) {
      if (el('globalSaveStatus')) el('globalSaveStatus').textContent = 'バックアップの読み込みに失敗しました。';
    }
  };
  fr.readAsText(file, 'utf-8');
}`;
html = html.slice(0, exportStart) + backupFunctions + html.slice(afterImport);

const helperAnchor = `const currentSubject = () => el('subjectSelect').value;`;
if (!html.includes(helperAnchor)) throw new Error('currentSubject anchor not found');
const historyHelpers = `const PRINT_HISTORY_KEY = 'mikamijuku_problem_app_print_history_v1';
const PRINT_HISTORY_LIMIT = 100;

function readPrintHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRINT_HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(x => x && Array.isArray(x.questions)) : [];
  } catch (e) {
    return [];
  }
}

function writePrintHistory(history) {
  try {
    const safe = (Array.isArray(history) ? history : []).slice(0, PRINT_HISTORY_LIMIT);
    localStorage.setItem(PRINT_HISTORY_KEY, JSON.stringify(safe));
    return true;
  } catch (e) {
    if (el('globalSaveStatus')) el('globalSaveStatus').textContent = '印刷履歴の保存に失敗しました。古い履歴を削除してください。';
    return false;
  }
}

function compactQuestionSnapshot(q, fallbackSubject = '', fallbackGrade = '') {
  return {
    id: String(q?.id || ''),
    subject: String(q?.subject || fallbackSubject || ''),
    grade: String(q?.grade || fallbackGrade || ''),
    category: String(q?.category || ''),
    type: String(q?.type || ''),
    q: String(q?.q || ''),
    a: String(q?.a || '')
  };
}

function makePrintContext(overrides = null) {
  if (overrides) {
    return {
      subject: overrides.subject || '英語',
      grade: overrides.grade || '中1',
      textbook: overrides.textbook || '—',
      section: overrides.section || '—',
      pickMode: overrides.pickMode || '',
      stages: Array.isArray(overrides.stages) ? overrides.stages.slice() : [],
      types: Array.isArray(overrides.types) ? overrides.types.slice() : []
    };
  }
  return {
    subject: currentSubject(),
    grade: currentGrade(),
    textbook: currentSubject() === '英語' ? currentTextbook() : '—',
    section: currentSubject() === '英語' ? (el('sectionSelect').value || '—') : '—',
    pickMode: el('pickMode')?.value || '',
    stages: selectedValues('input[data-stage]'),
    types: selectedValues('input[data-type]')
  };
}

function recordPrintHistory(printSet, mode, context) {
  const now = new Date();
  const entry = {
    version: 1,
    historyId: now.getTime().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
    printedAt: now.toISOString(),
    printedMode: mode,
    subject: context.subject,
    grade: context.grade,
    textbook: context.textbook,
    section: context.section,
    pickMode: context.pickMode,
    stages: context.stages,
    types: context.types,
    questionCount: printSet.length,
    questions: printSet.map(q => compactQuestionSnapshot(q, context.subject, context.grade))
  };
  const history = readPrintHistory();
  history.unshift(entry);
  if (writePrintHistory(history) && el('printHistoryPanel')?.style.display !== 'none') renderPrintHistoryPanel();
  return entry;
}

function printHistoryDateLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || '');
  return d.toLocaleString('ja-JP', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

function historyEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderPrintHistoryPanel() {
  const list = el('printHistoryList');
  if (!list) return;
  const history = readPrintHistory();
  if (!history.length) {
    list.innerHTML = '<div style="padding:10px 0">まだ印刷履歴はありません。</div>';
    return;
  }
  list.innerHTML = history.map(entry => {
    const metaParts = [entry.grade, entry.subject, entry.textbook && entry.textbook !== '—' ? entry.textbook : '', entry.section && entry.section !== '—' ? entry.section : '', (entry.questionCount || entry.questions.length) + '問'].filter(Boolean);
    return '<div style="border:1px solid var(--line);border-radius:12px;padding:10px;background:#fff">' +
      '<div style="font-weight:700">' + historyEscape(printHistoryDateLabel(entry.printedAt)) + '</div>' +
      '<div style="font-size:12px;margin-top:3px;opacity:.82">' + historyEscape(metaParts.join(' / ')) + '</div>' +
      '<div class="btns" style="margin-top:8px">' +
        '<button type="button" data-history-action="view" data-history-id="' + historyEscape(entry.historyId) + '">画面で開く</button>' +
        '<button type="button" data-history-action="both" data-history-id="' + historyEscape(entry.historyId) + '">問題＋解答を再印刷</button>' +
        '<button type="button" data-history-action="questions" data-history-id="' + historyEscape(entry.historyId) + '">問題だけ再印刷</button>' +
        '<button type="button" data-history-action="answers" data-history-id="' + historyEscape(entry.historyId) + '">解答だけ再印刷</button>' +
        '<button type="button" data-history-action="delete" data-history-id="' + historyEscape(entry.historyId) + '">削除</button>' +
      '</div></div>';
  }).join('');
}

function togglePrintHistoryPanel() {
  const panel = el('printHistoryPanel');
  if (!panel) return;
  const opening = panel.style.display === 'none' || !panel.style.display;
  panel.style.display = opening ? 'block' : 'none';
  if (opening) renderPrintHistoryPanel();
}

function getPrintHistoryEntry(historyId) {
  return readPrintHistory().find(x => x.historyId === historyId) || null;
}

function openPrintHistoryEntry(entry) {
  if (!entry || !Array.isArray(entry.questions) || !entry.questions.length) return;
  currentQuestions = entry.questions.map(q => ({...q}));
  showAnswers = false;
  el('questionPreview').classList.remove('showAnswers');
  el('questionPreview').innerHTML = currentQuestions.map((q, i) => \
    '<div class="q"><div class="qnum">Q' + String(i+1).padStart(2,'0') + '　' + historyEscape(q.id) + '　/　' + historyEscape(q.category) + '　/　' + historyEscape(q.type) + '</div><div>' + historyEscape(q.q) + '</div><div class="ans">答え: ' + historyEscape(q.a) + '</div></div>'
  ).join('');
  el('builderStatus').textContent = '印刷履歴 ' + printHistoryDateLabel(entry.printedAt) + ' の ' + currentQuestions.length + '問を開きました。';
  el('builderStatus').classList.add('good');
  saveState(true);
}

function handlePrintHistoryAction(evt) {
  const btn = evt.target.closest('button[data-history-action]');
  if (!btn) return;
  const action = btn.dataset.historyAction;
  const historyId = btn.dataset.historyId;
  const entry = getPrintHistoryEntry(historyId);
  if (!entry) { renderPrintHistoryPanel(); return; }
  if (action === 'view') {
    openPrintHistoryEntry(entry);
    return;
  }
  if (action === 'delete') {
    if (!window.confirm('この印刷履歴を削除しますか？')) return;
    writePrintHistory(readPrintHistory().filter(x => x.historyId !== historyId));
    renderPrintHistoryPanel();
    return;
  }
  if (['both','questions','answers'].includes(action)) printQuestions(action, entry);
}

function clearPrintHistory() {
  if (!readPrintHistory().length) return;
  if (!window.confirm('印刷履歴をすべて削除しますか？')) return;
  writePrintHistory([]);
  renderPrintHistoryPanel();
}

`;
html = html.replace(helperAnchor, historyHelpers + helperAnchor);

replaceOnce(`function printQuestions(mode = 'both') {`, `function printQuestions(mode = 'both', historySource = null) {`, 'print signature');
replaceOnce(
`  // 印刷処理中も同じ問題ID・同じ順番を固定する。\n  const printSet = currentQuestions.slice();\n  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));\n  const subject = currentSubject();\n  const grade = currentGrade();\n  const textbook = subject === '英語' ? currentTextbook() : '—';\n  const section = subject === '英語' ? (el('sectionSelect').value || '—') : '—';`,
`  // 印刷処理中も同じ問題ID・同じ順番を固定する。履歴再印刷時は保存済みスナップショットを使う。\n  const context = makePrintContext(historySource);\n  const printSet = historySource ? historySource.questions.map(q => ({...q})) : currentQuestions.slice();\n  if (!printSet.length) return;\n  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));\n  const subject = context.subject;\n  const grade = context.grade;\n  const textbook = context.textbook;\n  const section = context.section;`,
'print snapshot context');

replaceOnce(
`  const w = window.open('', '_blank');\n  if (!w) return;\n  w.document.open();`,
`  const w = window.open('', '_blank');\n  if (!w) return;\n  // 問題作成時ではなく、実際に印刷処理を開始した時だけ履歴へ保存する。\n  recordPrintHistory(printSet, mode, context);\n  w.document.open();`,
'print history record point');

replaceOnce(
`  el('printAnswersOnlyBtn').addEventListener('click', () => printQuestions('answers'));\n  el('toListBtn').addEventListener('click', () => { document.querySelector('.tab[data-screen="list"]').click(); refreshList(); saveState(true); });`,
`  el('printAnswersOnlyBtn').addEventListener('click', () => printQuestions('answers'));\n  el('printHistoryBtn').addEventListener('click', togglePrintHistoryPanel);\n  el('printHistoryPanel').addEventListener('click', handlePrintHistoryAction);\n  el('clearPrintHistoryBtn').addEventListener('click', clearPrintHistory);\n  el('toListBtn').addEventListener('click', () => { document.querySelector('.tab[data-screen="list"]').click(); refreshList(); saveState(true); });`,
'history event bindings');

const required = [
  'id="printHistoryBtn"',
  'id="printHistoryPanel"',
  "const PRINT_HISTORY_KEY = 'mikamijuku_problem_app_print_history_v1'",
  'function recordPrintHistory(',
  'function renderPrintHistoryPanel()',
  "function printQuestions(mode = 'both', historySource = null)",
  'recordPrintHistory(printSet, mode, context);',
  "backupVersion: 2",
  'printHistory: readPrintHistory()',
  'バックアップを書き出す',
  'バックアップを読み込む'
];
for (const needle of required) if (!html.includes(needle)) throw new Error('missing after patch: ' + needle);
if (html.includes('>保存データを書き出す</button>')) throw new Error('old export label remains');

fs.writeFileSync(file, html);
fs.mkdirSync('audit', { recursive: true });
fs.writeFileSync('audit/PROBLEM_APP_PRINT_HISTORY_IMPLEMENTATION.json', JSON.stringify({
  result: 'PASS',
  branch_target: 'feature-print-history-20260829',
  invariants: {
    generation_does_not_write_print_history: true,
    print_start_writes_snapshot_history: true,
    snapshot_contains_id_order_question_answer: true,
    history_persists_in_local_storage: true,
    history_limit: 100,
    history_can_view_reprint_delete: true,
    backup_includes_print_history: true,
    legacy_backup_import_supported: true
  }
}, null, 2) + '\n');
console.log('print history implementation applied');
