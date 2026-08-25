import fs from 'node:fs';

const input='audit/PROBLEM_APP_VOCAB_BROWSER_MATRIX.json';
const output='audit/PROBLEM_APP_VOCAB_BROWSER_MATRIX_SUMMARY.json';
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const rows=[];
const byScope={};
const byCategory=new Map();
for(const [grade,books] of Object.entries(data.grammar_attrition||{})){
  for(const [textbook,block] of Object.entries(books||{})){
    if(!block || !Array.isArray(block.sections)) continue;
    const scopeKey=`${grade}/${textbook}`;
    const scope={sections:block.sections.length,category_rows:0,zeroed_rows:0,severe_under_25pct_rows:0,under_50pct_rows:0,min_retention_pct:null};
    for(const sec of block.sections){
      for(const r of sec.categories||[]){
        const row={grade,textbook,section:sec.section,position:sec.position,section_count:sec.section_count,category:r.value||r.label,off:r.off,on:r.on,retention_pct:r.retention_pct,zeroed:!!r.zeroed,severe_under_25pct:!!r.severe_under_25pct,under_50pct:!!r.under_50pct};
        rows.push(row); scope.category_rows++;
        if(row.zeroed) scope.zeroed_rows++;
        if(row.severe_under_25pct) scope.severe_under_25pct_rows++;
        if(row.under_50pct) scope.under_50pct_rows++;
        scope.min_retention_pct=scope.min_retention_pct==null?row.retention_pct:Math.min(scope.min_retention_pct,row.retention_pct);
        const catKey=`${grade}/${row.category}`;
        const prev=byCategory.get(catKey)||{grade,category:row.category,rows:0,zeroed_rows:0,severe_rows:0,under_50_rows:0,min_retention_pct:101,worst:null};
        prev.rows++;
        if(row.zeroed) prev.zeroed_rows++;
        if(row.severe_under_25pct) prev.severe_rows++;
        if(row.under_50pct) prev.under_50_rows++;
        if(row.retention_pct<prev.min_retention_pct){prev.min_retention_pct=row.retention_pct;prev.worst={textbook,section:row.section,off:row.off,on:row.on,retention_pct:row.retention_pct};}
        byCategory.set(catKey,prev);
      }
    }
    byScope[scopeKey]=scope;
  }
}
rows.sort((a,b)=>a.retention_pct-b.retention_pct || b.off-a.off || a.grade.localeCompare(b.grade,'ja') || a.category.localeCompare(b.category,'ja'));
const categories=[...byCategory.values()].sort((a,b)=>a.min_retention_pct-b.min_retention_pct || b.severe_rows-a.severe_rows || a.grade.localeCompare(b.grade,'ja'));
const out={
  generated_at:new Date().toISOString(),
  source_sha256:null,
  scope:data.scope||null,
  totals:{
    sections_measured:Object.values(byScope).reduce((n,x)=>n+x.sections,0),
    category_rows:rows.length,
    zeroed_rows:rows.filter(x=>x.zeroed).length,
    severe_under_25pct_rows:rows.filter(x=>x.severe_under_25pct).length,
    under_50pct_rows:rows.filter(x=>x.under_50pct).length,
    minimum_retention_pct:rows.length?rows[0].retention_pct:null
  },
  by_scope:byScope,
  categories,
  worst_100:rows.slice(0,100),
  zeroed:rows.filter(x=>x.zeroed),
  severe_under_25pct:rows.filter(x=>x.severe_under_25pct),
};
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out.totals,null,2));
console.log('Worst 20');
console.log(JSON.stringify(out.worst_100.slice(0,20),null,2));
