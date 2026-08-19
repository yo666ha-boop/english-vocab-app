import fs from 'node:fs';
import vm from 'node:vm';

const text = fs.readFileSync('index.html','utf8');
const decl = /\b(?:const|let|var)\s+DATA\s*=\s*/g.exec(text);
if (!decl) throw new Error('DATA declaration not found');
let start = decl.index + decl[0].length;
while (/\s/.test(text[start] ?? '')) start++;
if (text[start] !== '[') throw new Error(`DATA does not start with [ at ${start}`);
function findMatchingBracket(src, begin) {
  let depth=0, quote=null, escaped=false, lineComment=false, blockComment=false;
  for (let p=begin;p<src.length;p++) {
    const c=src[p], n=src[p+1];
    if (lineComment) { if (c==='\n') lineComment=false; continue; }
    if (blockComment) { if (c==='*'&&n==='/') { blockComment=false; p++; } continue; }
    if (quote) { if (escaped) {escaped=false;continue;} if(c==='\\'){escaped=true;continue;} if(c===quote)quote=null; continue; }
    if(c==='/'&&n==='/'){lineComment=true;p++;continue;} if(c==='/'&&n==='*'){blockComment=true;p++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;} if(c==='[')depth++; else if(c===']'){depth--;if(depth===0)return p;}
  }
  return -1;
}
const end=findMatchingBracket(text,start); if(end<0)throw new Error('DATA closing bracket not found');
const data=vm.runInNewContext(`(${text.slice(start,end+1)})`,Object.create(null),{timeout:5000});
if(!Array.isArray(data))throw new Error('DATA not array');
const exam=data.filter(r=>r?.dataset==='exam');
const textbook=data.filter(r=>r?.dataset==='textbook');
const freq=(rows,key)=>Object.entries(rows.reduce((a,r)=>{const v=String(r?.[key]??'').trim()||'(blank)';a[v]=(a[v]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]);
const key=s=>String(s??'').toLowerCase().trim().replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ');
const textbookByEnglish=new Map();
for(const r of textbook){const k=key(r.english);if(!k)continue;if(!textbookByEnglish.has(k))textbookByEnglish.set(k,[]);textbookByEnglish.get(k).push(r);}
const recoverable=[]; const ambiguous=[]; const unresolved=[];
for(const r of exam){
  const matches=textbookByEnglish.get(key(r.english))||[];
  const poses=[...new Set(matches.map(x=>String(x.pos??'').trim()).filter(Boolean))];
  if(poses.length===1)recoverable.push({english:r.english,japanese:r.japanese,pos:poses[0],match_count:matches.length});
  else if(poses.length>1)ambiguous.push({english:r.english,japanese:r.japanese,poses,match_count:matches.length});
  else unresolved.push({english:r.english,japanese:r.japanese,phrase:r.phrase,exam_category:r.exam_category,match_count:matches.length});
}
const terms=['品詞','posBox','posMeta','examCategoryBox','examSubBox','filteredRows','state.filters.pos'];
const snippets=[];
for(const term of terms){let from=0;while(true){const idx=text.indexOf(term,from);if(idx<0)break;snippets.push({term,index:idx,text:text.slice(Math.max(0,idx-1200),Math.min(text.length,idx+2600))});from=idx+term.length;if(snippets.length>=160)break;}}
const report={total_count:data.length,textbook_count:textbook.length,exam_count:exam.length,elementary_count:data.filter(r=>r?.dataset==='elementary').length,exam_pos_blank:exam.filter(r=>!String(r?.pos??'').trim()).length,exam_pos_raw_blank:exam.filter(r=>!String(r?.pos_raw??'').trim()).length,pos_frequency:freq(exam,'pos'),pos_raw_frequency:freq(exam,'pos_raw'),textbook_exact_pos_recoverable_count:recoverable.length,textbook_exact_pos_ambiguous_count:ambiguous.length,manual_or_other_source_needed_count:unresolved.length,recoverable,ambiguous,unresolved,snippet_count:snippets.length};
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/EXAM_POS_DIAGNOSTIC.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('audit/EXAM_POS_UI_SNIPPETS.txt',snippets.map((s,n)=>`===== ${n+1} ${s.term} @ ${s.index} =====\n${s.text}\n`).join('\n'));
console.log(JSON.stringify({exam_count:exam.length,exam_pos_blank:report.exam_pos_blank,recoverable:recoverable.length,ambiguous:ambiguous.length,unresolved:unresolved.length},null,2));
if(exam.length!==534)throw new Error(`exam count changed: ${exam.length}`);
