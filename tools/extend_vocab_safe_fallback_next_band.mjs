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
`;

function patch(path){
  let src=fs.readFileSync(path,'utf8');
  if(!src.includes('function buildThereIsFallbacks()')){
    const anchor='function buildConjunctionFallbacks() {';
    const i=src.indexOf(anchor);
    if(i<0) throw new Error(`${path}: conjunction anchor missing`);
    src=src.slice(0,i)+builder+'\n'+src.slice(i);
  }
  if(!src.includes('buildThereIsFallbacks(),buildGerundFallbacks()')){
    const old='buildPresentPerfectContinuousFallbacks(),buildGerundFallbacks()';
    const neu='buildPresentPerfectContinuousFallbacks(),buildThereIsFallbacks(),buildGerundFallbacks()';
    if(!src.includes(old)) throw new Error(`${path}: fallback bank concat anchor missing`);
    src=src.replace(old,neu);
  }
  if(!src.includes("vocabFallbackItem('中2','there is ～ の文'")) throw new Error(`${path}: there-is runtime category missing`);
  fs.writeFileSync(path,src);
}

patch(APP);
patch(INSTALLER);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({result:'PASS',files:[APP,INSTALLER],added_runtime_categories:['中2 there is ～ の文'],design:'generic elementary-safe category fallback using exact stageMap runtime category; existing grammar chronology and lexical safety remain authoritative; no problem-ID, textbook, section, or measured-count exception'},null,2)+'\n');
console.log('PASS: next low-retention band there-is fallback installed');
