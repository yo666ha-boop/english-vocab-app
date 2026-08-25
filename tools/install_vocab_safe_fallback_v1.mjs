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

const VOCAB_FALLBACK_SAFE_BASE = new Set(String.raw\`I you he she we they my your his her their it our am is are can do not yes no a the this that and but what who where when how I'm you're have like want know go come get use eat drink sleep make take study read write speak listen look watch play cook sing swim run meet live help good bad big small new old long short hot cold nice cute school teacher student friend English Japanese name class club home city country family bag book pen notebook picture park room dog cat in on at to from with of for be was were been being does did done has had because if as than could may might must should will would shall more most less least there me him us them these those whose why about into over under after before between here please let TV\`.toLowerCase().split(/\s+/));
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
    {base:'write my name',ger:'writing my name',jp:'自分の名前を書くこと'},
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
  const all=buildGerundFallbacks().concat(buildConjunctionFallbacks());
  const seen=new Set();
  _vocabFallbackBankCache=all.filter(item=>{
    const k=item.id+'\\n'+item.q+'\\n'+item.a;
    if(seen.has(k)) return false;
    seen.add(k);
    return vocabFallbackLexicallySafe(item) && passesPrereqGrammar(item) && passesQualityGate(item);
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
