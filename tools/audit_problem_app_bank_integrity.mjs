import fs from 'node:fs';

// 2026-08-26: rerun after generic question/answer conflict repair.
const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_BANK_INTEGRITY.json';
const html=fs.readFileSync(HTML,'utf8');
function scriptJson(id){const m=new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i').exec(html);if(!m)throw new Error(`${id} not found`);return JSON.parse(m[1]);}
const all=scriptJson('qb-data');
const english=all.filter(x=>x?.subject==='英語');
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const lower=s=>norm(s).toLowerCase();
const required=['id','subject','grade','category','type','q','a'];
const missing=[];
for(const x of english)for(const k of required)if(!norm(x?.[k]))missing.push({id:x?.id??null,field:k});
const byId=new Map();for(const x of english){const a=byId.get(x.id)||[];a.push(x);byId.set(x.id,a);}
const duplicateIds=[...byId].filter(([,v])=>v.length>1).map(([id,v])=>({id,count:v.length,records:v.map(x=>({grade:x.grade,category:x.category,type:x.type,q:x.q,a:x.a}))}));
const byQuestion=new Map();for(const x of english){const k=lower(x.q);const a=byQuestion.get(k)||[];a.push(x);byQuestion.set(k,a);}
const conflictingQuestions=[];const duplicateQuestionAnswerGroups=[];
for(const [q,items] of byQuestion){
  const ans=[...new Set(items.map(x=>lower(x.a)))];
  if(ans.length>1)conflictingQuestions.push({normalized_question:q,count:items.length,answer_count:ans.length,samples:items.slice(0,8).map(x=>({id:x.id,grade:x.grade,category:x.category,type:x.type,a:x.a}))});
  else if(items.length>1)duplicateQuestionAnswerGroups.push({normalized_question:q,count:items.length,answer:items[0].a,sample_ids:items.slice(0,12).map(x=>x.id)});
}
conflictingQuestions.sort((a,b)=>b.count-a.count||a.normalized_question.localeCompare(b.normalized_question));
duplicateQuestionAnswerGroups.sort((a,b)=>b.count-a.count||a.normalized_question.localeCompare(b.normalized_question));
const sameQA=english.filter(x=>lower(x.q)===lower(x.a)).map(x=>({id:x.id,grade:x.grade,category:x.category,type:x.type,q:x.q,a:x.a}));
const questionTransformMismatch=[];
for(const x of english){const q=norm(x.q),a=norm(x.a);if(/疑問文にしなさい/.test(q)&&!/\?$/.test(a))questionTransformMismatch.push({id:x.id,kind:'question_without_question_mark',q:x.q,a:x.a});if(/否定文にしなさい/.test(q)&&!/(?:\bnot\b|n't\b|never\b|no\b)/i.test(a))questionTransformMismatch.push({id:x.id,kind:'negative_without_negative_marker',q:x.q,a:x.a});}
const gradeCounts={},categoryCounts={},typeCounts={};
for(const x of english){gradeCounts[x.grade]=(gradeCounts[x.grade]||0)+1;categoryCounts[`${x.grade}/${x.category}`]=(categoryCounts[`${x.grade}/${x.category}`]||0)+1;typeCounts[x.type]=(typeCounts[x.type]||0)+1;}
const hardFailures=[];if(missing.length)hardFailures.push(`missing_required_fields:${missing.length}`);if(duplicateIds.length)hardFailures.push(`duplicate_ids:${duplicateIds.length}`);
const out={generated_at:new Date().toISOString(),source:HTML,result:hardFailures.length?'FAIL':'PASS',hard_failures:hardFailures,english_count:english.length,grade_counts:gradeCounts,type_counts:Object.fromEntries(Object.entries(typeCounts).sort((a,b)=>b[1]-a[1])),category_count:Object.keys(categoryCounts).length,missing_required_fields:missing,duplicate_ids:duplicateIds,normalized_question_conflicts:{count:conflictingQuestions.length,top:conflictingQuestions.slice(0,100)},exact_duplicate_question_answer_groups:{count:duplicateQuestionAnswerGroups.length,top:duplicateQuestionAnswerGroups.slice(0,100)},same_question_and_answer:{count:sameQA.length,top:sameQA.slice(0,50)},transform_shape_warnings:{count:questionTransformMismatch.length,top:questionTransformMismatch.slice(0,100)},policy:'Hard fail only on missing required fields or duplicate IDs. Semantic duplicate/conflict and transform-shape findings are review signals, not automatically rewritten.'};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({result:out.result,english_count:out.english_count,hard_failures:out.hard_failures,question_conflicts:out.normalized_question_conflicts.count,duplicate_qa_groups:out.exact_duplicate_question_answer_groups.count,same_qa:out.same_question_and_answer.count,transform_warnings:out.transform_shape_warnings.count},null,2));
if(hardFailures.length)process.exit(1);
