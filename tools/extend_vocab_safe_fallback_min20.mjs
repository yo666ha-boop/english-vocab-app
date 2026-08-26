import fs from 'node:fs';

const files=['problem-app/index.html','tools/install_vocab_safe_fallback_v1.mjs'];
const marker='VOCAB_MIN20_SUPPLY_V1';
const builders=String.raw`
// ---- VOCAB_MIN20_SUPPLY_V1: generic grade-2 safe supply for learned categories ----
function buildGrade2ImperativeFallbacks() {
  const rows=[
    ['read a book','本を読みなさい。'],['write your name','名前を書きなさい。'],['study English','英語を勉強しなさい。'],
    ['listen','聞きなさい。'],['look here','ここを見なさい。'],['come here','ここへ来なさい。'],['go home','家へ行きなさい。'],
    ['play','遊びなさい。'],['sing','歌いなさい。'],['swim','泳ぎなさい。'],['run','走りなさい。'],['cook','料理しなさい。']
  ];
  const out=[];
  rows.forEach((r,i)=>{
    const stem=String(i+1).padStart(3,'0');
    const cmd=r[0][0].toUpperCase()+r[0].slice(1)+'.';
    out.push(vocabFallbackItem('中2','命令文','英作文','G2-IMP-WRITE-'+stem,'『'+r[1]+'』を英語で書きなさい。',cmd));
    out.push(vocabFallbackItem('中2','命令文','選択','G2-IMP-CHOICE-'+stem,'命令文として正しいものを ( '+cmd+' / You '+cmd+' ) から選びなさい。',cmd));
    out.push(vocabFallbackItem('中2','命令文','間違い直し','G2-IMP-FIX-'+stem,'You '+cmd+' の誤りを直しなさい。',cmd));
  });
  return out;
}

function buildGrade2PronounFallbacks() {
  const rows=[
    {sub:'I',obj:'me',poss:'my',be:'am',pred:'a student',wrong:'him'},
    {sub:'you',obj:'you',poss:'your',be:'are',pred:'my friend',wrong:'me'},
    {sub:'he',obj:'him',poss:'his',be:'is',pred:'my friend',wrong:'her'},
    {sub:'she',obj:'her',poss:'her',be:'is',pred:'my friend',wrong:'him'},
    {sub:'we',obj:'us',poss:'our',be:'are',pred:'friends',wrong:'them'},
    {sub:'they',obj:'them',poss:'their',be:'are',pred:'friends',wrong:'us'}
  ];
  const out=[]; let n=1;
  for(const r of rows){
    const stem=String(n++).padStart(3,'0');
    const cap=r.sub[0].toUpperCase()+r.sub.slice(1);
    out.push(vocabFallbackItem('中2','人称代名詞','選択','G2-PRON-SUB-'+stem,'( '+r.sub+' / '+r.obj+' / '+r.poss+' ) '+r.be+' '+r.pred+'. 正しい代名詞を選びなさい。',cap));
    out.push(vocabFallbackItem('中2','人称代名詞','空所補充','G2-PRON-OBJ-'+stem,cap+' is my friend. I often talk with (      ).',r.obj));
    out.push(vocabFallbackItem('中2','人称代名詞','選択','G2-PRON-POSS-'+stem,'This is ( '+r.poss+' / '+r.obj+' / '+r.sub+' ) book. 正しい代名詞を選びなさい。',r.poss));
    out.push(vocabFallbackItem('中2','人称代名詞','間違い直し','G2-PRON-FIX-'+stem,cap+' is my friend. I often talk with '+r.wrong+'. 2文目の代名詞の誤りを直しなさい。',cap+' is my friend. I often talk with '+r.obj+'.'));
  }
  return out;
}

function buildGrade2Infinitive2Fallbacks() {
  const subjects=[['I','am','私は'],['You','are','あなたは'],['He','is','彼は'],['She','is','彼女は'],['We','are','私たちは'],['They','are','彼らは']];
  const actions=[['meet you','あなたに会えて'],['read this book','この本を読めて'],['study English','英語を勉強できて'],['play in the park','公園で遊べて'],['cook at home','家で料理できて'],['write','書けて'],['sing','歌えて'],['swim','泳げて']];
  const out=[]; let n=1;
  for(const [s,be,jps] of subjects) for(const [act,jpa] of actions){
    const stem=String(n++).padStart(3,'0');
    const full=s+' '+be+' happy to '+act+'.';
    out.push(vocabFallbackItem('中2','不定詞②','空所補充','G2-INF2-FILL-'+stem,s+' '+be+' happy (      ) '+act+'. 不定詞になるように書きなさい。','to'));
    out.push(vocabFallbackItem('中2','不定詞②','英作文','G2-INF2-WRITE-'+stem,'次の日本語に合う英文を書きなさい。『'+jps+jpa+'うれしいです。』',full));
    out.push(vocabFallbackItem('中2','不定詞②','並びかえ','G2-INF2-ORDER-'+stem,'次の語(句)を正しい順に並べかえなさい。 ( '+act+' / to / happy / '+be+' / '+s+' )',full));
    out.push(vocabFallbackItem('中2','不定詞②','間違い直し','G2-INF2-FIX-'+stem,s+' '+be+' happy '+act+'. の誤りを直しなさい。',full));
  }
  return out;
}
// ---- END VOCAB_MIN20_SUPPLY_V1 ----

`;

for(const path of files){
  let text=fs.readFileSync(path,'utf8');
  if(text.includes(marker)){ console.log(path+': already patched'); continue; }
  const bank='function vocabFallbackBank() {';
  const idx=text.indexOf(bank);
  if(idx<0 || text.indexOf(bank,idx+1)>=0) throw new Error(path+': vocabFallbackBank anchor missing/nonunique');
  text=text.slice(0,idx)+builders+text.slice(idx);
  const old='const all=buildBePresentFallbacks().concat(';
  const replacement='const all=buildBePresentFallbacks().concat(buildGrade2ImperativeFallbacks(),buildGrade2PronounFallbacks(),buildGrade2Infinitive2Fallbacks(),';
  const j=text.indexOf(old);
  if(j<0 || text.indexOf(old,j+1)>=0) throw new Error(path+': concat anchor missing/nonunique');
  text=text.slice(0,j)+replacement+text.slice(j+old.length);
  fs.writeFileSync(path,text);
  console.log(path+': patched');
}
