import fs from 'node:fs';
const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_DUPLICATE_CORE_DIVERSIFY.json';
let html=fs.readFileSync(HTML,'utf8');
const re=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i;
const m=re.exec(html);if(!m)throw Error('qb-data');
const all=JSON.parse(m[1]);const rows=all.filter(x=>x?.subject==='英語');
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const key=(q,a)=>norm(q)+'\u0000'+norm(a);
const existing=new Set(rows.map(x=>key(x.q,x.a)));
const groups=new Map();for(const x of rows){const k=key(x.q,x.a);const a=groups.get(k)||[];a.push(x);groups.set(k,a);}
const stats={changed_rows:0,groups_touched:0,by_family:{},samples:[],skipped_no_candidate:0};
const changed=new Set();
function family(x){return `${x.grade}/${x.category}/${x.type}`;}
function pronoun(s){if(['He','Tom','Ken','Mike','Bob','John','Jim','Ben','Kenta','Riku','Kota','Takumi'].includes(s))return'he';if(['She','Emi','Yuki','Aya','Lucy','Mary','Ann','Kate','Lisa','Miki','Mika','Saki'].includes(s))return'she';return s.toLowerCase();}
const sing=['He','She','Tom','Ken','Emi','Yuki','Mike','Aya','Bob','Lucy','Mary','John'];
const adjs=['busy','happy','tired','hungry','free','kind','young','old','good','sad','fine','ready'];
const jpAdj={busy:'忙しい',happy:'うれしい',tired:'疲れている',hungry:'おなかがすいている',free:'ひまな',kind:'親切な',young:'若い',old:'年を取った',good:'元気な',sad:'悲しい',fine:'元気な',ready:'準備ができている'};
const actions=[
 ['play soccer','plays soccer','サッカーをします'],['study English','studies English','英語を勉強します'],['read books','reads books','本を読みます'],['cook dinner','cooks dinner','夕食を作ります'],['help at home','helps at home','家の手伝いをします'],['listen to music','listens to music','音楽を聞きます'],['visit the library','visits the library','図書館を訪れます'],['walk to school','walks to school','学校へ歩いて行きます'],['clean the room','cleans the room','部屋を掃除します'],['wash the dishes','washes the dishes','皿を洗います'],['play tennis','plays tennis','テニスをします'],['use a computer','uses a computer','コンピューターを使います']
];
const pluralSubs=[['I','私は'],['You','あなたは'],['We','私たちは'],['They','彼らは']];
const places=['Kyoto','Tokyo','Osaka','the park','the museum','the library','the zoo','the station','the school','the city','the town','the store'];
function beTransform(past=false){const out=[];for(const s of sing)for(const a of adjs){const be=past?'was':'is';const cap=past?'Was':'Is';out.push({mode:'neg',q:`${s} ${be} ${a}. を否定文にしなさい。`,a:`${s} ${be} not ${a}.`});out.push({mode:'q',q:`${s} ${be} ${a}. を疑問文にしなさい。`,a:`${cap} ${s==='He'||s==='She'?s.toLowerCase():s} ${a}?`});}return out;}
function beFill(){const out=[];for(const s of sing)for(const a of adjs)out.push({q:`${s} (      ) ${a}.`,a:'is'});return out;}
function beAnswer(past=false){const out=[];for(const s of sing)for(const a of adjs)for(const yes of [true,false]){const b=past?'was':'is';const cap=past?'Was':'Is';const pro=pronoun(s);out.push({yes,q:`${cap} ${s==='He'||s==='She'?s.toLowerCase():s} ${a}? に ${yes?'Yes':'No'} で答えなさい。`,a:`${yes?'Yes':'No'}, ${pro} ${yes?b:`${b} not`}.`});}return out;}
function thirdTransform(){const out=[];for(const s of sing)for(const [base,third] of actions){out.push({mode:'neg',q:`${s} ${third}. を否定文にしなさい。`,a:`${s} does not ${base}.`});out.push({mode:'q',q:`${s} ${third}. を疑問文にしなさい。`,a:`Does ${s==='He'||s==='She'?s.toLowerCase():s} ${base}?`});}return out;}
function thirdFill(){const out=[];for(const s of sing)for(const [base,third,jp] of actions)out.push({q:`${s} (      ) every day. 「${jp}」の意味になるように、空所に入る最も適切な語(句)を書きなさい。`,a:third.charAt(0).toUpperCase()+third.slice(1)});return out;}
function thirdError(){const out=[];for(const s of sing)for(const [base,third] of actions)out.push({q:`${s} ${base} every day. の誤りを直しなさい。`,a:`${s} ${third} every day.`});return out;}
function generalComposition(third=false){const out=[];if(third){for(const s of sing)for(const [base,form,jp] of actions)out.push({q:`次の日本語に合う英文を書きなさい。『${s==='He'?'彼':s==='She'?'彼女':s}は${jp}。』`,a:`${s} ${form}.`});}else{for(const [s,jps] of pluralSubs)for(const [base,,jp] of actions)out.push({q:`次の日本語に合う英文を書きなさい。『${jps}${jp}。』`,a:`${s} ${base}.`});}return out;}
function perfectTransform(continuous=false){const out=[];const subs=[['I','have'],['You','have'],['We','have'],['They','have'],['He','has'],['She','has'],['Tom','has'],['Ken','has'],['Emi','has'],['Yuki','has']];
 if(!continuous){for(const [s,h] of subs)for(const p of places){const decl=`${s} ${h} been to ${p} once.`;const cap=h==='has'?'Has':'Have';out.push({mode:'q',q:`${decl} を疑問文にしなさい。`,a:`${cap} ${s==='He'||s==='She'?s.toLowerCase():s} been to ${p} once?`});out.push({mode:'neg',q:`${decl} を否定文にしなさい。`,a:`${s} ${h} not been to ${p} once.`});}}
 else {const preds=[['been studying English for two hours','been studying English for two hours'],['been studying English for three hours','been studying English for three hours'],['been reading this book for an hour','been reading this book for an hour'],['been reading this book for two hours','been reading this book for two hours'],['been using this computer since this morning','been using this computer since this morning'],['been using this computer since noon','been using this computer since noon'],['lived in this town for three years','lived in this town for three years'],['lived in this city for five years','lived in this city for five years'],['been waiting for the bus for ten minutes','been waiting for the bus for ten minutes'],['been waiting for the bus for twenty minutes','been waiting for the bus for twenty minutes'],['been playing soccer for an hour','been playing soccer for an hour'],['been playing tennis for two hours','been playing tennis for two hours'],['been working here since Monday','been working here since Monday'],['been working here since Tuesday','been working here since Tuesday'],['known Ken for five years','known Ken for five years'],['known Tom for three years','known Tom for three years'],['been practicing English since this morning','been practicing English since this morning'],['been practicing tennis since noon','been practicing tennis since noon'],['been cleaning the room for an hour','been cleaning the room for an hour'],['been cooking dinner for thirty minutes','been cooking dinner for thirty minutes']];for(const [s,h] of subs)for(const [pred] of preds){const decl=`${s} ${h} ${pred}.`;const cap=h==='has'?'Has':'Have';out.push({mode:'q',q:`${decl} を疑問文にしなさい。`,a:`${cap} ${s==='He'||s==='She'?s.toLowerCase():s} ${pred}?`});out.push({mode:'neg',q:`${decl} を否定文にしなさい。`,a:`${s} ${h} not ${pred}.`});}}
 return out;}
const pools={
 '中1/be動詞/変形':beTransform(false),'中1/過去のbe動詞/変形':beTransform(true),'中1/be動詞/空所補充':beFill(),'中1/be動詞/答え方':beAnswer(false),'中1/過去のbe動詞/答え方':beAnswer(true),
 '中1/三単現/変形':thirdTransform(),'中1/三単現/空所補充':thirdFill(),'中1/三単現/間違い直し':thirdError(),
 '中2/一般動詞/英作文':generalComposition(false),'中2/三単現/英作文':generalComposition(true),
 '中3/現在完了形（完了・経験）/変形':perfectTransform(false),'中3/現在完了形（継続），現在完了進行形/変形':perfectTransform(true)
};
function originalMode(x){if(/否定文/.test(x.q||''))return'neg';if(/疑問文/.test(x.q||''))return'q';if(/Yes/.test(x.q||''))return true;if(/No/.test(x.q||''))return false;return null;}
function candidateFor(x,offset){let pool=pools[family(x)];if(!pool)return null;const mode=originalMode(x);if(mode!==null)pool=pool.filter(v=>v.mode===mode||v.yes===mode||(!('mode'in v)&&!('yes'in v)));if(!pool.length)return null;for(let i=0;i<pool.length;i++){const c=pool[(offset+i)%pool.length];if(!existing.has(key(c.q,c.a)))return c;}return null;}
let groupOrdinal=0;
for(const items of groups.values()){
 if(items.length<2)continue;const f=family(items[0]);if(!pools[f])continue;let touched=false;
 for(let i=1;i<items.length;i++){const x=items[i];if(family(x)!==f)continue;const c=candidateFor(x,(groupOrdinal*17+i*11)%pools[f].length);if(!c){stats.skipped_no_candidate++;continue;}const before={q:x.q,a:x.a};existing.delete(key(x.q,x.a));x.q=c.q;x.a=c.a;existing.add(key(x.q,x.a));changed.add(x.id);stats.by_family[f]=(stats.by_family[f]||0)+1;touched=true;if(stats.samples.length<120)stats.samples.push({id:x.id,family:f,before,after:{q:x.q,a:x.a}});}
 if(touched)stats.groups_touched++;groupOrdinal++;
}
stats.changed_rows=changed.size;
const newJson=JSON.stringify(all);html=html.slice(0,m.index)+m[0].replace(m[1],newJson)+html.slice(m.index+m[0].length);fs.writeFileSync(HTML,html);fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),...stats},null,2)+'\n');console.log(JSON.stringify(stats,null,2));if(!stats.changed_rows)throw Error('no duplicate diversification changes');
