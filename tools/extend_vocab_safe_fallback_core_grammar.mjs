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

const expandedBePresent=String.raw`function buildBePresentFallbacks() {
  const subjects=[
    {en:'I',be:'am',wrong:'are',jp:'私は'},
    {en:'You',be:'are',wrong:'am',jp:'あなたは'},
    {en:'He',be:'is',wrong:'are',jp:'彼は'},
    {en:'She',be:'is',wrong:'are',jp:'彼女は'},
    {en:'We',be:'are',wrong:'is',jp:'私たちは'},
    {en:'They',be:'are',wrong:'is',jp:'彼らは'},
    {en:'It',be:'is',wrong:'are',jp:'それは'}
  ];
  const complements=[
    {en:'a student',jp:'生徒です'},{en:'a friend',jp:'友達です'},{en:'a teacher',jp:'先生です'},
    {en:'at home',jp:'家にいます'},{en:'at school',jp:'学校にいます'},{en:'in the park',jp:'公園にいます'},
    {en:'in the room',jp:'部屋にいます'},{en:'in the city',jp:'町にいます'}
  ];
  const out=[]; let n=1;
  for(const s of subjects) for(const c of complements) {
    const stem=String(n++).padStart(3,'0');
    const full=s.en+' '+s.be+' '+c.en+'.';
    const neg=s.en+' '+s.be+' not '+c.en+'.';
    const question=s.be[0].toUpperCase()+s.be.slice(1)+' '+s.en.toLowerCase()+' '+c.en+'?';
    const yes='Yes, '+s.en.toLowerCase()+' '+s.be+'.';
    const jp=s.jp+c.jp+'。';
    out.push(vocabFallbackItem('中1','be動詞','空所補充','BE-FILL-'+stem,s.en+' (      ) '+c.en+'. 「'+jp+'」の意味になるように空所を埋めなさい。',s.be));
    out.push(vocabFallbackItem('中1','be動詞','選択','BE-CHOICE-'+stem,s.en+' ( am / is / are ) '+c.en+'. 正しい語を選びなさい。',s.be));
    out.push(vocabFallbackItem('中1','be動詞','変形','BE-CHANGE-'+stem,full+' を否定文にしなさい。',neg));
    out.push(vocabFallbackItem('中1','be動詞','英作文','BE-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jp+'』',full));
    out.push(vocabFallbackItem('中1','be動詞','間違い直し','BE-FIX-'+stem,s.en+' '+s.wrong+' '+c.en+'. の誤りを直しなさい。',full));
    out.push(vocabFallbackItem('中1','be動詞','答え方','BE-ANSWER-'+stem,question+' に Yes で答えなさい。',yes));
  }
  return out;
}`;

const patternOneBuilder=String.raw`
function buildPatternOneFallbacks() {
  const category='文型①（look ～，give A B）';
  const lookRows=[
    ['You','good'],['He','good'],['She','nice'],['It','nice'],['You','happy'],['He','happy'],['She','happy'],
    ['It','new'],['It','old'],['It','big'],['It','small'],['You','cute'],['She','cute']
  ];
  const giveRows=[
    ['I','you','a book'],['I','you','a pen'],['You','me','a book'],['You','me','a pen'],
    ['We','you','a book'],['They','you','a pen'],['He','me','a book'],['She','me','a pen']
  ];
  const out=[]; let n=1;
  for(const [s,c] of lookRows){
    const stem=String(n++).padStart(3,'0');
    const full=s+' look'+((s==='He'||s==='She'||s==='It')?'s':'')+' '+c+'.';
    out.push(vocabFallbackItem('中2',category,'空所補充','PAT1-LOOK-FILL-'+stem,s+' (      ) '+c+'. 「～に見える」の意味になるように動詞を書きなさい。',(s==='He'||s==='She'||s==='It')?'looks':'look'));
    out.push(vocabFallbackItem('中2',category,'英作文','PAT1-LOOK-WRITE-'+stem,'「'+s+'は'+c+'に見えます。」の意味になる英文を書きなさい。',full));
    out.push(vocabFallbackItem('中2',category,'間違い直し','PAT1-LOOK-FIX-'+stem,s+' is look '+c+'. の誤りを直しなさい。',full));
  }
  for(const [s,p,o] of giveRows){
    const stem=String(n++).padStart(3,'0');
    const verb=(s==='He'||s==='She')?'gives':'give';
    const full=s+' '+verb+' '+p+' '+o+'.';
    out.push(vocabFallbackItem('中2',category,'空所補充','PAT1-GIVE-FILL-'+stem,s+' (      ) '+p+' '+o+'. 「人に物を与える」の意味になるように動詞を書きなさい。',verb));
    out.push(vocabFallbackItem('中2',category,'英作文','PAT1-GIVE-WRITE-'+stem,'「'+s+'は'+p+'に'+o+'を与えます。」の意味になる英文を書きなさい。',full));
    out.push(vocabFallbackItem('中2',category,'並びかえ','PAT1-GIVE-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+o+' / '+p+' / '+verb+' / '+s+' )',full));
  }
  return out;
}
`;

function replaceFunction(src,name,replacement,nextName,path){
  const start=src.indexOf(`function ${name}() {`);
  const end=src.indexOf(`\n\nfunction ${nextName}() {`,start);
  if(start<0||end<0) throw new Error(`${path}: ${name} bounds missing`);
  return src.slice(0,start)+replacement+src.slice(end);
}

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
  src=replaceFunction(src,'buildBePresentFallbacks',expandedBePresent,'buildPastProgressiveFallbacks',path);
  if(src.includes("vocabFallbackItem('中2','文型①',")){
    src=src.replaceAll("vocabFallbackItem('中2','文型①',","vocabFallbackItem('中2','文型①（look ～，give A B）',");
  }
  if(!src.includes('function buildPatternOneFallbacks()')){
    const anchor='function buildConjunctionFallbacks() {';
    const i=src.indexOf(anchor); if(i<0) throw new Error(`${path}: conjunction builder anchor missing for pattern one`);
    src=src.slice(0,i)+patternOneBuilder+'\n'+src.slice(i);
  }
  if(!src.includes(' get give use eat')) src=src.replace(' get use eat drink sleep make take study',' get give use eat drink sleep make take study');
  if(!src.includes('nice cute happy school')) src=src.replace(' good bad big small new old long short hot cold nice cute school',' good bad big small new old long short hot cold nice cute happy school');
  if(!src.includes('buildPatternOneFallbacks(),buildGerundFallbacks()')){
    src=src.replace('buildImperativeFallbacks(),buildPresentVerbFallbacks(),buildGerundFallbacks()','buildImperativeFallbacks(),buildPresentVerbFallbacks(),buildPatternOneFallbacks(),buildGerundFallbacks()');
  }
  if(!src.includes('buildImperativeFallbacks(),buildPresentVerbFallbacks()')) throw new Error(`${path}: fallback bank concat patch missing`);
  if(!src.includes('buildPatternOneFallbacks(),buildGerundFallbacks()')) throw new Error(`${path}: pattern one bank concat patch missing`);
  if(!src.includes(' get give use eat') || !src.includes('nice cute happy school')) throw new Error(`${path}: fallback safe-base extension missing`);
  if(!src.includes("'文型①（look ～，give A B）'")) throw new Error(`${path}: pattern one runtime category mapping missing`);
  fs.writeFileSync(path,src);
}
patch(APP);
patch(INSTALLER);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({result:'PASS',files:[APP,INSTALLER],added_runtime_categories:['命令文','一般動詞','文型①（look ～，give A B）'],expanded_runtime_categories:['be動詞'],design:'category-level elementary-safe fallback for learned grammar; pattern-one fallback uses exact runtime stageMap category; existing prerequisite and lexical safety gates remain authoritative; no problem-ID, textbook, section, or measured-count exception'},null,2)+'\n');
console.log('PASS: core learned-grammar vocab-safe fallbacks installed/expanded');
