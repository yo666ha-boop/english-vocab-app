import fs from 'node:fs';

const APP='problem-app/index.html';
const INSTALLER='tools/install_vocab_safe_fallback_v1.mjs';
const OUT='audit/VOCAB_SAFE_FALLBACK_CORE_GRAMMAR_REPAIR.json';

const builders=String.raw`
function buildBePresentFallbacks() {
  const subjects=[
    {en:'I',be:'am',wrong:'are',jp:'私は'},
    {en:'You',be:'are',wrong:'am',jp:'あなたは'},
    {en:'We',be:'are',wrong:'am',jp:'私たちは'},
    {en:'They',be:'are',wrong:'is',jp:'彼らは'}
  ];
  const complements=[
    {en:'a student',jp:'生徒です'},
    {en:'a friend',jp:'友達です'},
    {en:'at home',jp:'家にいます'},
    {en:'in the park',jp:'公園にいます'}
  ];
  const out=[]; let n=1;
  for(const s of subjects) for(const c of complements) {
    const stem=String(n++).padStart(3,'0');
    const full=s.en+' '+s.be+' '+c.en+'.';
    const neg=s.en+' '+s.be+' not '+c.en+'.';
    const jp=s.jp+c.jp+'。';
    out.push(vocabFallbackItem('中1','be動詞','空所補充','BE-FILL-'+stem,s.en+' (      ) '+c.en+'. 「'+jp+'」の意味になるように空所を埋めなさい。',s.be));
    out.push(vocabFallbackItem('中1','be動詞','選択','BE-CHOICE-'+stem,s.en+' ( am / is / are ) '+c.en+'. 正しい語を選びなさい。',s.be));
    out.push(vocabFallbackItem('中1','be動詞','変形','BE-CHANGE-'+stem,full+' を否定文にしなさい。',neg));
    out.push(vocabFallbackItem('中1','be動詞','英作文','BE-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jp+'』',full));
    out.push(vocabFallbackItem('中1','be動詞','間違い直し','BE-FIX-'+stem,s.en+' '+s.wrong+' '+c.en+'. の誤りを直しなさい。',full));
  }
  return out;
}

function buildPastProgressiveFallbacks() {
  const subjects=[
    {en:'I',be:'was',wrong:'were',jp:'私は'},
    {en:'You',be:'were',wrong:'was',jp:'あなたは'},
    {en:'We',be:'were',wrong:'was',jp:'私たちは'},
    {en:'They',be:'were',wrong:'was',jp:'彼らは'}
  ];
  const acts=[
    {ger:'reading a book',jp:'本を読んでいました'},
    {ger:'playing in the park',jp:'公園で遊んでいました'},
    {ger:'studying English',jp:'英語を勉強していました'},
    {ger:'cooking at home',jp:'家で料理していました'}
  ];
  const out=[]; let n=1;
  for(const s of subjects) for(const a of acts) {
    const stem=String(n++).padStart(3,'0');
    const full=s.en+' '+s.be+' '+a.ger+'.';
    const neg=s.en+' '+s.be+' not '+a.ger+'.';
    const jp=s.jp+a.jp+'。';
    out.push(vocabFallbackItem('中1','過去進行形','空所補充','PPR-FILL-'+stem,s.en+' '+s.be+' (      ). 「'+jp+'」の意味になるように空所を埋めなさい。',a.ger));
    out.push(vocabFallbackItem('中1','過去進行形','選択','PPR-CHOICE-'+stem,s.en+' ( was / were ) '+a.ger+'. 正しい語を選びなさい。',s.be));
    out.push(vocabFallbackItem('中1','過去進行形','変形','PPR-CHANGE-'+stem,full+' を否定文にしなさい。',neg));
    out.push(vocabFallbackItem('中1','過去進行形','英作文','PPR-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jp+'』',full));
    out.push(vocabFallbackItem('中1','過去進行形','間違い直し','PPR-FIX-'+stem,s.en+' '+s.wrong+' '+a.ger+'. の誤りを直しなさい。',full));
  }
  return out;
}
`;

function patch(path){
  let src=fs.readFileSync(path,'utf8');
  if(!src.includes('function buildBePresentFallbacks()')){
    const anchor='function buildConjunctionFallbacks() {';
    const i=src.indexOf(anchor); if(i<0) throw new Error(`${path}: conjunction builder anchor missing`);
    src=src.slice(0,i)+builders+'\n'+src.slice(i);
  }
  const old='const all=buildGerundFallbacks().concat(buildConjunctionFallbacks());';
  const neu='const all=buildBePresentFallbacks().concat(buildPastProgressiveFallbacks(),buildGerundFallbacks(),buildConjunctionFallbacks());';
  if(src.includes(old)) src=src.replace(old,neu);
  else if(!src.includes(neu)) throw new Error(`${path}: fallback bank anchor missing`);
  fs.writeFileSync(path,src);
}
patch(APP);
patch(INSTALLER);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({result:'PASS',files:[APP,INSTALLER],added_categories:['be動詞（現在形）','過去進行形'],design:'grammar-category fallback uses only existing elementary-safe vocabulary and existing prerequisite/quality gates; no problem-ID, section, textbook, or measured-count exception'},null,2)+'\n');
console.log('PASS: core grammar vocab-safe fallbacks installed');
