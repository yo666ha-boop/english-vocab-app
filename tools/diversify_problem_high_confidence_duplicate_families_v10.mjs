import fs from 'node:fs';
const HTML='problem-app/index.html',OUT='audit/PROBLEM_APP_HIGH_CONFIDENCE_DUPLICATE_DIVERSIFICATION_V10.json';
let html=fs.readFileSync(HTML,'utf8');const re=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i,m=re.exec(html);if(!m)throw Error('qb-data');
const all=JSON.parse(m[1]),rows=all.filter(x=>x?.subject==='英語');
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase(),key=x=>norm(x.q)+'\u0000'+norm(x.a),fam=x=>`${x.grade}/${x.category}/${x.type}`,pref=x=>String(x.id||'').split('-')[0];
const by=new Map();for(const x of rows){const a=by.get(key(x))||[];a.push(x);by.set(key(x),a);}const used=new Set(rows.map(key));
const targets=new Set(['中3/文型/間違い直し','中2/比較/英作文','中1/頻度副詞/並びかえ','中3/接続詞/並びかえ','中3/関係代名詞/並びかえ']);
const callNames=[['Tom','him'],['Ken','him'],['Mike','him'],['Bob','him'],['John','him'],['Emi','her'],['Yuki','her'],['Aya','her'],['Lucy','her'],['Mary','her'],['Ann','her'],['Kate','her']];
const callSubs=['We','My friends','The students','They'];
const comparisons=[
['この湖はあの湖より深い。','This lake is deeper than that one.'],['この道はあの道より広い。','This road is wider than that one.'],['この塔はあの塔より高い。','This tower is taller than that one.'],['この鉛筆はあの鉛筆より短い。','This pencil is shorter than that one.'],['この犬はあの犬より大きい。','This dog is bigger than that one.'],['この公園はあの公園より広い。','This park is larger than that one.'],['この問題は前の問題より難しい。','This question is more difficult than the last one.'],['この歌はあの歌より人気があります。','This song is more popular than that one.'],['この町はあの町より静かです。','This town is quieter than that one.'],['このカメラはあのカメラより軽い。','This camera is lighter than that one.'],['この電車はあの電車より速い。','This train is faster than that one.'],['この川はあの川より広い。','This river is wider than that one.']];
const freqSubs=['Tom','Ken','Emi','Yuki','My father','My mother','Our teacher','The student'];
const freqAdvs=['always','usually','often','sometimes'];
const freqPreds=['busy','kind','happy','tired','ready','free'];
const conjunctions=[
['Ken stayed home because he was sick.'],['Emi went to bed early because she was tired.'],['Yuki took an umbrella because it was raining.'],['Tom studied hard because he had a test.'],['Aya opened the window because the room was hot.'],['Mike wore a coat because it was cold.'],['Lucy smiled because she was happy.'],['John ran home because it was late.'],['Mary called her friend because she needed help.'],['Bob drank some water because he was thirsty.'],['Kate used the bus because it was raining.'],['Ann stayed inside because the weather was bad.']];
const relatives=[
['The boy who is reading a book'],['The girl who is playing tennis'],['The man who is using a computer'],['The woman who is opening the window'],['The student who is studying English'],['The teacher who is writing on the board'],['The player who is running in the park'],['The girl who is singing a song'],['The boy who is carrying a bag'],['The woman who is taking a picture'],['The man who is washing the car'],['The student who is cleaning the room']];
const scramble=s=>{const w=s.replace(/[.?]/g,'').split(/\s+/);const o=[];for(let i=1;i<w.length;i+=2)o.push(w[i]);for(let i=0;i<w.length;i+=2)o.push(w[i]);return o.join(' / ')};
function build(f,i){
 if(f==='中3/文型/間違い直し'){const n=callNames[i%callNames.length],s=callSubs[Math.floor(i/callNames.length)%callSubs.length];return{q:`${s} call ${n[0]} ${n[1]}. の誤りを直しなさい。`,a:`${s} call ${n[1]} ${n[0]}.`};}
 if(f==='中2/比較/英作文'){const p=comparisons[i%comparisons.length];return{q:`次の日本語に合う英文を書きなさい。『${p[0]}』`,a:p[1]};}
 if(f==='中1/頻度副詞/並びかえ'){const s=freqSubs[i%freqSubs.length],adv=freqAdvs[Math.floor(i/freqSubs.length)%freqAdvs.length],p=freqPreds[Math.floor(i/(freqSubs.length*freqAdvs.length))%freqPreds.length],ans=`${s} is ${adv} ${p}.`;return{q:`次の語(句)を正しい順に並べかえなさい。 ( ${scramble(ans)} )`,a:ans};}
 if(f==='中3/接続詞/並びかえ'){const ans=conjunctions[i%conjunctions.length][0];return{q:`次の語(句)を正しい順に並べかえなさい。 ( ${scramble(ans)} )`,a:ans};}
 if(f==='中3/関係代名詞/並びかえ'){const ans=relatives[i%relatives.length][0];return{q:`次の語(句)を正しい順に並べかえなさい。 ( ${scramble(ans)} )`,a:ans};}
 return null;
}
const idx={},stats={groups_eligible:0,groups_touched:0,changed_rows:0,by_family:{},samples:[]};
for(const g of by.values()){if(g.length<2||g.length>4)continue;const f=fam(g[0]);if(!targets.has(f)||!g.every(x=>fam(x)===f&&pref(x)===pref(g[0])))continue;stats.groups_eligible++;let touched=false;for(let j=1;j<g.length;j++){const x=g[j];let i=idx[f]||0,out=null,k='';for(let n=0;n<10000;n++,i++){const c=build(f,i);if(!c)break;k=norm(c.q)+'\u0000'+norm(c.a);if(!used.has(k)){out=c;break;}}idx[f]=i+1;if(!out)continue;const before={q:x.q,a:x.a};x.q=out.q;x.a=out.a;used.add(k);stats.changed_rows++;stats.by_family[f]=(stats.by_family[f]||0)+1;touched=true;if(stats.samples.length<100)stats.samples.push({id:x.id,family:f,before,after:{q:x.q,a:x.a}});}if(touched)stats.groups_touched++;}
const after=new Map();for(const x of rows){const a=after.get(key(x))||[];a.push(x);after.set(key(x),a);}const dup=[...after.values()].filter(a=>a.length>1);stats.duplicate_groups_after=dup.length;stats.duplicate_excess_after=dup.reduce((s,a)=>s+a.length-1,0);stats.groups_ge5_after=dup.filter(a=>a.length>=5).length;if(!stats.changed_rows)throw Error('no changes');if(stats.groups_ge5_after)throw Error('ge5 regression');
const json=JSON.stringify(all);html=html.slice(0,m.index)+m[0].replace(m[1],json)+html.slice(m.index+m[0].length);fs.writeFileSync(HTML,html);fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),...stats},null,2)+'\n');console.log(JSON.stringify(stats,null,2));
