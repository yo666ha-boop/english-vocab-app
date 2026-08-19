import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const PATH='index.html';
let html=fs.readFileSync(PATH,'utf8');
const originalHtml=html;

const decl=/\b(?:const|let|var)\s+DATA\s*=\s*/g.exec(html);
if(!decl) throw new Error('DATA declaration not found');
let dataStart=decl.index+decl[0].length;
while(/\s/.test(html[dataStart]??'')) dataStart++;
if(html[dataStart]!=='[') throw new Error('DATA array start not found');
function findEnd(src,begin){let d=0,q=null,e=false,lc=false,bc=false;for(let p=begin;p<src.length;p++){const c=src[p],n=src[p+1];if(lc){if(c==='\n')lc=false;continue;}if(bc){if(c==='*'&&n==='/'){bc=false;p++;}continue;}if(q){if(e){e=false;continue;}if(c==='\\'){e=true;continue;}if(c===q)q=null;continue;}if(c==='/'&&n==='/'){lc=true;p++;continue;}if(c==='/'&&n==='*'){bc=true;p++;continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='[')d++;else if(c===']'){d--;if(d===0)return p;}}return -1;}
const dataEnd=findEnd(html,dataStart);
if(dataEnd<0) throw new Error('DATA array end not found');
const data=vm.runInNewContext(`(${html.slice(dataStart,dataEnd+1)})`,Object.create(null),{timeout:5000});
if(!Array.isArray(data)) throw new Error('DATA is not array');

const textbook=data.filter(r=>r?.dataset==='textbook');
const exam=data.filter(r=>r?.dataset==='exam');
const elementary=data.filter(r=>r?.dataset==='elementary');
if(textbook.length!==3975||exam.length!==534||elementary.length!==104||data.length!==4613) throw new Error(`dataset counts changed before fix: ${textbook.length}/${exam.length}/${elementary.length}/${data.length}`);
const nonExamBefore=crypto.createHash('sha256').update(JSON.stringify(data.filter(r=>r?.dataset!=='exam'))).digest('hex');

const norm=s=>String(s??'').toLowerCase().trim().replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ');
const byEnglish=new Map();
for(const r of textbook){const k=norm(r.english);if(!k)continue;if(!byEnglish.has(k))byEnglish.set(k,[]);byEnglish.get(k).push(r);}

const allowed=new Set(['名詞','代名詞','動詞','助動詞','形容詞','副詞','前置詞','接続詞','冠詞','間投詞','熟語・表現']);
const rawMap={'名詞':'名','代名詞':'代','動詞':'動','助動詞':'助','形容詞':'形','副詞':'副','前置詞':'前','接続詞':'接','冠詞':'冠','間投詞':'間','熟語・表現':'熟語・表現'};

// 一語ずつ日本語の意味を確認して決めた行。index は高校入試版534語の0始まり順。
const reviewed=new Map([
  [0,'動詞'],[1,'接続詞'],[2,'動詞'],[3,'動詞'],[4,'接続詞'],[5,'動詞'],
  [11,'代名詞'],[12,'動詞'],[29,'副詞'],[39,'代名詞'],[45,'助動詞'],[48,'助動詞'],[49,'動詞'],[50,'動詞'],[52,'動詞'],[60,'動詞'],[69,'動詞'],[75,'動詞'],[86,'動詞'],[87,'動詞'],[108,'動詞'],[109,'動詞'],[116,'動詞'],[137,'副詞'],[138,'副詞'],[143,'代名詞'],[155,'形容詞'],[159,'形容詞'],[164,'名詞'],[168,'名詞'],[169,'名詞'],[171,'名詞'],[172,'名詞'],[176,'名詞'],[178,'前置詞'],[179,'接続詞'],[184,'形容詞'],[188,'名詞'],[195,'名詞'],[204,'形容詞'],[208,'名詞'],[209,'動詞'],[211,'名詞'],
  [225,'形容詞'],[226,'名詞'],[229,'動詞'],[234,'名詞'],[236,'熟語・表現'],[237,'名詞'],[242,'名詞'],[243,'名詞'],[248,'名詞'],[249,'名詞'],[250,'熟語・表現'],[257,'名詞'],[259,'名詞'],[260,'名詞'],[264,'名詞'],[265,'名詞'],[268,'名詞'],[270,'名詞'],[271,'名詞'],[279,'名詞'],[283,'名詞'],[285,'名詞'],[287,'名詞'],[291,'名詞'],[293,'名詞'],[296,'名詞'],[297,'名詞'],[298,'名詞'],[300,'名詞'],[310,'名詞'],[314,'名詞'],[315,'名詞'],[325,'名詞'],[326,'名詞'],[327,'名詞'],[335,'名詞'],[336,'形容詞'],[337,'名詞'],[338,'名詞'],[340,'名詞'],[341,'名詞'],[342,'名詞'],[343,'名詞'],[347,'名詞'],[350,'名詞'],[351,'名詞'],[352,'名詞'],[353,'名詞'],[354,'名詞'],[355,'名詞'],[356,'名詞'],[357,'名詞'],
  [420,'熟語・表現'],[421,'接続詞'],[422,'熟語・表現'],[424,'熟語・表現'],[425,'副詞'],[426,'熟語・表現'],[431,'副詞'],[433,'熟語・表現'],[434,'熟語・表現'],[435,'熟語・表現'],[437,'熟語・表現'],[438,'代名詞'],[439,'熟語・表現'],[440,'熟語・表現'],[441,'熟語・表現'],[442,'熟語・表現'],[443,'熟語・表現'],[445,'代名詞'],[447,'代名詞'],[449,'熟語・表現'],[451,'熟語・表現'],[456,'熟語・表現'],[457,'熟語・表現'],[459,'熟語・表現'],[462,'熟語・表現'],[463,'熟語・表現'],[464,'形容詞'],[465,'熟語・表現'],[469,'熟語・表現']
]);

const classifications=[];
for(let i=0;i<exam.length;i++){
  const r=exam[i];
  let pos='', source='';
  if(reviewed.has(i)){pos=reviewed.get(i);source='reviewed-meaning';}
  else if(r.exam_category==='英作文の型'){pos='熟語・表現';source='reviewed-category';}
  else if(r.exam_category==='不規則動詞'){pos='動詞';source='reviewed-category';}
  else {
    const matches=byEnglish.get(norm(r.english))||[];
    const poses=[...new Set(matches.map(x=>String(x.pos??'').trim()).filter(Boolean))];
    if(poses.length===1){pos=poses[0];source='textbook-consensus';}
  }
  if(!allowed.has(pos)) throw new Error(`POS unresolved/invalid at exam[${i}] ${r.english} / ${r.japanese}: ${pos}`);
  r.pos=pos;
  r.pos_raw=rawMap[pos];
  classifications.push({exam_index:i,english:r.english,japanese:r.japanese,exam_category:r.exam_category,pos,pos_raw:r.pos_raw,source});
}

if(exam.some(r=>!String(r.pos??'').trim())||exam.some(r=>!String(r.pos_raw??'').trim())) throw new Error('exam POS blanks remain');
const nonExamAfter=crypto.createHash('sha256').update(JSON.stringify(data.filter(r=>r?.dataset!=='exam'))).digest('hex');
if(nonExamBefore!==nonExamAfter) throw new Error('non-exam DATA changed');

html=html.slice(0,dataStart)+JSON.stringify(data)+html.slice(dataEnd+1);

function replaceOnce(search,replacement,label){const n=html.split(search).length-1;if(n!==1)throw new Error(`${label}: expected exactly 1 match, got ${n}`);html=html.replace(search,replacement);}

replaceOnce(
`        <details><summary>分類 <span class="meta" id="examSubMeta"></span></summary><div class="checklist" id="examSubBox"></div></details>\n      </div>`,
`        <details><summary>分類 <span class="meta" id="examSubMeta"></span></summary><div class="checklist" id="examSubBox"></div></details>\n        <details open><summary>品詞 <span class="meta" id="examPosMeta"></span></summary><div class="checklist" id="examPosBox"></div></details>\n      </div>`,
'exam POS HTML');
replaceOnce(`    examSub: new Set(),\n    elemType:`, `    examSub: new Set(),\n    examPos: new Set(),\n    elemType:`, 'state examPos');
replaceOnce(`    examSub: document.getElementById('examSubBox'),\n    elemType:`, `    examSub: document.getElementById('examSubBox'),\n    examPos: document.getElementById('examPosBox'),\n    elemType:`, 'box examPos');
replaceOnce(`    examSub: document.getElementById('examSubMeta'),\n    elemType:`, `    examSub: document.getElementById('examSubMeta'),\n    examPos: document.getElementById('examPosMeta'),\n    elemType:`, 'meta examPos');
replaceOnce(`      if (state.dataset === 'exam' && ['examCategory'].includes(k)) renderAllFilters();`, `      if (state.dataset === 'exam' && ['examCategory','examSub'].includes(k)) renderAllFilters();`, 'exam dependent filters');
replaceOnce(
`    const subs = uniqueKeepOrder(base.map(r => r.exam_subcategory).filter(Boolean));\n    state.filters.examSub = new Set(selectedArray('examSub').filter(v => subs.includes(v)));\n    renderChecklist(els.boxes.examSub, 'examSub', subs);`,
`    const subs = uniqueKeepOrder(base.map(r => r.exam_subcategory).filter(Boolean));\n    state.filters.examSub = new Set(selectedArray('examSub').filter(v => subs.includes(v)));\n    renderChecklist(els.boxes.examSub, 'examSub', subs);\n    const basePos = base.filter(r => matches(state.filters.examSub, r.exam_subcategory));\n    const poses = uniqueKeepOrder(basePos.map(r => r.pos).filter(Boolean));\n    state.filters.examPos = new Set(selectedArray('examPos').filter(v => poses.includes(v)));\n    renderChecklist(els.boxes.examPos, 'examPos', poses);`,
'exam render filters');
replaceOnce(
`      matches(state.filters.examCategory, r.exam_category) &&\n      matches(state.filters.examSub, r.exam_subcategory)`,
`      matches(state.filters.examCategory, r.exam_category) &&\n      matches(state.filters.examSub, r.exam_subcategory) &&\n      matches(state.filters.examPos, r.pos)`,
'exam filteredRows');
replaceOnce(
`    els.headRow.innerHTML = \`<th>カテゴリ</th><th>分類</th><th>英語</th><th>日本語</th>\`;\n    els.listBody.innerHTML = state.currentList.map(r => \`<tr><td>\${esc(r.exam_category)}</td><td>\${esc(r.exam_subcategory || '')}</td><td><strong>\${esc(r.english)}</strong></td><td>\${esc(r.japanese)}</td></tr>\`).join('');`,
`    els.headRow.innerHTML = \`<th>カテゴリ</th><th>分類</th><th>品詞</th><th>英語</th><th>日本語</th>\`;\n    els.listBody.innerHTML = state.currentList.map(r => \`<tr><td>\${esc(r.exam_category)}</td><td>\${esc(r.exam_subcategory || '')}</td><td>\${esc(r.pos || '')}</td><td><strong>\${esc(r.english)}</strong></td><td>\${esc(r.japanese)}</td></tr>\`).join('');`,
'exam list POS column');
replaceOnce(`  state.filters.examSub = new Set();\n  clearCurrentTest();`, `  state.filters.examSub = new Set();\n  state.filters.examPos = new Set();\n  clearCurrentTest();`, 'quick target clear examPos');
replaceOnce(
`    rows.push(['入試カテゴリ', compactList(state.filters.examCategory, 'すべて')]);\n    rows.push(['分類', compactList(state.filters.examSub, 'すべて')]);`,
`    rows.push(['入試カテゴリ', compactList(state.filters.examCategory, 'すべて')]);\n    rows.push(['分類', compactList(state.filters.examSub, 'すべて')]);\n    rows.push(['品詞', compactList(state.filters.examPos, 'すべて')]);`,
'exam print conditions');
replaceOnce(
`    const cats = shortItemsForPrint(uniqueFromCurrentList('exam_category'), '全範囲');\n    return \`高校入試版｜\${cats}\`;`,
`    const cats = shortItemsForPrint(uniqueFromCurrentList('exam_category'), '全範囲');\n    const poses = shortItemsForPrint(uniqueFromCurrentList('pos'), '全品詞');\n    return \`高校入試版｜\${cats}｜\${poses}\`;`,
'exam print range line');

if(html===originalHtml) throw new Error('no changes produced');
fs.writeFileSync(PATH,html);

const posCounts=Object.fromEntries([...allowed].map(p=>[p,exam.filter(r=>r.pos===p).length]).filter(([,n])=>n));
const sourceCounts=classifications.reduce((a,r)=>(a[r.source]=(a[r.source]||0)+1,a),{});
const result={status:'pass',total_count:data.length,textbook_count:textbook.length,exam_count:exam.length,elementary_count:elementary.length,exam_pos_blank:0,exam_pos_raw_blank:0,pos_counts:posCounts,classification_source_counts:sourceCounts,non_exam_data_sha256_unchanged:true,ui_changes:['高校入試版に品詞フィルター追加','カテゴリ・分類・品詞の同時絞り込み','高校入試一覧に品詞列追加','印刷条件に品詞追加'],checked_at_utc:new Date().toISOString()};
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/EXAM_POS_FIX_RESULT.json',JSON.stringify(result,null,2)+'\n');
fs.writeFileSync('audit/EXAM_POS_CLASSIFICATION.tsv',['exam_index\tenglish\tjapanese\texam_category\tpos\tpos_raw\tsource',...classifications.map(r=>[r.exam_index,r.english,r.japanese,r.exam_category,r.pos,r.pos_raw,r.source].map(v=>String(v??'').replace(/[\t\r\n]+/g,' ')).join('\t'))].join('\n')+'\n');
console.log(JSON.stringify(result,null,2));
