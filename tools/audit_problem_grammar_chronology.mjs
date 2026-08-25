import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('problem-app/index.html','utf8');
function scriptJson(id){
  const m=new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i').exec(html);
  if(!m) throw new Error(`${id} missing`);
  return JSON.parse(m[1]);
}
const meta=scriptJson('meta-data');
const m=/const grammarChronology = (\{[\s\S]*?\n\});\nfunction grammarChronologyKey/.exec(html);
if(!m) throw new Error('grammarChronology object missing');
const chronology=vm.runInNewContext(`(${m[1]})`,Object.create(null),{timeout:1000});
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const out={generated_at_utc:new Date().toISOString(),books:{},totals:{anchors:0,resolved:0,hidden_null:0,unresolved:0},unresolved:[]};
for(const [tb,grades] of Object.entries(chronology)){
  out.books[tb]={};
  for(const [grade,map] of Object.entries(grades)){
    const g=grade.replace('中','');
    const sections=meta.sections?.[tb]?.[g]||[];
    const rows=[];
    for(const [stage,anchor] of Object.entries(map)){
      if(anchor===null){out.totals.hidden_null++;rows.push({stage,anchor,status:'not_in_grade'});continue;}
      out.totals.anchors++;
      if(anchor==='__start__'){out.totals.resolved++;rows.push({stage,anchor,index:0,section:sections[0]||'',status:'resolved'});continue;}
      const targets=Array.isArray(anchor)?anchor:[anchor];
      let best=-1;
      for(const a of targets){const n=norm(a);let i=sections.findIndex(x=>norm(x).startsWith(n));if(i<0)i=sections.findIndex(x=>norm(x).includes(n));if(i>=0&&(best<0||i<best))best=i;}
      if(best>=0){out.totals.resolved++;rows.push({stage,anchor,index:best,section:sections[best],status:'resolved'});}
      else {out.totals.unresolved++;const r={textbook:tb,grade,stage,anchor,status:'unresolved',section_count:sections.length};out.unresolved.push(r);rows.push(r);}
    }
    out.books[tb][grade]={section_count:sections.length,rows};
  }
}
if(out.totals.unresolved) throw new Error(`unresolved grammar chronology anchors: ${JSON.stringify(out.unresolved)}`);
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/PROBLEM_APP_GRAMMAR_CHRONOLOGY_AUDIT.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out.totals,null,2));
