import fs from 'node:fs';
import crypto from 'node:crypto';

const path = 'problem-app/index.html';
const auditPath = 'audit/PROBLEM_APP_GRAMMAR_CHRONOLOGY_APPLY.json';
const marker = 'GRAMMAR_CHRONOLOGY_R7_2025_V1';
let html = fs.readFileSync(path, 'utf8');

if (html.includes(marker)) {
  console.log(JSON.stringify({status:'already_installed', marker}, null, 2));
  process.exit(0);
}

const block = String.raw`// GRAMMAR_CHRONOLOGY_R7_2025_V1
// Learned-grammar chronology is independent from the lexical vocabulary gate.
// Source basis: official 2025/R7 annual teaching plans from Kairyudo (SUNSHINE)
// and Tokyo Shoseki (NEW HORIZON). Anchors are textbook sections, never question IDs.
const GRAMMAR_CHRONOLOGY_VERSION = 'r7-2025-publisher-plan-v1';
const grammarChronologySources = {
  'サンシャイン': 'https://www.kairyudo.co.jp/contents/04_shiryo/nenkei/chu/index.htm',
  'ニューホライズン': 'https://ten.tokyo-shoseki.co.jp/text/chu/list/keikaku/'
};
const grammarChronology = {
  'サンシャイン': {
    '中1': {
      '英語の語順':'__start__',
      'be動詞（現在形）':'PROGRAM 1',
      '一般動詞（現在形）':'PROGRAM 2',
      'be動詞と一般動詞':'PROGRAM 2',
      '疑問詞':'PROGRAM 3',
      'can':'PROGRAM 3',
      '人称代名詞':'PROGRAM 4',
      '命令文':'アクションコーナー',
      '一般動詞（３単現）':'PROGRAM 5',
      '現在進行形':'PROGRAM 8',
      'be動詞（過去形）':'PROGRAM 10',
      '一般動詞（過去形）':'PROGRAM 9',
      '過去進行形':'PROGRAM 10',
      'there is ～，look ～ の文':'PROGRAM 7',
      '未来の文':null,
      '接続詞':'PROGRAM 6'
    },
    '中2': {
      '英語の語順':'__start__',
      'be動詞（現在形）':'__start__',
      '一般動詞（現在形）':'__start__',
      'be動詞と一般動詞（現在形）':'__start__',
      'be動詞と一般動詞（過去形）':'__start__',
      '疑問詞':'__start__',
      '人称代名詞':'__start__',
      '命令文':'__start__',
      '進行形':'__start__',
      'there is ～ の文':'__start__',
      '未来の文':'PROGRAM 1',
      '助動詞':'PROGRAM 4',
      '接続詞':'PROGRAM 2',
      '不定詞①':'PROGRAM 3',
      '動名詞':'PROGRAM 1',
      '文型①（look ～，give A B）':'PROGRAM 5',
      '比較':'PROGRAM 6',
      '文型②（call A B，make A B）':null,
      '受動態':'PROGRAM 8',
      '現在完了形（完了・経験）':null,
      '現在完了形（継続），現在完了進行形':null,
      '不定詞②':'PROGRAM 5'
    },
    '中3': {
      '英語の語順':'__start__',
      'be動詞と一般動詞（現在形）':'__start__',
      'be動詞と一般動詞（過去形）':'__start__',
      '疑問詞':'__start__',
      '人称代名詞':'__start__',
      '進行形':'__start__',
      '命令文，there is ～ の文':'__start__',
      '未来の文':'__start__',
      '助動詞':'__start__',
      '接続詞':'__start__',
      '不定詞①，動名詞':'__start__',
      '比較':'__start__',
      '文型':'PROGRAM 3',
      '受動態':'__start__',
      '現在完了形（完了・経験）':'PROGRAM 1',
      '現在完了形（継続），現在完了進行形':'PROGRAM 2',
      '不定詞②':'PROGRAM 1',
      '分詞と間接疑問文':'PROGRAM 4',
      '関係代名詞':'PROGRAM 5',
      '仮定法':'PROGRAM 7'
    }
  },
  'ニューホライズン': {
    '中1': {
      '英語の語順':'__start__',
      'be動詞（現在形）':'Unit 1',
      '一般動詞（現在形）':'Unit 1',
      'be動詞と一般動詞':'Unit 1',
      '疑問詞':'Unit 3',
      'can':'Unit 2',
      '人称代名詞':'Unit 6',
      '命令文':'Unit 4',
      '一般動詞（３単現）':'Unit 5',
      '現在進行形':'Unit 7',
      'be動詞（過去形）':'Unit 10',
      '一般動詞（過去形）':'Unit 9',
      '過去進行形':'Unit 10',
      'there is ～，look ～ の文':'Unit 10',
      '未来の文':null,
      '接続詞':null
    },
    '中2': {
      '英語の語順':'__start__',
      'be動詞（現在形）':'__start__',
      '一般動詞（現在形）':'__start__',
      'be動詞と一般動詞（現在形）':'__start__',
      'be動詞と一般動詞（過去形）':'__start__',
      '疑問詞':'__start__',
      '人称代名詞':'__start__',
      '命令文':'__start__',
      '進行形':'__start__',
      'there is ～ の文':'__start__',
      '未来の文':'Unit 1',
      '助動詞':'Unit 4',
      '接続詞':'Unit 2',
      '不定詞①':'Unit 3',
      '動名詞':'Unit 4',
      '文型①（look ～，give A B）':'Unit 1',
      '比較':'Unit 6',
      '文型②（call A B，make A B）':'Unit 1',
      '受動態':'Unit 7',
      '現在完了形（完了・経験）':null,
      '現在完了形（継続），現在完了進行形':null,
      '不定詞②':'Unit 5'
    },
    '中3': {
      '英語の語順':'__start__',
      'be動詞と一般動詞（現在形）':'__start__',
      'be動詞と一般動詞（過去形）':'__start__',
      '疑問詞':'__start__',
      '人称代名詞':'__start__',
      '進行形':'__start__',
      '命令文，there is ～ の文':'__start__',
      '未来の文':'__start__',
      '助動詞':'__start__',
      '接続詞':'__start__',
      '不定詞①，動名詞':'__start__',
      '比較':'__start__',
      '文型':'Unit 1',
      '受動態':'__start__',
      '現在完了形（完了・経験）':'Unit 1',
      '現在完了形（継続），現在完了進行形':'Unit 2',
      '不定詞②':'Unit 3',
      '分詞と間接疑問文':'Unit 4',
      '関係代名詞':'Unit 5',
      '仮定法':'Unit 6'
    }
  }
};
function grammarChronologyKey(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
}
function grammarChronologySections(textbook=currentTextbook(), grade=currentGrade()) {
  return ((meta.sections?.[textbook] || {})[grade] || []);
}
function grammarChronologySectionIndex(textbook, grade, section) {
  const sections = grammarChronologySections(textbook, grade);
  const exact = sections.indexOf(section);
  if (exact >= 0) return exact;
  const target = grammarChronologyKey(section);
  return sections.findIndex(x => grammarChronologyKey(x) === target);
}
function grammarChronologyAnchorIndex(textbook, grade, anchor) {
  if (anchor === '__start__') return 0;
  if (anchor == null) return Number.POSITIVE_INFINITY;
  const sections = grammarChronologySections(textbook, grade);
  const targets = Array.isArray(anchor) ? anchor : [anchor];
  let best = Number.POSITIVE_INFINITY;
  for (const raw of targets) {
    const target = grammarChronologyKey(raw);
    let idx = sections.findIndex(x => grammarChronologyKey(x).startsWith(target));
    if (idx < 0) idx = sections.findIndex(x => grammarChronologyKey(x).includes(target));
    if (idx >= 0) best = Math.min(best, idx);
  }
  return best;
}
function learnedGrammarStages(textbook=currentTextbook(), grade=currentGrade(), section=el('sectionSelect')?.value || '') {
  const all = subjectConfig['英語'].stagesByGrade[grade] || [];
  const spec = grammarChronology?.[textbook]?.[grade] || {};
  const currentIdx = grammarChronologySectionIndex(textbook, grade, section);
  if (currentIdx < 0) return [];
  return all.filter(stage => Object.prototype.hasOwnProperty.call(spec, stage) && currentIdx >= grammarChronologyAnchorIndex(textbook, grade, spec[stage]));
}
window.__mikamiGrammarChronologyVersion = GRAMMAR_CHRONOLOGY_VERSION;
window.__mikamiGrammarChronologySources = grammarChronologySources;
window.__mikamiGrammarChronology = grammarChronology;
window.__mikamiLearnedGrammarStages = learnedGrammarStages;

function renderStageOptions(preserveSelection = true) {
  const allStages = subjectConfig[currentSubject()].stagesByGrade[currentGrade()] || [];
  const existing = new Map(Array.from(document.querySelectorAll('input[data-stage]')).map(x => [x.value, x.checked]));
  const stages = currentSubject() === '英語' ? learnedGrammarStages() : allStages;
  el('stageArea').innerHTML = stages.map(s => {
    const checked = preserveSelection && existing.has(s) ? existing.get(s) : true;
    return '<label class="ck"><input type="checkbox" data-stage value="' + s + '" ' + (checked ? 'checked' : '') + '> <span>' + s + '</span></label>';
  }).join('');
  if (currentSubject() === '英語') {
    el('stageArea').dataset.grammarChronologyVersion = GRAMMAR_CHRONOLOGY_VERSION;
    el('stageArea').dataset.learnedGrammarCount = String(stages.length);
    el('stageArea').dataset.allGrammarCount = String(allStages.length);
  }
}`;

const renderStart = html.indexOf('function renderStageOptions');
if (renderStart < 0) throw new Error('renderStageOptions function not found');
let renderEnd = html.indexOf('\n}\n\nfunction renderTypeOptions', renderStart);
if (renderEnd < 0) renderEnd = html.indexOf('\r\n}\r\n\r\nfunction renderTypeOptions', renderStart);
if (renderEnd < 0) throw new Error('renderStageOptions end anchor not found');
renderEnd += html[renderEnd] === '\r' ? 3 : 2;
html = html.slice(0, renderStart) + block + html.slice(renderEnd);

function replaceOnce(oldText, newText, label) {
  if (!html.includes(oldText)) throw new Error(label + ' baseline not found');
  html = html.replace(oldText, newText);
}
replaceOnce(
  "el('textbookSelect').addEventListener('change', () => { renderSectionOptions(); updateBuilderStatus(baseFiltered()); });",
  "el('textbookSelect').addEventListener('change', () => { renderSectionOptions(); renderStageOptions(false); updateBuilderStatus(baseFiltered()); });",
  'textbook change'
);
replaceOnce(
  "el('sectionSelect').addEventListener('change', () => updateBuilderStatus(baseFiltered()));",
  "el('sectionSelect').addEventListener('change', () => { renderStageOptions(true); updateBuilderStatus(baseFiltered()); });",
  'section change'
);
replaceOnce(
  "el('subjectSelect').addEventListener('change', () => { renderSectionOptions(); renderStageOptions(); renderTypeOptions(); syncListSelectors(); updateBuilderStatus(baseFiltered()); });",
  "el('subjectSelect').addEventListener('change', () => { renderSectionOptions(); renderStageOptions(false); renderTypeOptions(); syncListSelectors(); updateBuilderStatus(baseFiltered()); });",
  'subject change'
);
replaceOnce(
  "el('gradeSelect').addEventListener('change', () => { renderSectionOptions(); renderStageOptions(); renderTypeOptions(); syncListSelectors(); updateBuilderStatus(baseFiltered()); });",
  "el('gradeSelect').addEventListener('change', () => { renderSectionOptions(); renderStageOptions(false); renderTypeOptions(); syncListSelectors(); updateBuilderStatus(baseFiltered()); });",
  'grade change'
);
replaceOnce(
  "  safeSetValue('sectionSelect', state.section);\n  safeSetValue('questionCount', state.questionCount);",
  "  safeSetValue('sectionSelect', state.section);\n  renderStageOptions(false);\n  safeSetValue('questionCount', state.questionCount);",
  'applyState chronology render'
);

if (!html.includes(marker)) throw new Error('chronology marker missing after patch');
fs.writeFileSync(path, html, 'utf8');
const sha256 = crypto.createHash('sha256').update(html).digest('hex');
const audit = {
  applied_at_utc: new Date().toISOString(),
  status: 'installed',
  marker,
  version: 'r7-2025-publisher-plan-v1',
  problem_html_bytes: Buffer.byteLength(html),
  problem_html_sha256: sha256,
  source_basis: {
    sunshine: 'Kairyudo official R7/2025 annual teaching plans, grades 1-3',
    new_horizon: 'Tokyo Shoseki official R7/2025 annual teaching plans, grades 1-3'
  },
  invariants: {
    root_index_modified: false,
    question_id_hardcode: false,
    future_grammar_hidden_until_source_anchor: true,
    g2_current_perfect_hidden: true,
    rerender_on_textbook_change: true,
    rerender_on_section_change: true,
    restore_after_textbook_and_section: true
  }
};
fs.mkdirSync('audit', {recursive:true});
fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(audit, null, 2));
