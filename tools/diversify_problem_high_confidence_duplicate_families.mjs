import fs from 'node:fs';
const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_HIGH_CONFIDENCE_DUPLICATE_DIVERSIFICATION.json';
let html=fs.readFileSync(HTML,'utf8');
const re=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i;
const m=re.exec(html); if(!m) throw Error('qb-data');
const all=JSON.parse(m[1]); const rows=all.filter(x=>x?.subject==='英語');
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const key=x=>norm(x.q)+'\u0000'+norm(x.a); const fam=x=>`${x.grade}/${x.category}/${x.type}`;
const prefix=x=>String(x.id||'').split('-').slice(0,1)[0];
const byQA=new Map(); for(const x of rows){const k=key(x),a=byQA.get(k)||[];a.push(x);byQA.set(k,a);}
const targets=new Set([
 '中3/疑問詞/空所補充','中3/人称代名詞/選択',
 '中3/受動態/空所補充','中3/受動態/選択','中3/受動態/間違い直し',
 '中3/現在完了形（完了・経験）/空所補充','中3/現在完了形（完了・経験）/選択','中3/現在完了形（完了・経験）/間違い直し','中3/現在完了形（完了・経験）/英作文'
]);
const names=['Tom','Ken','Mike','Bob','John','Emi','Yuki','Aya','Lucy','Mary','Ann','Kate'];
const wh=[
 ['Where','does Tom live','どこに住んでいますか'],['When','does school start','いつ学校が始まりますか'],['Why','do you study English','なぜ英語を勉強しますか'],['How','do you go to school','どのように学校へ行きますか'],['What','do you want','何がほしいですか'],['Where','does Emi study','どこでエミは勉強しますか'],['When','do they play soccer','いつ彼らはサッカーをしますか'],['Why','does Ken read books','なぜケンは本を読みますか'],['How','does Aya come here','どのようにアヤはここへ来ますか'],['What','does Mike need','何がマイクには必要ですか']
];
const passive=[
 ['English','speak','spoken'],['This book','write','written'],['The room','clean','cleaned'],['These pictures','take','taken'],['The window','open','opened'],['The cake','make','made'],['The letter','send','sent'],['The song','sing','sung'],['The bike','use','used'],['The door','close','closed'],['The game','play','played'],['The homework','finish','finished']
];
const perfect=[
 ['finish','finished','my homework','宿題を終えました'],['write','written','the letter','手紙を書き終えました'],['see','seen','that movie','その映画を見たことがあります'],['eat','eaten','lunch','昼食を食べ終えました'],['lose','lost','my key','鍵をなくしました'],['do','done','the work','その仕事を終えました'],['read','read','this book','この本を読んだことがあります'],['visit','visited','Kyoto','京都を訪れたことがあります'],['meet','met','Mr. Brown','ブラウン先生に会ったことがあります'],['take','taken','the picture','その写真を撮りました'],['make','made','lunch','昼食を作りました'],['buy','bought','a new bag','新しいかばんを買いました']
];
const pronouns=[
 ['He','Him','His','teaches us English'],['She','Her','Her','plays tennis well'],['They','Them','Their','study English every day'],['We','Us','Our','use this room'],['I','Me','My','like this book'],['You','You','Your','know the answer']
];
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function build(f,i){
 if(f==='中3/疑問詞/空所補充'){const w=wh[i%wh.length];return{q:`(      ) ${w[1]}? 「${w[2]}」という意味になるように、空所に入る最も適切な疑問詞を書きなさい。`,a:w[0]};}
 if(f==='中3/人称代名詞/選択'){const p=pronouns[i%pronouns.length];const opts=i%2===0?`${p[0]} / ${p[1]} / ${p[2]}`:`${p[1]} / ${p[2]} / ${p[0]}`;return{q:`( ${opts} ) ${p[3]}. 文の主語として正しいものを選びなさい。`,a:p[0]};}
 if(f.startsWith('中3/受動態/')){const p=passive[i%passive.length];
  if(f.endsWith('/空所補充')) return{q:`${p[0]} is (      ) by many people. (${p[1]}) の語を正しい形にしなさい。`,a:cap(p[2])};
  if(f.endsWith('/選択')) return{q:`${p[0]} is ( ${p[2]} / ${p[1]} / ${p[1]}ing ) by many people. 正しいものを選びなさい。`,a:cap(p[2])};
  return{q:`${p[0]} is ${p[1]} by many people. の誤りを直しなさい。`,a:`${p[0]} is ${p[2]} by many people.`};
 }
 if(f.startsWith('中3/現在完了形（完了・経験）/')){const p=perfect[i%perfect.length];
  if(f.endsWith('/空所補充')) return{q:`I have just (      ) ${p[2]}. (${p[0]}) の語を正しい形にしなさい。`,a:cap(p[1])};
  if(f.endsWith('/選択')) return{q:`I ( have ${p[1]} / ${p[1]} / am ${p[1]} ) ${p[2]}. 正しいものを選びなさい。`,a:`Have ${p[1]}`};
  if(f.endsWith('/間違い直し')) return{q:`I have ${p[0]} ${p[2]} before. の誤りを直しなさい。`,a:`I have ${p[1]} ${p[2]} before.`};
  if(f.endsWith('/英作文')) return{q:`「私は${p[3]}。」を現在完了形を使って英語にしなさい。`,a:`I have ${p[1]} ${p[2]}.`};
 }
 return null;
}
const used=new Set(rows.map(key)); const idx={}; const stats={groups_seen:0,groups_eligible:0,changed_rows:0,groups_touched:0,by_family:{},samples:[]};
for(const group of byQA.values()){
 if(group.length<2||group.length>4) continue;
 stats.groups_seen++;
 const f=fam(group[0]); if(!targets.has(f)) continue;
 if(!group.every(x=>fam(x)===f&&prefix(x)===prefix(group[0]))) continue;
 stats.groups_eligible++; let touched=false;
 for(let j=1;j<group.length;j++){
  const x=group[j]; let i=idx[f]||0,out=null,k='';
  for(let tries=0;tries<1000;tries++,i++){const cand=build(f,i);if(!cand)break;k=norm(cand.q)+'\u0000'+norm(cand.a);if(!used.has(k)){out=cand;break;}}
  idx[f]=i+1; if(!out) continue;
  const before={q:x.q,a:x.a}; x.q=out.q; x.a=out.a; used.add(k); stats.changed_rows++; stats.by_family[f]=(stats.by_family[f]||0)+1;touched=true;
  if(stats.samples.length<80) stats.samples.push({id:x.id,family:f,before,after:{q:x.q,a:x.a}});
 }
 if(touched) stats.groups_touched++;
}
const after=new Map();for(const x of rows){const k=key(x),a=after.get(k)||[];a.push(x);after.set(k,a);}const dup=[...after.values()].filter(a=>a.length>1);
stats.duplicate_groups_after=dup.length;stats.duplicate_rows_after=dup.reduce((s,a)=>s+a.length,0);stats.duplicate_excess_after=dup.reduce((s,a)=>s+a.length-1,0);stats.groups_ge5_after=dup.filter(a=>a.length>=5).length;
if(!stats.changed_rows) throw Error('no high-confidence rows changed'); if(stats.groups_ge5_after) throw Error('ge5 regression');
const newJson=JSON.stringify(all);html=html.slice(0,m.index)+m[0].replace(m[1],newJson)+html.slice(m.index+m[0].length);fs.writeFileSync(HTML,html);fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),...stats},null,2)+'\n');console.log(JSON.stringify(stats,null,2));
