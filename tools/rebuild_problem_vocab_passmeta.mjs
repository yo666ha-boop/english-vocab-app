import fs from 'node:fs';
import vm from 'node:vm';

const PROBLEM_HTML='problem-app/index.html';
const VOCAB_HTML='index.html';
const CSV_PATH='data/v7_master.csv';
const AUDIT_PATH='audit/PROBLEM_APP_PASSMETA_REBUILD_AUDIT.json';
const CANDIDATE_PATH='audit/PROBLEM_APP_PASSMETA_CANDIDATE.json';

function parseCsv(text){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else quoted=false;}else field+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(field);field='';}else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}else field+=c;}if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}return rows;}
function extractScriptJson(html,id){const m=new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i').exec(html);if(!m)throw new Error(`${id} not found`);return JSON.parse(m[1]);}
function findMatchingBracket(src,start){let d=0,q=null,e=false,lc=false,bc=false;for(let p=start;p<src.length;p++){const c=src[p],n=src[p+1];if(lc){if(c==='\n')lc=false;continue;}if(bc){if(c==='*'&&n==='/'){bc=false;p++;}continue;}if(q){if(e){e=false;continue;}if(c==='\\'){e=true;continue;}if(c===q)q=null;continue;}if(c==='/'&&n==='/'){lc=true;p++;continue;}if(c==='/'&&n==='*'){bc=true;p++;continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='[')d++;else if(c===']'){d--;if(d===0)return p;}}return-1;}
function extractVocabData(html){const m=/\b(?:const|let|var)\s+DATA\s*=\s*/g.exec(html);if(!m)throw new Error('DATA not found');let s=m.index+m[0].length;while(/\s/.test(html[s]??''))s++;const e=findMatchingBracket(html,s);return vm.runInNewContext(`(${html.slice(s,e+1)})`,Object.create(null),{timeout:10000});}
const key=s=>String(s??'').normalize('NFKC').replace(/[❶①]/g,'1').replace(/[❷②]/g,'2').replace(/[❸③]/g,'3').replace(/[❹④]/g,'4').replace(/[❺⑤]/g,'5').replace(/[❻⑥]/g,'6').replace(/[❼⑦]/g,'7').replace(/[❽⑧]/g,'8').replace(/[❾⑨]/g,'9').replace(/[❿⑩]/g,'10').replace(/[～〜]/g,'～').replace(/[，、]/g,',').replace(/\s+/g,' ').trim();
const gradeNum=g=>Number(String(g??'').replace(/\D/g,''));
const tokenMatches=s=>[...(String(s??'').replace(/[’‘]/g,"'").matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g))].map(m=>({lower:m[0].toLowerCase(),raw:m[0]}));
const tokensOf=s=>tokenMatches(s).map(x=>x.lower);

const irregular=new Map(Object.entries({am:'be',is:'be',are:'be',was:'be',were:'be',been:'be',being:'be',has:'have',had:'have',having:'have',does:'do',did:'do',done:'do',doing:'do',goes:'go',went:'go',gone:'go',going:'go',comes:'come',came:'come',coming:'come',sees:'see',saw:'see',seen:'see',seeing:'see',eats:'eat',ate:'eat',eaten:'eat',eating:'eat',drinks:'drink',drank:'drink',drunk:'drink',drinking:'drink',takes:'take',took:'take',taken:'take',taking:'take',makes:'make',made:'make',making:'make',writes:'write',wrote:'write',written:'write',writing:'write',reads:'read',reading:'read',buys:'buy',bought:'buy',buying:'buy',brings:'bring',brought:'bring',bringing:'bring',thinks:'think',thought:'think',thinking:'think',knows:'know',knew:'know',known:'know',knowing:'know',speaks:'speak',spoke:'speak',spoken:'speak',speaking:'speak',tells:'tell',told:'tell',telling:'tell',says:'say',said:'say',saying:'say',gets:'get',got:'get',gotten:'get',getting:'get',gives:'give',gave:'give',given:'give',giving:'give',finds:'find',found:'find',finding:'find',leaves:'leave',left:'leave',leaving:'leave',feels:'feel',felt:'feel',feeling:'feel',keeps:'keep',kept:'keep',keeping:'keep',meets:'meet',met:'meet',meeting:'meet',runs:'run',ran:'run',running:'run',swims:'swim',swam:'swim',swum:'swim',swimming:'swim',sits:'sit',sat:'sit',sitting:'sit',stands:'stand',stood:'stand',standing:'stand',loses:'lose',lost:'lose',losing:'lose',teaches:'teach',taught:'teach',teaching:'teach',catches:'catch',caught:'catch',catching:'catch',becomes:'become',became:'become',becoming:'become',begins:'begin',began:'begin',begun:'begin',beginning:'begin',builds:'build',built:'build',building:'build',sends:'send',sent:'send',sending:'send',pays:'pay',paid:'pay',wears:'wear',wore:'wear',worn:'wear',breaks:'break',broke:'break',broken:'break',chooses:'choose',chose:'choose',chosen:'choose',flies:'fly',flew:'fly',flown:'fly',forgets:'forget',forgot:'forget',forgotten:'forget',hears:'hear',heard:'hear',holds:'hold',held:'hold',rides:'ride',rode:'ride',ridden:'ride',sells:'sell',sold:'sell',sleeps:'sleep',slept:'sleep',spends:'spend',spent:'spend',wins:'win',won:'win'}));
function lemmas(t){const out=new Set([t]);if(irregular.has(t))out.add(irregular.get(t));if(t.endsWith("n't"))out.add(t.slice(0,-3));if(t.includes("'"))out.add(t.split("'")[0]);if(t.length>4&&t.endsWith('ies'))out.add(t.slice(0,-3)+'y');if(t.length>4&&t.endsWith('ves')){out.add(t.slice(0,-3)+'f');out.add(t.slice(0,-3)+'fe');}if(t.length>3&&t.endsWith('es')){out.add(t.slice(0,-2));out.add(t.slice(0,-1));}if(t.length>3&&t.endsWith('s')&&!t.endsWith('ss'))out.add(t.slice(0,-1));if(t.length>4&&t.endsWith('ied'))out.add(t.slice(0,-3)+'y');if(t.length>3&&t.endsWith('ed')){out.add(t.slice(0,-2));out.add(t.slice(0,-1));}if(t.length>5&&t.endsWith('ying'))out.add(t.slice(0,-4)+'ie');if(t.length>4&&t.endsWith('ing')){out.add(t.slice(0,-3));out.add(t.slice(0,-3)+'e');}if(t.length>4&&t.endsWith('ier'))out.add(t.slice(0,-3)+'y');if(t.length>5&&t.endsWith('iest'))out.add(t.slice(0,-4)+'y');if(t.length>3&&t.endsWith('er'))out.add(t.slice(0,-2));if(t.length>4&&t.endsWith('est'))out.add(t.slice(0,-3));for(const x of [...out])if(x.length>3&&x.at(-1)===x.at(-2))out.add(x.slice(0,-1));return[...out];}
const grammarCore=new Set(`a an the i you he she it we they me him her us them my your his its our their mine yours hers ours theirs this that these those who which what when where why how whose am is are was were be been being do does did have has had can could may might must should will would shall not no yes and but or so because if as than to of in on at for from with by about into over under after before between near here there now then very too also only just ever never already yet still every all some any many much more most less least one two three first second third please let let's`.split(/\s+/));

const problemHtml=fs.readFileSync(PROBLEM_HTML,'utf8'),qb=extractScriptJson(problemHtml,'qb-data'),meta=extractScriptJson(problemHtml,'meta-data'),english=qb.filter(x=>x.subject==='英語');
const table=parseCsv(fs.readFileSync(CSV_PATH,'utf8').replace(/^\uFEFF/,'')),headers=table[0],idx=Object.fromEntries(headers.map((h,i)=>[h,i])),rows=table.slice(1).filter(r=>r.some(v=>String(v).trim()));
const vocabData=extractVocabData(fs.readFileSync(VOCAB_HTML,'utf8')),elementary=new Set();for(const r of vocabData.filter(x=>x&&x.dataset==='elementary'))for(const t of tokensOf(r.english))elementary.add(t);
const books=['サンシャイン','ニューホライズン'];

function uiParts(label,kind,num){const s=key(label);let m;if(kind==='program')m=new RegExp(`^PROGRAM ${num}-(.+)$`,'i').exec(s);else m=new RegExp(`^Unit ${num}-(.+)$`,'i').exec(s);if(!m)return[];return(m[1].match(/\d+/g)||[]).map(Number);}
function findUiOrdinal(tb,g,predicate){const arr=meta.sections?.[tb]?.[String(g)]||[];const i=arr.findIndex(predicate);return i>=0?i+1:0;}
function lastUiOrdinalForPrefix(tb,g,prefix){const arr=meta.sections?.[tb]?.[String(g)]||[];let hit=0;arr.forEach((x,i)=>{if(key(x).toLowerCase().startsWith(prefix.toLowerCase()))hit=i+1;});return hit;}
function mapSunshine(section,tb,g){const s=key(section);let m;
  if((m=/プレステップ\s*(\d+)/.exec(s)))return findUiOrdinal(tb,g,x=>key(x).startsWith(`プレステップ${m[1]}`));
  if((m=/Get Ready\s*(\d+)/i.exec(s)))return findUiOrdinal(tb,g,x=>key(x).toLowerCase().startsWith(`get ready ${m[1]}`.toLowerCase()));
  if((m=/PROGRAM\s*(\d+)\s+(\d+)-(\d+)(?:\s*[,・]\s*(\d+))?/i.exec(s))){const prog=Number(m[1]),parts=[Number(m[3])];if(m[4])parts.push(Number(m[4]));let ord=0;for(const part of parts){const o=findUiOrdinal(tb,g,x=>key(x).startsWith(`PROGRAM ${prog}-`)&&uiParts(x,'program',prog).includes(part));ord=Math.max(ord,o);}return ord;}
  if((m=/PROGRAM\s*(\d+)\s+教科書本文/i.exec(s)))return lastUiOrdinalForPrefix(tb,g,`PROGRAM ${m[1]}-`);
  if((m=/PROGRAM\s*(\d+)\s+(\d+)-1\s*[～~]\s*(\d+)/i.exec(s)))return lastUiOrdinalForPrefix(tb,g,`PROGRAM ${m[1]}-`);
  if(/アクションコーナー/.test(s))return findUiOrdinal(tb,g,x=>key(x).includes('アクションコーナー'));
  if(/疑問詞のまとめ/.test(s))return findUiOrdinal(tb,g,x=>key(x).includes('疑問詞のまとめ'));
  if((m=/Our Project\s*(\d+)/i.exec(s)))return findUiOrdinal(tb,g,x=>key(x).toLowerCase().includes(`our project ${m[1]}`));
  if((m=/Power-Up\s*(\d+)/i.exec(s)))return findUiOrdinal(tb,g,x=>key(x).toLowerCase().includes(`power-up ${m[1]}`));
  if((m=/Reading\s*(\d+)/i.exec(s)))return findUiOrdinal(tb,g,x=>key(x).toLowerCase().includes(`reading ${m[1]}`));
  if((m=/Step\s*(\d+)/i.exec(s)))return findUiOrdinal(tb,g,x=>key(x).toLowerCase().includes(`step ${m[1]}`));
  if(/Special Project/i.test(s))return findUiOrdinal(tb,g,x=>/special project/i.test(key(x)));
  return 0;
}
function rawNhSubpart(section){const s=key(section);let m;if((m=/Unit\s*(\d+)\s+Part\s*(\d+)/i.exec(s)))return{unit:Number(m[1]),part:Number(m[2]),kind:'part'};if((m=/Unit\s*(\d+)\s+Read and Think\s*(\d+)/i.exec(s)))return{unit:Number(m[1]),rt:Number(m[2]),kind:'rt'};return null;}
function mapNh(section,tb,g,maxPartByUnit){const s=key(section);let m;
  if((m=/プレステップ\s*(\d+)/.exec(s)))return findUiOrdinal(tb,g,x=>key(x).startsWith(`プレステップ${m[1]}`));
  if(/Unit\s*0/i.test(s))return findUiOrdinal(tb,g,x=>key(x)==='Unit 0');
  const sub=rawNhSubpart(s);if(sub){const part=sub.kind==='part'?sub.part:(maxPartByUnit[sub.unit]||2)+sub.rt;return findUiOrdinal(tb,g,x=>key(x).startsWith(`Unit ${sub.unit}-`)&&uiParts(x,'unit',sub.unit).includes(part));}
  if((m=/Unit\s*(\d+)\s+教科書本文/i.exec(s)))return lastUiOrdinalForPrefix(tb,g,`Unit ${m[1]}-`);
  if((m=/Unit\s*(\d+)\s+\d+\s*[～~].*/i.exec(s)))return lastUiOrdinalForPrefix(tb,g,`Unit ${m[1]}-`);
  if((m=/Real Life English\s*(\d+)/i.exec(s)))return findUiOrdinal(tb,g,x=>key(x).toLowerCase().includes(`real life english ${m[1]}`));
  if((m=/Stage Activity\s*(\d+)/i.exec(s)))return findUiOrdinal(tb,g,x=>key(x).toLowerCase().includes(`stage activity ${m[1]}`));
  if((m=/Let's Read\s*(\d+)/i.exec(s)))return findUiOrdinal(tb,g,x=>key(x).toLowerCase().startsWith(`let's read ${m[1]}`));
  if(/Let's Read/i.test(s)){const arr=meta.sections?.[tb]?.[String(g)]||[];let hit=0;arr.forEach((x,i)=>{if(key(x).toLowerCase().startsWith("let's read"))hit=i+1;});return hit;}
  return 0;
}

const stageLex={},mappingAudit={};
for(const tb of books){stageLex[tb]={};mappingAudit[tb]={};for(const g of[1,2,3]){
  const selected=rows.filter(r=>key(r[idx['教科書']])===tb&&gradeNum(r[idx['学年']])===g);const maxPartByUnit={};
  if(tb==='ニューホライズン')for(const r of selected){const sub=rawNhSubpart(r[idx['単元名']]);if(sub?.kind==='part')maxPartByUnit[sub.unit]=Math.max(maxPartByUnit[sub.unit]||0,sub.part);}
  const lex=new Map(),mappedPairs=new Map(),unmappedPairs=new Map(),priorRows=[];
  for(const r of selected){const major=key(r[idx['大単元']]),section=key(r[idx['単元名']]);const prior=/^\[(\d+)年生\]/.exec(major);let ordinal=0,priorGrade=false;
    if(prior&&Number(prior[1])<g){priorGrade=true;priorRows.push(section);}else ordinal=tb==='サンシャイン'?mapSunshine(section,tb,g):mapNh(section,tb,g,maxPartByUnit);
    const pair=major+' ⟶ '+section;if(priorGrade||ordinal>0)mappedPairs.set(pair,{ordinal:priorGrade?0:ordinal,priorGrade});else unmappedPairs.set(pair,(unmappedPairs.get(pair)||0)+1);
    for(const t of tokensOf(r[idx['英語']])){const stage=priorGrade?0:ordinal;if(stage>=0&&(priorGrade||ordinal>0)){const old=lex.get(t);if(old===undefined||stage<old)lex.set(t,stage);}}
  }
  stageLex[tb][g]=lex;mappingAudit[tb][`中${g}`]={csv_rows:selected.length,ui_sections:(meta.sections?.[tb]?.[String(g)]||[]).length,mapped_unique_pairs:mappedPairs.size,unmapped_unique_pairs:unmappedPairs.size,unmapped_pairs:[...unmappedPairs.keys()].slice(0,200),prior_grade_row_count:priorRows.length,prior_grade_samples:priorRows.slice(0,30),max_part_by_unit:maxPartByUnit};
}}
function tokenStage(tok,raw,tb,g){const candidates=lemmas(tok);if(candidates.some(x=>grammarCore.has(x)||elementary.has(x)))return 0;if(/^[A-Z][a-z]+$/.test(raw)||/^[A-Z]{2,}$/.test(raw))return 0;for(let pg=1;pg<g;pg++){const lex=stageLex[tb][pg];for(const x of candidates)if(lex.has(x))return 0;}const lex=stageLex[tb][g];let best=Infinity;for(const x of candidates)if(lex.has(x)&&lex.get(x)<best)best=lex.get(x);return Number.isFinite(best)?best:null;}

const candidate={},audit={generated_at_utc:new Date().toISOString(),coordinate_version:'v8-canonical-token-stage-dryrun',mapping:mappingAudit,coverage:{},unresolved_tokens:{}};
for(const item of english){candidate[item.id]={};}
for(const tb of books){audit.coverage[tb]={};audit.unresolved_tokens[tb]={};for(const g of[1,2,3]){const items=english.filter(x=>gradeNum(x.grade)===g),unknown=new Map();let resolved=0,oldResolved=0,resolvedOrOld=0;for(const item of items){const toks=tokenMatches(`${item.q??''} ${item.a??''}`),uniq=new Map();for(const t of toks)if(!uniq.has(t.lower))uniq.set(t.lower,t.raw);let req=0,blocked=false;for(const [tok,raw]of uniq){const stage=tokenStage(tok,raw,tb,g);if(stage===null){blocked=true;unknown.set(tok,(unknown.get(tok)||0)+1);}else req=Math.max(req,stage);}const old=(meta.passMeta?.[item.id]||{})[tb];if(Number.isInteger(old)&&old>0)oldResolved++;if(!blocked){resolved++;candidate[item.id][tb]=Math.max(1,req);}else candidate[item.id][tb]=-1;if(!blocked||(Number.isInteger(old)&&old>0))resolvedOrOld++;}const total=items.length;audit.coverage[tb][`中${g}`]={total,reconstructed_resolved:resolved,reconstructed_resolved_pct:+(resolved*100/total).toFixed(2),old_resolved:oldResolved,old_resolved_pct:+(oldResolved*100/total).toFixed(2),resolved_or_old:resolvedOrOld,resolved_or_old_pct:+(resolvedOrOld*100/total).toFixed(2)};audit.unresolved_tokens[tb][`中${g}`]=[...unknown.entries()].sort((a,b)=>b[1]-a[1]).slice(0,120).map(([token,count])=>({token,count}));}}
fs.mkdirSync('audit',{recursive:true});fs.writeFileSync(AUDIT_PATH,JSON.stringify(audit,null,2)+'\n');fs.writeFileSync(CANDIDATE_PATH,JSON.stringify({version:audit.coordinate_version,passMeta:candidate},null,2)+'\n');console.log(JSON.stringify({mapping:audit.mapping,coverage:audit.coverage},null,2));
