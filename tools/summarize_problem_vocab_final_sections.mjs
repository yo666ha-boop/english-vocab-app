import fs from 'node:fs';

const src='audit/PROBLEM_APP_VOCAB_BROWSER_MATRIX.json';
const dst='audit/PROBLEM_APP_VOCAB_FINAL_SECTION_SUMMARY.json';
const data=JSON.parse(fs.readFileSync(src,'utf8'));
const scopes=[];
const rows=[];
for(const [grade,books] of Object.entries(data.grammar_attrition||{})){
  for(const [textbook,block] of Object.entries(books||{})){
    const sections=Array.isArray(block?.sections)?block.sections:[];
    if(!sections.length) continue;
    const sec=sections[sections.length-1];
    const scope={grade,textbook,section:sec.section,position:sec.position,section_count:sec.section_count,category_rows:0,zeroed_rows:0,severe_under_25pct_rows:0,under_50pct_rows:0,min_retention_pct:null};
    for(const r of sec.categories||[]){
      const row={grade,textbook,section:sec.section,category:r.value||r.label,off:r.off,on:r.on,retention_pct:r.retention_pct,zeroed:!!r.zeroed,severe_under_25pct:!!r.severe_under_25pct,under_50pct:!!r.under_50pct};
      rows.push(row); scope.category_rows++;
      if(row.zeroed) scope.zeroed_rows++;
      if(row.severe_under_25pct) scope.severe_under_25pct_rows++;
      if(row.under_50pct) scope.under_50pct_rows++;
      scope.min_retention_pct=scope.min_retention_pct==null?row.retention_pct:Math.min(scope.min_retention_pct,row.retention_pct);
    }
    scopes.push(scope);
  }
}
rows.sort((a,b)=>a.retention_pct-b.retention_pct || b.off-a.off || a.grade.localeCompare(b.grade,'ja') || a.textbook.localeCompare(b.textbook,'ja'));
const out={generated_at:new Date().toISOString(),scope:'final_section_only_for_each_grade_textbook',note:'Final section is used as a conservative chronology-free check: by year end all grade-level grammar stages should be available. This does not replace a textbook/unit grammar chronology audit.',totals:{scopes:scopes.length,category_rows:rows.length,zeroed_rows:rows.filter(x=>x.zeroed).length,severe_under_25pct_rows:rows.filter(x=>x.severe_under_25pct).length,under_50pct_rows:rows.filter(x=>x.under_50pct).length,minimum_retention_pct:rows.length?rows[0].retention_pct:null},scopes,worst_rows:rows,severe_under_25pct:rows.filter(x=>x.severe_under_25pct),under_50pct:rows.filter(x=>x.under_50pct)};
fs.writeFileSync(dst,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out.totals,null,2));
console.log(JSON.stringify(out.severe_under_25pct,null,2));
