import fs from 'node:fs';
const HTML='problem-app/index.html';const OUT='audit/PROBLEM_APP_MEDIUM_SEMANTIC_REPAIR.json';
let html=fs.readFileSync(HTML,'utf8');const re=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i;const m=re.exec(html);if(!m)throw Error('qb-data');
const all=JSON.parse(m[1]);const rows=all.filter(x=>x?.subject==='英語');
const scope=new Set(['中1/一般動詞/変形','中2/一般動詞/英作文','中2/三単現/英作文','中3/be動詞と一般動詞（現在形）/変形']);
const fam=x=>`${x.grade}/${x.category}/${x.type}`;const stats={changed_rows:0,do_i_repairs:0,proper_name_case_repairs:0,mother_pronoun_repairs:0,samples:[]};
for(const x of rows){if(!scope.has(fam(x)))continue;const before={q:x.q,a:x.a};let kinds=[];let q=String(x.q||''),a=String(x.a||'');
  if(/^I\b.*を疑問文にしなさい。$/.test(q)&&/^Do you\b/.test(a)){a=a.replace(/^Do you\b/,'Do I');stats.do_i_repairs++;kinds.push('do_i');}
  const caseBefore=a;a=a.replace(/^Do tom and ken\b/,'Do Tom and Ken').replace(/^Do emi and yuki\b/,'Do Emi and Yuki');if(a!==caseBefore){stats.proper_name_case_repairs++;kinds.push('proper_name_case');}
  const motherQ=q,motherA=a;
  q=q.replace(/\bhelp my mother\b/g,'help at home').replace(/\bhelps (?:his|her) mother\b/g,'helps at home').replace(/母を手伝います/g,'家で手伝います');
  a=a.replace(/\bhelp my mother\b/g,'help at home').replace(/\bhelps (?:his|her) mother\b/g,'helps at home');
  if(q!==motherQ||a!==motherA){stats.mother_pronoun_repairs++;kinds.push('mother_pronoun');}
  if(q!==x.q||a!==x.a){x.q=q;x.a=a;stats.changed_rows++;if(stats.samples.length<100)stats.samples.push({id:x.id,family:fam(x),kinds,before,after:{q,a}});}
}
const residual=[];for(const x of rows){if(!scope.has(fam(x)))continue;const q=String(x.q||''),a=String(x.a||'');if(/^I\b.*を疑問文にしなさい。$/.test(q)&&/^Do you\b/.test(a))residual.push({id:x.id,kind:'do_i',q,a});if(/^Do (?:tom and ken|emi and yuki)\b/.test(a))residual.push({id:x.id,kind:'proper_case',q,a});if(/\b(?:help my mother|helps (?:his|her) mother)\b/.test(q+' '+a))residual.push({id:x.id,kind:'mother_pronoun',q,a});}
stats.residual_count=residual.length;stats.residual_samples=residual.slice(0,30);
const newJson=JSON.stringify(all);html=html.slice(0,m.index)+m[0].replace(m[1],newJson)+html.slice(m.index+m[0].length);fs.writeFileSync(HTML,html);fs.writeFileSync(OUT,JSON.stringify({generated_at:new Date().toISOString(),...stats},null,2)+'\n');console.log(JSON.stringify(stats,null,2));if(residual.length)throw Error('semantic residuals '+residual.length);
