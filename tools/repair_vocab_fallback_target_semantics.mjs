import fs from 'node:fs';

const paths=['problem-app/index.html','tools/install_vocab_safe_fallback_v1.mjs'];
const marker='VOCAB_FALLBACK_TARGET_FROM_LEARNED_SUPPLY_V1';
const anchor=`  const selectedTypeSet=new Set(types||[]);\n  const counts=new Map();`;
const replacement=`  const selectedTypeSet=new Set(types||[]);\n  // ${marker}: derive the replacement ceiling from the same learned-grammar/quality pool\n  // that is available with vocabulary filtering OFF. This avoids an arbitrary per-type count cap.\n  const targetCounts=new Map();\n  for(const item of qb) {\n    if(item.subject!=='英語' || item.grade!==grade) continue;\n    if(selectedCategorySet.size && !selectedCategorySet.has(item.category)) continue;\n    if(selectedTypeSet.size && !selectedTypeSet.has(item.type)) continue;\n    if(!passesPrereqGrammar(item) || !passesQualityGate(item)) continue;\n    const key=item.category+'\\u0000'+item.type;\n    targetCounts.set(key,(targetCounts.get(key)||0)+1);\n  }\n  const counts=new Map();`;
const oldCap=`    if((counts.get(key)||0)>=VOCAB_FALLBACK_TARGET_PER_CATEGORY_TYPE) continue;`;
const newCap=`    const target=targetCounts.get(key)||0;\n    if(!target || (counts.get(key)||0)>=target) continue;`;

const changed=[];
for(const path of paths){
  let s=fs.readFileSync(path,'utf8');
  if(s.includes(marker)){console.log(path+': already repaired');continue;}
  const ai=s.indexOf(anchor);
  if(ai<0 || s.indexOf(anchor,ai+anchor.length)>=0) throw new Error(path+': target-count anchor missing/non-unique');
  const ci=s.indexOf(oldCap);
  if(ci<0 || s.indexOf(oldCap,ci+oldCap.length)>=0) throw new Error(path+': old cap anchor missing/non-unique');
  s=s.replace(anchor,replacement).replace(oldCap,newCap);
  fs.writeFileSync(path,s);
  changed.push(path);
}
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/VOCAB_FALLBACK_TARGET_SEMANTICS_REPAIR.json',JSON.stringify({
  generated_at:new Date().toISOString(),marker,changed,
  policy:'For each selected learned grammar category/type, vocabulary-ON safe fallback may replace blocked supply only up to the vocabulary-OFF pool that passes prerequisite grammar and quality gates.',
  arbitrary_target_removed:true,problem_id_hardcode:false,section_hardcode:false,textbook_hardcode:false
},null,2)+'\n');
console.log(JSON.stringify({marker,changed},null,2));
