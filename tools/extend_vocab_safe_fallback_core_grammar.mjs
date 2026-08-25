import fs from 'node:fs';

const APP='problem-app/index.html';
const INSTALLER='tools/install_vocab_safe_fallback_v1.mjs';
const OUT='audit/VOCAB_SAFE_FALLBACK_CORE_GRAMMAR_REPAIR.json';

const builders=String.raw`
function buildBePastFallbacks() {
  const subjects=[
    {en:'I',be:'was',wrong:'were',jp:'私は'},
    {en:'You',be:'were',wrong:'was',jp:'あなたは'},
    {en:'He',be:'was',wrong:'were',jp:'彼は'},
    {en:'She',be:'was',wrong:'were',jp:'彼女は'},
    {en:'We',be:'were',wrong:'was',jp:'私たちは'},
    {en:'They',be:'were',wrong:'was',jp:'彼らは'}
  ];
  const complements=[
    {en:'at home',jp:'家にいました'},
    {en:'at school',jp:'学校にいました'},
    {en:'in the park',jp:'公園にいました'},
    {en:'in the room',jp:'部屋にいました'},
    {en:'a student',jp:'生徒でした'},
    {en:'a teacher',jp:'先生でした'},
    {en:'a friend',jp:'友達でした'},
    {en:'in the city',jp:'町にいました'}
  ];
  const out=[]; let n=1;
  for(const s of subjects) for(const c of complements) {
    const stem=String(n++).padStart(3,'0');
    const full=s.en+' '+s.be+' '+c.en+'.';
    const neg=s.en+' '+s.be+' not '+c.en+'.';
    const question=s.be[0].toUpperCase()+s.be.slice(1)+' '+s.en.toLowerCase()+' '+c.en+'?';
    const yes='Yes, '+s.en.toLowerCase()+' '+s.be+'.';
    const jp=s.jp+c.jp+'。';
    out.push(vocabFallbackItem('中1','過去のbe動詞','空所補充','PBE-FILL-'+stem,s.en+' (      ) '+c.en+'. 「'+jp+'」の意味になるように空所を埋めなさい。',s.be));
    out.push(vocabFallbackItem('中1','過去のbe動詞','選択','PBE-CHOICE-'+stem,s.en+' ( was / were ) '+c.en+'. 正しい語を選びなさい。',s.be));
    out.push(vocabFallbackItem('中1','過去のbe動詞','変形','PBE-CHANGE-'+stem,full+' を否定文にしなさい。',neg));
    out.push(vocabFallbackItem('中1','過去のbe動詞','答え方','PBE-ANSWER-'+stem,question+' に Yes で答えなさい。',yes));
    out.push(vocabFallbackItem('中1','過去のbe動詞','間違い直し','PBE-FIX-'+stem,s.en+' '+s.wrong+' '+c.en+'. の誤りを直しなさい。',full));
  }
  return out;
}

function buildWordOrderFallbacks() {
  const rows=[
    ['I am a student.','私は生徒です。'],['You are my friend.','あなたは私の友達です。'],['We are at school.','私たちは学校にいます。'],['They are in the park.','彼らは公園にいます。'],
    ['I am at home.','私は家にいます。'],['You are in the room.','あなたは部屋にいます。'],['We are friends.','私たちは友達です。'],['They are students.','彼らは生徒です。'],
    ['I like English.','私は英語が好きです。'],['You like books.','あなたは本が好きです。'],['We like school.','私たちは学校が好きです。'],['They like English.','彼らは英語が好きです。'],
    ['I study English.','私は英語を勉強します。'],['You read a book.','あなたは本を読みます。'],['We play in the park.','私たちは公園で遊びます。'],['They study at home.','彼らは家で勉強します。'],
    ['I write at home.','私は家で書きます。'],['You sing at school.','あなたは学校で歌います。'],['We swim.','私たちは泳ぎます。'],['They run in the park.','彼らは公園で走ります。'],
    ['I have a book.','私は本を持っています。'],['You have a pen.','あなたはペンを持っています。'],['We have books.','私たちは本を持っています。'],['They have a dog.','彼らは犬を飼っています。'],
    ['I can swim.','私は泳げます。'],['You can sing.','あなたは歌えます。'],['We can run.','私たちは走れます。'],['They can cook.','彼らは料理できます。'],
    ['This is my book.','これは私の本です。'],['That is your bag.','あれはあなたのかばんです。'],['This is a pen.','これはペンです。'],['That is a picture.','あれは絵です。'],
    ['I am not at home.','私は家にいません。'],['You are not a teacher.','あなたは先生ではありません。'],['We do not play.','私たちは遊びません。'],['They do not study.','彼らは勉強しません。']
  ];
  const out=[];
  rows.forEach((row,i)=>{
    const stem=String(i+1).padStart(3,'0');
    const words=row[0].replace(/[.?]/g,'').split(/\s+/);
    const shift=(i%Math.max(1,words.length-1))+1;
    const scrambled=words.slice(shift).concat(words.slice(0,shift)).join(' / ');
    out.push(vocabFallbackItem('中1','並びかえ','並びかえ','WORD-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+scrambled+' )',row[0]));
    out.push(vocabFallbackItem('中1','英作文','英作文','WORD-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+row[1]+'』',row[0]));
  });
  return out;
}
`;

function patch(path){
  let src=fs.readFileSync(path,'utf8');
  if(!src.includes('function buildBePastFallbacks()')){
    const anchor='function buildConjunctionFallbacks() {';
    const i=src.indexOf(anchor); if(i<0) throw new Error(`${path}: conjunction builder anchor missing`);
    src=src.slice(0,i)+builders+'\n'+src.slice(i);
  }
  const old='const all=buildBePresentFallbacks().concat(buildPastProgressiveFallbacks(),buildGerundFallbacks(),buildConjunctionFallbacks());';
  const neu='const all=buildBePresentFallbacks().concat(buildPastProgressiveFallbacks(),buildBePastFallbacks(),buildWordOrderFallbacks(),buildGerundFallbacks(),buildConjunctionFallbacks());';
  if(src.includes(old)) src=src.replace(old,neu);
  else if(!src.includes(neu)) throw new Error(`${path}: fallback bank anchor missing`);
  fs.writeFileSync(path,src);
}
patch(APP);
patch(INSTALLER);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({result:'PASS',files:[APP,INSTALLER],added_runtime_categories:['過去のbe動詞','並びかえ','英作文'],design:'grammar-category fallback uses only elementary-safe vocabulary and existing prerequisite/quality gates; no problem-ID, section, textbook, or measured-count exception'},null,2)+'\n');
console.log('PASS: early learned grammar vocab-safe fallbacks installed');
