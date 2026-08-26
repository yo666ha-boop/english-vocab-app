import fs from 'node:fs';
const s=fs.readFileSync('problem-app/index.html','utf8');
const needles=['builderStatus','questionPreview','questionCount','pickMode','function getFilteredPool','function buildPool','passesPrereqGrammar','問題を作成'];
const contexts=[];
for(const needle of needles){
  let from=0,count=0;
  while(count<6){
    const i=s.indexOf(needle,from); if(i<0)break;
    contexts.push({needle,index:i,context:s.slice(Math.max(0,i-1200),Math.min(s.length,i+2200))});
    from=i+needle.length;count++;
  }
}
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/PROBLEM_APP_SEARCH_INTEGRATION_CONTEXT.json',JSON.stringify({generated_at:new Date().toISOString(),file_bytes:Buffer.byteLength(s),contexts},null,2)+'\n');
console.log(JSON.stringify({file_bytes:Buffer.byteLength(s),matches:Object.fromEntries(needles.map(n=>[n,contexts.filter(x=>x.needle===n).map(x=>x.index)]))},null,2));
