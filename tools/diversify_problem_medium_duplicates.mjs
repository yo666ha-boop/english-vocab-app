import fs from 'node:fs';
const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_MEDIUM_DUPLICATE_DIVERSIFICATION.json';
let html=fs.readFileSync(HTML,'utf8');
const re=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i;
const m=re.exec(html);if(!m)throw Error('qb-data');
const all=JSON.parse(m[1]);const rows=all.filter(x=>x?.subject==='英語');
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const key=x=>norm(x.q)+'\u0000'+norm(x.a);const fam=x=>`${x.grade}/${x.category}/${x.type}`;
const map=new Map();for(const x of rows){const k=key(x);const a=map.get(k)||[];a.push(x);map.set(k,a);}const duplicateKeys=new Set([...map.entries()].filter(([,a])=>a.length>1).map(([k])=>k));
const targets=new Set([
'中2/一般動詞/英作文','中2/三単現/英作文','中3/be動詞と一般動詞（現在形）/変形','中1/過去の疑問文・否定文/変形','中2/未来表現/並びかえ','中3/関係代名詞/選択','中2/未来表現/空所補充','中1/一般動詞/変形','中1/be動詞/変形','中2/be動詞/変形','中2/be動詞/空所補充','中2/比較/間違い直し','中2/一般動詞の過去形/選択','中2/三単現/並びかえ']);
const names=[['Tom','トム','he'],['Ken','ケン','he'],['Mike','マイク','he'],['Bob','ボブ','he'],['John','ジョン','he'],['Emi','エミ','she'],['Yuki','ユキ','she'],['Aya','アヤ','she'],['Lucy','ルーシー','she'],['Mary','メアリー','she'],['Ann','アン','she'],['Kate','ケイト','she']];
const pluralSubs=[['I','私は','I'],['We','私たちは','we'],['They','彼らは','they'],['You','あなたは','you'],['My friends','私の友達は','they'],['The students','その生徒たちは','they'],['Tom and Ken','トムとケンは','they'],['Emi and Yuki','エミとユキは','they']];
const acts=[
 ['study English','studies English','studied English','英語を勉強します','英語を勉強しました'],
 ['play soccer','plays soccer','played soccer','サッカーをします','サッカーをしました'],
 ['read books','reads books','read books','本を読みます','本を読みました'],
 ['use a computer','uses a computer','used a computer','コンピューターを使います','コンピューターを使いました'],
 ['visit the library','visits the library','visited the library','図書館を訪れます','図書館を訪れました'],
 ['watch TV','watches TV','watched TV','テレビを見ます','テレビを見ました'],
 ['listen to music','listens to music','listened to music','音楽を聞きます','音楽を聞きました'],
 ['clean the room','cleans the room','cleaned the room','部屋を掃除します','部屋を掃除しました'],
 ['help my mother','helps his mother','helped his mother','母を手伝います','母を手伝いました'],
 ['practice the piano','practices the piano','practiced the piano','ピアノを練習します','ピアノを練習しました'],
 ['walk to school','walks to school','walked to school','歩いて学校へ行きます','歩いて学校へ行きました'],
 ['make lunch','makes lunch','made lunch','昼食を作ります','昼食を作りました'],
 ['open the window','opens the window','opened the window','窓を開けます','窓を開けました'],
 ['close the door','closes the door','closed the door','ドアを閉めます','ドアを閉めました'],
 ['answer the question','answers the question','answered the question','質問に答えます','質問に答えました'],
 ['take pictures','takes pictures','took pictures','写真を撮ります','写真を撮りました']
];
const adv=[[' every day','毎日'],[' after school','放課後'],[' on Sunday','日曜日に'],[' in the evening','夕方に']];
const adjs=[['busy','忙しい'],['happy','うれしい'],['tired','疲れている'],['free','ひまな'],['kind','親切な'],['ready','準備ができている'],['hungry','お腹がすいている'],['fine','元気な'],['young','若い'],['quiet','静かな'],['careful','注意深い'],['friendly','親しみやすい']];
const comp=[
 ['This bag','that one','large','larger'],['This book','that one','small','smaller'],['This question','that one','easy','easier'],['Tom','Ken','tall','taller'],['Emi','Yuki','young','younger'],['This room','that one','big','bigger'],['My bike','your bike','fast','faster'],['This desk','that one','heavy','heavier'],['This river','that one','long','longer'],['This box','that one','light','lighter'],['This movie','that one','exciting','more exciting'],['This idea','that one','important','more important']
];
const objects=[['book','read'],['letter','write'],['picture','show'],['question','answer'],['computer','use'],['room','clean'],['song','sing'],['movie','watch'],['bike','use'],['bag','carry'],['window','open'],['door','close']];
function pick(a,i){return a[i%a.length];}function cap(s){return s[0].toUpperCase()+s.slice(1);}function tokens(s){return s.replace(/[.,?]/g,'').split(/\s+/).filter(Boolean);}function scramble(s){const w=tokens(s),o=[];for(let j=1;j<w.length;j+=2)o.push(w[j]);for(let j=0;j<w.length;j+=2)o.push(w[j]);return o;}function reorder(s){return `次の語(句)を正しい順に並べかえなさい。 ( ${scramble(s).join(' / ')} )`;}
function build(f,i){
 const n=pick(names,i),a=pick(acts,Math.floor(i/names.length)),p=pick(pluralSubs,i),d=pick(adv,Math.floor(i/8));
 if(f==='中2/一般動詞/英作文'){const pp=pick(pluralSubs,i),aa=pick(acts,Math.floor(i/8));return {q:`次の日本語に合う英文を書きなさい。『${pp[1]}${d[1]}${aa[3]}。』`,a:`${pp[0]} ${aa[0]}${d[0]}.`};}
 if(f==='中2/三単現/英作文'){return {q:`次の日本語に合う英文を書きなさい。『${n[1]}は${d[1]}${a[3]}。』`,a:`${n[0]} ${a[1]}${d[0]}.`};}
 if(f==='中3/be動詞と一般動詞（現在形）/変形'){const j=Math.floor(i/names.length);if(j%2===0){const x=pick(adjs,j);return {q:`${n[0]} is ${x[0]}. を疑問文にしなさい。`,a:`Is ${n[0]} ${x[0]}?`};}return {q:`${n[0]} ${a[1]}${d[0]}. を否定文にしなさい。`,a:`${n[0]} does not ${a[0]}${d[0]}.`};}
 if(f==='中1/過去の疑問文・否定文/変形'){if(i%2===0)return {q:`${n[0]} ${a[2]} yesterday. を疑問文にしなさい。`,a:`Did ${n[0]} ${a[0]} yesterday?`};return {q:`${n[0]} ${a[2]} yesterday. を否定文にしなさい。`,a:`${n[0]} did not ${a[0]} yesterday.`};}
 if(f==='中2/未来表現/並びかえ'){const s=i%2===0?`${n[0]} will ${a[0]} tomorrow.`:`${n[0]} is going to ${a[0]} tomorrow.`;return {q:reorder(s),a:s};}
 if(f==='中3/関係代名詞/選択'){if(i%2===0){const v=pick([['running','走っている'],['singing','歌っている'],['studying','勉強している'],['reading','読んでいる'],['walking','歩いている'],['playing tennis','テニスをしている']],Math.floor(i/2));return {q:`The ${i%4===0?'boy':'girl'} ( who / which / where ) is ${v[0]} is ${n[0]}'s friend. 正しいものを選びなさい。`,a:'who'};}const o=pick(objects,Math.floor(i/2));return {q:`The ${o[0]} ( who / which / where ) ${n[0]} ${i%3===0?'bought':'used'} yesterday is mine. 正しいものを選びなさい。`,a:'which'};}
 if(f==='中2/未来表現/空所補充'){if(i%2===0)return {q:`${n[0]} (      ) ${a[0]} tomorrow. 「〜するつもりです」になるように空所に入る語句を書きなさい。`,a:'is going to'};return {q:`${n[0]} (      ) ${a[0]} next week. 「〜するでしょう」になるように空所に入る語を書きなさい。`,a:'will'};}
 if(f==='中1/一般動詞/変形'){const pp=pick(pluralSubs,i),aa=pick(acts,Math.floor(i/8));if(i%2===0)return {q:`${pp[0]} ${aa[0]}${d[0]}. を疑問文にしなさい。`,a:`Do ${pp[0]==='I'?'you':pp[0].toLowerCase()} ${aa[0]}${d[0]}?`};return {q:`${pp[0]} ${aa[0]}${d[0]}. を否定文にしなさい。`,a:`${pp[0]} do not ${aa[0]}${d[0]}.`};}
 if(f==='中1/be動詞/変形'||f==='中2/be動詞/変形'){const x=pick(adjs,Math.floor(i/names.length));if(i%2===0)return {q:`${n[0]} is ${x[0]}. を疑問文にしなさい。`,a:`Is ${n[0]} ${x[0]}?`};return {q:`${n[0]} is ${x[0]}. を否定文にしなさい。`,a:`${n[0]} is not ${x[0]}.`};}
 if(f==='中2/be動詞/空所補充'){const x=pick(adjs,Math.floor(i/names.length));return {q:`${n[0]} (      ) ${x[0]} today. 空所に入る最も適切なbe動詞を書きなさい。`,a:'is'};}
 if(f==='中2/比較/間違い直し'){const c=pick(comp,i);const wrong=c[3].startsWith('more ')?`${c[2]}er`:`more ${c[2]}`;return {q:`${c[0]} is ${wrong} than ${c[1]}. の誤りを直しなさい。`,a:`${c[0]} is ${c[3]} than ${c[1]}.`};}
 if(f==='中2/一般動詞の過去形/選択'){const aa=pick(acts,i);return {q:`${n[0]} ( ${aa[0].split(' ')[0]} / ${aa[2].split(' ')[0]} / ${aa[1].split(' ')[0]} ) ${aa[0].split(' ').slice(1).join(' ')} yesterday. 正しいものを選びなさい。`,a:cap(aa[2].split(' ')[0])};}
 if(f==='中2/三単現/並びかえ'){const s=`${n[0]} ${a[1]}${d[0]}.`;return {q:reorder(s),a:s};}
 return null;
}
const idx={};const stats={target_families:[...targets],duplicate_rows_before:[...map.values()].filter(a=>a.length>1).reduce((s,a)=>s+a.length,0),duplicate_excess_before:[...map.values()].filter(a=>a.length>1).reduce((s,a)=>s+a.length-1,0),changed_rows:0,by_family:{},samples:[]};
for(const x of rows){const f=fam(x);if(!targets.has(f)||!duplicateKeys.has(key(x)))continue;const i=idx[f]||0;idx[f]=i+1;const out=build(f,i);if(!out)throw Error('no builder '+f);const before={q:x.q,a:x.a};if(out.q!==x.q||out.a!==x.a){x.q=out.q;x.a=out.a;stats.changed_rows++;stats.by_family[f]=(stats.by_family[f]||0)+1;if(stats.samples.length<100)stats.samples.push({id:x.id,family:f,before,after:{q:x.q,a:x.a}});}}
const after=new Map();for(const x of rows){const k=key(x);const a=after.get(k)||[];a.push(x);after.set(k,a);}const dups=[...after.values()].filter(a=>a.length>1);stats.duplicate_rows_after=dups.reduce((s,a)=>s+a.length,0);stats.duplicate_excess_after=dups.reduce((s,a)=>s+a.length-1,0);stats.duplicate_groups_after=dups.length;stats.duplicate_row_ratio_after=Number((stats.duplicate_rows_after/rows.length).toFixed(6));stats.duplicate_excess_ratio_after=Number((stats.duplicate_excess_after/rows.length).toFixed(6));stats.groups_ge5_after=dups.filter(a=>a.length>=5).length;stats.groups_ge10_after=dups.filter(a=>a.length>=10).length;
const newJson=JSON.stringify(all);html=html.slice(0,m.index)+m[0].replace(m[1],newJson)+html.slice(m.index+m[0].length);fs.writeFileSync(HTML,html);fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),...stats},null,2)+'\n');console.log(JSON.stringify(stats,null,2));
if(!stats.changed_rows)throw Error('no rows changed');
