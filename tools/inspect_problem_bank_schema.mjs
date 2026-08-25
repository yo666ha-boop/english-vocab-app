import fs from 'node:fs';

const html = fs.readFileSync('problem-app/index.html', 'utf8');
function scriptJson(id) {
  const m = new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i').exec(html);
  if (!m) throw new Error(`${id} not found`);
  return JSON.parse(m[1]);
}
const qb = scriptJson('qb-data');
const english = qb.filter(x => x.subject === '英語');
const keys = [...new Set(english.flatMap(x => Object.keys(x)))].sort();
const byGrade = {};
for (const grade of ['中1','中2','中3']) {
  const items = english.filter(x => x.grade === grade);
  byGrade[grade] = {
    count: items.length,
    samples: items.slice(0, 12),
    field_values: {}
  };
  for (const k of keys) {
    const vals = [...new Set(items.map(x => x[k]).filter(v => v !== undefined && v !== null && String(v).trim() !== '').map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)))];
    if (vals.length > 0 && vals.length <= 80) byGrade[grade].field_values[k] = vals.slice(0,80);
  }
}
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/PROBLEM_BANK_SCHEMA.json', JSON.stringify({english_count: english.length, keys, byGrade}, null, 2)+'\n');
console.log(JSON.stringify({english_count: english.length, keys, grade_counts: Object.fromEntries(Object.entries(byGrade).map(([g,v])=>[g,v.count]))}, null, 2));
