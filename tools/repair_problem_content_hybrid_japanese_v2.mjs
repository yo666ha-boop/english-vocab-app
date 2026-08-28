import fs from 'node:fs';

const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_CONTENT_HYBRID_REPAIR_V2.json';
let html=fs.readFileSync(HTML,'utf8');
const re=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i;
const m=re.exec(html); if(!m) throw new Error('qb-data not found');
const all=JSON.parse(m[1]);
const rows=all.filter(x=>x?.subject==='英語');
const proper=new Set(['Tom','Ken','Mike','Emi','Yuki','Aya','Bob','Lucy','Mary','John','Jim','Ann','Kate','Lisa','Ben','Alex','Kenta','Miki','Mika','Saki','Riku','Kota','Takumi']);
const wordRe=/[A-Za-z][A-Za-z'-]*/g;
const stats={changed_rows:0,hybrid_rows_before:0,hybrid_rows_after:0,semantic_repairs:0,by_category:{},samples:[]};
const changed=new Set();
function quoted(q){const z=/『([^』]*)』/.exec(String(q||''));return z?z[1]:'';}
function badTokens(jp){return (jp.match(wordRe)||[]).filter(t=>!proper.has(t)&&!(/^[ABC]$/.test(t)));}
function remember(x,kind,before){changed.add(x.id);stats.by_category[x.category]=(stats.by_category[x.category]||0)+1;if(stats.samples.length<120)stats.samples.push({id:x.id,kind,before,after:{q:x.q,a:x.a}});}
function setQ(x,jp,kind){const nq=String(x.q).replace(/『[^』]*』/,`『${jp}』`);if(nq===x.q)return false;const before={q:x.q,a:x.a};x.q=nq;remember(x,kind,before);return true;}
function setQA(x,q,a,kind){const before={q:x.q,a:x.a};let did=false;if(q!=null&&q!==x.q){x.q=q;did=true;}if(a!=null&&a!==x.a){x.a=a;did=true;}if(!did)return false;remember(x,kind,before);return true;}
const phrases=[
 ['pencil case','筆箱'],['My father','私の父'],['My mother','私の母'],['My brother','私の兄弟'],['My sister','私の姉妹'],['My friend','私の友達'],
 ['The student','その生徒'],['The teacher','その先生'],['The boy','その少年'],['The girl','その少女'],['Our team','私たちのチーム'],
 ['This computer','このコンピューター'],['This picture','この写真'],['This chair','このいす'],['This house','この家'],['This table','このテーブル'],['This flower','この花'],['This bike','この自転車'],['This book','この本'],['This bag','このかばん'],['This dog','この犬'],['This car','この車'],['This desk','この机'],['This room','この部屋'],
 ['the classroom','教室'],['the hospital','病院'],['the library','図書館'],['the station','駅'],['the museum','博物館'],['the kitchen','台所'],['the school','学校'],['the store','店'],['the park','公園'],['the room','部屋'],['the gym','体育館'],['the pool','プール'],['the zoo','動物園'],['the town','町'],['the city','街'],['the office','事務所'],
 ['my homework','私の宿題'],['my room','私の部屋'],['my bag','私のかばん'],['our school','私たちの学校']
];
const words={
 I:'私',You:'あなた',He:'彼',She:'彼女',We:'私たち',They:'彼ら',This:'この',That:'あの',this:'この',that:'あの',the:'',My:'私の',Our:'私たちの',my:'私の',our:'私たちの',
 book:'本',books:'本',pen:'ペン',bag:'かばん',picture:'写真',desk:'机',chair:'いす',table:'テーブル',bike:'自転車',dog:'犬',cat:'猫',window:'窓',door:'ドア',box:'箱',wall:'壁',tree:'木',computer:'コンピューター',homework:'宿題',room:'部屋',park:'公園',school:'学校',library:'図書館',station:'駅',museum:'博物館',store:'店',classroom:'教室',kitchen:'台所',gym:'体育館',pool:'プール',zoo:'動物園',town:'町',city:'街',office:'事務所',house:'家',car:'車',flower:'花',question:'問題',game:'ゲーム',ball:'ボール',camera:'カメラ',
 tennis:'テニス',soccer:'サッカー',baseball:'野球',basketball:'バスケットボール',volleyball:'バレーボール',badminton:'バドミントン',swimming:'水泳',running:'ランニング',skiing:'スキー',skating:'スケート',music:'音楽',English:'英語',english:'英語',dinner:'夕食',
 busy:'忙しい',easy:'簡単',small:'小さい',large:'大きい',kind:'親切',good:'良い',tired:'疲れた',happy:'うれしい',hungry:'空腹',free:'自由',popular:'人気',beautiful:'美しい',interesting:'おもしろい',young:'若い',sleepy:'眠い',sad:'悲しい',cold:'寒い',hot:'暑い',nice:'親切',old:'年を取った',big:'大きい',strong:'強い',fast:'速い',slow:'遅い',cute:'かわいい',
 Monday:'月曜日',Tuesday:'火曜日',Wednesday:'水曜日',Thursday:'木曜日',Friday:'金曜日',Saturday:'土曜日',Sunday:'日曜日',monday:'月曜日',tuesday:'火曜日',wednesday:'水曜日',thursday:'木曜日',friday:'金曜日',saturday:'土曜日',sunday:'日曜日'
};
function cleanJapanese(s){
 for(const [a,b] of phrases)s=s.split(a).join(b);
 s=s.replace(/[A-Za-z][A-Za-z'-]*/g,t=>Object.prototype.hasOwnProperty.call(words,t)?words[t]:t);
 s=s.replace(/\s+/g,' ').replace(/\s+([、。！？,.])/g,'$1').replace(/([\u3040-\u30ff\u3400-\u9fff])\s+/g,'$1').replace(/\s+([\u3040-\u30ff\u3400-\u9fff])/g,'$1').trim();
 s=s.replace(/忙しいにしました/g,'忙しくしました').replace(/疲れたにしました/g,'疲れさせました').replace(/うれしいにしました/g,'うれしくしました').replace(/眠いにしました/g,'眠くしました').replace(/悲しいにしました/g,'悲しくしました').replace(/寒いにしました/g,'寒くしました').replace(/暑いにしました/g,'暑くしました').replace(/親切にしました/g,'親切にしました').replace(/年を取ったにしました/g,'年を取らせました').replace(/大きいにしました/g,'大きくしました').replace(/強いにしました/g,'強くしました').replace(/速いにしました/g,'速くしました').replace(/遅いにしました/g,'遅くしました').replace(/かわいいにしました/g,'かわいくしました');
 return s;
}
const makeNatural={
 sleepy:['The book made me sleepy.','その本を読んで私は眠くなりました。'],
 sad:['The news made me sad.','その知らせを聞いて私は悲しくなりました。'],
 cold:['The rain made me cold.','雨で私は寒くなりました。'],
 hot:['The game made me hot.','そのゲームをして私は暑くなりました。'],
 nice:['The news made me happy.','その知らせを聞いて私はうれしくなりました。'],
 old:['The hard work made me tired.','その大変な仕事で私は疲れました。'],
 big:['The exercise made me strong.','その運動で私は強くなりました。'],
 strong:['The exercise made me strong.','その運動で私は強くなりました。'],
 fast:['The practice made me fast.','その練習で私は速くなりました。'],
 slow:['The heavy bag made me slow.','その重いかばんで私は動きが遅くなりました。'],
 cute:['The hat made me happy.','その帽子で私はうれしくなりました。']
};
function comparisonRepair(x){
 const cmp=/^(My bike|Our school|This (?:bag|book|chair|house|desk|table|car|bike|flower)) is (busier|kinder|younger|easier) than that one\.$/i.exec(String(x.a||''));
 const sup=/^(My bike|Our school|This (?:bag|book|chair|house|desk|table|car|bike|flower)) is the (busiest|kindest|youngest|easiest) of the three\.$/i.exec(String(x.a||''));
 if(cmp){const adj=cmp[2].toLowerCase();if(adj==='easier')return setQA(x,'次の日本語に合う英文を書きなさい。『このゲームはあのゲームより簡単です。』','This game is easier than that one.','semantic_inanimate_comparison');const jpAdj=adj==='busier'?'忙しい':adj==='kinder'?'親切':'若い';return setQA(x,`次の日本語に合う英文を書きなさい。『トムはケンより${jpAdj}です。』`,`Tom is ${adj} than Ken.`,'semantic_inanimate_comparison');}
 if(sup){const adj=sup[2].toLowerCase();if(adj==='easiest')return setQA(x,'次の日本語に合う英文を書きなさい。『このゲームは3つの中でいちばん簡単です。』','This game is the easiest of the three.','semantic_inanimate_superlative');const jpAdj=adj==='busiest'?'忙しい':adj==='kindest'?'親切':'若い';return setQA(x,`次の日本語に合う英文を書きなさい。『トムは3人の中でいちばん${jpAdj}です。』`,`Tom is the ${adj} of the three.`,'semantic_inanimate_superlative');}
 return false;
}
for(const x of rows){
 if(x.type!=='英作文'||!/次の日本語に合う英文/.test(String(x.q||'')))continue;
 const jp=quoted(x.q);if(!jp)continue;const beforeBad=badTokens(jp);if(!beforeBad.length)continue;stats.hybrid_rows_before++;
 if(comparisonRepair(x)){stats.semantic_repairs++;continue;}
 if(x.category==='比較'&&/^My friend is the easiest in this class\.$/.test(String(x.a||''))){if(setQA(x,'次の日本語に合う英文を書きなさい。『私の友達はこのクラスでいちばん親切です。』','My friend is the kindest in this class.','comparison_kind_alignment'))stats.semantic_repairs++;continue;}
 if(x.category==='文型'){
   const z=/^The news made me (sleepy|sad|cold|hot|nice|old|big|strong|fast|slow|cute)\.$/.exec(String(x.a||''));
   if(z&&makeNatural[z[1]]){const [a,j]=makeNatural[z[1]];if(setQA(x,`次の日本語に合う英文を書きなさい。『${j}』`,a,'make_object_complement_naturalization'))stats.semantic_repairs++;continue;}
 }
 const natural=cleanJapanese(jp);if(natural!==jp)setQ(x,natural,'hybrid_token_naturalization');
}
for(const x of rows){if(x.type==='英作文'&&/次の日本語に合う英文/.test(String(x.q||''))&&badTokens(quoted(x.q)).length)stats.hybrid_rows_after++;}
stats.changed_rows=changed.size;
const newJson=JSON.stringify(all);html=html.slice(0,m.index)+m[0].replace(m[1],newJson)+html.slice(m.index+m[0].length);
fs.writeFileSync(HTML,html);fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),...stats},null,2)+'\n');console.log(JSON.stringify(stats,null,2));
if(!stats.changed_rows)throw new Error('v2 repair made no changes');
