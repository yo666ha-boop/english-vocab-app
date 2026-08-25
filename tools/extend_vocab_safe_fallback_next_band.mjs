import fs from 'node:fs';

const APP='problem-app/index.html';
const INSTALLER='tools/install_vocab_safe_fallback_v1.mjs';
const OUT='audit/VOCAB_SAFE_FALLBACK_NEXT_BAND_REPAIR.json';

const builder=String.raw`
function buildThereIsFallbacks() {
  const rows=[
    ['a book','in the room','本が部屋にあります'],
    ['a pen','in the room','ペンが部屋にあります'],
    ['a book','at school','本が学校にあります'],
    ['a pen','at school','ペンが学校にあります'],
    ['a dog','in the park','犬が公園にいます'],
    ['a cat','in the park','ねこが公園にいます'],
    ['a book','at home','本が家にあります'],
    ['a pen','at home','ペンが家にあります']
  ];
  const out=[]; let n=1;
  for(const [thing,place,jp] of rows){
    const stem=String(n++).padStart(3,'0');
    const full='There is '+thing+' '+place+'.';
    const question='Is there '+thing+' '+place+'?';
    out.push(vocabFallbackItem('中2','there is ～ の文','空所補充','THERE-FILL-'+stem,'There (      ) '+thing+' '+place+'. 空所に入る語を書きなさい。','is'));
    out.push(vocabFallbackItem('中2','there is ～ の文','英作文','THERE-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jp+'。』',full));
    out.push(vocabFallbackItem('中2','there is ～ の文','変形','THERE-QUESTION-'+stem,full+' を疑問文にしなさい。',question));
  }
  return out;
}

function buildBeVsVerbFallbacks() {
  const beRows=[
    ['I am a student.','私は生徒です。'],['You are a student.','あなたは生徒です。'],
    ['He is a student.','彼は生徒です。'],['She is a student.','彼女は生徒です。'],
    ['We are at school.','私たちは学校にいます。'],['They are at home.','彼らは家にいます。'],
    ['It is a book.','それは本です。'],['I am at home.','私は家にいます。']
  ];
  const verbRows=[
    ['I study English.','私は英語を勉強します。'],['You read a book.','あなたは本を読みます。'],
    ['We play.','私たちは遊びます。'],['They sing.','彼らは歌います。'],
    ['I like English.','私は英語が好きです。'],['You write.','あなたは書きます。'],
    ['We cook.','私たちは料理します。'],['They swim.','彼らは泳ぎます。']
  ];
  const out=[]; let n=1;
  for(const [full,jp] of beRows){
    const stem=String(n++).padStart(3,'0');
    out.push(vocabFallbackItem('中1','区別','見分け','DIST-BE-'+stem,full+' は be動詞の文か、一般動詞の文か答えなさい。','be動詞の文'));
    out.push(vocabFallbackItem('中1','区別','英作文','DIST-BE-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jp+'』',full));
  }
  n=1;
  for(const [full,jp] of verbRows){
    const stem=String(n++).padStart(3,'0');
    out.push(vocabFallbackItem('中1','区別','見分け','DIST-VERB-'+stem,full+' は be動詞の文か、一般動詞の文か答えなさい。','一般動詞の文'));
    out.push(vocabFallbackItem('中1','区別','英作文','DIST-VERB-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jp+'』',full));
  }
  const fixes=[
    ['I am study English.','I study English.'],['You are read a book.','You read a book.'],
    ['We are play.','We play.'],['They are sing.','They sing.'],
    ['I a student.','I am a student.'],['You a student.','You are a student.'],
    ['He a student.','He is a student.'],['She a student.','She is a student.']
  ];
  fixes.forEach((r,i)=>out.push(vocabFallbackItem('中1','区別','間違い直し','DIST-FIX-'+String(i+1).padStart(3,'0'),r[0]+' の誤りを直しなさい。',r[1])));
  return out;
}
`;

function patch(path){
  let src=fs.readFileSync(path,'utf8');
  if(!src.includes('function buildThereIsFallbacks()')){
    const anchor='function buildConjunctionFallbacks() {';
    const i=src.indexOf(anchor);
    if(i<0) throw new Error(`${path}: conjunction anchor missing`);
    src=src.slice(0,i)+builder+'\n'+src.slice(i);
  } else if(!src.includes('function buildBeVsVerbFallbacks()')) {
    const anchor='function buildConjunctionFallbacks() {';
    const i=src.indexOf(anchor);
    if(i<0) throw new Error(`${path}: conjunction anchor missing for distinction`);
    const start=builder.indexOf('function buildBeVsVerbFallbacks()');
    src=src.slice(0,i)+builder.slice(start)+'\n'+src.slice(i);
  }
  if(!src.includes('buildThereIsFallbacks(),buildGerundFallbacks()') && !src.includes('buildThereIsFallbacks(),buildBeVsVerbFallbacks(),buildGerundFallbacks()')){
    const old='buildPresentPerfectContinuousFallbacks(),buildGerundFallbacks()';
    const neu='buildPresentPerfectContinuousFallbacks(),buildThereIsFallbacks(),buildBeVsVerbFallbacks(),buildGerundFallbacks()';
    if(!src.includes(old)) throw new Error(`${path}: fallback bank concat anchor missing`);
    src=src.replace(old,neu);
  }
  if(src.includes('buildThereIsFallbacks(),buildGerundFallbacks()')) src=src.replace('buildThereIsFallbacks(),buildGerundFallbacks()','buildThereIsFallbacks(),buildBeVsVerbFallbacks(),buildGerundFallbacks()');
  if(!src.includes("vocabFallbackItem('中2','there is ～ の文'")) throw new Error(`${path}: there-is runtime category missing`);
  if(!src.includes("vocabFallbackItem('中1','区別'")) throw new Error(`${path}: distinction runtime category missing`);
  if(!src.includes('buildThereIsFallbacks(),buildBeVsVerbFallbacks(),buildGerundFallbacks()')) throw new Error(`${path}: next-band concat missing`);
  fs.writeFileSync(path,src);
}

patch(APP);
patch(INSTALLER);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({result:'PASS',files:[APP,INSTALLER],added_runtime_categories:['中2 there is ～ の文','中1 区別'],design:'generic elementary-safe category fallback using exact stageMap runtime categories; existing grammar chronology and lexical safety remain authoritative; no problem-ID, textbook, section, or measured-count exception'},null,2)+'\n');
console.log('PASS: next low-retention band fallbacks installed');
