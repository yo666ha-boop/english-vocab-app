import fs from 'node:fs';

const PATH='problem-app/index.html';
let html=fs.readFileSync(PATH,'utf8');
const marker='VOCAB_SAFE_FALLBACK_V1';
if(html.includes(marker)){
  console.log('fallback already installed');
  process.exit(0);
}

function replaceOnce(needle,replacement,label){
  const i=html.indexOf(needle);
  if(i<0) throw new Error(`${label} anchor not found`);
  if(html.indexOf(needle,i+needle.length)>=0) throw new Error(`${label} anchor not unique`);
  html=html.slice(0,i)+replacement+html.slice(i+needle.length);
}

const fallbackCode=String.raw`
// ---- VOCAB_SAFE_FALLBACK_V1: deterministic elementary-safe grammar fallback ----
const VOCAB_FALLBACK_TARGET_PER_CATEGORY_TYPE = 30;
let _vocabFallbackBankCache = null;

const VOCAB_FALLBACK_SAFE_BASE = new Set("I you he she we they my your his her their it our am is are can do not yes no a the this that and but what who where when how I'm you're have like want know go come get give use eat drink sleep make take study read write speak listen look watch play cook sing swim run meet live help good bad big small new old long short hot cold nice cute happy school teacher student friend English Japanese name class club home city country family bag book pen notebook picture park room dog cat in on at to from with of for be was were been being does did done has had because if as than could may might must should will would shall more most less least there me him us them these those whose why about into over under after before between here please let TV".toLowerCase().split(/\s+/));
const VOCAB_FALLBACK_IRREGULAR = new Map(Object.entries({went:'go',gone:'go',came:'come',made:'make',took:'take',taken:'take',wrote:'write',written:'write',did:'do',done:'do',has:'have',had:'have',was:'be',were:'be'}));

function vocabFallbackTokenBases(token) {
  const t=String(token||'').toLowerCase();
  const out=new Set([t]);
  if(VOCAB_FALLBACK_IRREGULAR.has(t)) out.add(VOCAB_FALLBACK_IRREGULAR.get(t));
  if(t.length>4 && t.endsWith('ies')) out.add(t.slice(0,-3)+'y');
  if(t.length>3 && t.endsWith('es')) { out.add(t.slice(0,-2)); out.add(t.slice(0,-1)); }
  if(t.length>3 && t.endsWith('s') && !t.endsWith('ss')) out.add(t.slice(0,-1));
  if(t.length>4 && t.endsWith('ied')) out.add(t.slice(0,-3)+'y');
  if(t.length>3 && t.endsWith('ed')) { out.add(t.slice(0,-2)); out.add(t.slice(0,-1)); }
  if(t.length>4 && t.endsWith('ing')) { out.add(t.slice(0,-3)); out.add(t.slice(0,-3)+'e'); }
  for(const x of [...out]) if(x.length>3 && x.at(-1)===x.at(-2)) out.add(x.slice(0,-1));
  return [...out];
}

function vocabFallbackLexicallySafe(item) {
  const tokens=((String(item.q||'')+' '+String(item.a||'')).replace(/[’‘]/g,"'").match(/[A-Za-z]+(?:'[A-Za-z]+)?/g)||[]);
  return tokens.every(t => vocabFallbackTokenBases(t).some(base => VOCAB_FALLBACK_SAFE_BASE.has(base)));
}

function vocabFallbackItem(grade, category, type, code, q, a) {
  return { id:'VF-'+grade.replace('中','G')+'-'+code, subject:'英語', grade, category, type, mistake:'', cause:'語彙安全fallback', q, a, _vocabFallback:true };
}

function buildGerundFallbacks() {
  const subjects=[
    {en:'I',jp:'私は'}, {en:'You',jp:'あなたは'}, {en:'We',jp:'私たちは'}, {en:'They',jp:'彼らは'}
  ];
  const acts=[
    {base:'play with a dog',ger:'playing with a dog',jp:'犬と遊ぶこと'},
    {base:'read a book',ger:'reading a book',jp:'本を読むこと'},
    {base:'write',ger:'writing',jp:'書くこと'},
    {base:'sing',ger:'singing',jp:'歌うこと'},
    {base:'swim',ger:'swimming',jp:'泳ぐこと'},
    {base:'run in the park',ger:'running in the park',jp:'公園で走ること'},
    {base:'cook at home',ger:'cooking at home',jp:'家で料理すること'},
    {base:'study English',ger:'studying English',jp:'英語を勉強すること'},
    {base:'speak English',ger:'speaking English',jp:'英語を話すこと'},
    {base:'watch TV',ger:'watching TV',jp:'テレビを見ること'}
  ];
  const out=[]; let n=1;
  for(const s of subjects) for(const act of acts) {
    const stem=String(n++).padStart(3,'0');
    const full=s.en+' like '+act.ger+'.';
    const jp=s.jp+act.jp+'が好きです。';
    out.push(vocabFallbackItem('中2','動名詞','空所補充','GER-FILL-'+stem,s.en+' like (      ).',act.ger));
    out.push(vocabFallbackItem('中2','動名詞','英作文','GER-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jp+'』',full));
    out.push(vocabFallbackItem('中2','動名詞','変形','GER-CHANGE-'+stem,full+' を否定文にしなさい。',s.en+' do not like '+act.ger+'.'));
    out.push(vocabFallbackItem('中2','動名詞','間違い直し','GER-FIX-'+stem,s.en+' like '+act.base+'. の誤りを直しなさい。',full));
  }
  return out;
}


function buildBePresentFallbacks() {
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


function buildPatternOneFallbacks() {
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
    out.push(vocabFallbackItem('中2','文型①','空所補充','PAT1-LOOK-FILL-'+stem,s+' (      ) '+c+'. 「～に見える」の意味になるように動詞を書きなさい。',(s==='He'||s==='She'||s==='It')?'looks':'look'));
    out.push(vocabFallbackItem('中2','文型①','英作文','PAT1-LOOK-WRITE-'+stem,'「'+s+'は'+c+'に見えます。」の意味になる英文を書きなさい。',full));
    out.push(vocabFallbackItem('中2','文型①','間違い直し','PAT1-LOOK-FIX-'+stem,s+' is look '+c+'. の誤りを直しなさい。',full));
  }
  for(const [s,p,o] of giveRows){
    const stem=String(n++).padStart(3,'0');
    const verb=(s==='He'||s==='She')?'gives':'give';
    const full=s+' '+verb+' '+p+' '+o+'.';
    out.push(vocabFallbackItem('中2','文型①','空所補充','PAT1-GIVE-FILL-'+stem,s+' (      ) '+p+' '+o+'. 「人に物を与える」の意味になるように動詞を書きなさい。',verb));
    out.push(vocabFallbackItem('中2','文型①','英作文','PAT1-GIVE-WRITE-'+stem,'「'+s+'は'+p+'に'+o+'を与えます。」の意味になる英文を書きなさい。',full));
    out.push(vocabFallbackItem('中2','文型①','並びかえ','PAT1-GIVE-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+o+' / '+p+' / '+verb+' / '+s+' )',full));
  }
  return out;
}

function buildConjunctionFallbacks() {
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
  scenarios.forEach((sc,i)=>{
    const stem=String(i+1).padStart(3,'0');
    const blank=sc.en.replace(new RegExp('\\b'+sc.conj+'\\b','i'),'(      )');
    const select=sc.en.replace(new RegExp('\\b'+sc.conj+'\\b','i'),'( because / if / when )');
    const wrong=sc.conj==='because'?'if':(sc.conj==='if'?'because':'if');
    const wrongSentence=sc.en.replace(new RegExp('\\b'+sc.conj+'\\b','i'),m=>m[0]===m[0].toUpperCase()?wrong[0].toUpperCase()+wrong.slice(1):wrong);
    const clean=sc.en.replace(/[.,]/g,'').split(/\s+/);
    const shift=(i%Math.max(1,clean.length-1))+1;
    const scrambled=clean.slice(shift).concat(clean.slice(0,shift)).join(' / ');
    out.push(vocabFallbackItem('中3','接続詞','空所補充','CONJ-FILL-'+stem,blank+' 「'+sc.hint+'」に合う接続詞を書きなさい。',sc.conj));
    out.push(vocabFallbackItem('中3','接続詞','選択','CONJ-CHOICE-'+stem,select+' 正しい接続詞を選びなさい。',sc.conj));
    out.push(vocabFallbackItem('中3','接続詞','英作文','CONJ-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+sc.jp+'』',sc.en));
    out.push(vocabFallbackItem('中3','接続詞','間違い直し','CONJ-FIX-'+stem,wrongSentence+' を『'+sc.jp+'』の意味になるように直しなさい。',sc.en));
    out.push(vocabFallbackItem('中3','接続詞','読解','CONJ-READ-'+stem,sc.en+' 問い：この文の内容を日本語で書きなさい。',sc.jp));
    out.push(vocabFallbackItem('中3','接続詞','並びかえ','CONJ-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+scrambled+' )',sc.en));
  });
  return out;
}

function vocabFallbackBank() {
  if(_vocabFallbackBankCache) return _vocabFallbackBankCache;
  const all=buildBePresentFallbacks().concat(buildPastProgressiveFallbacks(),buildBePastFallbacks(),buildWordOrderFallbacks(),buildImperativeFallbacks(),buildPresentVerbFallbacks(),buildPatternOneFallbacks(),buildGerundFallbacks(),buildConjunctionFallbacks());
  const seen=new Set();
  _vocabFallbackBankCache=all.filter(item=>{
    const k=item.id+'\\n'+item.q+'\\n'+item.a;
    if(seen.has(k)) return false;
    seen.add(k);
    return vocabFallbackLexicallySafe(item) && passesQualityGate(item);
  });
  return _vocabFallbackBankCache;
}

function appendVocabFallbacks(originals, categories, types, overrideMode) {
  const mode=overrideMode || (useVocabGate() ? 'on' : 'off');
  if(currentSubject()!=='英語' || mode==='off') return originals;
  const grade=currentGrade();
  const selectedCategorySet=new Set(categories||[]);
  const selectedTypeSet=new Set(types||[]);
  const counts=new Map();
  const seenText=new Set();
  for(const item of originals) {
    const key=item.category+'\\u0000'+item.type;
    counts.set(key,(counts.get(key)||0)+1);
    seenText.add(String(item.q||'')+'\\u0000'+String(item.a||''));
  }
  const extras=[];
  for(const item of vocabFallbackBank()) {
    if(item.grade!==grade) continue;
    if(selectedCategorySet.size && !selectedCategorySet.has(item.category)) continue;
    if(selectedTypeSet.size && !selectedTypeSet.has(item.type)) continue;
    if(!passesPrereqGrammar(item) || !passesQualityGate(item) || !vocabFallbackLexicallySafe(item)) continue;
    const key=item.category+'\\u0000'+item.type;
    if((counts.get(key)||0)>=VOCAB_FALLBACK_TARGET_PER_CATEGORY_TYPE) continue;
    const textKey=String(item.q||'')+'\\u0000'+String(item.a||'');
    if(seenText.has(textKey)) continue;
    seenText.add(textKey);
    counts.set(key,(counts.get(key)||0)+1);
    extras.push(item);
  }
  return originals.concat(extras);
}
// ---- END VOCAB_SAFE_FALLBACK_V1 ----

`;

const baseStart=html.indexOf('function baseFiltered(overrideMode) {');
const baseEnd=html.indexOf('\n}\n\nfunction shuffle',baseStart);
if(baseStart<0||baseEnd<0) throw new Error('baseFiltered function bounds not found');
html=html.slice(0,baseStart)+fallbackCode+String.raw`function baseFiltered(overrideMode) {
  const subj = currentSubject();
  const grade = currentGrade();
  const categories = selectedCategories();
  const types = selectedValues('input[data-type]');
  const originals = qb.filter(item => {
    if (item.subject !== subj) return false;
    if (item.grade !== grade) return false;
    if (categories.length && !categories.includes(item.category)) return false;
    if (types.length && !types.includes(item.type)) return false;
    if (!passesVocab(item, overrideMode)) return false;
    if (!passesPrereqGrammar(item)) return false;
    if (!passesQualityGate(item)) return false;
    return true;
  });
  return appendVocabFallbacks(originals, categories, types, overrideMode);
}`+html.slice(baseEnd+2);

replaceOnce("function passesVocab(item, overrideMode) {\n  if (item.subject !== '英語') return true;","function passesVocab(item, overrideMode) {\n  if (item.subject !== '英語') return true;\n  if (item._vocabFallback === true) return true;",'passesVocab');

replaceOnce("  if (/Did You ne\\b|Do You\\b|Do They\\b|Does She\\b|Does He\\b/.test(both)) return false;","  if (/Did You ne\\b|Do You\\b|Do They\\b|Does She\\b|Does He\\b/.test(both)) return false;\n  if (/\\b(?:You|We|They)\\s+was\\b/i.test(both)) return false;\n  if (/\\b(?:I|He|She|It)\\s+were\\b/i.test(both)) return false;",'agreement quality gate');

replaceOnce("  const map = new Map(qb.map(q => [q.id, q]));","  const map = new Map(qb.concat(vocabFallbackBank()).map(q => [q.id, q]));",'restore map');

replaceOnce("  let rows = qb.filter(item => {","  const listSource = (vocabMode === 'on' && subj === '英語') ? qb.concat(vocabFallbackBank()) : qb;\n  let rows = listSource.filter(item => {",'list source');

fs.writeFileSync(PATH,html);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/VOCAB_SAFE_FALLBACK_INSTALL_RESULT.json',JSON.stringify({
  installedAt:new Date().toISOString(),marker,targetPerCategoryType:30,htmlBytes:Buffer.byteLength(html),fallbackDesign:{gerundGrade:'中2',conjunctionGrade:'中3',idHardcode:false,elementarySourceWords:104}
},null,2)+'\n');
console.log(JSON.stringify({installed:true,bytes:Buffer.byteLength(html)},null,2));
