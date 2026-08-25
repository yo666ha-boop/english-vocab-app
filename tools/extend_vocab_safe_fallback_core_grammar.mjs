import fs from 'node:fs';

const APP='problem-app/index.html';
const INSTALLER='tools/install_vocab_safe_fallback_v1.mjs';
const OUT='audit/VOCAB_SAFE_FALLBACK_CORE_GRAMMAR_REPAIR.json';

const builders=String.raw`
function buildImperativeFallbacks() {
  const rows=[
    ['read a book','本を読みなさい。'],['write your name','名前を書きなさい。'],['study English','英語を勉強しなさい。'],['listen','聞きなさい。'],['look here','ここを見なさい。'],['come here','ここへ来なさい。'],['go home','家へ行きなさい。'],['play','遊びなさい。'],['sing','歌いなさい。'],['swim','泳ぎなさい。'],['run','走りなさい。'],['cook','料理しなさい。']
  ];
  const out=[];
  rows.forEach((r,i)=>{
    const stem=String(i+1).padStart(3,'0');
    const cmd=r[0][0].toUpperCase()+r[0].slice(1)+'.';
    out.push(vocabFallbackItem('中1','命令文','英作文','IMP-WRITE-'+stem,'『'+r[1]+'』を英語で書きなさい。',cmd));
    out.push(vocabFallbackItem('中1','命令文','選択','IMP-CHOICE-'+stem,'命令文として正しいものを ( '+cmd+' / You '+cmd+' ) から選びなさい。',cmd));
    out.push(vocabFallbackItem('中1','命令文','間違い直し','IMP-FIX-'+stem,'You '+cmd+' の誤りを直しなさい。',cmd));
  });
  return out;
}

function buildPresentVerbFallbacks() {
  const subjects=[{en:'I',jp:'私は'},{en:'You',jp:'あなたは'},{en:'We',jp:'私たちは'},{en:'They',jp:'彼らは'}];
  const verbs=[
    {en:'study English',jp:'英語を勉強します'},{en:'read a book',jp:'本を読みます'},{en:'write',jp:'書きます'},{en:'sing',jp:'歌います'},
    {en:'swim',jp:'泳ぎます'},{en:'run',jp:'走ります'},{en:'cook',jp:'料理します'},{en:'play',jp:'遊びます'},{en:'like English',jp:'英語が好きです'},
    {en:'have a book',jp:'本を持っています'},{en:'go home',jp:'家へ行きます'},{en:'come here',jp:'ここへ来ます'}
  ];
  const out=[]; let n=1;
  for(const s of subjects) for(const v of verbs){
    const stem=String(n++).padStart(3,'0');
    const full=s.en+' '+v.en+'.';
    const neg=s.en+' do not '+v.en+'.';
    out.push(vocabFallbackItem('中1','一般動詞','英作文','PRS-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+s.jp+v.jp+'。』',full));
    out.push(vocabFallbackItem('中1','一般動詞','変形','PRS-NEG-'+stem,full+' を否定文にしなさい。',neg));
    out.push(vocabFallbackItem('中1','一般動詞','空所補充','PRS-FILL-'+stem,s.en+' (      ) '+v.en.split(' ').slice(1).join(' ')+'. 文が自然になるように動詞を書きなさい。',v.en.split(' ')[0]));
  }
  return out;
}
`;

function patch(path){
  let src=fs.readFileSync(path,'utf8');
  if(!src.includes('function buildImperativeFallbacks()')){
    const anchor='function buildConjunctionFallbacks() {';
    const i=src.indexOf(anchor); if(i<0) throw new Error(`${path}: conjunction builder anchor missing`);
    src=src.slice(0,i)+builders+'\n'+src.slice(i);
  }
  if(!src.includes('buildImperativeFallbacks(),buildPresentVerbFallbacks()')){
    src=src.replace(/(const all=.*?buildWordOrderFallbacks\(\),)(buildGerundFallbacks\(\),buildConjunctionFallbacks\(\)\);)/,
      '$1buildImperativeFallbacks(),buildPresentVerbFallbacks(),$2');
  }
  if(!src.includes('buildImperativeFallbacks(),buildPresentVerbFallbacks()')) throw new Error(`${path}: fallback bank concat patch missing`);
  fs.writeFileSync(path,src);
}
patch(APP);
patch(INSTALLER);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({result:'PASS',files:[APP,INSTALLER],added_runtime_categories:['命令文','一般動詞'],design:'category-level elementary-safe fallback for learned grammar; existing prerequisite and lexical safety gates remain authoritative; no problem-ID, textbook, section, or measured-count exception'},null,2)+'\n');
console.log('PASS: imperative and present-verb vocab-safe fallbacks installed');
