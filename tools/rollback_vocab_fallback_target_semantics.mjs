import fs from 'node:fs';
const paths=['problem-app/index.html','tools/install_vocab_safe_fallback_v1.mjs'];
const marker='VOCAB_FALLBACK_TARGET_FROM_LEARNED_SUPPLY_V1';
const inserted=`  // ${marker}: derive the replacement ceiling from the same learned-grammar/quality pool\n  // that is available with vocabulary filtering OFF. This avoids an arbitrary per-type count cap.\n  const targetCounts=new Map();\n  for(const item of qb) {\n    if(item.subject!=='英語' || item.grade!==grade) continue;\n    if(selectedCategorySet.size && !selectedCategorySet.has(item.category)) continue;\n    if(selectedTypeSet.size && !selectedTypeSet.has(item.type)) continue;\n    if(!passesPrereqGrammar(item) || !passesQualityGate(item)) continue;\n    const key=item.category+'\\u0000'+item.type;\n    targetCounts.set(key,(targetCounts.get(key)||0)+1);\n  }\n`;
const newCap=`    const target=targetCounts.get(key)||0;\n    if(!target || (counts.get(key)||0)>=target) continue;`;
const oldCap=`    if((counts.get(key)||0)>=VOCAB_FALLBACK_TARGET_PER_CATEGORY_TYPE) continue;`;
const changed=[];
for(const path of paths){
  let s=fs.readFileSync(path,'utf8');
  if(!s.includes(marker)){console.log(path+': marker absent');continue;}
  if(!s.includes(inserted)) throw new Error(path+': inserted target block not found exactly');
  if(!s.includes(newCap)) throw new Error(path+': learned-supply cap not found');
  s=s.replace(inserted,'').replace(newCap,oldCap);
  fs.writeFileSync(path,s);changed.push(path);
}
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/VOCAB_FALLBACK_TARGET_SEMANTICS_ROLLBACK.json',JSON.stringify({generated_at:new Date().toISOString(),changed,reason:'Exhaustive browser matrix regression: prior 0/0/232 became zeroed=3, under25=152, under50=564. Preserve last known good behavior while root cause is investigated.'},null,2)+'\n');
console.log(JSON.stringify({changed},null,2));
