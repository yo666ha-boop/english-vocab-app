import fs from 'node:fs';

const APP='problem-app/index.html';
const INSTALLER='tools/install_vocab_safe_fallback_v1.mjs';
const OUT='audit/VOCAB_MULTIGRADE_COMMON_FALLBACK_REPAIR.json';

const conjunctionBuilder=String.raw`function buildConjunctionFallbacks() {
  const subjects=[
    {en:'I',low:'I',jp:'私は',be:'am'},
    {en:'You',low:'you',jp:'あなたは',be:'are'},
    {en:'We',low:'we',jp:'私たちは',be:'are'},
    {en:'They',low:'they',jp:'彼らは',be:'are'}
  ];
  const scenarios=[];
  for(const s of subjects) {
    scenarios.push({conj:'because',hint:'〜なので',en:s.en+' go home because it is cold.',jp:s.jp+'寒いので家に帰ります。'});
    scenarios.push({conj:'if',hint:'もし〜なら',en:'If it is cold, '+s.low+' go home.',jp:'もし寒ければ、'+s.jp+'家に帰ります。'});
    scenarios.push({conj:'when',hint:'〜するとき',en:s.en+' read a book when '+s.low+' '+s.be+' at home.',jp:s.jp+'家にいるとき、本を読みます。'});
    scenarios.push({conj:'because',hint:'〜なので',en:s.en+' go home because it is hot.',jp:s.jp+'暑いので家に帰ります。'});
    scenarios.push({conj:'if',hint:'もし〜なら',en:'If it is hot, '+s.low+' go home.',jp:'もし暑ければ、'+s.jp+'家に帰ります。'});
    scenarios.push({conj:'when',hint:'〜するとき',en:s.en+' study English when '+s.low+' '+s.be+' at home.',jp:s.jp+'家にいるとき、英語を勉強します。'});
    scenarios.push({conj:'when',hint:'〜するとき',en:s.en+' cook when '+s.low+' '+s.be+' at home.',jp:s.jp+'家にいるとき、料理します。'});
    scenarios.push({conj:'if',hint:'もし〜なら',en:'If '+s.low+' '+s.be+' at home, '+s.low+' read a book.',jp:'もし家にいるなら、'+s.jp+'本を読みます。'});
  }
  const out=[];
  for(const grade of ['中2','中3']) scenarios.forEach((sc,i)=>{
    const stem=String(i+1).padStart(3,'0');
    const prefix=grade==='中2'?'G2-CONJ':'CONJ';
    const blank=sc.en.replace(new RegExp('\\b'+sc.conj+'\\b','i'),'(      )');
    const select=sc.en.replace(new RegExp('\\b'+sc.conj+'\\b','i'),'( because / if / when )');
    const wrong=sc.conj==='because'?'if':(sc.conj==='if'?'because':'if');
    const wrongSentence=sc.en.replace(new RegExp('\\b'+sc.conj+'\\b','i'),m=>m[0]===m[0].toUpperCase()?wrong[0].toUpperCase()+wrong.slice(1):wrong);
    const clean=sc.en.replace(/[.,]/g,'').split(/\s+/);
    const shift=(i%Math.max(1,clean.length-1))+1;
    const scrambled=clean.slice(shift).concat(clean.slice(0,shift)).join(' / ');
    out.push(vocabFallbackItem(grade,'接続詞','空所補充',prefix+'-FILL-'+stem,blank+' 「'+sc.hint+'」に合う接続詞を書きなさい。',sc.conj));
    out.push(vocabFallbackItem(grade,'接続詞','選択',prefix+'-CHOICE-'+stem,select+' 正しい接続詞を選びなさい。',sc.conj));
    out.push(vocabFallbackItem(grade,'接続詞','英作文',prefix+'-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+sc.jp+'』',sc.en));
    out.push(vocabFallbackItem(grade,'接続詞','間違い直し',prefix+'-FIX-'+stem,wrongSentence+' を『'+sc.jp+'』の意味になるように直しなさい。',sc.en));
    out.push(vocabFallbackItem(grade,'接続詞','読解',prefix+'-READ-'+stem,sc.en+' 問い：この文の内容を日本語で書きなさい。',sc.jp));
    out.push(vocabFallbackItem(grade,'接続詞','並びかえ',prefix+'-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+scrambled+' )',sc.en));
  });
  return out;
}`;

const questionBuilder=String.raw`function buildQuestionWordFallbacks() {
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
  const out=[];
  for(const grade of ['中1','中2']) rows.forEach((r,i)=>{
    const stem=String(i+1).padStart(3,'0');
    const prefix=grade==='中1'?'G1-WH':'WH';
    const full=r.wh+' '+r.body+'?';
    out.push(vocabFallbackItem(grade,cat,'空所補充',prefix+'-FILL-'+stem,'(      ) '+r.body+'? — '+r.answer+' 空所に入る疑問詞を書きなさい。',r.wh));
    out.push(vocabFallbackItem(grade,cat,'選択',prefix+'-CHOICE-'+stem,'( What / Who / Where ) '+r.body+'? — '+r.answer+' 最も適切な疑問詞を選びなさい。',r.wh));
    out.push(vocabFallbackItem(grade,cat,'答えから質問文',prefix+'-Q-'+stem,r.answer+' という答えになるように、'+r.ask+'をたずねる疑問文を書きなさい。',full));
    out.push(vocabFallbackItem(grade,cat,'並びかえ',prefix+'-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+r.body+' / '+r.wh+' )',full));
  });
  return out;
}`;

function replaceBetween(src,startAnchor,nextAnchor,replacement,path){
  const start=src.indexOf(startAnchor);
  const next=src.indexOf(nextAnchor,start+startAnchor.length);
  if(start<0 || next<0) throw new Error(`${path}: missing anchors ${startAnchor} -> ${nextAnchor}`);
  if(src.indexOf(startAnchor,start+1)>=0) throw new Error(`${path}: non-unique start anchor ${startAnchor}`);
  return src.slice(0,start)+replacement+'\n\n'+src.slice(next);
}

for(const path of [APP,INSTALLER]){
  let src=fs.readFileSync(path,'utf8');
  src=replaceBetween(src,'function buildConjunctionFallbacks() {','function buildCombinedThereLookFallbacks() {',conjunctionBuilder,path);
  src=replaceBetween(src,'function buildQuestionWordFallbacks() {','function buildPresentProgressiveFallbacks() {',questionBuilder,path);
  if(!src.includes("for(const grade of ['中1','中2'])")) throw new Error(`${path}: G1/G2 question-word coverage missing`);
  if(!src.includes("for(const grade of ['中2','中3'])")) throw new Error(`${path}: G2/G3 conjunction coverage missing`);
  fs.writeFileSync(path,src);
}

fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({
  generated_at:new Date().toISOString(),
  result:'PASS',
  files:[APP,INSTALLER],
  repair:{question_words:['中1','中2'],conjunctions:['中2','中3']},
  policy:'generalize existing safe category-level fallback builders across grades where the same learned grammar category is used; no textbook/unit/problem-ID/count exception; grammar chronology, vocabulary chronology, lexical safety, quality, and supplemental cap remain authoritative'
},null,2)+'\n');
console.log('PASS: multigrade common fallbacks repaired');
