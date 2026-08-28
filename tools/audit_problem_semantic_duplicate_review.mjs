import fs from 'node:fs';

const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_SEMANTIC_DUPLICATE_REVIEW.json';
const html=fs.readFileSync(HTML,'utf8');
const m=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
if(!m) throw new Error('qb-data not found');
const rows=JSON.parse(m[1]).filter(x=>x?.subject==='英語');
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const family=x=>`${x.grade}/${x.category}/${x.type}`;
const prefix=x=>String(x.id||'').replace(/-\d+$/,'');
const byQA=new Map();
for(const x of rows){const k=`${norm(x.q)}\u0000${norm(x.a)}`;const a=byQA.get(k)||[];a.push(x);byQA.set(k,a);}
const groups=[];
for(const items of byQA.values()){
  if(items.length<2) continue;
  const fams=[...new Set(items.map(family))];
  const cats=[...new Set(items.map(x=>`${x.grade}/${x.category}`))];
  const types=[...new Set(items.map(x=>x.type))];
  const prefixes=[...new Set(items.map(prefix))];
  let classification='same_family_copy';
  if(cats.length===1 && types.length>1) classification='same_category_cross_type';
  else if(cats.length>1) classification='cross_category';
  const samePrefix=prefixes.length===1;
  groups.push({classification,count:items.length,excess:items.length-1,same_prefix:samePrefix,families:fams,prefixes,q:items[0].q,a:items[0].a,ids:items.map(x=>x.id)});
}
groups.sort((a,b)=>b.excess-a.excess||a.classification.localeCompare(b.classification)||String(a.q).localeCompare(String(b.q)));
const counts={}; const excess={};
for(const g of groups){counts[g.classification]=(counts[g.classification]||0)+1;excess[g.classification]=(excess[g.classification]||0)+g.excess;}
const sameFamily=groups.filter(g=>g.classification==='same_family_copy');
const sameFamilySamePrefix=sameFamily.filter(g=>g.same_prefix);
const cross=groups.filter(g=>g.classification!=='same_family_copy');
const out={
  generated_at:new Date().toISOString(),source:HTML,english_count:rows.length,
  duplicate_group_count:groups.length,duplicate_excess:groups.reduce((s,g)=>s+g.excess,0),
  classification_group_counts:counts,classification_excess_counts:excess,
  review_priority:{
    same_family_same_prefix_groups:sameFamilySamePrefix.length,
    same_family_same_prefix_excess:sameFamilySamePrefix.reduce((s,g)=>s+g.excess,0),
    cross_family_groups:cross.length,
    policy:'same-family + same-prefix exact Q/A duplicates are highest-confidence template-copy review targets; cross-family duplicates require pedagogical review before diversification.'
  },
  same_family_same_prefix: sameFamilySamePrefix.slice(0,500),
  same_family_other_prefix: sameFamily.filter(g=>!g.same_prefix).slice(0,500),
  cross_family: cross.slice(0,500)
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({duplicate_groups:out.duplicate_group_count,duplicate_excess:out.duplicate_excess,classification_group_counts:counts,review_priority:out.review_priority},null,2));
