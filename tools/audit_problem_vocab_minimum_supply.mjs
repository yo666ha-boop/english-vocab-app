import fs from 'node:fs';

const input='audit/PROBLEM_APP_VOCAB_BROWSER_MATRIX.json';
const output='audit/PROBLEM_APP_VOCAB_MINIMUM_SUPPLY.json';
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const rows=[];
for(const [grade,books] of Object.entries(data.grammar_attrition||{})){
  for(const [textbook,block] of Object.entries(books||{})){
    for(const sec of block?.sections||[]){
      for(const r of sec.categories||[]){
        rows.push({grade,textbook,section:sec.section,position:sec.position,section_count:sec.section_count,category:r.value||r.label,off:Number(r.off||0),on:Number(r.on||0),retention_pct:Number(r.retention_pct||0)});
      }
    }
  }
}
const below20=rows.filter(r=>r.on<20);
const finalBelow20=below20.filter(r=>r.position===r.section_count);
const lateBelow20=below20.filter(r=>r.position>=Math.ceil(r.section_count*0.75));
const minOn=rows.length?Math.min(...rows.map(r=>r.on)):null;
const result={generated_at:new Date().toISOString(),source:input,total_rows:rows.length,min_on:minOn,below_20_count:below20.length,late_quarter_below_20_count:lateBelow20.length,final_section_below_20_count:finalBelow20.length,below_20:below20.sort((a,b)=>a.on-b.on||a.retention_pct-b.retention_pct),final_section_below_20:finalBelow20};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({total_rows:result.total_rows,min_on:result.min_on,below_20_count:result.below_20_count,late_quarter_below_20_count:result.late_quarter_below_20_count,final_section_below_20_count:result.final_section_below_20_count,worst:result.below_20.slice(0,30)},null,2));
