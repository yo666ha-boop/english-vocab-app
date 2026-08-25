import fs from 'node:fs';

const path='tools/install_vocab_safe_fallback_v1.mjs';
let src=fs.readFileSync(path,'utf8');
let changed=0;
const lines=src.split('\n').map(line=>{
  if(line.includes('const VOCAB_FALLBACK_SAFE_BASE = new Set(String.raw\\`')){
    const fixed=line.replace('String.raw\\`','"').replace('\\`.toLowerCase()', '".toLowerCase()');
    if(fixed!==line) changed++;
    return fixed;
  }
  return line;
});
src=lines.join('\n');
const semanticNeedle="{base:'write my name',ger:'writing my name',jp:'自分の名前を書くこと'}";
if(src.includes(semanticNeedle)){
  src=src.replace(semanticNeedle,"{base:'write',ger:'writing',jp:'書くこと'}");
  changed++;
}
const cacheNeedle="return vocabFallbackLexicallySafe(item) && passesPrereqGrammar(item) && passesQualityGate(item);";
const cacheReplacement="return vocabFallbackLexicallySafe(item) && passesQualityGate(item);";
if(src.includes(cacheNeedle)){
  src=src.replace(cacheNeedle,cacheReplacement);
  changed++;
}
fs.writeFileSync(path,src);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/VOCAB_SAFE_INSTALLER_SOURCE_REPAIR.json',JSON.stringify({repairedAt:new Date().toISOString(),changes:changed,contextDependentPrereqCacheRepair:!src.includes(cacheNeedle)},null,2)+'\n');
console.log(JSON.stringify({changes:changed,contextDependentPrereqCacheRepair:!src.includes(cacheNeedle)},null,2));
if(changed<1) console.log('installer source already repaired');
