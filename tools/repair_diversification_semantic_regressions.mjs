import fs from 'node:fs';
const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_DIVERSIFICATION_SEMANTIC_CLEANUP.json';
let html=fs.readFileSync(HTML,'utf8');
const re=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i;
const m=re.exec(html);if(!m)throw Error('qb-data');
const all=JSON.parse(m[1]);const rows=all.filter(x=>x?.subject==='英語');
const stats={changed_rows:0,awkward_present_perfect_negative:0,question_answer_case:0,samples:[]};
for(const x of rows){
 const before={q:x.q,a:x.a};let kind=null;
 // A literal mechanical negative of "has been ... once" is grammatical-looking but unnatural.
 // Use the standard experience negative with never while keeping the same grammar target.
 const z=/^(.+?) (has|have) not been to (.+?) once\.$/.exec(String(x.a||''));
 if(z){x.a=`${z[1]} ${z[2]} never been to ${z[3]}.`;stats.awkward_present_perfect_negative++;kind='present_perfect_experience_negative';}
 // Keep sentence-initial proper names/pronouns capitalized in generated Does/Has/Was questions.
 if(/^(Does|Has|Was|Is) [a-z][A-Za-z]+\b/.test(String(x.a||''))){
   x.a=String(x.a).replace(/^(Does|Has|Was|Is) ([a-z][A-Za-z]+)/,(s,aux,sub)=>`${aux} ${sub[0].toUpperCase()}${sub.slice(1)}`);
   stats.question_answer_case++;kind=kind||'question_subject_case';
 }
 if(kind&&stats.samples.length<80)stats.samples.push({id:x.id,kind,before,after:{q:x.q,a:x.a}});
}
stats.changed_rows=stats.awkward_present_perfect_negative+stats.question_answer_case;
const newJson=JSON.stringify(all);html=html.slice(0,m.index)+m[0].replace(m[1],newJson)+html.slice(m.index+m[0].length);fs.writeFileSync(HTML,html);fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),...stats},null,2)+'\n');console.log(JSON.stringify(stats,null,2));
