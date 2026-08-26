import fs from 'node:fs';
import vm from 'node:vm';

const HTML='problem-app/index.html';
const PERSIST='audit/PROBLEM_APP_VOCAB_PERSISTENT_UNRESOLVED_TOKENS.json';
const OUT='audit/PROBLEM_APP_VOCAB_FALLBACK_SUPPLY_CONTEXT.json';

function countBy(items){
  const m=new Map();
  for(const x of items)m.set(x.type,(m.get(x.type)||0)+1);
  return Object.fromEntries([...m].sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
}
function extractGerundBuilderPrelude(html){
  const start=html.indexOf('// ---- VOCAB_SAFE_FALLBACK_V1:');
  const stop=html.indexOf('function buildBePresentFallbacks()',start);
  if(start<0||stop<0) throw new Error('gerund fallback prelude not found');
  return html.slice(start,stop);
}

const html=fs.readFileSync(HTML,'utf8');
const persistent=JSON.parse(fs.readFileSync(PERSIST,'utf8'));
const group=persistent.results?.find(x=>x.grade==='中2'&&x.textbook==='サンシャイン'&&x.category==='動名詞');
if(!group) throw new Error('persistent Sunshine G2 gerund group not found');

const sandbox={};
vm.createContext(sandbox);
const prelude=extractGerundBuilderPrelude(html);
vm.runInContext(prelude+'\n;globalThis.__AUDIT__={target:VOCAB_FALLBACK_TARGET_PER_CATEGORY_TYPE,items:buildGerundFallbacks().filter(vocabFallbackLexicallySafe)};',sandbox,{timeout:10000});
const target=sandbox.__AUDIT__.target;
const supply=sandbox.__AUDIT__.items;
const supplyByType=countBy(supply);

const originalTypes=group.original_types||{};
const unresolvedTypes=group.unresolved_types||{};
const types=[...new Set([...Object.keys(originalTypes),...Object.keys(supplyByType)])].sort();
const byType={};
let resolvedTotal=0,currentCapacity=0,blockedFillCapacity=0;
for(const type of types){
  const original=Number(originalTypes[type]||0);
  const blocked=Number(unresolvedTypes[type]||0);
  const resolved=Math.max(0,original-blocked);
  const safeSupply=Number(supplyByType[type]||0);
  const currentAppend=Math.min(Math.max(0,target-resolved),safeSupply);
  const blockedFill=Math.min(blocked,safeSupply);
  byType[type]={original_pool:original,resolved_original_estimate:resolved,blocked_original:blocked,safe_template_supply:safeSupply,current_target_total:target,current_append_capacity:currentAppend,blocked_replacement_capacity:blockedFill,current_total_estimate:resolved+currentAppend,blocked_fill_total_estimate:resolved+blockedFill};
  resolvedTotal+=resolved; currentCapacity+=currentAppend; blockedFillCapacity+=blockedFill;
}

const final=group.final_section||{};
const out={
  generated_at:new Date().toISOString(),
  purpose:'diagnostic only; no production mutation',
  context:{grade:group.grade,textbook:group.textbook,category:group.category,final_section:final.section,position:final.position},
  observed:{original_pool:group.original_pool,unresolved_problem_count:group.unresolved_problem_count,final_off:final.off,final_on:final.on,final_retention_pct:final.retention_pct},
  runtime_policy:{target_per_category_type:target,meaning:'originals count toward fixed category/type target; fallback is appended only until total reaches target'},
  supply:{lexically_safe_gerund_templates:supply.length,by_type:supplyByType},
  estimates:{resolved_original_from_pool_minus_unresolved:resolvedTotal,current_append_capacity:currentCapacity,current_total_estimate:resolvedTotal+currentCapacity,blocked_replacement_capacity:blockedFillCapacity,blocked_fill_total_estimate:resolvedTotal+blockedFillCapacity,model_delta_vs_actual_on:(resolvedTotal+currentCapacity)-Number(final.on||0)},
  by_type:byType,
  interpretation:{
    current_cap_bottleneck:types.some(t=>Number(byType[t].blocked_original)>0&&Number(byType[t].resolved_original_estimate)>=target),
    candidate_formula:'For each learned category/type, derive desired supplemental count from blocked originals, but cap it by generic lexically-safe template supply; never target the full OFF pool and never relax vocabulary chronology.',
    safe_to_apply_now:false,
    reason:'This audit is intentionally conservative. resolved_original is estimated from passMeta unresolved counts and still needs actual runtime per-section measurement before production semantics change.'
  }
};
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
