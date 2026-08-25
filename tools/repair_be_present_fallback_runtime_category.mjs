import fs from 'node:fs';

const files=['problem-app/index.html','tools/install_vocab_safe_fallback_v1.mjs','tools/extend_vocab_safe_fallback_core_grammar.mjs'];
const old="vocabFallbackItem('中1','be動詞（現在形）'";
const neu="vocabFallbackItem('中1','be動詞'";
const changed=[];
for(const path of files){
  let src=fs.readFileSync(path,'utf8');
  const before=src.split(old).length-1;
  if(before){
    src=src.split(old).join(neu);
    fs.writeFileSync(path,src);
    changed.push({path,replacements:before});
  } else if(!src.includes(neu)) {
    throw new Error(`${path}: neither visible-stage nor runtime-category fallback anchor found`);
  }
}
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/VOCAB_SAFE_FALLBACK_BE_PRESENT_CATEGORY_REPAIR.json',JSON.stringify({
  result:'PASS',
  changed,
  display_stage:'be動詞（現在形）',
  runtime_stage_map_category:'be動詞',
  rule:'Fallback items use the actual problem-bank category selected by subjectConfig[英語].stageMap, while chronology continues to expose the display stage. No problem-ID, textbook, section, or measured-count exception.'
},null,2)+'\n');
console.log(JSON.stringify({result:'PASS',changed},null,2));
