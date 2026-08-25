import fs from 'node:fs';
import vm from 'node:vm';

const MATRIX='audit/PROBLEM_APP_VOCAB_BROWSER_MATRIX.json';
const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_VOCAB_LOW_RETENTION_ROWS.json';
const AUDIT_THRESHOLD_PCT=33;

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
const low=rows.filter(r=>Number(r.off)>0 && Number(r.retention_pct)<AUDIT_THRESHOLD_PCT).sort((a,b)=>Number(a.retention_pct)-Number(b.retention_pct)||Number(b.off)-Number(a.off));
const records=[];
for(const z of low){
  const mapped=stageMap?.[z.grade]?.[z.category]||[z.category];
  const mappedSet=new Set(mapped);
  const pool=qb.filter(x=>x.grade===z.grade && mappedSet.has(x.category));
  let allowed=0, unresolved=0, future=0, other=0;
  const byType={};
  const samples=[];
  for(const item of pool){
    byType[item.type]=(byType[item.type]||0)+1;
    const raw=(meta.passMeta?.[item.id]||{})[z.textbook];
    const v=Number.isInteger(raw)?raw:Number(raw);
    if(v===-2||(Number.isInteger(v)&&v>0&&v<=z.position)){allowed++;continue;}
    let reason='other';
    if(!Number.isFinite(v)||v===-1){unresolved++;reason='unresolved';}
    else if(v>z.position){future++;reason='future_vocab_coordinate';}
    else other++;
    if(samples.length<20) samples.push({id:item.id,category:item.category,type:item.type,passMeta:Number.isFinite(v)?v:null,reason,q:item.q,a:item.a});
  }
  records.push({grade:z.grade,textbook:z.textbook,section:z.section,position:z.position,category:z.category,off:z.off,on:z.on,retention_pct:z.retention_pct,runtime_mapped_categories:mapped,original_pool:pool.length,allowed_by_coordinate:allowed,blocked_unresolved:unresolved,blocked_future:future,blocked_other:other,original_types:byType,blocked_samples:samples});
}
const byCategory={};
for(const r of records){const k=`${r.grade}/${r.category}`;const x=byCategory[k]??={rows:0,min_retention_pct:100,total_off:0,total_on:0,total_unresolved:0,total_future:0};x.rows++;x.min_retention_pct=Math.min(x.min_retention_pct,Number(r.retention_pct));x.total_off+=Number(r.off);x.total_on+=Number(r.on);x.total_unresolved+=r.blocked_unresolved;x.total_future+=r.blocked_future;}
const severeCount=records.filter(r=>Number(r.retention_pct)<25).length;
fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),source:MATRIX,audit_threshold_pct:AUDIT_THRESHOLD_PCT,low_count:records.length,severe_count:severeCount,records,by_category:byCategory},null,2)+'\n');
console.log(JSON.stringify({audit_threshold_pct:AUDIT_THRESHOLD_PCT,low_count:records.length,severe_count:severeCount,worst:records.slice(0,20).map(r=>({grade:r.grade,textbook:r.textbook,section:r.section,category:r.category,off:r.off,on:r.on,retention:r.retention_pct,pool:r.original_pool,allowed:r.allowed_by_coordinate,unresolved:r.blocked_unresolved,future:r.blocked_future,types:r.original_types}))},null,2));
