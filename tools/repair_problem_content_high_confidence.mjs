import fs from 'node:fs';

const HTML='problem-app/index.html';
const AUDIT='audit/PROBLEM_APP_CONTENT_HIGH_CONFIDENCE_REPAIR.json';
let html=fs.readFileSync(HTML,'utf8');
const re=/(<script\s+id=["']qb-data["'][^>]*>)([\s\S]*?)(<\/script>)/i;
const m=re.exec(html);
if(!m) throw new Error('qb-data not found');
const all=JSON.parse(m[2]);
const english=all.filter(x=>x?.subject==='英語');
const changes=[];

function quotedJapanese(q){const mm=/『([^』]*)』/.exec(String(q||''));return mm?mm[1]:'';}
function record(x,field,before,after,reason){if(before===after)return;changes.push({id:x.id,field,reason,before,after});x[field]=after;}

for(const x of english){
  let a=String(x.a??'');
  const fixes=[
    [/\bI is\b/g,'I am'],[/\bI was not is\b/g,'I was not'],
    [/\byou is\b/gi,'you are'],[/\bwe is\b/gi,'we are'],[/\bthey is\b/gi,'they are'],
    [/\bhe are\b/gi,'he is'],[/\bshe are\b/gi,'she is'],[/\bit are\b/gi,'it is'],
    [/\byou was\b/gi,'you were'],[/\bwe was\b/gi,'we were'],[/\bthey was\b/gi,'they were']
  ];
  let fixed=a;
  for(const [rr,to] of fixes) fixed=fixed.replace(rr,to);
  if(fixed!==a) record(x,'a',a,fixed,'pronoun_be_agreement');

  a=String(x.a??'');
  const pluralBe=/^(The\s+(?:shoes|books|pens|dogs|cats|bags|chairs|desks|bikes|pictures))\s+is\b/i;
  if(pluralBe.test(a)) record(x,'a',a,a.replace(pluralBe,'$1 are'),'plural_subject_be_agreement');

  const jp=quotedJapanese(x.q);
  a=String(x.a??'');
  if(/^(彼)(は|が)/.test(jp) && !/[私僕わたし]/.test(jp) && /\bmy\b/i.test(a)){
    record(x,'a',a,a.replace(/\bmy\b/gi,'his'),'male_subject_possessive');
  } else if(/^(彼女)(は|が)/.test(jp) && !/[私僕わたし]/.test(jp) && /\bmy\b/i.test(a)){
    record(x,'a',a,a.replace(/\bmy\b/gi,'her'),'female_subject_possessive');
  }
}

html=html.slice(0,m.index)+m[1]+JSON.stringify(all)+m[3]+html.slice(m.index+m[0].length);
fs.writeFileSync(HTML,html);
const out={generated_at:new Date().toISOString(),source:HTML,english_count:english.length,change_count:changes.length,by_reason:Object.fromEntries([...new Set(changes.map(c=>c.reason))].sort().map(k=>[k,changes.filter(c=>c.reason===k).length])),changes};
fs.writeFileSync(AUDIT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({change_count:out.change_count,by_reason:out.by_reason},null,2));
