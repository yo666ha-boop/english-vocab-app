import fs from 'node:fs';
const HTML='problem-app/index.html',OUT='audit/PROBLEM_APP_HIGH_CONFIDENCE_DUPLICATE_DIVERSIFICATION_V3.json';
let html=fs.readFileSync(HTML,'utf8');const re=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i,m=re.exec(html);if(!m)throw Error('qb-data');
const all=JSON.parse(m[1]),rows=all.filter(x=>x?.subject==='英語');
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase(),key=x=>norm(x.q)+'\u0000'+norm(x.a),fam=x=>`${x.grade}/${x.category}/${x.type}`,pref=x=>String(x.id||'').split('-')[0];
const by=new Map();for(const x of rows){const k=key(x),a=by.get(k)||[];a.push(x);by.set(k,a);}const used=new Set(rows.map(key));
const targets=new Set(['中3/疑問詞/空所補充','中3/現在完了形（完了・経験）/選択','中3/現在完了形（完了・経験）/間違い直し','中3/関係代名詞/間違い直し','中3/関係代名詞/並びかえ','中3/受動態/間違い直し','中3/仮定法/英作文']);
const wh=[['What','do you want','何'],['Where','do you play tennis','どこで'],['When','do you study English','いつ'],['Why','do you read this book','なぜ'],['How','do you go to school','どのように'],['Who','helps you at home','だれが'],['What','does Ken need','何'],['Where','does Emi live','どこに'],['When','does school start','いつ'],['Why','does Tom practice every day','なぜ'],['How','does Yuki come here','どのように'],['Who','uses this computer','だれが']];
const perfect=[['finished','my homework','宿題を終えた'],['written','the letter','手紙を書いた'],['eaten','lunch','昼食を食べた'],['seen','that movie','その映画を見た'],['lost','my key','鍵をなくした'],['read','this book','この本を読んだ'],['visited','Kyoto','京都を訪れた'],['done','the work','その仕事をした'],['made','lunch','昼食を作った'],['taken','many pictures','たくさん写真を撮った'],['cleaned','my room','部屋を掃除した'],['used','this computer','このコンピューターを使った']];
const wrongPerfect=[['went','gone','there'],['saw','seen','that movie'],['wrote','written','the letter'],['ate','eaten','lunch'],['did','done','the work'],['took','taken','many pictures'],['made','made','lunch'],['readed','read','this book'],['buyed','bought','this bag'],['speaked','spoken','English'],['camed','come','here'],['knowed','known','Ken']];
const rel=[['boy','plays soccer','kind'],['girl','studies English','my friend'],['man','works here','Mr. Brown'],['woman','teaches us English','kind'],['student','reads many books','Ken'],['teacher','lives near school','friendly'],['player','runs fast','Tom'],['girl','uses this computer','Emi'],['boy','is singing','my brother'],['woman','is taking a picture','my teacher'],['man','is using a computer','Ken'],['student','is reading a book','Yuki']];
const passive=[['This computer','use','used','by many students'],['English','speak','spoken','in many countries'],['This room','clean','cleaned','every day'],['These pictures','take','taken','in Kyoto'],['This book','write','written','in English'],['Lunch','make','made','by my mother'],['The window','open','opened','every morning'],['The letters','send','sent','every week'],['This song','sing','sung','by many students'],['The bike','use','used','by Ken'],['The door','close','closed','at five'],['Rice','eat','eaten','in many countries']];
const hypo=[['a bird','fly in the sky','鳥','空を飛べる'],['a fish','swim in the sea','魚','海を泳げる'],['a cat','jump high','猫','高く跳べる'],['a dog','run fast','犬','速く走れる'],['a teacher','help students','先生','生徒を助けられる'],['a doctor','help sick people','医者','病気の人を助けられる'],['a chef','cook good food','料理人','おいしい料理を作れる'],['a pilot','fly around the world','パイロット','世界中を飛べる'],['a singer','sing for many people','歌手','多くの人のために歌える'],['a writer','write many books','作家','たくさんの本を書ける'],['a soccer player','play in a big stadium','サッカー選手','大きなスタジアムでプレーできる'],['a scientist','study space','科学者','宇宙を研究できる']];
const scramble=s=>{const w=s.replace(/[.?]/g,'').split(/\s+/),o=[];for(let i=1;i<w.length;i+=2)o.push(w[i]);for(let i=0;i<w.length;i+=2)o.push(w[i]);return o.join(' / ')};
function build(f,i){
 if(f==='中3/疑問詞/空所補充'){const p=wh[i%wh.length];return{q:`(      ) ${p[1]}? 「${p[2]}」に合う最も適切な疑問詞を書きなさい。`,a:p[0]};}
 if(f==='中3/現在完了形（完了・経験）/選択'){const p=perfect[i%perfect.length];return{q:`I ( have ${p[0]} / ${p[0]} / am ${p[0]} ) ${p[1]}. 現在完了形になるものを選びなさい。`,a:`Have ${p[0]}`};}
 if(f==='中3/現在完了形（完了・経験）/間違い直し'){const p=wrongPerfect[i%wrongPerfect.length];if(p[0]===p[1])return{q:`I has ${p[1]} ${p[2]} before. の誤りを直しなさい。`,a:`I have ${p[1]} ${p[2]} before.`};return{q:`I have ${p[0]} ${p[2]} before. の誤りを直しなさい。`,a:`I have ${p[1]} ${p[2]} before.`};}
 if(f==='中3/関係代名詞/間違い直し'){const p=rel[i%rel.length];return{q:`The ${p[0]} which ${p[1]} is ${p[2]}. の誤りを、who を使って直しなさい。`,a:`The ${p[0]} who ${p[1]} is ${p[2]}.`};}
 if(f==='中3/関係代名詞/並びかえ'){const p=rel[i%rel.length],s=`The ${p[0]} who ${p[1]} is ${p[2]}.`;return{q:`次の語(句)を正しい順に並べかえなさい。 ( ${scramble(s)} )`,a:s};}
 if(f==='中3/受動態/間違い直し'){const p=passive[i%passive.length];return{q:`${p[0]} is ${p[1]} ${p[3]}. の誤りを直しなさい。`,a:`${p[0]} is ${p[2]} ${p[3]}.`};}
 if(f==='中3/仮定法/英作文'){const p=hypo[i%hypo.length];return{q:`次の日本語に合う英文を書きなさい。『もし私が${p[2]}なら、${p[3]}のに。』`,a:`If I were ${p[0]}, I could ${p[1]}.`};}
 return null;
}
const idx={},stats={groups_eligible:0,groups_touched:0,changed_rows:0,by_family:{},samples:[]};
for(const g of by.values()){
 if(g.length<2||g.length>4)continue;const f=fam(g[0]);if(!targets.has(f)||!g.every(x=>fam(x)===f&&pref(x)===pref(g[0])))continue;stats.groups_eligible++;let touched=false;
 for(let j=1;j<g.length;j++){const x=g[j];let i=idx[f]||0,out=null,k='';for(let n=0;n<2000;n++,i++){const c=build(f,i);if(!c)break;k=norm(c.q)+'\u0000'+norm(c.a);if(!used.has(k)){out=c;break;}}idx[f]=i+1;if(!out)continue;const before={q:x.q,a:x.a};x.q=out.q;x.a=out.a;used.add(k);stats.changed_rows++;stats.by_family[f]=(stats.by_family[f]||0)+1;touched=true;if(stats.samples.length<80)stats.samples.push({id:x.id,family:f,before,after:{q:x.q,a:x.a}});}
 if(touched)stats.groups_touched++;
}
const after=new Map();for(const x of rows){const k=key(x),a=after.get(k)||[];a.push(x);after.set(k,a);}const dup=[...after.values()].filter(a=>a.length>1);stats.duplicate_groups_after=dup.length;stats.duplicate_excess_after=dup.reduce((s,a)=>s+a.length-1,0);stats.groups_ge5_after=dup.filter(a=>a.length>=5).length;
if(!stats.changed_rows)throw Error('no changes');if(stats.groups_ge5_after)throw Error('ge5 regression');
const json=JSON.stringify(all);html=html.slice(0,m.index)+m[0].replace(m[1],json)+html.slice(m.index+m[0].length);fs.writeFileSync(HTML,html);fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),...stats},null,2)+'\n');console.log(JSON.stringify(stats,null,2));
