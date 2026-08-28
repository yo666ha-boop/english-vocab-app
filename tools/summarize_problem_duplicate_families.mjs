import fs from 'node:fs';
const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_DUPLICATE_FAMILY_SUMMARY.json';
const h=fs.readFileSync(HTML,'utf8');
const m=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i.exec(h);if(!m)throw Error('qb-data');
const rows=JSON.parse(m[1]).filter(x=>x?.subject==='英語');
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const prefix=id=>{const z=/^(.+?)-\d+$/.exec(String(id||''));return z?z[1]:String(id||'').split('-')[0];};
const map=new Map();
for(const x of rows){const k=norm(x.q)+'\u0000'+norm(x.a);const a=map.get(k)||[];a.push(x);map.set(k,a);}
const groups=[];const families={};const prefixes={};
let duplicateRows=0,excess=0;
for(const items of map.values()){
 if(items.length<2)continue;
 duplicateRows+=items.length;excess+=items.length-1;
 const first=items[0];
 groups.push({count:items.length,excess:items.length-1,q:first.q,a:first.a,ids:items.slice(0,40).map(x=>x.id),families:[...new Set(items.map(x=>`${x.grade}/${x.category}/${x.type}`))],prefixes:[...new Set(items.map(x=>prefix(x.id)))]});
 for(const x of items){const k=`${x.grade}/${x.category}/${x.type}`;families[k]??={row_count:0,group_keys:new Set(),excess_estimate:0};families[k].row_count++;families[k].group_keys.add(norm(first.q)+'\u0000'+norm(first.a));}
 for(const x of items){const k=prefix(x.id);prefixes[k]=(prefixes[k]||0)+1;}
}
for(const g of groups){for(const f of g.families){if(families[f])families[f].excess_estimate+=g.excess/g.families.length;}}
const familySummary=Object.entries(families).map(([family,v])=>({family,row_count:v.row_count,duplicate_group_count:v.group_keys.size,excess_estimate:Math.round(v.excess_estimate)})).sort((a,b)=>b.excess_estimate-a.excess_estimate||b.row_count-a.row_count||a.family.localeCompare(b.family));
const prefixSummary=Object.entries(prefixes).map(([prefix,row_count])=>({prefix,row_count})).sort((a,b)=>b.row_count-a.row_count||a.prefix.localeCompare(b.prefix));
groups.sort((a,b)=>b.excess-a.excess||b.count-a.count||String(a.q).localeCompare(String(b.q)));
const out={generated_at:new Date().toISOString(),english_count:rows.length,duplicate_row_count:duplicateRows,duplicate_excess:excess,duplicate_group_count:groups.length,row_ratio:Number((duplicateRows/rows.length).toFixed(6)),family_summary:familySummary,prefix_summary:prefixSummary,top_groups:groups.slice(0,400)};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({english_count:rows.length,duplicate_row_count:duplicateRows,duplicate_excess:excess,duplicate_group_count:groups.length,row_ratio:out.row_ratio,top_families:familySummary.slice(0,40),top_prefixes:prefixSummary.slice(0,30)},null,2));
