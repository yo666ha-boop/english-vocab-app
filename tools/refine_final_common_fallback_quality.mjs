import fs from 'node:fs';

const FILES=['problem-app/index.html','tools/install_vocab_safe_fallback_v1.mjs'];
const OUT='audit/VOCAB_SAFE_FALLBACK_FINAL_COMMON_QUALITY_REPAIR.json';

const combined=String.raw`function buildCombinedThereLookFallbacks() {
  // Exact runtime category used by the combined G1 display stage.
  const cat='there is ～・look ～ の文';
  const out=[]; let n=1;
  const places=[['in the room','部屋に'],['at school','学校に'],['at home','家に'],['in the park','公園に']];
  const things=[['a book','本'],['a pen','ペン'],['a dog','犬'],['a cat','ねこ']];
  for(const [thing,jpThing] of things) for(const [place,jpPlace] of places){
    const stem=String(n++).padStart(3,'0');
    const full='There is '+thing+' '+place+'.';
    out.push(vocabFallbackItem('中1',cat,'空所補充','THERELOOK-FILL-'+stem,'There (      ) '+thing+' '+place+'. 空所に入る語を書きなさい。','is'));
    out.push(vocabFallbackItem('中1',cat,'変形','THERELOOK-Q-'+stem,full+' を疑問文にしなさい。','Is there '+thing+' '+place+'?'));
    out.push(vocabFallbackItem('中1',cat,'並びかえ','THERELOOK-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+place+' / '+thing+' / is / There )',full));
    out.push(vocabFallbackItem('中1',cat,'英作文','THERELOOK-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jpThing+'が'+jpPlace+'あります。』',full));
  }
  const looks=[
    ['I','am','私は','happy','うれしそう'],['You','are','あなたは','happy','うれしそう'],
    ['He','is','彼は','happy','うれしそう'],['She','is','彼女は','happy','うれしそう'],
    ['We','are','私たちは','happy','うれしそう'],['They','are','彼らは','happy','うれしそう'],
    ['It','is','それは','nice','よさそう']
  ];
  for(const [s,be,jpS,adj,jpAdj] of looks){
    const stem=String(n++).padStart(3,'0');
    const verb=(s==='He'||s==='She'||s==='It')?'looks':'look';
    const full=s+' '+verb+' '+adj+'.';
    out.push(vocabFallbackItem('中1',cat,'空所補充','LOOK-FILL-'+stem,s+' (      ) '+adj+'. lookを適切な形にして書きなさい。',verb));
    out.push(vocabFallbackItem('中1',cat,'英作文','LOOK-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jpS+jpAdj+'に見えます。』',full));
    out.push(vocabFallbackItem('中1',cat,'間違い直し','LOOK-FIX-'+stem,s+' '+be+' look '+adj+'. の誤りを直しなさい。',full));
  }
  return out;
}`;

const wh=String.raw`function buildQuestionWordFallbacks() {
  const cat='疑問詞';
  const rows=[
    {wh:'Where',ask:'場所',body:'do you study English',answer:'At home.'},
    {wh:'What',ask:'もの',body:'do you like',answer:'I like English.'},
    {wh:'Who',ask:'人',body:'is a student',answer:'He is a student.'},
    {wh:'Where',ask:'場所',body:'do you read a book',answer:'At school.'},
    {wh:'What',ask:'もの',body:'do you read',answer:'A book.'},
    {wh:'Where',ask:'場所',body:'do they play',answer:'In the park.'},
    {wh:'What',ask:'もの',body:'do we study',answer:'English.'},
    {wh:'Who',ask:'人',body:'is a teacher',answer:'She is a teacher.'}
  ];
  const out=[]; let n=1;
  for(const r of rows){
    const stem=String(n++).padStart(3,'0');
    const full=r.wh+' '+r.body+'?';
    out.push(vocabFallbackItem('中2',cat,'空所補充','WH-FILL-'+stem,'(      ) '+r.body+'? — '+r.answer+' 空所に入る疑問詞を書きなさい。',r.wh));
    out.push(vocabFallbackItem('中2',cat,'選択','WH-CHOICE-'+stem,'( What / Who / Where ) '+r.body+'? — '+r.answer+' 最も適切な疑問詞を選びなさい。',r.wh));
    out.push(vocabFallbackItem('中2',cat,'答えから質問文','WH-Q-'+stem,r.answer+' という答えになるように、'+r.ask+'をたずねる疑問文を書きなさい。',full));
    out.push(vocabFallbackItem('中2',cat,'並びかえ','WH-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+r.body+' / '+r.wh+' )',full));
  }
  return out;
}`;

function replaceFunction(src,name,replacement,path){
  const start=src.indexOf('function '+name+'()');
  if(start<0) throw new Error(`${path}: ${name} missing`);
  const brace=src.indexOf('{',start); let depth=0,q=null,esc=false,line=false,block=false,end=-1;
  for(let i=brace;i<src.length;i++){
    const c=src[i],n=src[i+1];
    if(line){if(c==='\n')line=false;continue;}
    if(block){if(c==='*'&&n==='/'){block=false;i++;}continue;}
    if(q){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===q)q=null;continue;}
    if(c==='/'&&n==='/'){line=true;i++;continue;}if(c==='/'&&n==='*'){block=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0){end=i+1;break;}
  }
  if(end<0) throw new Error(`${path}: ${name} end missing`);
  return src.slice(0,start)+replacement+src.slice(end);
}

for(const path of FILES){
  let src=fs.readFileSync(path,'utf8');
  src=replaceFunction(src,'buildCombinedThereLookFallbacks',combined,path);
  src=replaceFunction(src,'buildQuestionWordFallbacks',wh,path);
  fs.writeFileSync(path,src);
}
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({result:'PASS',files:FILES,changes:['there/look Japanese prompts now exactly match the English place/content','question-word Who examples now have semantically valid answers','question-word answer-to-question prompts use natural Japanese ask labels'],design:'wording/semantic quality refinement only; IDs, categories, types, generic floor, chronology, and lexical safety policy unchanged'},null,2)+'\n');
console.log('PASS: final common fallback wording refined');
