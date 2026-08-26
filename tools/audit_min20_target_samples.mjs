import fs from 'node:fs';
const html=fs.readFileSync('problem-app/index.html','utf8');
const m=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i.exec(html); if(!m) throw new Error('qb-data not found');
const all=JSON.parse(m[1]);
const targets=['人称代名詞','不定詞②','命令文'];
const out={};
for(const cat of targets){out[cat]=all.filter(x=>x?.subject==='英語'&&x?.grade==='中2'&&x?.category===cat).slice(0,30).map(x=>({id:x.id,type:x.type,q:x.q,a:x.a}));}
fs.writeFileSync('audit/PROBLEM_APP_MIN20_TARGET_SAMPLES.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(out).map(([k,v])=>[k,v.slice(0,10)])),null,2));
