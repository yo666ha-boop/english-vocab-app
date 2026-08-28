import fs from 'node:fs';
const h=fs.readFileSync('problem-app/index.html','utf8');
const m=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i.exec(h);if(!m)throw Error('qb-data');
const rows=JSON.parse(m[1]).filter(x=>x?.subject==='英語');
const prefix=id=>{const z=/^(.+?)-\d+$/.exec(String(id||''));return z?z[1]:String(id||'').split('-')[0];};
const proper=new Set(['Tom','Ken','Mike','Emi','Yuki','Aya','Bob','Lucy','Mary','John','Jim','Ann','Kate','Lisa','Ben','Alex','Kenta','Miki','Mika','Saki','Riku','Kota','Takumi']);
const wordRe=/[A-Za-z][A-Za-z'-]*/g;
const groups={};
for(const x of rows){
 if(x.type!=='英作文'||!/次の日本語に合う英文/.test(x.q||'')) continue;
 const qm=/『([^』]*)』/.exec(x.q||''); if(!qm) continue;
 const bad=(qm[1].match(wordRe)||[]).filter(t=>!proper.has(t)&&!(/^[ABC]$/.test(t)));
 if(!bad.length) continue;
 const k=`${prefix(x.id)}|${x.grade}|${x.category}`;
 const g=groups[k]??={prefix:prefix(x.id),grade:x.grade,category:x.category,count:0,samples:[]};g.count++;
 if(g.samples.length<12)g.samples.push({id:x.id,jp:qm[1],a:x.a});
}
const out=Object.values(groups).sort((a,b)=>b.count-a.count||a.prefix.localeCompare(b.prefix));
fs.writeFileSync('audit/PROBLEM_APP_CONTENT_TEMPLATE_SUMMARY.json',JSON.stringify({generated_at:new Date().toISOString(),groups:out},null,2)+'\n');
console.log(JSON.stringify(out,null,2));
