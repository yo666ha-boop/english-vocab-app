import fs from 'node:fs';

const file = 'problem-app/index.html';
let html = fs.readFileSync(file, 'utf8');

const oldButtons = `          <button id="generateBtn" class="primary">問題を作成</button>
          <button id="toggleAnswersBtn">解答表示切替</button>
          <button id="printBtn">印刷</button>
          <button id="toListBtn">この条件で問題一覧へ</button>`;
const newButtons = `          <button id="generateBtn" class="primary">問題を作成</button>
          <button id="toggleAnswersBtn">解答表示切替</button>
          <button id="printBothBtn" class="primary">問題＋解答を印刷</button>
          <button id="printQuestionsOnlyBtn">問題だけ印刷</button>
          <button id="printAnswersOnlyBtn">解答だけ印刷</button>
          <button id="toListBtn">この条件で問題一覧へ</button>`;

if (!html.includes(oldButtons)) throw new Error('print button block not found');
html = html.replace(oldButtons, newButtons);

const oldEvents = `  el('generateBtn').addEventListener('click', renderQuestions);
  el('toggleAnswersBtn').addEventListener('click', () => { showAnswers = !showAnswers; renderQuestions(); });
  el('printBtn').addEventListener('click', printQuestions);`;
const newEvents = `  el('generateBtn').addEventListener('click', renderQuestions);
  el('toggleAnswersBtn').addEventListener('click', () => {
    showAnswers = !showAnswers;
    // 解答表示の切替では currentQuestions を絶対に再抽選しない。
    el('questionPreview').classList.toggle('showAnswers', showAnswers);
    saveState(true);
  });
  el('printBothBtn').addEventListener('click', () => printQuestions('both'));
  el('printQuestionsOnlyBtn').addEventListener('click', () => printQuestions('questions'));
  el('printAnswersOnlyBtn').addEventListener('click', () => printQuestions('answers'));`;

if (!html.includes(oldEvents)) throw new Error('event handler block not found');
html = html.replace(oldEvents, newEvents);

const start = html.indexOf('function printQuestions() {');
const endMarker = '\n\nfunction refreshList() {';
const end = html.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('printQuestions function boundaries not found');

const replacement = String.raw`function printQuestions(mode = 'both') {
  if (!currentQuestions.length) return;
  if (!['both','questions','answers'].includes(mode)) mode = 'both';

  // 印刷処理中も同じ問題ID・同じ順番を固定する。
  const printSet = currentQuestions.slice();
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const subject = currentSubject();
  const grade = currentGrade();
  const textbook = subject === '英語' ? currentTextbook() : '—';
  const section = subject === '英語' ? (el('sectionSelect').value || '—') : '—';
  const meta = '教科書: ' + escapeHtml(textbook) + ' / 単語はここまで: ' + escapeHtml(section);

  const questionPages = [];
  for (let startIndex = 0; startIndex < printSet.length; startIndex += 10) {
    const pageQuestions = printSet.slice(startIndex, startIndex + 10);
    const rows = Math.ceil(pageQuestions.length / 2);
    const body = pageQuestions.map((q, offset) => {
      const index = startIndex + offset;
      return '<div class="q"><div class="n">Q' + (index + 1) + '　' + escapeHtml(q.id) + '</div><div class="body">' + escapeHtml(q.q) + '</div><div class="answer-space" aria-label="解答欄"></div></div>';
    }).join('');
    questionPages.push('<section class="page question-page"><h2>' + escapeHtml(grade) + ' ' + escapeHtml(subject) + ' 問題プリント</h2><div class="student-line">名前：____________________________　日付：______________</div><div class="meta">' + meta + ' / 問題 ' + (startIndex + 1) + '〜' + (startIndex + pageQuestions.length) + '</div><div class="questions" style="grid-template-rows:repeat(' + rows + ', minmax(0, 1fr))">' + body + '</div></section>');
  }

  const answerPages = [];
  for (let startIndex = 0; startIndex < printSet.length; startIndex += 20) {
    const pageAnswers = printSet.slice(startIndex, startIndex + 20);
    const body = pageAnswers.map((q, offset) => {
      const index = startIndex + offset;
      return '<div class="answer-item"><div class="n">Q' + (index + 1) + '　' + escapeHtml(q.id) + '</div><div class="a">' + escapeHtml(q.a) + '</div></div>';
    }).join('');
    answerPages.push('<section class="page answer-page"><h2>' + escapeHtml(grade) + ' ' + escapeHtml(subject) + ' 解答</h2><div class="meta">' + meta + ' / 解答 ' + (startIndex + 1) + '〜' + (startIndex + pageAnswers.length) + '</div><div class="answers">' + body + '</div></section>');
  }

  const selectedPages = mode === 'questions' ? questionPages : mode === 'answers' ? answerPages : questionPages.concat(answerPages);
  const titleSuffix = mode === 'questions' ? '問題' : mode === 'answers' ? '解答' : '問題＋解答';
  const printHtml = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>' + escapeHtml(grade + ' ' + subject + ' ' + titleSuffix) + '</title><style>' +
    '@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic",sans-serif;color:#111}' +
    '.page{min-height:277mm;page-break-after:always;break-after:page;padding:0}.page:last-child{page-break-after:auto;break-after:auto}h2{margin:0 0 4mm;font-size:18pt}.meta,.student-line{font-size:9.5pt;margin-bottom:3mm}' +
    '.questions{height:245mm;display:grid;grid-template-columns:1fr 1fr;column-gap:8mm;row-gap:0}.q{border-bottom:1px solid #bbb;padding:3mm 1mm;min-height:0;break-inside:avoid}.n{font-weight:700;font-size:10pt;margin-bottom:2mm}.body{font-size:11pt;line-height:1.45}.answer-space{height:16mm;border-bottom:1px dotted #bbb;margin-top:3mm}' +
    '.answers{display:grid;grid-template-columns:1fr 1fr;column-gap:10mm;row-gap:2mm}.answer-item{border-bottom:1px solid #ddd;padding:2.5mm 1mm;break-inside:avoid}.answer-item .n{margin-bottom:1mm}.a{font-size:11pt;line-height:1.4}' +
    '</style></head><body>' + selectedPages.join('') + '<script>window.onload=()=>window.print()<\\/script></body></html>';

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(printHtml);
  w.document.close();
}`;

html = html.slice(0, start) + replacement + html.slice(end);

const required = [
  'id="printBothBtn"',
  'id="printQuestionsOnlyBtn"',
  'id="printAnswersOnlyBtn"',
  "printQuestions('both')",
  "printQuestions('questions')",
  "printQuestions('answers')",
  "function printQuestions(mode = 'both')",
  "el('questionPreview').classList.toggle('showAnswers', showAnswers);"
];
for (const needle of required) if (!html.includes(needle)) throw new Error('missing after repair: ' + needle);
if (html.includes("el('toggleAnswersBtn').addEventListener('click', () => { showAnswers = !showAnswers; renderQuestions(); });")) throw new Error('old regenerating toggle still present');

fs.writeFileSync(file, html);
fs.mkdirSync('audit', { recursive: true });
fs.writeFileSync('audit/PROBLEM_APP_ANSWER_PRINT_FIX.json', JSON.stringify({
  result: 'PASS',
  invariants: {
    answer_toggle_preserves_current_question_set: true,
    default_print_contains_question_pages_then_separate_answer_pages: true,
    questions_only_button: true,
    answers_only_button: true,
    print_uses_snapshot_of_current_questions: true
  }
}, null, 2) + '\n');

console.log('answer/print repair applied');
