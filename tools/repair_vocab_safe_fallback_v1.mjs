import fs from 'node:fs';

const path='problem-app/index.html';
const installerPath='tools/install_vocab_safe_fallback_v1.mjs';
let html=fs.readFileSync(path,'utf8');
let installer=fs.readFileSync(installerPath,'utf8');
const start=html.indexOf('// ---- VOCAB_SAFE_FALLBACK_V1:');
const endMarker='// ---- END VOCAB_SAFE_FALLBACK_V1 ----';
const endStart=html.indexOf(endMarker,start);
if(start<0||endStart<0) throw new Error('fallback segment not found');
const end=endStart+endMarker.length;
const before=html.slice(start,end);
const badCount=(before.match(/\\`/g)||[]).length;
let after=before.replace(/\\`/g,'`');
const semanticNeedle="{base:'write my name',ger:'writing my name',jp:'自分の名前を書くこと'}";
const semanticReplacement="{base:'write',ger:'writing',jp:'書くこと'}";
const semanticCount=after.includes(semanticNeedle)?1:0;
after=after.replace(semanticNeedle,semanticReplacement);

// Context-dependent prerequisite filtering must never be cached globally.
// The matrix visits early sections first; caching passesPrereqGrammar() there
// permanently removed later-learned gerund/conjunction fallbacks from the bank.
// Keep only context-free lexical/quality filtering in the cache and re-check
// passesPrereqGrammar() inside appendVocabFallbacks() for the current section.
const cacheNeedle="return vocabFallbackLexicallySafe(item) && passesPrereqGrammar(item) && passesQualityGate(item);";
const cacheReplacement="return vocabFallbackLexicallySafe(item) && passesQualityGate(item);";
const contextCacheCount=after.includes(cacheNeedle)?1:0;
after=after.replace(cacheNeedle,cacheReplacement);

// The target is a cap on supplemental fallback items, not on originals + fallback.
// Originals are still recorded in seenText to prevent duplicate question/answer pairs,
// then counts are reset before fallback selection. This is generic across category/type
// and does not relax vocabulary or grammar chronology.
const supplementalMarker='  counts.clear(); // supplemental fallback cap: originals do not consume the fallback allowance\n';
const extrasAnchor='  const extras=[];';
let supplementalCapRepair=0;
if(!after.includes(supplementalMarker)){
  const i=after.indexOf(extrasAnchor);
  if(i<0) throw new Error('appendVocabFallbacks extras anchor not found');
  after=after.slice(0,i)+supplementalMarker+after.slice(i);
  supplementalCapRepair=1;
}

if(after!==before) html=html.slice(0,start)+after+html.slice(end);

// Keep installer source reproducible with the same generic semantic repair.
// The installer stores the injected code inside String.raw, so the same textual
// marker/anchor can be applied without rebuilding the whole generated segment.
let installerSupplementalRepair=0;
if(!installer.includes(supplementalMarker)){
  const markerPos=installer.indexOf('// ---- VOCAB_SAFE_FALLBACK_V1:');
  const i=installer.indexOf(extrasAnchor,markerPos);
  if(markerPos<0||i<0) throw new Error('installer fallback extras anchor not found');
  installer=installer.slice(0,i)+supplementalMarker+installer.slice(i);
  installerSupplementalRepair=1;
}

fs.writeFileSync(path,html);
fs.writeFileSync(installerPath,installer);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/VOCAB_SAFE_FALLBACK_SYNTAX_REPAIR.json',JSON.stringify({
  repairedAt:new Date().toISOString(),
  escapedBackticksRemoved:badCount,
  semanticPossessiveRepair:semanticCount,
  contextDependentPrereqCacheRepair:contextCacheCount,
  supplementalFallbackCapRepair:supplementalCapRepair,
  installerSupplementalFallbackCapRepair:installerSupplementalRepair,
  htmlBytes:Buffer.byteLength(html)
},null,2)+'\n');
console.log(JSON.stringify({
  escapedBackticksRemoved:badCount,
  semanticPossessiveRepair:semanticCount,
  contextDependentPrereqCacheRepair:contextCacheCount,
  supplementalFallbackCapRepair:supplementalCapRepair,
  installerSupplementalFallbackCapRepair:installerSupplementalRepair,
  htmlBytes:Buffer.byteLength(html)
},null,2));
