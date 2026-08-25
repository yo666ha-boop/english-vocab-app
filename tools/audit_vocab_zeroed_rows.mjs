import fs from 'node:fs';
import vm from 'node:vm';

const MATRIX='audit/PROBLEM_APP_VOCAB_BROWSER_MATRIX.json';
const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_VOCAB_ZEROED_ROWS.json';

function scriptJson(html,id){
  const m=new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i').exec(html);
  if(!m) throw new Error(`${id} not found`);
  return JSON.parse(m[1]);
}
function matchingBrace(src,start){let depth=0,quote=null,esc=false,line=false,block=false;for(let i=start;i<src.length;i++){const c=src[i],n=src[i+1];if(line){if(c==='\n')line=false;continue;}if(block){if(c==='*'&&n==='/'){block=false;i++;}continue;}if(quote){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===quote)quote=null;continue;}if(c==='/'&&n==='/'){line=true;i++;continue;}if(c==='/'&&n==='*'){block=true;i++;continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'){depth--;if(depth===0)return i;}}return -1;}
function subjectConfigFromRuntime(html){const m=/\bconst\s+subjectConfig\s*=\s*/.exec(html);if(!m)throw new Error('subjectConfig not found');let start=m.index+m[0].length;while(/\s/.test(html[start]||''))start++;const end=matchingBrace(html,start);return vm.runInNewContext(`(${html.slice(start,end+1)})`,Object.create(null),{timeout:5000});}

const matrix=JSON.parse(fs.readFileSync(MATRIX,'utf8'));
const html=fs.readFileSync(HTML,'utf8');
const qb=scriptJson(html,'qb-data').filter(x=>x.subject==='英語');
const meta=scriptJson(html,'meta-data');
const stageMap=subjectConfigFromRuntime(html)?.['英語']?.stageMap||{};
const rows=[];
for(const [grade,books] of Object.entries(matrix.grammar_attrition||{})) for(const [textbook,rec] of Object.entries(books||{})) for(const sec of rec?.sections||[]) for(const cat of sec.categories||[]) rows.push({...cat,grade,textbook,section:sec.section,position:sec.position,section_count:sec.section_count,category:cat.value});
if(!rows.length) throw new Error('nested grammar_attrition rows not found');
const zeroed=rows.filter(r=>r.zeroed===true || (Number(r.off)>0 && Number(r.on)===0));
const out=[];
for(const z of zeroed){
  const mapped=stageMap?.[z.grade]?.[z.category]||[z.category];
  const mappedSet=new Set(mapped);
  const pool=qb.filter(x=>x.grade===z.grade && mappedSet.has(x.category));
  const blocked=[]; const coordCounts=new Map(); let allowedByCoordinate=0;
  for(const item of pool){
    const raw=(meta.passMeta?.[item.id]||{})[z.textbook];
    const v=Number.isInteger(raw)?raw:Number(raw);
    const coordinateAllows=v===-2||(Number.isInteger(v)&&v>0&&v<=z.position);
    if(coordinateAllows){allowedByCoordinate++;continue;}
    const reason=!Number.isFinite(v)||v===-1?'unresolved':(v>z.position?'future_vocab_coordinate':'other');
    blocked.push({id:item.id,category:item.category,type:item.type,q:item.q,a:item.a,passMeta:Number.isFinite(v)?v:null,reason});
    const k=Number.isFinite(v)?String(v):'missing_or_invalid';coordCounts.set(k,(coordCounts.get(k)||0)+1);
  }
  out.push({
    grade:z.grade,textbook:z.textbook,section:z.section,position:z.position,section_count:z.section_count,category:z.category,
    off:z.off,on:z.on,retention_pct:z.retention_pct,data_stage:z.data_stage,label:z.label,
    runtime_mapped_categories:mapped,original_pool:pool.length,allowed_by_coordinate:allowedByCoordinate,blocked_by_coordinate:blocked.length,
    blocked_coordinate_values:Object.fromEntries(coordCounts),blocked_samples:blocked.slice(0,40)
  });
}
fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),source:MATRIX,stage_map_source:'actual problem-app runtime subjectConfig[英語].stageMap',zeroed_count:out.length,records:out},null,2)+'\n');
console.log(JSON.stringify({zeroed_count:out.length,records:out.map(x=>({grade:x.grade,textbook:x.textbook,section:x.section,category:x.category,off:x.off,on:x.on,pool:x.original_pool,allowed_by_coordinate:x.allowed_by_coordinate,blocked_by_coordinate:x.blocked_by_coordinate,coords:x.blocked_coordinate_values}))},null,2));
