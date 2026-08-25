import fs from 'node:fs';

const APP='problem-app/index.html';
const INSTALLER='tools/install_vocab_safe_fallback_v1.mjs';
const OUT='audit/VOCAB_SAFE_FALLBACK_REMAINING_SEVERE_REPAIR.json';

const builders=String.raw`
function buildGrade1ConjunctionFallbacks() {
  const rows=[
    ['I study English','I like English','and','私は英語を勉強し、英語が好きです。'],
    ['I read a book','I write','and','私は本を読み、書きます。'],
    ['You sing','I listen','and','あなたが歌い、私は聞きます。'],
    ['I like English','I do not like math','but','私は英語が好きですが、数学は好きではありません。'],
    ['I am at home','I am happy','and','私は家にいて、うれしいです。'],
    ['He is a student','She is a student','and','彼も彼女も生徒です。'],
    ['I play','I am happy','because','私は遊ぶので、うれしいです。'],
    ['I study English','I like English','because','私は英語が好きなので、英語を勉強します。']
  ];
  const out=[]; let n=1;
  for(const [a,b,c,jp] of rows){
    const stem=String(n++).padStart(3,'0');
    const full=a+' '+c+' '+b+'.';
    out.push(vocabFallbackItem('中1','接続詞','空所補充','G1-CONJ-FILL-'+stem,a+' (      ) '+b+'. 文の意味に合う接続詞を書きなさい。',c));
    out.push(vocabFallbackItem('中1','接続詞','英作文','G1-CONJ-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jp+'』',full));
    out.push(vocabFallbackItem('中1','接続詞','並びかえ','G1-CONJ-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+b+' / '+c+' / '+a+' )',full));
  }
  return out;
}

function buildPastVerbFallbacks() {
  const cat='一般動詞の過去形';
  const rows=[
    ['I','play','played','私は遊びました。'],['I','study','studied','私は勉強しました。'],['I','cook','cooked','私は料理しました。'],
    ['I','walk','walked','私は歩きました。'],['I','use','used','私は使いました。'],['I','like','liked','私は好きでした。'],
    ['We','play','played','私たちは遊びました。'],['They','study','studied','彼らは勉強しました。'],['You','cook','cooked','あなたは料理しました。'],
    ['He','play','played','彼は遊びました。'],['She','study','studied','彼女は勉強しました。'],['He','use','used','彼は使いました。']
  ];
  const out=[]; let n=1;
  for(const [s,base,past,jp] of rows){
    const stem=String(n++).padStart(3,'0');
    const full=s+' '+past+'.';
    out.push(vocabFallbackItem('中1',cat,'空所補充','PAST-FILL-'+stem,s+' (      ) yesterday. '+base+'を過去形にして書きなさい。',past));
    out.push(vocabFallbackItem('中1',cat,'変形','PAST-CHANGE-'+stem,s+' '+base+'. を過去の文にしなさい。',full));
    out.push(vocabFallbackItem('中1',cat,'英作文','PAST-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jp+'』',full));
  }
  return out;
}

function buildIrregularPastFallbacks() {
  const rows=[
    ['I','go','went'],['You','come','came'],['We','make','made'],['They','take','took'],
    ['I','write','wrote'],['You','do','did'],['We','have','had'],['He','go','went'],
    ['She','come','came'],['He','make','made'],['She','write','wrote'],['They','have','had']
  ];
  const out=[]; let n=1;
  for(const [s,base,past] of rows){
    const stem=String(n++).padStart(3,'0');
    const full=s+' '+past+'.';
    out.push(vocabFallbackItem('中1','不規則動詞','空所補充','IRR-FILL-'+stem,s+' (      ) yesterday. '+base+'を過去形にして書きなさい。',past));
    out.push(vocabFallbackItem('中1','不規則動詞','変形','IRR-CHANGE-'+stem,s+' '+base+'. を過去の文にしなさい。',full));
    out.push(vocabFallbackItem('中1','不規則動詞','選択','IRR-CHOICE-'+stem,s+' ( '+base+' / '+past+' ) yesterday. 正しいものを選びなさい。',past));
  }
  return out;
}

function buildPastTimeFallbacks() {
  const rows=[
    ['I played','私は昨日遊びました。'],['You studied English','あなたは昨日英語を勉強しました。'],
    ['We cooked','私たちは昨日料理しました。'],['They walked','彼らは昨日歩きました。'],
    ['He played','彼は昨日遊びました。'],['She studied English','彼女は昨日英語を勉強しました。'],
    ['I wrote','私は昨日書きました。'],['You came','あなたは昨日来ました。'],
    ['We went home','私たちは昨日家へ行きました。'],['They made a book','彼らは昨日本を作りました。']
  ];
  const out=[]; let n=1;
  for(const [stemText,jp] of rows){
    const stem=String(n++).padStart(3,'0');
    const full=stemText+' yesterday.';
    out.push(vocabFallbackItem('中1','過去を表す語','空所補充','PTIME-FILL-'+stem,stemText+' (      ). 「昨日」の意味になる語を書きなさい。','yesterday'));
    out.push(vocabFallbackItem('中1','過去を表す語','英作文','PTIME-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jp+'』',full));
  }
  return out;
}

function buildPresentPerfectContinuousFallbacks() {
  const rows=[
    ['I','have','study English','studying English','私はずっと英語を勉強しています。'],
    ['I','have','read a book','reading a book','私はずっと本を読んでいます。'],
    ['I','have','play','playing','私はずっと遊んでいます。'],
    ['You','have','study English','studying English','あなたはずっと英語を勉強しています。'],
    ['We','have','study English','studying English','私たちはずっと英語を勉強しています。'],
    ['They','have','play','playing','彼らはずっと遊んでいます。'],
    ['He','has','study English','studying English','彼はずっと英語を勉強しています。'],
    ['She','has','read a book','reading a book','彼女はずっと本を読んでいます。']
  ];
  const cat='現在完了形（継続），現在完了進行形';
  const out=[]; let n=1;
  for(const [s,aux,base,ing,jp] of rows){
    const stem=String(n++).padStart(3,'0');
    const full=s+' '+aux+' been '+ing+'.';
    out.push(vocabFallbackItem('中3',cat,'空所補充','PPC-FILL-'+stem,s+' '+aux+' been (      ). 現在完了進行形になるように書きなさい。',ing));
    out.push(vocabFallbackItem('中3',cat,'英作文','PPC-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jp+'』',full));
    out.push(vocabFallbackItem('中3',cat,'並びかえ','PPC-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+ing+' / been / '+aux+' / '+s+' )',full));
  }
  return out;
}
`;

function patch(path){
  let src=fs.readFileSync(path,'utf8');
  if(!src.includes('function buildGrade1ConjunctionFallbacks()')){
    const anchor='function buildConjunctionFallbacks() {';
    const i=src.indexOf(anchor);
    if(i<0) throw new Error(`${path}: conjunction anchor missing`);
    src=src.slice(0,i)+builders+'\n'+src.slice(i);
  } else if(!src.includes('function buildIrregularPastFallbacks()')) {
    const anchor='function buildPresentPerfectContinuousFallbacks() {';
    const i=src.indexOf(anchor);
    if(i<0) throw new Error(`${path}: present-perfect-continuous anchor missing`);
    const a=builders.indexOf('function buildIrregularPastFallbacks()');
    const b=builders.indexOf('function buildPresentPerfectContinuousFallbacks()');
    src=src.slice(0,i)+builders.slice(a,b)+src.slice(i);
  }
  src=src.replaceAll("vocabFallbackItem('中1','一般動詞（過去形）',","vocabFallbackItem('中1','一般動詞の過去形',");
  if(src.includes('buildPastVerbFallbacks(),buildPresentPerfectContinuousFallbacks()')) src=src.replace('buildPastVerbFallbacks(),buildPresentPerfectContinuousFallbacks()','buildPastVerbFallbacks(),buildIrregularPastFallbacks(),buildPastTimeFallbacks(),buildPresentPerfectContinuousFallbacks()');
  if(!src.includes('buildGrade1ConjunctionFallbacks(),buildPastVerbFallbacks(),buildIrregularPastFallbacks(),buildPastTimeFallbacks(),buildPresentPerfectContinuousFallbacks(),buildGerundFallbacks()')){
    const old='buildPatternOneFallbacks(),buildGerundFallbacks()';
    const neu='buildPatternOneFallbacks(),buildGrade1ConjunctionFallbacks(),buildPastVerbFallbacks(),buildIrregularPastFallbacks(),buildPastTimeFallbacks(),buildPresentPerfectContinuousFallbacks(),buildGerundFallbacks()';
    if(src.includes(old)) src=src.replace(old,neu);
  }
  for(const pair of [
    [' get give use eat',' get give walk use eat'],
    [' play sing swim run cook',' play sing swim run cook played studied cooked walked used liked'],
    [' write read listen',' write read listen studying reading playing been'],
    [' and but because',' and but because yesterday']
  ]) if(src.includes(pair[0]) && !src.includes(pair[1])) src=src.replace(pair[0],pair[1]);
  for(const required of ['function buildGrade1ConjunctionFallbacks()','function buildPastVerbFallbacks()','function buildIrregularPastFallbacks()','function buildPastTimeFallbacks()','function buildPresentPerfectContinuousFallbacks()','buildIrregularPastFallbacks(),buildPastTimeFallbacks()']){
    if(!src.includes(required)) throw new Error(`${path}: missing ${required}`);
  }
  if(src.includes("vocabFallbackItem('中1','一般動詞（過去形）',")) throw new Error(`${path}: stale past-tense display category remains`);
  fs.writeFileSync(path,src);
}

patch(APP);
patch(INSTALLER);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({result:'PASS',files:[APP,INSTALLER],added_runtime_categories:['中1 接続詞','中1 一般動詞の過去形','中1 不規則動詞','中1 過去を表す語','中3 現在完了形（継続），現在完了進行形'],design:'generic category-level safe fallback only; grammar chronology and lexical gate remain authoritative; all past-tense stageMap problem categories receive generic safe supply; no problem-ID, textbook, section, or measured-count exception'},null,2)+'\n');
console.log('PASS: remaining severe/low-band generic vocab-safe fallbacks installed');
