import fs from 'node:fs';
const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_DIVERSIFICATION_SEMANTIC_CLEANUP.json';
let html=fs.readFileSync(HTML,'utf8');
const re=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i;
const m=re.exec(html);if(!m)throw Error('qb-data');
const all=JSON.parse(m[1]);const rows=all.filter(x=>x?.subject==='英語');
const stats={changed_rows:0,awkward_present_perfect_negative:0,common_subject_case_repair:0,samples:[]};
const changed=new Set();
for(const x of rows){
 const before={q:x.q,a:x.a};const kinds=[];
 // Avoid an unnatural mechanical negative of an experience sentence.
 const z=/^(.+?) (has|have) not been to (.+?) once\.$/.exec(String(x.a||''));
 if(z){x.a=`${z[1]} ${z[2]} never been to ${z[3]}.`;stats.awkward_present_perfect_negative++;kinds.push('present_perfect_experience_negative');}
 // Repair the previous cleanup regression: common pronouns/determiners after auxiliaries are lowercase.
 const repaired=String(x.a||'').replace(/^(Does|Has|Was|Is) (He|She|You|We|They|My|Our)\b/,(s,aux,sub)=>`${aux} ${sub.toLowerCase()}`);
 if(repaired!==x.a){x.a=repaired;stats.common_subject_case_repair++;kinds.push('common_subject_case');}
 if(kinds.length){changed.add(x.id);if(stats.samples.length<120)stats.samples.push({id:x.id,kinds,before,after:{q:x.q,a:x.a}});}
}
stats.changed_rows=changed.size;
const newJson=JSON.stringify(all);html=html.slice(0,m.index)+m[0].replace(m[1],newJson)+html.slice(m.index+m[0].length);fs.writeFileSync(HTML,html);fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),...stats},null,2)+'\n');console.log(JSON.stringify(stats,null,2));
