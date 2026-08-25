import fs from 'node:fs';

// 2026-08-26: rerun after dynamic learned-grammar matrix landed.
// 2026-08-26: rerun after context-dependent fallback cache fix.
// 2026-08-26: rerun after core learned-grammar vocab-safe fallback.
const input='audit/PROBLEM_APP_VOCAB_BROWSER_MATRIX.json';
const output='audit/PROBLEM_APP_VOCAB_BROWSER_MATRIX_SUMMARY.json';
const gapOutput='audit/PROBLEM_APP_VOCAB_FINAL_SECTION_GAPS.json';
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
const finalRows=rows.filter(x=>x.position===x.section_count).sort((a,b)=>a.retention_pct-b.retention_pct || b.off-a.off);
const lateRows=rows.filter(x=>x.position>=Math.max(1,Math.ceil(x.section_count*0.75))).sort((a,b)=>a.retention_pct-b.retention_pct || b.off-a.off);
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
    minimum_retention_pct:rows.length?rows[0].retention_pct:null,
    final_section_category_rows:finalRows.length,
    final_section_zeroed_rows:finalRows.filter(x=>x.zeroed).length,
    final_section_severe_under_25pct_rows:finalRows.filter(x=>x.severe_under_25pct).length,
    final_section_under_50pct_rows:finalRows.filter(x=>x.under_50pct).length,
    late_quarter_category_rows:lateRows.length,
    late_quarter_zeroed_rows:lateRows.filter(x=>x.zeroed).length,
    late_quarter_severe_under_25pct_rows:lateRows.filter(x=>x.severe_under_25pct).length,
    late_quarter_under_50pct_rows:lateRows.filter(x=>x.under_50pct).length
  },
  by_scope:byScope,
  categories,
  final_section:{
    rows:finalRows,
    zeroed:finalRows.filter(x=>x.zeroed),
    severe_under_25pct:finalRows.filter(x=>x.severe_under_25pct),
    under_50pct:finalRows.filter(x=>x.under_50pct)
  },
  late_quarter:{
    severe_under_25pct:lateRows.filter(x=>x.severe_under_25pct),
    under_50pct:lateRows.filter(x=>x.under_50pct)
  },
  worst_100:rows.slice(0,100),
  zeroed:rows.filter(x=>x.zeroed),
  severe_under_25pct:rows.filter(x=>x.severe_under_25pct),
};
const gapOut={
  generated_at:out.generated_at,
  scope:data.scope||null,
  final_section_totals:{
    category_rows:finalRows.length,
    zeroed:finalRows.filter(x=>x.zeroed).length,
    severe_under_25pct:finalRows.filter(x=>x.severe_under_25pct).length,
    under_50pct:finalRows.filter(x=>x.under_50pct).length
  },
  final_under_50pct:finalRows.filter(x=>x.under_50pct),
  late_quarter_severe_under_25pct:lateRows.filter(x=>x.severe_under_25pct),
  note:'Rows are chronology-aware when the source matrix exposes only currently learned stages. Final-section rows remain mature-grade diagnostics.'
};
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');
fs.writeFileSync(gapOutput,JSON.stringify(gapOut,null,2)+'\n');
console.log(JSON.stringify(out.totals,null,2));
console.log('Final-section under 50');
console.log(JSON.stringify(gapOut.final_under_50pct,null,2));
