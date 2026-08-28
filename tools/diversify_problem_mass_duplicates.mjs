import fs from 'node:fs';

const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_MASS_DUPLICATE_DIVERSIFICATION.json';
let html=fs.readFileSync(HTML,'utf8');
const re=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i;
const m=re.exec(html);if(!m)throw new Error('qb-data not found');
const all=JSON.parse(m[1]);
const rows=all.filter(x=>x?.subject==='英語');
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const qaKey=x=>norm(x.q)+'\u0000'+norm(x.a);
const family=x=>`${x.grade}/${x.category}/${x.type}`;
const byKey=new Map();
for(const x of rows){const k=qaKey(x);const a=byKey.get(k)||[];a.push(x);byKey.set(k,a);}
const massKeys=new Set([...byKey.entries()].filter(([,a])=>a.length>=10).map(([k])=>k));
const targetRows=rows.filter(x=>massKeys.has(qaKey(x)));
const counts={};
for(const x of targetRows)counts[family(x)]=(counts[family(x)]||0)+1;

const names=[
  ['Tom','彼','he'],['Ken','彼','he'],['Mike','彼','he'],['Bob','彼','he'],['John','彼','he'],['Emi','彼女','she'],['Yuki','彼女','she'],['Aya','彼女','she'],['Lucy','彼女','she'],['Mary','彼女','she'],['Ann','彼女','she'],['Kate','彼女','she']
];
const simpleActions=[
  ['study English','英語を勉強する'],['read this book','この本を読む'],['help my friend','友達を手伝う'],['clean the room','部屋を掃除する'],['practice tennis','テニスを練習する'],['visit Kyoto','京都を訪れる'],['use this computer','このコンピューターを使う'],['write a letter','手紙を書く'],['make dinner','夕食を作る'],['go to the library','図書館へ行く'],['take a picture','写真を撮る'],['buy this book','この本を買う'],['play soccer','サッカーをする'],['listen to music','音楽を聞く'],['watch this movie','この映画を見る'],['talk with my teacher','先生と話す'],['open the window','窓を開ける'],['close the door','ドアを閉める'],['answer the question','その質問に答える'],['finish my homework','宿題を終える']
];
const items=[
  ['book','本','read','読む'],['letter','手紙','write','書く'],['picture','写真','show','見せる'],['question','質問','answer','答える'],['computer','コンピューター','use','使う'],['room','部屋','clean','掃除する'],['song','歌','sing','歌う'],['movie','映画','watch','見る'],['bike','自転車','use','使う'],['bag','かばん','carry','運ぶ'],['desk','机','clean','掃除する'],['window','窓','open','開ける'],['door','ドア','close','閉める'],['cake','ケーキ','make','作る'],['game','ゲーム','play','する'],['story','物語','read','読む'],['email','メール','write','書く'],['map','地図','use','使う'],['box','箱','open','開ける'],['homework','宿題','finish','終える']
];
const places=[['Kyoto','京都'],['Osaka','大阪'],['Tokyo','東京'],['Nara','奈良'],['the library','図書館'],['the museum','博物館'],['the park','公園'],['the zoo','動物園']];
const activities=[['study English','英語を勉強する'],['play tennis','テニスをする'],['play soccer','サッカーをする'],['read books','本を読む'],['practice the piano','ピアノを練習する'],['use this computer','このコンピューターを使う'],['clean the room','部屋を掃除する'],['wait for the bus','バスを待つ']];
const durations=['for two hours','for three hours','since this morning','since Monday','for a week','since April','for thirty minutes','since five o’clock'];
function pick(a,i){return a[i%a.length];}
function cap(s){return s[0].toUpperCase()+s.slice(1);}
function words(s){return s.replace(/[.,?]/g,'').split(/\s+/).filter(Boolean);}
function scramble(s){const w=words(s);const order=[];for(let j=0;j<w.length;j+=2)order.push(w[j]);for(let j=1;j<w.length;j+=2)order.push(w[j]);return order;}
function reorderQ(sentence){return `次の語(句)を正しい順に並べかえなさい。 ( ${scramble(sentence).join(' / ')} )`;}
function presentPerfectTransform(i){
  const [name,,pron]=pick(names,i);const plural=i%4===3;const s=plural?'They':name;const p=plural?'they':pron;
  const acts=['visited Kyoto twice','finished the homework','lost the key','seen this movie before','been to Osaka once','read this book before','cleaned the room already','used this computer before','met Mr. Brown before','written the letter already'];
  const pred=acts[Math.floor(i/names.length)%acts.length];const aux=plural?'have':'has';const qaux=plural?'Have':'Has';
  return {q:`${s} ${aux} ${pred}. を疑問文にしなさい。`,a:`${qaux} ${plural?p:s} ${pred}?`};
}
function presentPerfectContinuousTransform(i){
  const [name,,pron]=pick(names,i);const plural=i%5===4;const s=plural?'They':name;const p=plural?'they':pron;const [act]=pick(activities,Math.floor(i/names.length));const dur=pick(durations,i);
  const aux=plural?'have':'has';const qaux=plural?'Have':'Has';
  return {q:`${s} ${aux} been ${act.replace(/^study /,'studying ').replace(/^play /,'playing ').replace(/^read /,'reading ').replace(/^practice /,'practicing ').replace(/^use /,'using ').replace(/^clean /,'cleaning ').replace(/^wait /,'waiting ')} ${dur}. を疑問文にしなさい。`,a:`${qaux} ${plural?p:s} been ${act.replace(/^study /,'studying ').replace(/^play /,'playing ').replace(/^read /,'reading ').replace(/^practice /,'practicing ').replace(/^use /,'using ').replace(/^clean /,'cleaning ').replace(/^wait /,'waiting ')} ${dur}?`};
}
function m3Builder(f,i){
  const [name,jpPerson,pron]=pick(names,i);const [enAct,jpAct]=pick(simpleActions,i);const item=pick(items,i);const place=pick(places,i);
  switch(f){
    case '中3/不定詞①，動名詞/並びかえ': {const sentences=['This book is easy to read.','This question is easy to answer.','This bag is too heavy to carry.','English is fun to learn.','This computer is easy to use.','This picture is nice to see.','This room is easy to clean.','This story is interesting to read.'];const s=sentences[i%sentences.length].replace('This ',i>=8?'That ':'This ');return {q:reorderQ(s),a:s};}
    case '中3/不定詞①，動名詞/選択': {const pairs=[['finished','reading','read','this book'],['enjoyed','playing','play','tennis'],['finished','writing','write','the letter'],['enjoyed','listening','listen','to music'],['finished','cleaning','clean','the room'],['enjoyed','watching','watch','the movie']];const p=pick(pairs,i);return {q:`${name} ${p[0]} ( to ${p[2]} / ${p[1]} / ${p[2]} ) ${p[3]}. 正しいものを選びなさい。`,a:cap(p[1])};}
    case '中3/不定詞②/並びかえ': {const s=`I have a ${item[0]} to ${item[2]}.`;return {q:reorderQ(s),a:s};}
    case '中3/不定詞②/空所補充': return {q:`I have a ${item[0]} (      ) ${item[2]}. 「${item[3]}ための${item[1]}」になるように、空所に入る最も適切な語を書きなさい。`,a:'to'};
    case '中3/不定詞②/英作文': return {q:`次の日本語に合う英文を書きなさい。『私は${jpAct}ために${place[1]}へ行きました。』`,a:`I went to ${place[0]} to ${enAct}.`};
    case '中3/不定詞②/読解': return {q:`${name} went to ${place[0]} to ${enAct}. 問い：この文の意味として最も適切なものを書きなさい。`,a:`${name}は${jpAct}ために${place[1]}へ行きました。`};
    case '中3/不定詞②/選択': return {q:`I have a ${item[0]} to ${item[2]}. の to ${item[2]} のはたらきとして最も適切なものを選びなさい。 (A) 名詞を説明する (B) 理由を表す (C) 結果を表す`,a:'A'};
    case '中3/人称代名詞/空所補充': {const p=[['mine','私のもの'],['yours','あなたのもの'],['his','彼のもの'],['hers','彼女のもの'],['ours','私たちのもの'],['theirs','彼らのもの']][i%6];return {q:`This ${item[0]} is not mine. It is (      ). 「${p[1]}」になるように、空所に入る最も適切な語を書きなさい。`,a:cap(p[0])};}
    case '中3/人称代名詞/選択': {const qs=[['( He / Him / His ) teaches us English.','He'],['I know ( he / him / his ) well.','Him'],['This is ( he / him / his ) book.','His'],['( She / Her / Hers ) plays tennis.','She'],['I talked with ( she / her / hers ).','Her'],['This bag is ( her / hers / she ).','Hers']];const p=pick(qs,i);return {q:`${p[0]} 正しいものを選びなさい。`,a:p[1]};}
    case '中3/仮定法/並びかえ': {const s=`If I had more time, I would ${enAct}.`;return {q:reorderQ(s),a:s};}
    case '中3/仮定法/空所補充': return {q:`If I (      ) you, I would ${enAct}. 空所に入る最も適切な語を書きなさい。`,a:'were'};
    case '中3/仮定法/英作文': {const p=[['鳥','a bird','空を飛べる','fly in the sky'],['魚','a fish','海を泳げる','swim in the sea'],['先生','a teacher','生徒を助ける','help students'],['猫','a cat','高く跳べる','jump high'],['犬','a dog','速く走れる','run fast']][i%5];return {q:`次の日本語に合う英文を書きなさい。『もし私が${p[0]}なら、${p[2]}のに。』`,a:`If I were ${p[1]}, I could ${p[3]}.`};}
    case '中3/仮定法/読解': return {q:`If I had more time, I would ${enAct}. 問い：この文の意味として最も適切なものを書きなさい。`,a:`もしもっと時間があれば、私は${jpAct}のに。`};
    case '中3/仮定法/選択': return {q:`If ${name} had more time, ${pron} ( will / would / can ) ${enAct}. 正しいものを選びなさい。`,a:'Would'};
    case '中3/仮定法/間違い直し': {const wrong=i%2?'was':'am';return {q:`If I ${wrong} you, I would ${enAct}. の誤りを直しなさい。`,a:`If I were you, I would ${enAct}.`};}
    case '中3/分詞と間接疑問文/空所補充': {if(i%2===0){const verbs=[['play','playing'],['sing','singing'],['run','running'],['read','reading'],['study','studying']];const v=pick(verbs,i/2);return {q:`The ${i%4===0?'boy':'girl'} (      ) in the park is my friend. (${v[0]}) の（ ）内を正しくしなさい。`,a:cap(v[1])};}const wh=[['where','どこに住んでいるか'],['what','何がほしいか'],['when','いつ来るか'],['why','なぜ忙しいか'],['how','どのように行くか']][Math.floor(i/2)%5];return {q:`Do you know (      ) ${pron} ${wh[0]==='where'?'lives':wh[0]==='what'?'wants':wh[0]==='when'?'will come':wh[0]==='why'?'is busy':'goes there'}? 「${jpPerson}が${wh[1]}」になるように、空所に入る最も適切な語を書きなさい。`,a:cap(wh[0])};}
    case '中3/分詞と間接疑問文/英作文': {if(i%2===0)return {q:`次の日本語に合う英文を書きなさい。『公園で${i%4===0?'走っている少年':'歌っている少女'}は私の友達です。』`,a:i%4===0?'The boy running in the park is my friend.':'The girl singing in the park is my friend.'};const wh=[['what','何をほしいのか','wants'],['where','どこに住んでいるのか','lives'],['why','なぜ忙しいのか','is busy'],['when','いつ来るのか','will come']][Math.floor(i/2)%4];return {q:`次の日本語に合う英文を書きなさい。『私は${jpPerson}が${wh[1]}わかりません。』`,a:`I don't know ${wh[0]} ${pron} ${wh[2]}.`};}
    case '中3/分詞と間接疑問文/選択': {const wh=['where','what','when','why'];const w=pick(wh,i);return {q:`I don't know (A) ${w} does ${pron} ${w==='where'?'live':w==='what'?'want':w==='when'?'come':'study English'} (B) ${w} ${pron} ${w==='where'?'lives':w==='what'?'wants':w==='when'?'comes':'studies English'} (C) ${pron} ${w}. 正しいものを選びなさい。`,a:'B'};}
    case '中3/分詞と間接疑問文/間違い直し': {const wh=['where','what','when','why'];const w=pick(wh,i);const base=w==='where'?'live':w==='what'?'want':w==='when'?'come':'study English';const third=w==='where'?'lives':w==='what'?'wants':w==='when'?'comes':'studies English';return {q:`I don't know ${w} does ${pron} ${base}. の誤りを直しなさい。`,a:`I don't know ${w} ${pron} ${third}.`};}
    case '中3/助動詞/読解': {const mods=[['should','〜すべきです'],['must','〜しなければなりません'],['may','〜かもしれません'],['can','〜できます']];const md=pick(mods,i);return {q:`You ${md[0]} ${enAct}. 問い：この文の意味として最も適切なものを書きなさい。`,a:`あなたは${jpAct}${md[1].replace('〜','')}。`};}
    case '中3/助動詞/選択': return {q:`You ( must / can / may ) ${enAct} today. 「しなければならない」に合うものを選びなさい。`,a:'Must'};
    case '中3/受動態/空所補充': {const p=[['English','speak','spoken'],['This book','read','read'],['The room','clean','cleaned'],['This song','sing','sung'],['The letter','write','written'],['This computer','use','used']][i%6];return {q:`${p[0]} is (      ) by many students. (${p[1]}) の（ ）内を正しくしなさい。`,a:cap(p[2])};}
    case '中3/受動態/選択': {const p=[['The letters','sent','were sent','are sending','yesterday'],['The room','cleaned','was cleaned','is cleaning','yesterday'],['These books','read','are read','are reading','every year'],['The pictures','took','were taken','are taking','yesterday']][i%4];return {q:`${p[0]} ( ${p[1]} / ${p[2]} / ${p[3]} ) ${p[4]}. 正しいものを選びなさい。`,a:cap(p[2])};}
    case '中3/受動態/間違い直し': {const p=[['This song','sing','sung'],['This letter','write','written'],['The room','clean','cleaned'],['This book','read','read'],['This computer','use','used']][i%5];return {q:`${p[0]} is ${p[1]} by many students. の誤りを直しなさい。`,a:`${p[0]} is ${p[2]} by many students.`};}
    case '中3/命令文，there is ～ の文/読解': {const p=[['Please be quiet.','静かにしてください。'],['Open the window, please.','窓を開けてください。'],['Please sit down.','座ってください。'],['Don’t run here.','ここで走らないでください。'],['Please look at this picture.','この写真を見てください。'],['Don’t open the door.','ドアを開けないでください。']][i%6];return {q:`${p[0]} 問い：この英文の意味として最も適切なものを書きなさい。`,a:p[1]};}
    case '中3/接続詞/並びかえ': {const s=i%2===0?`${name} stayed home because ${pron} was tired.`:`If you ${enAct}, you will be happy.`;return {q:reorderQ(s),a:s};}
    case '中3/接続詞/読解': {const s=i%2===0?`If you ${enAct}, you will learn a lot.`:`${name} stayed home because ${pron} was tired.`;const a=i%2===0?`もし${jpAct}なら、たくさん学ぶでしょう。`:`${name}は疲れていたので家にいました。`;return {q:`${s} 問い：この文の内容として最も適切なものを書きなさい。`,a};}
    case '中3/文型/見分け': {if(i%2===0)return {q:`${name} gave me a ${item[0]}. は『人に物を与える文』か、『AをBと呼ぶ文』か答えなさい。`,a:'人に物を与える文'};return {q:`They call ${pron==='he'?'him':'her'} ${name}. は『人に物を与える文』か、『AをBと呼ぶ文』か答えなさい。`,a:'AをBと呼ぶ文'};}
    case '中3/文型/間違い直し': return {q:`They call ${name} ${pron==='he'?'him':'her'}. の誤りを直しなさい。`,a:`They call ${pron==='he'?'him':'her'} ${name}.`};
    case '中3/未来の文/選択': {const signs=[['Look at the clouds.','rain soon'],['Look at that dark sky.','snow soon'],['The bus is coming.','arrive soon'],['She has a map and a ticket.','travel tomorrow']][i%4];return {q:`${signs[0]} It ( will / is going to / did ) ${signs[1]}. 正しいものを選びなさい。`,a:'is going to'};}
    case '中3/現在完了形（完了・経験）/変形': return presentPerfectTransform(i);
    case '中3/現在完了形（完了・経験）/空所補充': {const ps=[['finish','finished','my homework'],['write','written','the letter'],['see','seen','this movie'],['eat','eaten','lunch'],['do','done','the work'],['read','read','this book']];const p=pick(ps,i);return {q:`I have just (      ) ${p[2]}. (${p[0]}) の（ ）内を正しくしなさい。`,a:cap(p[1])};}
    case '中3/現在完了形（完了・経験）/選択': {const ps=[['lost','my key','I cannot open the door now'],['finished','my homework','I can go out now'],['seen','this movie','I know the story'],['written','the letter','I can send it now'],['eaten','lunch','I am not hungry now']];const p=pick(ps,i);return {q:`I ( have ${p[0]} / ${p[0]} / am ${p[0]} ) ${p[1]}, so ${p[2]}. 正しいものを選びなさい。`,a:`Have ${p[0]}`};}
    case '中3/現在完了形（完了・経験）/間違い直し': {const ps=[['went','gone','there'],['saw','seen','that movie'],['wrote','written','the letter'],['ate','eaten','lunch'],['did','done','the work']];const p=pick(ps,i);return {q:`I have ${p[0]} ${p[2]} before. の誤りを直しなさい。`,a:`I have ${p[1]} ${p[2]} before.`};}
    case '中3/現在完了形（継続），現在完了進行形/変形': return presentPerfectContinuousTransform(i);
    case '中3/現在完了形（継続），現在完了進行形/空所補充': {const p=pick([['study','studying','English'],['play','playing','tennis'],['read','reading','this book'],['use','using','this computer'],['wait','waiting','for the bus']],i);return {q:`${name} has been (      ) ${p[2]} since this morning. (${p[0]}) の（ ）内を正しくしなさい。`,a:cap(p[1])};}
    case '中3/現在完了形（継続），現在完了進行形/選択': return {q:`${name} ( has worked / worked / is work ) here since ${i%2?'April':'Monday'}. 正しいものを選びなさい。`,a:'Has worked'};
    case '中3/疑問詞/空所補充': {const wh=[['Why','do you study English?','なぜ'],['Where','does Tom live?','どこ'],['When','does school start?','いつ'],['How','do you go to school?','どのように'],['What','do you want?','何']][i%5];return {q:`(      ) ${wh[1]} 「${wh[2]}」に合う最も適切な語を書きなさい。`,a:wh[0]};}
    case '中3/関係代名詞/並びかえ': {const persons=[['boy','riding a bike'],['girl','singing a song'],['student','reading a book'],['man','using a computer'],['woman','taking a picture']];const p=pick(persons,i);const s=`The ${p[0]} who is ${p[1]}`;return {q:reorderQ(s),a:s};}
    case '中3/関係代名詞/選択': {if(i%2===0){const p=pick([['boy','running'],['girl','singing'],['student','studying'],['man','walking'],['woman','reading']],i/2);return {q:`The ${p[0]} ( who / which / where ) is ${p[1]} is my friend. 空所に入る最も適切な語を書きなさい。`,a:'who'};}const p=pick([['camera','on the desk'],['book','on the table'],['bike','by the tree'],['bag','in the room'],['computer','in the classroom']],Math.floor(i/2));return {q:`The ${p[0]} ( who / which / where ) was ${p[1]} is mine. 正しいものを選びなさい。`,a:'which'};}
    case '中3/関係代名詞/間違い直し': {const p=pick([['girl','lives next door'],['boy','plays tennis'],['student','studies English'],['man','works here'],['woman','teaches us']],i);return {q:`The ${p[0]} which ${p[1]} is kind. の誤りを、who を使って直しなさい。`,a:`The ${p[0]} who ${p[1]} is kind.`};}
  }
  return null;
}
function m2Builder(f,i){
  const pairs=[['This bag','that one','large','larger'],['This book','that one','small','smaller'],['This question','that one','easy','easier'],['Tom','Ken','tall','taller'],['Emi','Yuki','young','younger'],['This room','that one','big','bigger'],['My bike','your bike','fast','faster'],['This desk','that one','heavy','heavier'],['This river','that one','long','longer'],['This box','that one','light','lighter']];const p=pick(pairs,i);
  if(f==='中2/比較/並びかえ'){const s=`${p[0]} is ${p[3]} than ${p[1]}.`;return {q:reorderQ(s),a:s};}
  if(f==='中2/比較/間違い直し')return {q:`${p[0]} is more ${p[2]} than ${p[1]}. の誤りを直しなさい。`,a:`${p[0]} is ${p[3]} than ${p[1]}.`};
  return null;
}
function build(f,i){return f.startsWith('中3/')?m3Builder(f,i):m2Builder(f,i);}

const familyIndex={};const stats={mass_groups_before:massKeys.size,mass_rows_before:targetRows.length,changed_rows:0,by_family:{},unsupported:{},samples:[]};
for(const x of targetRows){
  const f=family(x);const i=familyIndex[f]||0;familyIndex[f]=i+1;
  const out=build(f,i);
  if(!out){stats.unsupported[f]=(stats.unsupported[f]||0)+1;continue;}
  const before={q:x.q,a:x.a};
  if(out.q!==x.q||out.a!==x.a){x.q=out.q;x.a=out.a;stats.changed_rows++;stats.by_family[f]=(stats.by_family[f]||0)+1;if(stats.samples.length<120)stats.samples.push({id:x.id,family:f,before,after:{q:x.q,a:x.a}});}
}
if(Object.keys(stats.unsupported).length)throw new Error(`Unsupported mass families: ${JSON.stringify(stats.unsupported)}`);

const afterMap=new Map();for(const x of rows){const k=qaKey(x);const a=afterMap.get(k)||[];a.push(x);afterMap.set(k,a);}
const massAfter=[...afterMap.values()].filter(a=>a.length>=10);
stats.mass_groups_after=massAfter.length;stats.mass_rows_after=massAfter.reduce((s,a)=>s+a.length,0);stats.mass_excess_after=massAfter.reduce((s,a)=>s+a.length-1,0);
const dupAfter=[...afterMap.values()].filter(a=>a.length>1);stats.duplicate_rows_after=dupAfter.reduce((s,a)=>s+a.length,0);stats.duplicate_excess_after=dupAfter.reduce((s,a)=>s+a.length-1,0);stats.duplicate_groups_after=dupAfter.length;stats.duplicate_row_ratio_after=Number((stats.duplicate_rows_after/rows.length).toFixed(6));stats.duplicate_excess_ratio_after=Number((stats.duplicate_excess_after/rows.length).toFixed(6));

const newJson=JSON.stringify(all);html=html.slice(0,m.index)+m[0].replace(m[1],newJson)+html.slice(m.index+m[0].length);fs.writeFileSync(HTML,html);fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),...stats},null,2)+'\n');console.log(JSON.stringify(stats,null,2));
if(stats.mass_groups_after>0)throw new Error(`Mass duplicates remain: ${stats.mass_groups_after}`);
