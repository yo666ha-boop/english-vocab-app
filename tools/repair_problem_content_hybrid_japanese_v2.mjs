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
function setQ(x,jp,kind){
  const nq=String(x.q).replace(/『[^』]*』/,`『${jp}』`); if(nq===x.q)return false;
  const before={q:x.q,a:x.a}; x.q=nq; changed.add(x.id); stats.by_category[x.category]=(stats.by_category[x.category]||0)+1;
  if(stats.samples.length<100)stats.samples.push({id:x.id,kind,before,after:{q:x.q,a:x.a}}); return true;
}
function setQA(x,q,a,kind){
  const before={q:x.q,a:x.a}; let did=false;
  if(q!=null&&q!==x.q){x.q=q;did=true;} if(a!=null&&a!==x.a){x.a=a;did=true;}
  if(!did)return false; changed.add(x.id); stats.by_category[x.category]=(stats.by_category[x.category]||0)+1;
  if(stats.samples.length<100)stats.samples.push({id:x.id,kind,before,after:{q:x.q,a:x.a}}); return true;
}
const phrases=[
  ['pencil case','筆箱'],['My father','私の父'],['My mother','私の母'],['My brother','私の兄弟'],['My sister','私の姉妹'],['My friend','私の友達'],
  ['The student','その生徒'],['The teacher','その先生'],['The boy','その少年'],['The girl','その少女'],['Our team','私たちのチーム'],
  ['This computer','このコンピューター'],['This picture','この写真'],['This chair','このいす'],['This house','この家'],['This table','このテーブル'],['This flower','この花'],['This bike','この自転車'],['This book','この本'],['This bag','このかばん'],['This dog','この犬'],['This car','この車'],['This desk','この机'],['This room','この部屋'],
  ['the classroom','教室'],['the hospital','病院'],['the library','図書館'],['the station','駅'],['the museum','博物館'],['the kitchen','台所'],['the school','学校'],['the store','店'],['the park','公園'],['the room','部屋'],['the gym','体育館'],['the pool','プール'],['the zoo','動物園'],['the town','町'],['the city','街'],
  ['my homework','私の宿題'],['my room','私の部屋'],['my bag','私のかばん'],['our school','私たちの学校']
];
const words={
  I:'私',You:'あなた',He:'彼',She:'彼女',We:'私たち',They:'彼ら',This:'この',That:'あの',this:'この',that:'あの',the:'',my:'私の',our:'私たちの',
  book:'本',books:'本',pen:'ペン',bag:'かばん',picture:'写真',desk:'机',chair:'いす',table:'テーブル',bike:'自転車',dog:'犬',cat:'猫',window:'窓',door:'ドア',box:'箱',wall:'壁',tree:'木',computer:'コンピューター',homework:'宿題',room:'部屋',park:'公園',school:'学校',library:'図書館',station:'駅',museum:'博物館',store:'店',classroom:'教室',kitchen:'台所',gym:'体育館',pool:'プール',zoo:'動物園',town:'町',city:'街',house:'家',car:'車',flower:'花',question:'問題',game:'ゲーム',
  tennis:'テニス',soccer:'サッカー',baseball:'野球',basketball:'バスケットボール',volleyball:'バレーボール',badminton:'バドミントン',swimming:'水泳',running:'ランニング',skiing:'スキー',skating:'スケート',music:'音楽',English:'英語',english:'英語',dinner:'夕食',
  busy:'忙しい',easy:'簡単',small:'小さい',large:'大きい',kind:'親切',good:'良い',tired:'疲れた',happy:'うれしい',hungry:'空腹',free:'自由',popular:'人気',beautiful:'美しい',interesting:'おもしろい',young:'若い'
};
function cleanJapanese(s){
  for(const [a,b] of phrases)s=s.split(a).join(b);
  s=s.replace(/[A-Za-z][A-Za-z'-]*/g,t=>Object.prototype.hasOwnProperty.call(words,t)?words[t]:t);
  s=s.replace(/\s+/g,' ')
    .replace(/\s+([、。！？,.])/g,'$1')
    .replace(/([\u3040-\u30ff\u3400-\u9fff])\s+/g,'$1')
    .replace(/\s+([\u3040-\u30ff\u3400-\u9fff])/g,'$1')
    .trim();
  s=s.replace(/忙しいにしました/g,'忙しくしました')
    .replace(/疲れたにしました/g,'疲れさせました')
    .replace(/うれしいにしました/g,'うれしくしました')
    .replace(/空腹にしました/g,'空腹にしました')
    .replace(/親切にしました/g,'親切にしました')
    .replace(/自由にしました/g,'自由にしました');
  return s;
}

for(const x of rows){
  if(x.type!=='英作文'||!/次の日本語に合う英文/.test(String(x.q||'')))continue;
  const jp=quoted(x.q); if(!jp)continue;
  const beforeBad=badTokens(jp); if(!beforeBad.length)continue; stats.hybrid_rows_before++;

  // Repair semantically invalid inanimate comparison templates before generic Japanese cleanup.
  const cmp=/^This (bag|book|chair|house|desk|table|car|bike|flower) is (busier|kinder|younger|easier) than that one\.$/i.exec(String(x.a||''));
  const sup=/^This (bag|book|chair|house|desk|table|car|bike|flower) is the (busiest|kindest|youngest|easiest) of the three\.$/i.exec(String(x.a||''));
  if(cmp){
    const adj=cmp[2].toLowerCase();
    if(adj==='easier')setQA(x,'次の日本語に合う英文を書きなさい。『このゲームはあのゲームより簡単です。』','This game is easier than that one.','semantic_inanimate_comparison');
    else {
      const jpAdj=adj==='busier'?'忙しい':adj==='kinder'?'親切':'若い';
      const enAdj=adj;
      setQA(x,`次の日本語に合う英文を書きなさい。『トムはケンより${jpAdj}です。』`,`Tom is ${enAdj} than Ken.`,'semantic_inanimate_comparison');
    }
    stats.semantic_repairs++; continue;
  }
  if(sup){
    const adj=sup[2].toLowerCase();
    if(adj==='easiest')setQA(x,'次の日本語に合う英文を書きなさい。『このゲームは3つの中でいちばん簡単です。』','This game is the easiest of the three.','semantic_inanimate_superlative');
    else {
      const jpAdj=adj==='busiest'?'忙しい':adj==='kindest'?'親切':'若い';
      setQA(x,`次の日本語に合う英文を書きなさい。『トムは3人の中でいちばん${jpAdj}です。』`,`Tom is the ${adj} of the three.`,'semantic_inanimate_superlative');
    }
    stats.semantic_repairs++; continue;
  }

  // Middle-school comparison mismatch: Japanese やさしい must not map to easiest.
  if(x.category==='比較'&&/^My friend is the easiest in this class\.$/.test(String(x.a||''))){
    if(setQA(x,'次の日本語に合う英文を書きなさい。『私の友達はこのクラスでいちばん親切です。』','My friend is the kindest in this class.','comparison_kind_alignment'))stats.semantic_repairs++;
    continue;
  }

  const natural=cleanJapanese(jp);
  if(natural!==jp)setQ(x,natural,'hybrid_token_naturalization');
}

// Fix four residual preposition objects introduced by the first high-confidence pass.
const exactFixes={
 'ボールはboxの中にあります。':'ボールは箱の中にあります。',
 '写真はwallの上にあります。':'写真は壁にあります。',
 'ペンはpencil caseの中にあります。':'ペンは筆箱の中にあります。',
 '自転車はtreeのそばにあります。':'自転車は木のそばにあります。'
};
for(const x of rows){const jp=quoted(x.q);if(exactFixes[jp])setQ(x,exactFixes[jp],'residual_preposition_cleanup');}

for(const x of rows){if(x.type==='英作文'&&/次の日本語に合う英文/.test(String(x.q||''))&&badTokens(quoted(x.q)).length)stats.hybrid_rows_after++;}
stats.changed_rows=changed.size;
const newJson=JSON.stringify(all);
html=html.slice(0,m.index)+m[0].replace(m[1],newJson)+html.slice(m.index+m[0].length);
fs.writeFileSync(HTML,html);
fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),...stats},null,2)+'\n');
console.log(JSON.stringify(stats,null,2));
if(!stats.changed_rows)throw new Error('v2 repair made no changes');
