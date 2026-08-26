import fs from 'node:fs';

const LOW='audit/PROBLEM_APP_VOCAB_LOW_RETENTION_ROWS.json';
const SAFE='audit/PROBLEM_APP_PASSMETA_SAFE_AUDIT.json';
const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_VOCAB_PERSISTENT_UNRESOLVED_TOKENS.json';

function scriptJson(html,id){
  const m=new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i').exec(html);
  if(!m) throw new Error(`${id} not found`);
  return JSON.parse(m[1]);
}
function tokensOf(s){
  return [...String(s??'').replace(/[’‘]/g,"'").matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)].map(m=>m[0].toLowerCase());
}
function countTypes(items){
  const out={};
  for(const item of items) out[item.type]=(out[item.type]||0)+1;
  return Object.fromEntries(Object.entries(out).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])));
}

const low=JSON.parse(fs.readFileSync(LOW,'utf8'));
const safe=JSON.parse(fs.readFileSync(SAFE,'utf8'));
const html=fs.readFileSync(HTML,'utf8');
const qb=scriptJson(html,'qb-data').filter(x=>x.subject==='英語');
const meta=scriptJson(html,'meta-data');

const persistent=(low.progression||[]).filter(x=>x.classification==='persistent_to_final');
const results=[];
for(const group of persistent){
  const records=(low.records||[]).filter(r=>r.grade===group.grade&&r.textbook===group.textbook&&r.category===group.category);
  if(!records.length) throw new Error(`no records for ${group.grade}/${group.textbook}/${group.category}`);
  const mapped=[...new Set(records.flatMap(r=>r.runtime_mapped_categories||[r.category]))];
  const pool=qb.filter(x=>x.grade===group.grade&&mapped.includes(x.category));
  const unresolved=pool.filter(item=>{
    const raw=(meta.passMeta?.[item.id]||{})[group.textbook];
    const v=Number.isInteger(raw)?raw:Number(raw);
    return !Number.isFinite(v)||v===-1;
  });
  const knownUnknown=new Set(((safe.unresolved_tokens?.[group.textbook]?.[group.grade])||[]).map(x=>x.token));
  const counts=new Map();
  const examples=new Map();
  for(const item of unresolved){
    for(const tok of new Set(tokensOf(`${item.q??''} ${item.a??''}`))){
      if(!knownUnknown.has(tok)) continue;
      counts.set(tok,(counts.get(tok)||0)+1);
      if(!examples.has(tok)) examples.set(tok,[]);
      const a=examples.get(tok);
      if(a.length<4)a.push({id:item.id,type:item.type,q:item.q,a:item.a});
    }
  }
  const tokens=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([token,count])=>({token,count,examples:examples.get(token)}));
  const finalRecord=[...records].sort((a,b)=>b.position-a.position)[0];
  results.push({
    grade:group.grade,textbook:group.textbook,category:group.category,
    rows:group.rows,first_section:group.first_section,last_section:group.last_section,
    min_retention_pct:group.min_retention_pct,max_retention_pct:group.max_retention_pct,
    runtime_mapped_categories:mapped,original_pool:pool.length,unresolved_problem_count:unresolved.length,
    original_types:countTypes(pool),unresolved_types:countTypes(unresolved),
    final_section:{section:finalRecord.section,position:finalRecord.position,off:finalRecord.off,on:finalRecord.on,retention_pct:finalRecord.retention_pct,original_types:finalRecord.original_types},
    matched_global_unresolved_token_count:tokens.length,
    top_unresolved_tokens:tokens.slice(0,80)
  });
}
const out={generated_at:new Date().toISOString(),source_low_retention:LOW,source_passmeta_audit:SAFE,persistent_group_count:persistent.length,results};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({persistent_group_count:persistent.length,results:results.map(r=>({grade:r.grade,textbook:r.textbook,category:r.category,pool:r.original_pool,unresolved:r.unresolved_problem_count,original_types:r.original_types,unresolved_types:r.unresolved_types,final_section:r.final_section,top:r.top_unresolved_tokens.slice(0,30).map(x=>[x.token,x.count])}))},null,2));
