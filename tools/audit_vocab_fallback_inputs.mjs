import fs from 'node:fs';
import vm from 'node:vm';

function scriptJson(html,id){
  const m=new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i').exec(html);
  if(!m) throw new Error(`${id} not found`);
  return JSON.parse(m[1]);
}
function findMatchingBracket(src,start){
  let d=0,q=null,esc=false,line=false,block=false;
  for(let i=start;i<src.length;i++){
    const c=src[i],n=src[i+1];
    if(line){if(c==='\n')line=false;continue;}
    if(block){if(c==='*'&&n==='/'){block=false;i++;}continue;}
    if(q){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===q)q=null;continue;}
    if(c==='/'&&n==='/'){line=true;i++;continue;} if(c==='/'&&n==='*'){block=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){q=c;continue;}
    if(c==='[')d++; else if(c===']'){d--;if(d===0)return i;}
  }
  return -1;
}
function rootData(html){
  const m=/\b(?:const|let|var)\s+DATA\s*=\s*/g.exec(html); if(!m) throw new Error('root DATA not found');
  let start=m.index+m[0].length; while(/\s/.test(html[start]??''))start++;
  const end=findMatchingBracket(html,start); if(end<0) throw new Error('root DATA end not found');
  return vm.runInNewContext(`(${html.slice(start,end+1)})`,Object.create(null),{timeout:10000});
}
const norm=s=>String(s??'').normalize('NFKC').replace(/[’‘]/g,"'").trim().toLowerCase();
const tokenize=s=>(String(s??'').replace(/[’‘]/g,"'").match(/[A-Za-z]+(?:'[A-Za-z]+)?/g)||[]).map(norm);
const countBy=arr=>Object.fromEntries([...arr.reduce((m,x)=>m.set(x,(m.get(x)||0)+1),new Map())].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))));

const pdfElementary=`I you he she we they my your his her their it our am is are can do not yes no a the this that and but what who where when how I'm you're have like want know go come get use eat drink sleep make take study read write speak listen look watch play cook sing swim run meet live help good bad big small new old long short hot cold nice cute school teacher student friend English Japanese name class club home city country family bag book pen notebook picture park room dog cat in on at to from with of for`.split(/\s+/).map(norm);
const pdfSet=new Set(pdfElementary);
if(pdfSet.size!==104) throw new Error(`PDF transcription unique count ${pdfSet.size}`);
const root=rootData(fs.readFileSync('index.html','utf8'));
const runtimeElementary=[];
for(const r of root.filter(x=>x&&x.dataset==='elementary')) for(const t of tokenize(r.english)) runtimeElementary.push(t);
const runtimeSet=new Set(runtimeElementary);

const problemHtml=fs.readFileSync('problem-app/index.html','utf8');
const qb=scriptJson(problemHtml,'qb-data');
const meta=scriptJson(problemHtml,'meta-data');
function passesQualityGate(item){
  if(!item||!String(item.q||'').trim()||!String(item.a||'').trim()) return false;
  const q=String(item.q||''),a=String(item.a||''),both=q+' '+a;
  if(/This is (?:he|she|we)\b/i.test(both)) return false;
  if(/\bthan He\b/.test(both)) return false;
  if(/\b(?:Mika|She) (?:love|begin|stop)\b/.test(both)) return false;
  if(/Do you have (?:visited|been|finished|lost|lived|studied|seen|done)/i.test(both)) return false;
  if(/Did You ne\b|Do You\b|Do They\b|Does She\b|Does He\b/.test(both)) return false;
  if(/否定文または疑問文/.test(q)) return false;
  if(/日本語で説明しなさい/.test(q)&&/^[A-Za-z]/.test(a)) return false;
  if(/\(\s*she\s*\/\s*her\s*\/\s*her\s*\)/i.test(q)) return false;
  if(/\(\s*he\s*\/\s*him\s*\/\s*him\s*\)/i.test(q)) return false;
  if(String(item.id||'').startsWith('M2-INF2-')){
    if(item.type==='空所補充'&&/^to$/i.test(a)&&/\bto\s*\(\s*\)\s*(?=[A-Za-z])/i.test(q)) return false;
    if(/^(?:He|She|Yuki|Mika|Takumi|Ken|Emi|Tom|The student|The teacher|This boy|This girl|My mother|My father|My brother|My sister|My friend) (?:want|need|like) to\b/i.test(a)) return false;
  }
  if(item.category==='動名詞'&&!/[A-Za-z]+ing\b/.test(both)) return false;
  if(item.category==='比較'&&!/\bthan\b|\bas\s+\w+\s+as\b|\bmost\b|\w+est\b/i.test(both)) return false;
  const infinitiveBlank=item.type==='空所補充'&&/^to$/i.test(a)&&/\(\s*\)\s*[A-Za-z]+\b/.test(q);
  if((item.category==='不定詞'||item.category==='不定詞①'||item.category==='不定詞②')&&!/\bto\s+[A-Za-z]+\b/i.test(both)&&!infinitiveBlank) return false;
  if(String(item.category).startsWith('現在完了形')&&!/\b(?:have|has)\b/i.test(both)) return false;
  if(item.category==='関係代名詞'){
    if(!/\b(?:who|which|that)\b/i.test(both)) return false;
    if(item.type==='空所補充'&&/\(\s*\)/.test(q)){
      if(!/who\s*\/\s*which/i.test(q)) return false;
      if(!/^(?:who|which)$/i.test(a)) return false;
    }
  }
  return true;
}
function caseAudit(tb,grade,category){
  const finalOrdinal=(meta.sections?.[tb]?.[String(grade)]||[]).length;
  const items=qb.filter(x=>x.subject==='英語'&&x.grade===`中${grade}`&&x.category===category&&passesQualityGate(x));
  const passed=[],rejected=[];
  for(const item of items){
    const v=meta.passMeta?.[item.id]?.[tb];
    if(v===-2||(Number.isInteger(v)&&v>0&&v<=finalOrdinal)) passed.push(item); else rejected.push({...item,passMeta:v??null});
  }
  const tokenFreq=countBy(rejected.flatMap(x=>tokenize(`${x.q} ${x.a}`)).filter(t=>!pdfSet.has(t)));
  return {
    textbook:tb,grade:`中${grade}`,category,finalOrdinal,
    qualityEligible:items.length,passed:passed.length,rejected:rejected.length,retentionPct:items.length?+(passed.length*100/items.length).toFixed(2):0,
    rejectedTypes:countBy(rejected.map(x=>x.type)),
    topNonElementaryTokens:Object.entries(tokenFreq).slice(0,60),
    samples:rejected.slice(0,60).map(x=>({id:x.id,type:x.type,q:x.q,a:x.a,passMeta:x.passMeta}))
  };
}
const out={
  generatedAt:new Date().toISOString(),
  elementary:{pdfUnique:pdfSet.size,runtimeUnique:runtimeSet.size,runtimeTokenCount:runtimeElementary.length,missingFromRuntime:[...pdfSet].filter(x=>!runtimeSet.has(x)),extraInRuntime:[...runtimeSet].filter(x=>!pdfSet.has(x)).sort(),exactSetMatch:pdfSet.size===runtimeSet.size&&[...pdfSet].every(x=>runtimeSet.has(x))},
  severe:[caseAudit('サンシャイン',2,'動名詞'),caseAudit('サンシャイン',3,'接続詞')],
  controls:[caseAudit('ニューホライズン',2,'動名詞'),caseAudit('ニューホライズン',3,'接続詞')]
};
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/VOCAB_FALLBACK_INPUT_AUDIT.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({elementary:out.elementary,severe:out.severe.map(x=>({textbook:x.textbook,grade:x.grade,category:x.category,qualityEligible:x.qualityEligible,passed:x.passed,rejected:x.rejected,retentionPct:x.retentionPct}))},null,2));
if(!out.elementary.exactSetMatch) process.exitCode=2;
