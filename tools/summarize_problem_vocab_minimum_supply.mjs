import fs from 'node:fs';
const input='audit/PROBLEM_APP_VOCAB_MINIMUM_SUPPLY.json';
const output='audit/PROBLEM_APP_VOCAB_MINIMUM_SUPPLY_SUMMARY.json';
const d=JSON.parse(fs.readFileSync(input,'utf8'));
const final=d.final_section_below_20||[];
const late=(d.below_20||[]).filter(r=>r.position>=Math.ceil(r.section_count*0.75));
const result={generated_at:new Date().toISOString(),total_rows:d.total_rows,min_on:d.min_on,below_20_count:d.below_20_count,late_quarter_below_20_count:d.late_quarter_below_20_count,final_section_below_20_count:d.final_section_below_20_count,final_section_below_20:final,final_with_off_at_least_20:final.filter(r=>r.off>=20),late_unique_groups:[...new Map(late.map(r=>[`${r.grade}/${r.textbook}/${r.category}`,{grade:r.grade,textbook:r.textbook,category:r.category,min_on:r.on,off:r.off,last_position:r.position,section_count:r.section_count}])).values()]};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
