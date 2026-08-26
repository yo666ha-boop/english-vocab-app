import fs from 'node:fs';
import vm from 'node:vm';

const HTML='problem-app/index.html';
const MATRIX='audit/PROBLEM_APP_VOCAB_BROWSER_MATRIX.json';
const OUT='audit/PROBLEM_APP_VOCAB_FALLBACK_SUPPLY_CONTEXT.json';

function scriptJson(html,id){
  const m=new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i').exec(html);
  if(!m) throw new Error(`${id} not found`);
  return JSON.parse(m[1]);
}
function passesQualityGate(item){
  if(!item||!String(item.q||'').trim()||!String(item.a||'').trim()) return false;
  const q=String(item.q||''),a=String(item.a||''),both=q+' '+a;
  if(/This is (?:he|she|we)\b/i.test(both)) return false;
  if(/\bthan He\b/.test(both)) return false;
  if(/\b(?:Mika|She) (?:love|begin|stop)\b/.test(both)) return false;
  if(/Do you have (?:visited|been|finished|lost|lived|studied|seen|done)/i.test(both)) return false;
  if(/Did You ne\b|Do You\b|Do They\b|Does She\b|Does He\b/.test(both)) return false;
  if(/否定文または疑問文/.test(q)) return false;
  if(/日本語で説明しなさい/.test(q)&&/^[A-Za-z]/.test(a)) return false;
  if(/\(\s*she\s*\/\s*her\s*\/\s*her\s*\)/i.test(q)) return false;
  if(/\(\s*he\s*\/\s*him\s*\/\s*him\s*\)/i.test(q)) return false;
  if(String(item.id||'').startsWith('M2-INF2-')){
    if(item.type==='空所補充'&&/^to$/i.test(a)&&/\bto\s*\(\s*\)\s*(?=[A-Za-z])/i.test(q)) return false;
    if(/^(?:He|She|Yuki|Mika|Takumi|Ken|Emi|Tom|The student|The teacher|This boy|This girl|My mother|My father|My brother|My sister|My friend) (?:want|need|like) to\b/i.test(a)) return false;
  }
  if(item.category==='動名詞'&&!/[A-Za-z]+ing\b/.test(both)) return false;
  if(item.category==='比較'&&!/\bthan\b|\bas\s+\w+\s+as\b|\bmost\b|\w+est\b/i.test(both)) return false;
  const infinitiveBlank=item.type==='空所補充'&&/^to$/i.test(a)&&/\(\s*\)\s*[A-Za-z]+\b/.test(q);
  if((item.category==='不定詞'||item.category==='不定詞①'||item.category==='不定詞②')&&!/\bto\s+[A-Za-z]+\b/i.test(both)&&!infinitiveBlank) return false;
  if(String(item.category).startsWith('現在完了形')&&!/\b(?:have|has)\b/i.test(both)) return false;
  if(item.category==='関係代名詞'){
    if(!/\b(?:who|which|that)\b/i.test(both)) return false;
    if(item.type==='空所補充'&&/\(\s*\)/.test(q)){
      if(!/who\s*\/\s*which/i.test(q)) return false;
      if(!/^(?:who|which)$/i.test(a)) return false;
    }
  }
  return true;
}
function countBy(items,key='type'){
  const m=new Map();
  for(const x of items){const k=typeof key==='function'?key(x):x[key];m.set(k,(m.get(k)||0)+1);}
  return Object.fromEntries([...m].sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
}
function matrixRows(matrix){
  const out=[];
  const walk=x=>{if(Array.isArray(x)) for(const v of x) walk(v); else if(x&&typeof x==='object'){if('off' in x&&'on' in x&&('category' in x||'stage' in x))out.push(x);for(const v of Object.values(x)) if(v&&typeof v==='object')walk(v);}};
  walk(matrix); return out;
}
function extractFallbackSegment(html){
  const start=html.indexOf('// ---- VOCAB_SAFE_FALLBACK_V1:');
  const endMarker='// ---- END VOCAB_SAFE_FALLBACK_V1 ----';
  const end=html.indexOf(endMarker,start);
  if(start<0||end<0) throw new Error('fallback segment not found');
  return html.slice(start,end+endMarker.length);
}

const html=fs.readFileSync(HTML,'utf8');
const qb=scriptJson(html,'qb-data').filter(x=>x.subject==='英語');
const meta=scriptJson(html,'meta-data');
const matrix=JSON.parse(fs.readFileSync(MATRIX,'utf8'));
const seg=extractFallbackSegment(html);
const sandbox={passesQualityGate,passesPrereqGrammar:()=>true,useVocabGate:()=>true,currentSubject:()=> '英語',currentGrade:()=> '中2'};
vm.createContext(sandbox);
vm.runInContext(seg+'\n;globalThis.__AUDIT__={target:VOCAB_FALLBACK_TARGET_PER_CATEGORY_TYPE,bank:buildVocabFallbackBank()};',sandbox,{timeout:20000});
const target=sandbox.__AUDIT__.target;
const bank=sandbox.__AUDIT__.bank;

const cases=[
  {textbook:'サンシャイン',grade:'中2',gradeKey:'2',section:'Reading 3',category:'動名詞'},
  {textbook:'ニューホライズン',grade:'中2',gradeKey:'2',section:null,category:'動名詞'}
];
const rows=matrixRows(matrix);
const results=[];
for(const c of cases){
  const sections=meta.sections?.[c.textbook]?.[c.gradeKey]||[];
  const section=c.section||sections.at(-1)?.name||sections.at(-1)?.label||sections.at(-1);
  const pos=Math.max(1,sections.findIndex(s=>(s?.name??s?.label??s)===section)+1);
  const originals=qb.filter(x=>x.grade===c.grade&&x.category===c.category&&passesQualityGate(x));
  const allowed=originals.filter(item=>{const raw=meta.passMeta?.[item.id]?.[c.textbook];const v=Number(raw);return raw===-2||(Number.isInteger(v)&&v>0&&v<=pos);});
  const blocked=originals.filter(x=>!allowed.includes(x));
  const fallback=bank.filter(x=>x.grade===c.grade&&x.category===c.category&&passesQualityGate(x));
  const types=[...new Set([...originals,...fallback].map(x=>x.type))].sort();
  const byType={}; let predicted=0;
  for(const type of types){
    const orig=originals.filter(x=>x.type===type);
    const ok=allowed.filter(x=>x.type===type);
    const bad=blocked.filter(x=>x.type===type);
    const supply=fallback.filter(x=>x.type===type);
    const seen=new Set(ok.map(x=>String(x.q||'')+'\u0000'+String(x.a||'')));
    const uniqueSupply=supply.filter(x=>!seen.has(String(x.q||'')+'\u0000'+String(x.a||'')));
    const currentNeed=Math.max(0,target-ok.length);
    const currentAppend=Math.min(currentNeed,uniqueSupply.length);
    const blockedNeed=Math.min(bad.length,uniqueSupply.length);
    byType[type]={original_quality_eligible:orig.length,resolved_original:ok.length,blocked_original:bad.length,safe_template_supply:supply.length,unique_safe_supply:uniqueSupply.length,current_target_total:target,current_append_capacity:currentAppend,blocked_replacement_capacity:blockedNeed,predicted_current_total:ok.length+currentAppend,predicted_blocked_fill_total:ok.length+blockedNeed};
    predicted+=ok.length+currentAppend;
  }
  const mr=rows.find(r=>r.textbook===c.textbook&&r.grade===c.grade&&r.section===section&&(r.category===c.category||r.stage===c.category));
  results.push({...c,section,position:pos,target_per_category_type:target,original_quality_eligible:originals.length,resolved_original:allowed.length,blocked_original:blocked.length,safe_template_supply:fallback.length,original_types:countBy(originals),resolved_types:countBy(allowed),blocked_types:countBy(blocked),safe_supply_types:countBy(fallback),by_type:byType,predicted_current_on:predicted,matrix_actual:mr?{off:mr.off,on:mr.on,retention_pct:mr.retention_pct}:null});
}
const out={generated_at:new Date().toISOString(),purpose:'diagnostic only; no production mutation',formula_notes:{current:'per category/type, originals count toward fixed target; append only until total reaches target',candidate_to_test:'fill at most blocked_original per type from lexically-safe generic fallback supply; do not target OFF total'},results};
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
if(results[0].matrix_actual&&Math.abs(results[0].matrix_actual.on-results[0].predicted_current_on)>10){console.error('diagnostic model differs materially from actual matrix; do not apply candidate formula');process.exitCode=2;}
