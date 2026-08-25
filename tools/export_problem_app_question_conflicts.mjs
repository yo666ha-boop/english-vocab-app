import fs from 'node:fs';
const html=fs.readFileSync('problem-app/index.html','utf8');
const m=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);if(!m)throw new Error('qb-data missing');
const qb=JSON.parse(m[1]).filter(x=>x.subject==='英語');
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const key=s=>norm(s).toLowerCase();
const map=new Map();for(const x of qb){const k=key(x.q);const a=map.get(k)||[];a.push(x);map.set(k,a);}
const groups=[];for(const [q,items] of map){const answers=[...new Set(items.map(x=>norm(x.a)))];if(answers.length>1)groups.push({q:items[0].q,count:items.length,answers,categories:[...new Set(items.map(x=>`${x.grade}/${x.category}/${x.type}`))],sample_ids:items.slice(0,20).map(x=>x.id)});}
groups.sort((a,b)=>b.count-a.count||a.q.localeCompare(b.q));
let txt=`conflict_groups\t${groups.length}\n`;
for(const [i,g] of groups.entries())txt+=`${i+1}\t${g.count}\t${g.categories.join(' | ')}\tQ=${g.q.replace(/\t|\n/g,' ')}\tA=${g.answers.join(' || ').replace(/\t|\n/g,' ')}\n`;
fs.writeFileSync('audit/PROBLEM_APP_QUESTION_CONFLICTS.tsv',txt);
console.log(txt);
