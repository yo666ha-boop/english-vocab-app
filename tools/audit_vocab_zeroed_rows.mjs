import fs from 'node:fs';
import vm from 'node:vm';

const MATRIX='audit/PROBLEM_APP_VOCAB_BROWSER_MATRIX.json';
const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_VOCAB_ZEROED_ROWS.json';

function scriptJson(html,id){
  const m=new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i').exec(html);
  if(!m) throw new Error(`${id} not found`);
  return JSON.parse(m[1]);
}
function gradeNum(g){ return Number(String(g??'').replace(/\D/g,'')); }

const matrix=JSON.parse(fs.readFileSync(MATRIX,'utf8'));
const html=fs.readFileSync(HTML,'utf8');
const qb=scriptJson(html,'qb-data').filter(x=>x.subject==='英語');
const meta=scriptJson(html,'meta-data');

const rows = matrix.rows || matrix.records || matrix.categories || matrix.results || [];
if(!Array.isArray(rows) || !rows.length) throw new Error('matrix row array not found');
const zeroed=rows.filter(r=>r.zeroed===true || (Number(r.off)>0 && Number(r.on)===0));
const out=[];
for(const z of zeroed){
  const mapped = z.runtime_mapped_categories || z.mapped_categories || [z.category].filter(Boolean);
  const pool=qb.filter(x=>gradeNum(x.grade)===gradeNum(z.grade) && mapped.includes(x.category));
  const rejected=[];
  const coordCounts=new Map();
  for(const item of pool){
    const v=(meta.passMeta?.[item.id]||{})[z.textbook];
    if(v===-1 || v==null){
      rejected.push({id:item.id,category:item.category,type:item.type,q:item.q,a:item.a,passMeta:v??null});
      coordCounts.set(String(v??'null'),(coordCounts.get(String(v??'null'))||0)+1);
    }
  }
  out.push({
    grade:z.grade,textbook:z.textbook,section:z.section,position:z.position,category:z.category,
    off:z.off,on:z.on,retention_pct:z.retention_pct,
    mapped_categories:mapped,original_pool:pool.length,
    unresolved_count:rejected.length,
    unresolved_coordinate_values:Object.fromEntries(coordCounts),
    unresolved_samples:rejected.slice(0,40)
  });
}
fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),source:MATRIX,zeroed_count:out.length,records:out},null,2)+'\n');
console.log(JSON.stringify({zeroed_count:out.length,records:out.map(x=>({grade:x.grade,textbook:x.textbook,section:x.section,category:x.category,off:x.off,on:x.on,unresolved_count:x.unresolved_count}))},null,2));
