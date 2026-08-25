import fs from 'node:fs';

// 2026-08-26: rerun after dynamic learned-grammar matrix landed.
// 2026-08-26: rerun after context-dependent fallback cache fix.
// 2026-08-26: rerun after core learned-grammar vocab-safe fallback.
// 2026-08-26: rerun after be-present runtime-category repair.
// 2026-08-26: rerun after early learned low-retention fallback expansion.
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
const finalRows=[];
for(const [grade,books] of Object.entries(data.grammar_attrition||{})) for(const [textbook,block] of Object.entries(books||{})){const sec=block?.sections?.[block.sections.length-1];if(!sec)continue;for(const r of sec.categories||[])finalRows.push({grade,textbook,section:sec.section,position:sec.position,section_count:sec.section_count,category:r.value||r.label,off:r.off,on:r.on,retention_pct:r.retention_pct,zeroed:!!r.zeroed,severe_under_25pct:!!r.severe_under_25pct,under_50pct:!!r.under_50pct});}
finalRows.sort((a,b)=>a.retention_pct-b.retention_pct||b.off-a.off);
const finalGaps=finalRows.filter(r=>r.under_50pct);
const lateRows=rows.filter(r=>r.section_count>0 && r.position>=Math.ceil(r.section_count*0.75));
const count=x=>({rows:x.length,zeroed:x.filter(r=>r.zeroed).length,severe_under_25pct:x.filter(r=>r.severe_under_25pct).length,under_50pct:x.filter(r=>r.under_50pct).length,min_retention_pct:x.length?Math.min(...x.map(r=>r.retention_pct)):null});
const summary={generated_at:new Date().toISOString(),source:input,totals:count(rows),final_section:count(finalRows),late_quarter:count(lateRows),by_scope:byScope,worst_rows:rows.slice(0,120),worst_categories:[...byCategory.values()].sort((a,b)=>a.min_retention_pct-b.min_retention_pct||b.rows-a.rows).slice(0,120)};
fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(gapOutput,JSON.stringify({generated_at:summary.generated_at,source:input,rule:'last section of each grade/textbook scope; learned categories only because matrix is chronology-aware',rows:finalRows.length,under_50pct_count:finalGaps.length,gaps:finalGaps},null,2)+'\n');
console.log(JSON.stringify({output,gapOutput,totals:summary.totals,final_section:summary.final_section,late_quarter:summary.late_quarter,by_scope:summary.by_scope,worst_rows:summary.worst_rows.slice(0,20),final_gaps:finalGaps},null,2));
