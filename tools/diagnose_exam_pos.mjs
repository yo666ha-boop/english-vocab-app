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
    if (quote) {
      if (escaped) { escaped=false; continue; }
      if (c==='\\') { escaped=true; continue; }
      if (c===quote) quote=null;
      continue;
    }
    if (c==='/'&&n==='/') { lineComment=true; p++; continue; }
    if (c==='/'&&n==='*') { blockComment=true; p++; continue; }
    if (c==='"'||c==="'"||c==='`') { quote=c; continue; }
    if (c==='[') depth++;
    else if (c===']') { depth--; if (depth===0) return p; }
  }
  return -1;
}
const end=findMatchingBracket(text,start);
if(end<0) throw new Error('DATA closing bracket not found');
const data=vm.runInNewContext(`(${text.slice(start,end+1)})`,Object.create(null),{timeout:5000});
if(!Array.isArray(data)) throw new Error('DATA not array');
const exam=data.filter(r=>r?.dataset==='exam');
const freq=key=>Object.entries(exam.reduce((a,r)=>{const v=String(r?.[key]??'').trim()||'(blank)';a[v]=(a[v]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]);
const terms=['品詞','posFilter','pos_filter','examPos','exam-pos','pos_raw','posSelect','pos-select'];
const snippets=[];
for(const term of terms){let from=0;while(true){const idx=text.indexOf(term,from);if(idx<0)break;snippets.push({term,index:idx,text:text.slice(Math.max(0,idx-1200),Math.min(text.length,idx+2400))});from=idx+term.length;if(snippets.length>=120)break;}}
const report={
  total_count:data.length,
  textbook_count:data.filter(r=>r?.dataset==='textbook').length,
  exam_count:exam.length,
  elementary_count:data.filter(r=>r?.dataset==='elementary').length,
  exam_pos_blank:exam.filter(r=>!String(r?.pos??'').trim()).length,
  exam_pos_raw_blank:exam.filter(r=>!String(r?.pos_raw??'').trim()).length,
  pos_frequency:freq('pos'),
  pos_raw_frequency:freq('pos_raw'),
  sample_exam:exam.slice(0,20),
  snippet_count:snippets.length
};
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/EXAM_POS_DIAGNOSTIC.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('audit/EXAM_POS_UI_SNIPPETS.txt',snippets.map((s,n)=>`===== ${n+1} ${s.term} @ ${s.index} =====\n${s.text}\n`).join('\n'));
console.log(JSON.stringify(report,null,2));
if(exam.length!==534) throw new Error(`exam count changed: ${exam.length}`);
