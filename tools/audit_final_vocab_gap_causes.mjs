import fs from 'node:fs';
import vm from 'node:vm';

// 2026-08-26: support current final-gap schema (`gaps`) and fail closed on empty input.
const html=fs.readFileSync('problem-app/index.html','utf8');
const gaps=JSON.parse(fs.readFileSync('audit/PROBLEM_APP_VOCAB_FINAL_SECTION_GAPS.json','utf8'));
const outPath='audit/PROBLEM_APP_VOCAB_FINAL_GAP_CAUSES.json';
function scriptJson(id){const m=new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i').exec(html);if(!m)throw new Error(`${id} not found`);return JSON.parse(m[1]);}
function matchingBrace(src,start){let depth=0,quote=null,esc=false,line=false,block=false;for(let i=start;i<src.length;i++){const c=src[i],n=src[i+1];if(line){if(c==='\n')line=false;continue;}if(block){if(c==='*'&&n==='/'){block=false;i++;}continue;}if(quote){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===quote)quote=null;continue;}if(c==='/'&&n==='/'){line=true;i++;continue;}if(c==='/'&&n==='*'){block=true;i++;continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'){depth--;if(depth===0)return i;}}return -1;}
function subjectConfigFromRuntime(){const m=/\bconst\s+subjectConfig\s*=\s*/.exec(html);if(!m)throw new Error('subjectConfig not found');let start=m.index+m[0].length;while(/\s/.test(html[start]||''))start++;const end=matchingBrace(html,start);return vm.runInNewContext(`(${html.slice(start,end+1)})`,Object.create(null),{timeout:5000});}
const qb=scriptJson('qb-data'),meta=scriptJson('meta-data'),stageMap=subjectConfigFromRuntime()?.['英語']?.stageMap||{},english=qb.filter(x=>x.subject==='英語');
const gapRows=Array.isArray(gaps.gaps)?gaps.gaps:Array.isArray(gaps.final_under_50pct)?gaps.final_under_50pct:[];
if((gaps.summary?.under_50pct??0)>0 && gapRows.length===0) throw new Error('final gap source reports under-50 rows but no gap rows were loaded');
const records=[];
for(const gap of gapRows){const mappedCategories=stageMap?.[gap.grade]?.[gap.category]||[gap.category],mappedSet=new Set(mappedCategories),pool=english.filter(x=>x.grade===gap.grade&&mappedSet.has(x.category));let accepted=0;const rejected=[];for(const item of pool){const raw=(meta.passMeta?.[item.id]||{})[gap.textbook],val=Number.isInteger(raw)?raw:Number(raw),ok=val===-2||(Number.isInteger(val)&&val>0&&val<=gap.section_count);if(ok)accepted++;else rejected.push({item,val:Number.isFinite(val)?val:null});}const counts={};for(const r of rejected){const k=r.val==null?'missing_or_invalid':String(r.val);counts[k]=(counts[k]||0)+1;}records.push({...gap,runtime_mapped_categories:mappedCategories,original_pool:pool.length,accepted_by_final_passmeta:accepted,rejected_by_final_passmeta:rejected.length,rejection_coordinate_values:counts,rejected_samples:rejected.slice(0,30).map(({item,val})=>({id:item.id,category:item.category,type:item.type,q:item.q,a:item.a,passMeta:val}))});}
const out={generated_at:new Date().toISOString(),source_gap_file:'audit/PROBLEM_APP_VOCAB_FINAL_SECTION_GAPS.json',loaded_gap_key:Array.isArray(gaps.gaps)?'gaps':'final_under_50pct',stage_map_source:'actual problem-app runtime subjectConfig[英語].stageMap',explanation:'Chronology-aware mature final-section under-50% causes. No word/unit/problem-ID whitelist.',records};
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(records.map(r=>({scope:`${r.grade}/${r.textbook}/${r.category}`,off:r.off,on:r.on,retention:r.retention_pct,pool:r.original_pool,accepted:r.accepted_by_final_passmeta,rejected:r.rejected_by_final_passmeta,coords:r.rejection_coordinate_values})),null,2));
