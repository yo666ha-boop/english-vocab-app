import fs from 'node:fs';
import vm from 'node:vm';

const text=fs.readFileSync('index.html','utf8');
const decl=/\b(?:const|let|var)\s+DATA\s*=\s*/g.exec(text);
if(!decl) throw new Error('DATA declaration not found');
let start=decl.index+decl[0].length;
while(/\s/.test(text[start]??'')) start++;
if(text[start]!=='[') throw new Error(`DATA does not start with [ at ${start}`);
function endBracket(src,begin){let d=0,q=null,e=false,lc=false,bc=false;for(let p=begin;p<src.length;p++){const c=src[p],n=src[p+1];if(lc){if(c==='\n')lc=false;continue;}if(bc){if(c==='*'&&n==='/'){bc=false;p++;}continue;}if(q){if(e){e=false;continue;}if(c==='\\'){e=true;continue;}if(c===q)q=null;continue;}if(c==='/'&&n==='/'){lc=true;p++;continue;}if(c==='/'&&n==='*'){bc=true;p++;continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='[')d++;else if(c===']'){d--;if(d===0)return p;}}return -1;}
const end=endBracket(text,start);
if(end<0) throw new Error('DATA closing bracket not found');
const data=vm.runInNewContext(`(${text.slice(start,end+1)})`,Object.create(null),{timeout:5000});
if(!Array.isArray(data)) throw new Error('DATA not array');
const exam=data.filter(r=>r?.dataset==='exam');
const freq=key=>Object.fromEntries(Object.entries(exam.reduce((a,r)=>{const v=String(r?.[key]??'').trim()||'(blank)';a[v]=(a[v]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]));
const allowed=new Set(['名詞','代名詞','動詞','助動詞','形容詞','副詞','前置詞','接続詞','冠詞','間投詞','熟語・表現']);
const invalid=exam.map((r,i)=>({i,english:r.english,pos:String(r.pos??'').trim(),pos_raw:String(r.pos_raw??'').trim()})).filter(r=>!allowed.has(r.pos)||!r.pos_raw);
const markers={
  exam_pos_box:(text.match(/id="examPosBox"/g)||[]).length===1,
  exam_pos_meta:(text.match(/id="examPosMeta"/g)||[]).length===1,
  exam_pos_state:text.includes('examPos: new Set()'),
  exam_pos_filter:text.includes('matches(state.filters.examPos, r.pos)'),
  exam_pos_list_column:text.includes('<th>カテゴリ</th><th>分類</th><th>品詞</th><th>英語</th><th>日本語</th>'),
  exam_pos_print_condition:text.includes("rows.push(['品詞', compactList(state.filters.examPos, 'すべて')]);")
};
const report={
  status:'pass',
  total_count:data.length,
  textbook_count:data.filter(r=>r?.dataset==='textbook').length,
  exam_count:exam.length,
  elementary_count:data.filter(r=>r?.dataset==='elementary').length,
  exam_pos_blank:exam.filter(r=>!String(r?.pos??'').trim()).length,
  exam_pos_raw_blank:exam.filter(r=>!String(r?.pos_raw??'').trim()).length,
  invalid_pos_count:invalid.length,
  pos_frequency:freq('pos'),
  pos_raw_frequency:freq('pos_raw'),
  ui_markers:markers,
  checked_at_utc:new Date().toISOString()
};
if(report.total_count!==4613||report.textbook_count!==3975||report.exam_count!==534||report.elementary_count!==104) throw new Error('dataset counts changed');
if(report.exam_pos_blank!==0||report.exam_pos_raw_blank!==0||report.invalid_pos_count!==0) throw new Error('exam POS audit failed: '+JSON.stringify({blank:report.exam_pos_blank,raw_blank:report.exam_pos_raw_blank,invalid}));
if(Object.values(markers).some(v=>!v)) throw new Error('exam POS UI marker missing: '+JSON.stringify(markers));
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/EXAM_POS_DIAGNOSTIC.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
