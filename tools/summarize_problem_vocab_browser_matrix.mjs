import fs from 'node:fs';

// 2026-08-26: rerun after dynamic learned-grammar matrix landed.
// 2026-08-26: rerun after context-dependent fallback cache fix.
// 2026-08-26: rerun after core learned-grammar vocab-safe fallback.
// 2026-08-26: rerun after be-present runtime-category repair.
// 2026-08-26: rerun after early learned low-retention fallback expansion.
// 2026-08-26: rerun after imperative/present-verb fallback expansion.
// 2026-08-26: rerun after pattern-one runtime-category fallback fix.
// 2026-08-26: rerun after remaining severe grammar fallback expansion.
// 2026-08-26: rerun after past-tense runtime-category fallback fix.
// 2026-08-26: rerun after there-is next-band fallback.
// 2026-08-26: rerun after be-vs-verb distinction fallback.
// 2026-08-26: rerun summary after all past-stage category fallbacks matrix.
// 2026-08-26: rerun summary after final common grammar fallbacks matrix.
// 2026-08-26: rerun summary after supplemental-only fallback allowance matrix.
// 2026-08-26: rerun summary from post-pronoun-quality final-candidate matrix.
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
        prev.rows++; if(row.zeroed)prev.zeroed_rows++; if(row.severe_under_25pct)prev.severe_rows++; if(row.under_50pct)prev.under_50_rows++;
        if(row.retention_pct<prev.min_retention_pct){prev.min_retention_pct=row.retention_pct;prev.worst=row;}
        byCategory.set(catKey,prev);
      }
    }
    byScope[scopeKey]=scope;
  }
}
const finalRows=rows.filter(r=>r.position===r.section_count);
const lateRows=rows.filter(r=>r.position>=Math.ceil(r.section_count*0.75));
const stat=arr=>({rows:arr.length,zeroed:arr.filter(r=>r.zeroed).length,severe_under_25pct:arr.filter(r=>r.severe_under_25pct).length,under_50pct:arr.filter(r=>r.under_50pct).length,min_retention_pct:arr.length?Math.min(...arr.map(r=>r.retention_pct)):null});
const worstRows=[...rows].sort((a,b)=>a.retention_pct-b.retention_pct||a.grade.localeCompare(b.grade)||a.textbook.localeCompare(b.textbook)||a.position-b.position).slice(0,50);
const categories=[...byCategory.values()].sort((a,b)=>a.min_retention_pct-b.min_retention_pct||a.grade.localeCompare(b.grade)||a.category.localeCompare(b.category));
const summary={generated_at:new Date().toISOString(),source:input,totals:stat(rows),final_section:stat(finalRows),late_quarter:stat(lateRows),by_scope:byScope,worst_rows:worstRows,by_category:categories};
fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n');
const gaps=finalRows.filter(r=>r.under_50pct).sort((a,b)=>a.retention_pct-b.retention_pct);
fs.writeFileSync(gapOutput,JSON.stringify({generated_at:new Date().toISOString(),source:input,scope:'final section of each grade/textbook; learned grammar only because matrix stages are dynamically read from actual UI',summary:stat(finalRows),gaps},null,2)+'\n');
console.log(JSON.stringify({totals:summary.totals,final_section:summary.final_section,late_quarter:summary.late_quarter,worst_rows:worstRows.slice(0,15),final_gaps:gaps},null,2));
