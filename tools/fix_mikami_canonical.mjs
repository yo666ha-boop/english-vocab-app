#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const [,, inputPath, outputPath = '14b01a93-de5d-4c95-a655-932d2f3f2513_repaired.html'] = process.argv;
if (!inputPath) {
  console.error('Usage: node tools/fix_mikami_canonical.mjs <canonical.html> [output.html]');
  process.exit(2);
}

let html = fs.readFileSync(inputPath, 'utf8');
const beforeHash = sha256(html);

// Hard stop: this tool must never modify the unrelated GitHub English app.
const requiredMarkers = [
  'id="qb-data"', 'id="meta-data"', 'R1-PRON-', 'GEN-PRS-',
  'M2-GER2-', 'M2-COMP2-', 'M2X-INF-', 'M2-RD2-'
];
for (const marker of requiredMarkers) {
  if (!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
}

const qbBlock = extractJsonScript(html, 'qb-data');
const metaBlock = extractJsonScript(html, 'meta-data');
const qb = JSON.parse(qbBlock.json);
const meta = JSON.parse(metaBlock.json);
if (!Array.isArray(qb) || qb.length < 10000) throw new Error(`NOT CANONICAL: qb count=${qb.length}`);

const changes = [];
const changed = (item, reason, oldQ, oldA) => {
  if (item.q !== oldQ || item.a !== oldA) changes.push({id:item.id, reason, q_before:oldQ, q_after:item.q, a_before:oldA, a_after:item.a});
};

// ---- R1-PRON: rebuild the 12 known pronoun items with natural, unique contexts ----
const pronounBank = {
  'R1-PRON-0001':['選択','( I / me / my ) am a student. 最も適切な語を選びなさい。','I'],
  'R1-PRON-0002':['空所補充','Ken knows me. He often talks with (      ). ( I / me / my )','me'],
  'R1-PRON-0003':['選択','( He / Him / His ) is my friend. 最も適切な語を選びなさい。','He'],
  'R1-PRON-0004':['空所補充','I know Ken. I see (      ) every day. ( he / him / his )','him'],
  'R1-PRON-0005':['選択','( She / Her / Hers ) plays tennis after school. 最も適切な語を選びなさい。','She'],
  'R1-PRON-0006':['空所補充','This is Mika. I study English with (      ). ( she / her / hers )','her'],
  'R1-PRON-0007':['選択','( We / Us / Our ) are friends. 最も適切な語を選びなさい。','We'],
  'R1-PRON-0008':['空所補充','Our teacher helps (      ) after school. ( we / us / our )','us'],
  'R1-PRON-0009':['選択','This is ( my / me / I ) bag. 最も適切な語を選びなさい。','my'],
  'R1-PRON-0010':['空所補充','That bag is (      ). ( my / mine / me )','mine'],
  'R1-PRON-0011':['選択','Tom is ( their / them / they ) friend. 最も適切な語を選びなさい。','their'],
  'R1-PRON-0012':['空所補充','These books are (      ). ( our / ours / us )','ours']
};

for (const item of qb) {
  const oldQ = item.q, oldA = item.a;

  if (pronounBank[item.id]) {
    const [type,q,a] = pronounBank[item.id];
    item.type = type; item.q = q; item.a = a;
    changed(item, 'R1-PRON natural/unique rebuild', oldQ, oldA);
    continue;
  }

  if (item.id?.startsWith('GEN-PRS-')) repairGenPrs(item);
  if (item.id?.startsWith('M2-GER2-')) repairGerund(item);
  if (item.id?.startsWith('M2-COMP2-')) repairComparison(item);
  if (item.id?.startsWith('M2X-INF-')) repairInfinitive(item);
  if (item.id?.startsWith('M2-RD2-')) repairReading(item);
  if (String(item.category || '').startsWith('現在完了形')) repairPresentPerfect(item);
  if (item.category === '関係代名詞') repairRelativePronoun(item);

  changed(item, 'targeted grammar/quality repair', oldQ, oldA);
}

// Legacy generators created the same defects outside the narrow target families too
// (M2-COMP/M2X-COMP, M2X-GER/M2Y-GER and older pronoun sets). Clean those
// after targeted generation so the quality gate evaluates the final text, not a stale template.
for (const item of qb) {
  const oldQ = item.q, oldA = item.a;
  item.q = repairLegacyQualityText(item.q);
  item.a = repairLegacyQualityText(item.a);
  changed(item, 'global legacy quality cleanup', oldQ, oldA);
}

// ---- Vocabulary gate: 0 and -1 are uncertain and must not pass ----
const oldVocabGate = `function passesVocab(item, overrideMode) {\n  if (item.subject !== '英語') return true;\n  const mode = overrideMode || (useVocabGate() ? 'on' : 'off');\n  if (mode === 'off') return true;\n  if (item.grade !== currentGrade()) return true;\n  const rec = meta.passMeta[item.id] || {};\n  const minIdx = rec[currentTextbook()];\n  return Number.isInteger(minIdx) && minIdx >= 0 && minIdx <= currentSectionIndex();\n}`;
const newVocabGate = `function passesVocab(item, overrideMode) {\n  if (item.subject !== '英語') return true;\n  const mode = overrideMode || (useVocabGate() ? 'on' : 'off');\n  if (mode === 'off') return true;\n  if (item.grade !== currentGrade()) return true;\n  const rec = meta.passMeta[item.id] || {};\n  const minIdx = rec[currentTextbook()];\n  const sectionIdx = currentSectionIndex();\n  // 0 / -1 / missing are unresolved vocabulary positions. Fail closed.\n  if (!Number.isInteger(minIdx) || minIdx <= 0) return false;\n  if (!Number.isInteger(sectionIdx) || sectionIdx < 0) return false;\n  return minIdx <= sectionIdx;\n}`;
if (!html.includes(oldVocabGate)) throw new Error('Canonical passesVocab() signature changed; refusing unsafe patch');
html = html.replace(oldVocabGate, newVocabGate);

// Replace embedded JSON while preserving the rest of the full app.
recount(meta, qb);
html = replaceJsonScript(html, 'qb-data', JSON.stringify(qb));
html = replaceJsonScript(html, 'meta-data', JSON.stringify(meta));

const audit = auditBank(qb, meta, html);
if (audit.errors.length) {
  console.error(JSON.stringify({status:'FAILED_QUALITY_GATE', ...audit}, null, 2));
  process.exit(3);
}

fs.writeFileSync(outputPath, html, 'utf8');
const report = {
  status:'OK', input:inputPath, output:outputPath,
  sha256_before:beforeHash, sha256_after:sha256(html),
  question_count:qb.length, changed_items:changes.length,
  changes, audit
};
fs.writeFileSync(outputPath + '.audit.json', JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({status:'OK', output:outputPath, changed_items:changes.length, audit}, null, 2));

function repairGenPrs(item) {
  item.q = String(item.q || '').replace('「本を読みました」','「本を読みます」');
  if (/「ピアノを練習します」/.test(item.q)) item.a = 'practice the piano';
  if (/「本を読みます」/.test(item.q) && /\(\s*\)/.test(item.q)) item.a = 'read books';
  if (/\( practice \/ the \/ tennis \/ We \)/.test(item.q)) item.q = item.q.replace('( practice / the / tennis / We )','( practice / tennis / We )');
  if (item.type === '変形' && /を疑問文にしなさい。$/.test(item.q)) {
    const src = item.q.replace(/\s*を疑問文にしなさい。$/,'').trim();
    const q = simplePresentQuestion(src);
    if (q) item.a = q;
  }
  // Mid-sentence blank answers should not be capitalized merely because they are answer strings.
  if (item.type === '空所補充' && /^[A-Z][a-z]/.test(item.a || '')) item.a = item.a[0].toLowerCase() + item.a.slice(1);
}

function repairGerund(item) {
  let q = String(item.q || ''), a = String(item.a || '');
  // love/begin allow infinitives too; use verbs that force a gerund for one-answer questions.
  q = q.replace(/\bShe love\b/g,'She enjoys').replace(/\bMika love\b/g,'Mika enjoys');
  a = a.replace(/\bShe love\b/g,'She enjoys').replace(/\bMika love\b/g,'Mika enjoys');
  q = q.replace(/\bShe begin\b/g,'She finishes').replace(/\bMika begin\b/g,'Mika finishes');
  a = a.replace(/\bShe begin\b/g,'She finishes').replace(/\bMika begin\b/g,'Mika finishes');
  q = q.replace(/\bMika stop\b/g,'Mika stops').replace(/\bShe stop\b/g,'She stops');
  a = a.replace(/\bMika stop\b/g,'Mika stops').replace(/\bShe stop\b/g,'She stops');
  q = q.replace(/using my phone/g,'using her phone');
  a = a.replace(/using my phone/g,'using her phone');
  if (/She stops to us\./.test(q)) {
    q = q.replace('She stops to us.','She stops use her phone.');
    a = 'She stops using her phone.';
  }
  if (/enjoys to listen/.test(q)) a = 'She enjoys listening to music.';
  item.q=q; item.a=a;
}

function repairComparison(item) {
  let q=String(item.q||''), a=String(item.a||'');
  q = q.replace('( He / than / He /','( Ken / than / Tom /');
  a = a.replace(/^He is (.+) than He\.$/,'Ken is $1 than Tom.');
  q = q.replace(/^He is (.+) than He\./,'Ken is $1 than Tom.');
  q = q.replace(/My friend \/ than \/ He/g,'My friend / than / Tom');
  a = a.replace(/My friend is (.+) than He\./,'My friend is $1 than Tom.');
  q = q.replace(/My friend is (.+) than He\./,'My friend is $1 than Tom.');
  item.q=q; item.a=a;
}

function repairInfinitive(item) {
  let q=String(item.q||''), a=String(item.a||'');
  if (/を否定文または疑問文に直しなさい。$/.test(q)) q=q.replace('を否定文または疑問文に直しなさい。','を疑問文にしなさい。');
  if (/を疑問文にしなさい。$/.test(q)) {
    const src=q.replace(/\s*を疑問文にしなさい。$/,'').trim();
    const made=simplePresentQuestion(src);
    if (made) a=made;
  }
  // Only malformed auxiliary text is normalized here. Sentence-initial Do/Does is valid English.
  a=a.replace(/Did You ne\b/g,'Do you need');
  item.q=q; item.a=a;
}

function repairReading(item) {
  const jp = {
    'M2-RD2-1549':'明日、サッカーをします。',
    'M2-RD2-1551':'病気だったからです。',
    'M2-RD2-1553':'先週、京都を訪れました。',
    'M2-RD2-1555':'図書館で勉強する予定です。',
    'M2-RD2-1557':'自転車で学校へ行けます。',
    'M2-RD2-1559':'放課後にマンガを読むことを楽しんでいます。'
  };
  if (jp[item.id] && /日本語で説明しなさい/.test(item.q || '')) item.a=jp[item.id];
}

function repairPresentPerfect(item) {
  let q=String(item.q||''), a=String(item.a||'');
  const possessivePairs = [
    [/^We have finished my homework\./,'We have finished our homework.'],
    [/^We have lost my key\./,'We have lost our key.'],
    [/^He has finished my homework\./,'He has finished his homework.'],
    [/^He has lost my key\./,'He has lost his key.'],
    [/^She has finished my homework\./,'She has finished her homework.'],
    [/^She has lost my key\./,'She has lost her key.']
  ];
  for (const [re,to] of possessivePairs) q=q.replace(re,to);
  if (/を疑問文にしなさい。$/.test(q)) {
    const src=q.replace(/\s*を疑問文にしなさい。$/,'').trim();
    const made=presentPerfectQuestion(src);
    if (made) a=made;
  }
  item.q=q; item.a=a;
}

function repairRelativePronoun(item) {
  let q=String(item.q||''), a=String(item.a||'');
  // Keep one answer by making blank items closed-choice when that/omission would otherwise also work.
  if (item.type === '空所補充' && /^Who$/i.test(a)) {
    q=q.replace('(      )','( who / which / where )'); item.type='選択'; a='who';
  } else if (item.type === '空所補充' && /^Which$/i.test(a)) {
    q=q.replace('(      )','( who / which / where )'); item.type='選択'; a='which';
  }
  if (item.type === '間違い直し' && /The girl which/.test(q) && /who/i.test(a)) {
    q=q.replace('の誤りを直しなさい。','の誤りを、who を使って直しなさい。');
  }
  if (item.type === '英作文' && /\bwhich\b/i.test(a) && !/which を使/.test(q)) q += '（which を使うこと）';
  if (item.type === '英作文' && /\bwho\b/i.test(a) && !/who を使/.test(q)) q += '（who を使うこと）';
  q=q.replace(/bagです/g,'かばんです').replace(/penです/g,'ペンです').replace(/bookです/g,'本です').replace(/flowerです/g,'花です');
  item.q=q; item.a=a;
}

function repairLegacyQualityText(value) {
  let s=String(value||'');
  s=s.replace(/\bHe is ([^.\n]+?) than He\b/g,'Ken is $1 than Tom')
     .replace(/\bthan\s*\/\s*He\b/g,'than / Ken')
     .replace(/\bthan He\b/g,'than Ken')
     .replace(/\bMika love\b/g,'Mika loves')
     .replace(/\bShe love\b/g,'She loves')
     .replace(/\bMika begin\b/g,'Mika begins')
     .replace(/\bShe begin\b/g,'She begins')
     .replace(/\bMika stop\b/g,'Mika stops')
     .replace(/\bShe stop\b/g,'She stops')
     .replace(/\(\s*she\s*\/\s*her\s*\/\s*her\s*\)/gi,'( she / her / hers )');
  return s;
}

function simplePresentQuestion(sentence) {
  const s=sentence.replace(/[.。]$/,'').trim();
  const m=s.match(/^(I|you|we|they|he|she|[A-Z][A-Za-z]+)\s+(.+)$/);
  if (!m) return null;
  const subject=m[1], rest=m[2];
  if (/^(am|is|are|can)\b/i.test(rest)) return null;
  const third=/^(he|she)$/i.test(subject) || (!/^(I|you|we|they)$/i.test(subject));
  let body=rest;
  if (third) body=removeThirdSingular(body);
  return `${third?'Does':'Do'} ${subject === 'I' ? 'I' : subject.toLowerCase() === subject ? subject : subject} ${body}?`.replace(/^Do i /,'Do I ');
}
function removeThirdSingular(rest) {
  const [verb,...tail]=rest.split(/\s+/);
  let base=verb;
  if (/ies$/i.test(verb)) base=verb.replace(/ies$/i,'y');
  else if (/(ches|shes|sses|xes|zes|oes)$/i.test(verb)) base=verb.replace(/es$/i,'');
  else if (/s$/i.test(verb) && !/ss$/i.test(verb)) base=verb.replace(/s$/i,'');
  return [base,...tail].join(' ');
}
function presentPerfectQuestion(sentence) {
  const s=sentence.replace(/[.。]$/,'').trim();
  let m=s.match(/^(I|you|we|they|[A-Z][A-Za-z]+) have (.+)$/);
  if (m) return `Have ${m[1]} ${m[2]}?`;
  m=s.match(/^(he|she|[A-Z][A-Za-z]+) has (.+)$/i);
  if (m) return `Has ${m[1].toLowerCase()==='he'||m[1].toLowerCase()==='she'?m[1].toLowerCase():m[1]} ${m[2]}?`;
  return null;
}

function auditBank(qb, meta, html) {
  const errors=[]; const warnings=[];
  const ids=new Set();
  for (const x of qb) {
    if (!x.id || ids.has(x.id)) errors.push(`duplicate/missing id:${x.id}`); else ids.add(x.id);
    if (!String(x.q||'').trim() || !String(x.a||'').trim()) errors.push(`empty q/a:${x.id}`);
    const pair=`${x.q}\n${x.a}`;
    if (/This is (he|she|we)\b/i.test(pair)) errors.push(`unnatural pronoun:${x.id}`);
    if (/\(\s*she\s*\/\s*her\s*\/\s*her\s*\)/i.test(pair)) errors.push(`duplicate choice:${x.id}`);
    if (/\bthan He\b/.test(pair)) errors.push(`comparison pronoun:${x.id}`);
    if (/\b(Mika|She) (love|begin|stop)\b/.test(pair)) errors.push(`3sg/gerund template:${x.id}`);
    if (/Do you have (visited|been|finished|lost|lived|studied)/i.test(pair)) errors.push(`present-perfect auxiliary:${x.id}`);
    // Do/Does at the start of a valid question is not an error. Keep only the malformed legacy token.
    if (/Did You ne\b/.test(pair)) errors.push(`infinitive transform:${x.id}`);
    if (/日本語で説明しなさい/.test(x.q||'') && /^[A-Za-z]/.test(String(x.a||''))) errors.push(`Japanese-answer mismatch:${x.id}`);
    if (/否定文または疑問文/.test(x.q||'')) errors.push(`non-unique transform:${x.id}`);
  }
  const pm=meta.passMeta || {};
  let uncertain=0;
  for (const rec of Object.values(pm)) for (const v of Object.values(rec||{})) if (v===0 || v===-1) uncertain++;
  if (!html.includes('minIdx <= 0) return false')) errors.push('vocab gate does not fail closed for 0/-1');
  if (uncertain) warnings.push(`${uncertain} passMeta positions remain 0/-1 and are intentionally blocked until remapped from the latest NH/SS master`);
  return {errors,warnings, uncertain_vocab_positions:uncertain};
}
function recount(meta,qb) {
  const bySubject={}, byGrade={};
  for (const x of qb) { bySubject[x.subject]=(bySubject[x.subject]||0)+1; byGrade[x.grade]=(byGrade[x.grade]||0)+1; }
  meta.counts={all:qb.length,bySubject,byGrade};
}
function extractJsonScript(src,id) {
  const re=new RegExp(`<script\\s+id=["']${id}["']\\s+type=["']application/json["']>([\\s\\S]*?)<\\/script>`);
  const m=src.match(re); if(!m) throw new Error(`missing JSON script ${id}`); return {json:m[1],full:m[0]};
}
function replaceJsonScript(src,id,json) {
  const re=new RegExp(`(<script\\s+id=["']${id}["']\\s+type=["']application/json["']>)[\\s\\S]*?(<\\/script>)`);
  if(!re.test(src)) throw new Error(`missing JSON script ${id}`); return src.replace(re,`$1${json}$2`);
}
function sha256(s){return crypto.createHash('sha256').update(s).digest('hex');}
