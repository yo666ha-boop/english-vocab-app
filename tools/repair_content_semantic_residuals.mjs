import fs from 'node:fs';
const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_SEMANTIC_RESIDUAL_REPAIR.json';
let html=fs.readFileSync(HTML,'utf8');
const re=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i;
const m=re.exec(html);if(!m)throw Error('qb-data not found');
const all=JSON.parse(m[1]);const rows=all.filter(x=>x?.subject==='英語');
const fam=x=>`${x.grade}/${x.category}/${x.type}`;
const bad=/^(This|That) (bag|book|chair|house|desk|table|car|bike|flower)\b([\s\S]*?)\b(busier|kinder|younger)\b([\s\S]*)$/i;
const stats={changed_rows:0,by_family:{},samples:[]};
for(const x of rows){
  if(x.category!=='比較'||x.type!=='英作文')continue;
  const a=String(x.a||'');const hit=bad.exec(a);if(!hit)continue;
  const before={q:x.q,a:x.a};
  x.a=a.replace(/\b(?:busier|kinder|younger)\b/i,'bigger');
  x.q=String(x.q||'').replace(/(より)\s*(?:忙しい|親切(?:だ|です)?|若い)(?:です)?/,'$1大きいです');
  if(x.q===before.q){
    x.q=String(x.q||'').replace(/忙しい|親切(?:だ|です)?|若い/,'大きい');
  }
  stats.changed_rows++;const f=fam(x);stats.by_family[f]=(stats.by_family[f]||0)+1;
  if(stats.samples.length<50)stats.samples.push({id:x.id,family:f,before,after:{q:x.q,a:x.a}});
}
const residual=[];
for(const x of rows){if(x.category==='比較'&&x.type==='英作文'&&bad.test(String(x.a||'')))residual.push({id:x.id,q:x.q,a:x.a});}
stats.residual_count=residual.length;stats.residual_samples=residual.slice(0,30);
const newJson=JSON.stringify(all);
html=html.slice(0,m.index)+m[0].replace(m[1],newJson)+html.slice(m.index+m[0].length);
fs.writeFileSync(HTML,html);
fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),...stats},null,2)+'\n');
console.log(JSON.stringify(stats,null,2));
if(residual.length)throw Error(`semantic residuals ${residual.length}`);
