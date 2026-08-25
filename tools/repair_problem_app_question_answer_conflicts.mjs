import fs from 'node:fs';

const APP='problem-app/index.html';
const OUT='audit/PROBLEM_APP_QUESTION_CONFLICT_REPAIR.json';
let html=fs.readFileSync(APP,'utf8');
const re=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i;
const m=re.exec(html);if(!m)throw new Error('qb-data missing');
const qb=JSON.parse(m[1]);
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const low=s=>norm(s).toLowerCase();
const midSubject=s=>s==='I'?'I':s.toLowerCase();
const actionJa=new Map(Object.entries({
  'visit my grandmother':'祖母を訪ねる','visit your grandmother':'祖母を訪ねる','visit our grandmother':'祖母を訪ねる','visit their grandmother':'祖母を訪ねる',
  'play soccer':'サッカーをする','study science':'理科を勉強する','watch a movie':'映画を見る','clean my room':'自分の部屋を掃除する','clean your room':'自分の部屋を掃除する','clean our room':'自分たちの部屋を掃除する','clean their room':'自分たちの部屋を掃除する','practice tennis':'テニスを練習する','go shopping':'買い物に行く','help my father':'父を手伝う','help your father':'父を手伝う','help our father':'父を手伝う','help their father':'父を手伝う',
  'practice basketball':'バスケットボールを練習する','study math':'数学を勉強する','use the internet':'インターネットを使う','play the guitar':'ギターを弾く','read english books':'英語の本を読む','play tennis':'テニスをする','help at home':'家で手伝う','cook curry':'カレーを作る','join the tennis club':'テニス部に入る'
}));
const pastPhrase=new Map(Object.entries({'went to the park':'go to the park','saw a movie':'see a movie','ate breakfast':'eat breakfast','came to my house':'come to my house','came to our house':'come to our house','had a test':'have a test','did my homework':'do my homework','did our homework':'do our homework','got up at six':'get up at six','made a cake':'make a cake'}));
const changed=[];
function set(item,field,value,reason){if(item[field]===value)return;changed.push({id:item.id,field,reason,before:item[field],after:value});item[field]=value;}

for(const item of qb){
  if(item?.subject!=='英語')continue;
  const q=norm(item.q),a=norm(item.a);

  // Ambiguous future fill-ins: retain the intended answer but add a semantic cue.
  if(item.grade==='中2'&&item.category==='未来表現'&&item.type==='空所補充'&&/\bgoing to \(\s*\) next Sunday\.$/i.test(q)){
    const jp=actionJa.get(low(a));
    if(jp)set(item,'q',q+` 「${jp}」の意味になるように、空所に入る語句を書きなさい。`,'disambiguate_future_fill_by_meaning');
  }

  // Ambiguous simple-present fill-ins: add the intended Japanese meaning.
  if(item.grade==='中2'&&item.category==='一般動詞'&&item.type==='空所補充'&&/^(I|You|We|They) \(\s*\) every day\.$/.test(q)){
    const jp=actionJa.get(low(a));
    if(jp)set(item,'q',q+` 「毎日${jp}」の意味になるように、空所に入る語句を書きなさい。`,'disambiguate_present_fill_by_meaning');
  }

  // Underspecified be-going-to construction prompts: state the intended action.
  if(item.grade==='中2'&&item.category==='未来表現'&&item.type==='変形'&&/を主語にして、be going to を使った正しい英文を書きなさい。$/.test(q)){
    const mm=/\bgoing to (.+)\.$/i.exec(a);const jp=mm?actionJa.get(low(mm[1])):null;
    if(jp){const s=q.split(' を主語にして')[0];set(item,'q',`${s} を主語にして、be going to を使い、「${jp}つもりです」の意味の英文を書きなさい。`,'disambiguate_future_construction_by_meaning');}
  }

  // Sentence transformation means keep the sentence subject/person; do not silently switch I/we to you.
  if(item.type==='変形'&&/を疑問文にしなさい。$/.test(q)){
    const src=q.replace(/ を疑問文にしなさい。$/,'');
    let mm=/^(I|You|He|She|We|They|It) (am|is|are) (.+)\.$/.exec(src);
    if(mm){const [,s,be,rest]=mm;set(item,'a',be[0].toUpperCase()+be.slice(1)+' '+midSubject(s)+' '+rest+'?','canonical_be_question_keep_subject');continue;}
    if(['一般動詞','be動詞と一般動詞（現在形）'].includes(item.category)){
      mm=/^(I|You|We|They) (.+)\.$/.exec(src);
      if(mm){const [,s,pred]=mm;set(item,'a','Do '+midSubject(s)+' '+pred+'?','canonical_present_question_keep_subject');continue;}
    }
    if(['過去の疑問文・否定文','不規則動詞'].includes(item.category)){
      mm=/^(I|You|We|They) (.+) yesterday\.$/.exec(src);
      if(mm){const [,s,past]=mm;const base=pastPhrase.get(low(past));if(base)set(item,'a','Did '+midSubject(s)+' '+base+' yesterday?','canonical_past_question_keep_subject_and_base_form');}
    }
  }

  // Third-person correction must correct the sentence actually shown.
  if(item.type==='間違い直し'&&item.category==='三単現'){
    const mm=/^(He|She) play tennis every day\. の誤りを直しなさい。$/i.exec(q);
    if(mm){const s=mm[1][0].toUpperCase()+mm[1].slice(1).toLowerCase();set(item,'a',s+' plays tennis every day.','repair_third_person_answer_to_shown_sentence');}
  }

  // Japanese source is singular, so the English answer must also be singular.
  if(q==='『その花は美しく見えます。』を英語で書きなさい。')set(item,'a','The flower looks beautiful.','repair_singular_flower_number_agreement');

  // Both conjunction word orders are valid; make each prompt explicit so the key is deterministic.
  if(q==='『雨だったので、彼女は家にいました。』を英語で書きなさい。'){
    if(/^Because\b/.test(a))set(item,'q',q.replace(/。$/,'。Because で文を始めなさい。'),'disambiguate_valid_conjunction_order');
    else set(item,'q',q.replace(/。$/,'。because を文の後半に置きなさい。'),'disambiguate_valid_conjunction_order');
  }

  // "saw" and "watched" can both translate 映画を見た; specify the target verb by grammar category.
  if(/次の日本語に合う英文を書きなさい。『(?:あなたは|彼らは|私たちは|私は) 昨日 映画を見ました。』/.test(q)){
    if(item.category==='不規則動詞')set(item,'q',q+' see の過去形を使いなさい。','disambiguate_movie_verb_by_grammar_target');
    else if(item.category==='一般動詞の過去形')set(item,'q',q+' watch の過去形を使いなさい。','disambiguate_movie_verb_by_grammar_target');
  }
}

const english=qb.filter(x=>x?.subject==='英語');
const byQ=new Map();for(const x of english){const k=low(x.q),arr=byQ.get(k)||[];arr.push(x);byQ.set(k,arr);}
const conflicts=[];for(const [q,items] of byQ){const answers=[...new Set(items.map(x=>low(x.a)))];if(answers.length>1)conflicts.push({q,count:items.length,answers:items.map(x=>x.a).filter((v,i,a)=>a.indexOf(v)===i),samples:items.slice(0,12).map(x=>({id:x.id,category:x.category,type:x.type,a:x.a}))});}
conflicts.sort((a,b)=>b.count-a.count||a.q.localeCompare(b.q));

const replacement=m[0].replace(m[1],JSON.stringify(qb));
html=html.slice(0,m.index)+replacement+html.slice(m.index+m[0].length);
fs.writeFileSync(APP,html);
fs.mkdirSync('audit',{recursive:true});
const out={generated_at:new Date().toISOString(),result:conflicts.length?'REVIEW':'PASS',changed_fields:changed.length,changed_items:new Set(changed.map(x=>x.id)).size,changes_by_reason:Object.fromEntries([...new Set(changed.map(x=>x.reason))].map(r=>[r,changed.filter(x=>x.reason===r).length])),remaining_normalized_question_conflicts:conflicts.length,remaining_conflicts:conflicts.slice(0,100),sample_changes:changed.slice(0,100),policy:'Generic question/answer-template repair by grammar form, displayed source sentence, answer meaning, and category. No problem-ID whitelist; valid alternate phrasings are disambiguated in the prompt rather than declared wrong.'};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({result:out.result,changed_fields:out.changed_fields,changed_items:out.changed_items,changes_by_reason:out.changes_by_reason,remaining_conflicts:conflicts.length,remaining:conflicts.slice(0,20)},null,2));
if(conflicts.length)process.exitCode=2;
