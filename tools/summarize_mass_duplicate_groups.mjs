import fs from 'node:fs';
const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_MASS_DUPLICATE_GROUPS.json';
const html=fs.readFileSync(HTML,'utf8');
const m=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);if(!m)throw Error('qb-data');
const rows=JSON.parse(m[1]).filter(x=>x?.subject==='英語');
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const groups=new Map();
for(const x of rows){const k=norm(x.q)+'\u0000'+norm(x.a);const a=groups.get(k)||[];a.push(x);groups.set(k,a);}
const out=[];
for(const items of groups.values()){
  if(items.length<10)continue;
  const x=items[0];
  out.push({count:items.length,excess:items.length-1,grade:x.grade,category:x.category,type:x.type,q:x.q,a:x.a,prefixes:[...new Set(items.map(v=>String(v.id||'').replace(/-\d+$/,'')))]});
}
out.sort((a,b)=>b.count-a.count||a.grade.localeCompare(b.grade)||a.category.localeCompare(b.category)||a.type.localeCompare(b.type)||a.q.localeCompare(b.q));
const result={generated_at:new Date().toISOString(),mass_group_count:out.length,mass_row_count:out.reduce((s,x)=>s+x.count,0),mass_excess:out.reduce((s,x)=>s+x.excess,0),groups:out};
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({mass_group_count:result.mass_group_count,mass_row_count:result.mass_row_count,mass_excess:result.mass_excess},null,2));
