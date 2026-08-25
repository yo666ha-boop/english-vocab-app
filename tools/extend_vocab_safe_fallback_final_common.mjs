import fs from 'node:fs';

const APP='problem-app/index.html';
const INSTALLER='tools/install_vocab_safe_fallback_v1.mjs';
const OUT='audit/VOCAB_SAFE_FALLBACK_FINAL_COMMON_REPAIR.json';

const builders=String.raw`
function buildCombinedThereLookFallbacks() {
  // Exact runtime category used by the combined G1 display stage.
  const cat='there is ～・look ～ の文';
  const out=[]; let n=1;
  const places=['in the room','at school','at home','in the park'];
  const things=[['a book','本'],['a pen','ペン'],['a dog','犬'],['a cat','ねこ']];
  for(const [thing,jp] of things) for(const place of places){
    const stem=String(n++).padStart(3,'0');
    const full='There is '+thing+' '+place+'.';
    out.push(vocabFallbackItem('中1',cat,'空所補充','THERELOOK-FILL-'+stem,'There (      ) '+thing+' '+place+'. 空所に入る語を書きなさい。','is'));
    out.push(vocabFallbackItem('中1',cat,'変形','THERELOOK-Q-'+stem,full+' を疑問文にしなさい。','Is there '+thing+' '+place+'?'));
    out.push(vocabFallbackItem('中1',cat,'並びかえ','THERELOOK-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+place+' / '+thing+' / is / There )',full));
    out.push(vocabFallbackItem('中1',cat,'英作文','THERELOOK-WRITE-'+stem,'「'+jp+'がそこにあります。」の形になるように、there is を使って英文を書きなさい。',full));
  }
  const looks=[['I','am','happy'],['You','are','happy'],['He','is','happy'],['She','is','happy'],['We','are','happy'],['They','are','happy'],['It','is','nice']];
  for(const [s,be,adj] of looks){
    const stem=String(n++).padStart(3,'0');
    const verb=(s==='He'||s==='She'||s==='It')?'looks':'look';
    const full=s+' '+verb+' '+adj+'.';
    out.push(vocabFallbackItem('中1',cat,'空所補充','LOOK-FILL-'+stem,s+' (      ) '+adj+'. lookを適切な形にして書きなさい。',verb));
    out.push(vocabFallbackItem('中1',cat,'英作文','LOOK-WRITE-'+stem,'look を使って「'+s+' は '+adj+' に見えます」の意味の英文を書きなさい。',full));
    out.push(vocabFallbackItem('中1',cat,'間違い直し','LOOK-FIX-'+stem,s+' '+be+' look '+adj+'. の誤りを直しなさい。',full));
  }
  return out;
}

function buildQuestionWordFallbacks() {
  const cat='疑問詞';
  const rows=[
    {wh:'Where',jp:'どこで',body:'do you study English',answer:'At home.'},
    {wh:'What',jp:'何を',body:'do you like',answer:'I like English.'},
    {wh:'Who',jp:'だれが',body:'is your teacher',answer:'My teacher.'},
    {wh:'Where',jp:'どこで',body:'do you read a book',answer:'At school.'},
    {wh:'What',jp:'何を',body:'do you read',answer:'A book.'},
    {wh:'Where',jp:'どこで',body:'do they play',answer:'In the park.'},
    {wh:'What',jp:'何を',body:'do we study',answer:'English.'},
    {wh:'Who',jp:'だれが',body:'is your friend',answer:'My friend.'}
  ];
  const out=[]; let n=1;
  for(const r of rows){
    const stem=String(n++).padStart(3,'0');
    const full=r.wh+' '+r.body+'?';
    out.push(vocabFallbackItem('中2',cat,'空所補充','WH-FILL-'+stem,'(      ) '+r.body+'? — '+r.answer+' 空所に入る疑問詞を書きなさい。',r.wh));
    out.push(vocabFallbackItem('中2',cat,'選択','WH-CHOICE-'+stem,'( What / Who / Where ) '+r.body+'? — '+r.answer+' 最も適切な疑問詞を選びなさい。',r.wh));
    out.push(vocabFallbackItem('中2',cat,'答えから質問文','WH-Q-'+stem,r.answer+' という答えになるように、'+r.jp+'をたずねる疑問文を書きなさい。',full));
    out.push(vocabFallbackItem('中2',cat,'並びかえ','WH-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+r.body+' / '+r.wh+' )',full));
  }
  return out;
}

function buildPresentProgressiveFallbacks() {
  const cat='進行形';
  const subjects=[
    {s:'I',be:'am',jp:'私は'}, {s:'You',be:'are',jp:'あなたは'},
    {s:'He',be:'is',jp:'彼は'}, {s:'She',be:'is',jp:'彼女は'},
    {s:'We',be:'are',jp:'私たちは'}, {s:'They',be:'are',jp:'彼らは'}
  ];
  const acts=[
    {ing:'reading a book',jp:'本を読んでいます'},
    {ing:'studying English',jp:'英語を勉強しています'},
    {ing:'playing in the park',jp:'公園で遊んでいます'},
    {ing:'cooking at home',jp:'家で料理しています'},
    {ing:'writing',jp:'書いています'},
    {ing:'singing',jp:'歌っています'}
  ];
  const out=[]; let n=1;
  for(const s of subjects) for(const a of acts){
    const stem=String(n++).padStart(3,'0');
    const full=s.s+' '+s.be+' '+a.ing+'.';
    const neg=s.s+' '+s.be+' not '+a.ing+'.';
    const q=s.be[0].toUpperCase()+s.be.slice(1)+' '+s.s.toLowerCase()+' '+a.ing+'?';
    out.push(vocabFallbackItem('中2',cat,'空所補充','PROG-FILL-'+stem,s.s+' '+s.be+' (      ). 進行形になるように書きなさい。',a.ing));
    out.push(vocabFallbackItem('中2',cat,'英作文','PROG-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+s.jp+a.jp+'。』',full));
    out.push(vocabFallbackItem('中2',cat,'変形','PROG-NEG-'+stem,full+' を否定文にしなさい。',neg));
    out.push(vocabFallbackItem('中2',cat,'並びかえ','PROG-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+a.ing+' / '+s.be+' / '+s.s+' )',full));
    out.push(vocabFallbackItem('中2',cat,'疑問文','PROG-Q-'+stem,full+' を疑問文にしなさい。',q));
  }
  return out;
}

function buildFutureFallbacks() {
  const cats=['未来表現','未来の文'];
  const subjects=[['I','am','私は'],['You','are','あなたは'],['We','are','私たちは'],['They','are','彼らは'],['He','is','彼は'],['She','is','彼女は']];
  const acts=[['study English','英語を勉強する'],['read a book','本を読む'],['play in the park','公園で遊ぶ'],['cook at home','家で料理する'],['write','書く'],['sing','歌う'],['go home','家に帰る'],['meet my friend','友達に会う']];
  const out=[]; let n=1;
  for(const cat of cats) for(const [s,be,jps] of subjects) for(const [act,jpa] of acts){
    const stem=String(n++).padStart(3,'0');
    const will=s+' will '+act+'.';
    const going=s+' '+be+' going to '+act+'.';
    out.push(vocabFallbackItem('中2',cat,'空所補充','FUT-FILL-'+stem,s+' (      ) '+act+'. willを使う未来の文にしなさい。','will'));
    out.push(vocabFallbackItem('中2',cat,'英作文','FUT-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jps+jpa+'つもりです。』',going));
    out.push(vocabFallbackItem('中2',cat,'変形','FUT-NEG-'+stem,will+' を否定文にしなさい。',s+' will not '+act+'.'));
    out.push(vocabFallbackItem('中2',cat,'並びかえ','FUT-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+act+' / will / '+s+' )',will));
  }
  return out;
}

function buildPresentPerfectCompletionExperienceFallbacks() {
  const cat='現在完了形（完了・経験）';
  const subjects=[['I','have','私は'],['You','have','あなたは'],['We','have','私たちは'],['They','have','彼らは'],['He','has','彼は'],['She','has','彼女は']];
  const parts=[
    ['been to the park','公園へ行ったことがあります'],
    ['been to the city','その町へ行ったことがあります'],
    ['written a book','本を書いたことがあります'],
    ['read a book','本を読んだことがあります'],
    ['done it','それをしたことがあります'],
    ['gone home','家に帰ってしまいました']
  ];
  const out=[]; let n=1;
  for(const [s,aux,jps] of subjects) for(const [part,jp] of parts){
    const stem=String(n++).padStart(3,'0');
    const full=s+' '+aux+' '+part+'.';
    const neg=s+' '+aux+' not '+part+'.';
    const q=aux[0].toUpperCase()+aux.slice(1)+' '+s.toLowerCase()+' '+part+'?';
    out.push(vocabFallbackItem('中3',cat,'空所補充','PPE-FILL-'+stem,s+' (      ) '+part+'. 現在完了形になるように have または has を書きなさい。',aux));
    out.push(vocabFallbackItem('中3',cat,'英作文','PPE-WRITE-'+stem,'次の日本語に合う現在完了の英文を書きなさい。『'+jps+jp+'。』',full));
    out.push(vocabFallbackItem('中3',cat,'変形','PPE-Q-'+stem,full+' を疑問文にしなさい。',q));
    out.push(vocabFallbackItem('中3',cat,'間違い直し','PPE-FIX-'+stem,s+' '+aux+' not '+part+'. を肯定文に直しなさい。',full));
    out.push(vocabFallbackItem('中3',cat,'並びかえ','PPE-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+part+' / '+aux+' / '+s+' )',full));
  }
  return out;
}
`;

const newBuilders=['buildCombinedThereLookFallbacks()','buildQuestionWordFallbacks()','buildPresentProgressiveFallbacks()','buildFutureFallbacks()','buildPresentPerfectCompletionExperienceFallbacks()'];

function patch(path){
  let src=fs.readFileSync(path,'utf8');
  if(!src.includes('function buildCombinedThereLookFallbacks()')){
    const anchor='function vocabFallbackBank() {';
    const i=src.indexOf(anchor);
    if(i<0) throw new Error(`${path}: vocabFallbackBank anchor missing`);
    src=src.slice(0,i)+builders+'\n'+src.slice(i);
  }
  const m=/const all=([^;]+);/.exec(src.slice(src.indexOf('function vocabFallbackBank()')));
  if(!m) throw new Error(`${path}: fallback concat missing`);
  let expr=m[1];
  for(const b of newBuilders){
    if(!expr.includes(b)){
      const needle='buildGerundFallbacks(),buildConjunctionFallbacks()';
      if(!expr.includes(needle)) throw new Error(`${path}: concat insertion anchor missing`);
      expr=expr.replace(needle,b+','+needle);
    }
  }
  src=src.slice(0,src.indexOf('function vocabFallbackBank()'))+src.slice(src.indexOf('function vocabFallbackBank()')).replace(m[0],`const all=${expr};`);
  for(const required of ['function buildCombinedThereLookFallbacks()','function buildQuestionWordFallbacks()','function buildPresentProgressiveFallbacks()','function buildFutureFallbacks()','function buildPresentPerfectCompletionExperienceFallbacks()']) if(!src.includes(required)) throw new Error(`${path}: missing ${required}`);
  fs.writeFileSync(path,src);
}

patch(APP);
patch(INSTALLER);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({result:'PASS',files:[APP,INSTALLER],added_runtime_categories:['中1 there is ～・look ～ の文','中2 疑問詞','中2 進行形','中2 未来表現','中2 未来の文','中3 現在完了形（完了・経験）'],design:'generic category-level elementary-safe fallbacks; existing grammar chronology, lexical safety, quality gate, and per-category/type floor remain authoritative; no problem-ID, textbook, section, retention-threshold, or measured-count exception'},null,2)+'\n');
console.log('PASS: generic final common grammar fallbacks prepared');
