import fs from 'node:fs';
import vm from 'node:vm';

const PROBLEM_HTML = 'problem-app/index.html';
const VOCAB_HTML = 'index.html';
const CSV_PATH = 'data/v7_master.csv';
const OUT = 'audit/PROBLEM_APP_PASSMETA_SAFE_CANDIDATE.json';
const AUDIT = 'audit/PROBLEM_APP_PASSMETA_SAFE_AUDIT.json';

function parseCsv(text) {
  const rows=[]; let row=[], field='', quoted=false;
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (quoted) {
      if (c==='"') { if (text[i+1]==='"') { field+='"'; i++; } else quoted=false; }
      else field+=c;
    } else if (c==='"') quoted=true;
    else if (c===',') { row.push(field); field=''; }
    else if (c==='\n') { row.push(field.replace(/\r$/,'')); rows.push(row); row=[]; field=''; }
    else field+=c;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/,'')); rows.push(row); }
  return rows;
}
function scriptJson(html,id) {
  const m=new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i').exec(html);
  if(!m) throw new Error(`${id} not found`);
  return JSON.parse(m[1]);
}
function findMatchingBracket(src,start) {
  let d=0,q=null,esc=false,line=false,block=false;
  for(let i=start;i<src.length;i++) {
    const c=src[i], n=src[i+1];
    if(line){if(c==='\n')line=false;continue;}
    if(block){if(c==='*'&&n==='/'){block=false;i++;}continue;}
    if(q){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===q)q=null;continue;}
    if(c==='/'&&n==='/'){line=true;i++;continue;} if(c==='/'&&n==='*'){block=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){q=c;continue;}
    if(c==='[')d++; else if(c===']'){d--;if(d===0)return i;}
  }
  return -1;
}
function vocabData(html) {
  const m=/\b(?:const|let|var)\s+DATA\s*=\s*/g.exec(html); if(!m) throw new Error('root DATA not found');
  let start=m.index+m[0].length; while(/\s/.test(html[start]??''))start++;
  const end=findMatchingBracket(html,start); if(end<0) throw new Error('root DATA end not found');
  return vm.runInNewContext(`(${html.slice(start,end+1)})`,Object.create(null),{timeout:10000});
}
const key=s=>String(s??'').normalize('NFKC')
  .replace(/[❶①]/g,'1').replace(/[❷②]/g,'2').replace(/[❸③]/g,'3').replace(/[❹④]/g,'4').replace(/[❺⑤]/g,'5')
  .replace(/[❻⑥]/g,'6').replace(/[❼⑦]/g,'7').replace(/[❽⑧]/g,'8').replace(/[❾⑨]/g,'9').replace(/[❿⑩]/g,'10')
  .replace(/[～〜]/g,'~').replace(/[，、]/g,',').replace(/\s+/g,' ').trim();
const gradeNum=g=>Number(String(g??'').replace(/\D/g,''));
const tokenMatches=s=>[...(String(s??'').replace(/[’‘]/g,"'").matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g))].map(m=>({raw:m[0],lower:m[0].toLowerCase()}));
const tokensOf=s=>tokenMatches(s).map(x=>x.lower);

const irregular=new Map(Object.entries({
  am:'be',is:'be',are:'be',was:'be',were:'be',been:'be',being:'be',
  has:'have',had:'have',having:'have',does:'do',did:'do',done:'do',doing:'do',
  goes:'go',went:'go',gone:'go',comes:'come',came:'come',sees:'see',saw:'see',seen:'see',
  eats:'eat',ate:'eat',eaten:'eat',drinks:'drink',drank:'drink',drunk:'drink',
  takes:'take',took:'take',taken:'take',makes:'make',made:'make',writes:'write',wrote:'write',written:'write',
  buys:'buy',bought:'buy',brings:'bring',brought:'bring',thinks:'think',thought:'think',knows:'know',knew:'know',known:'know',
  speaks:'speak',spoke:'speak',spoken:'speak',tells:'tell',told:'tell',says:'say',said:'say',gets:'get',got:'get',gotten:'get',
  gives:'give',gave:'give',given:'give',finds:'find',found:'find',leaves:'leave',left:'leave',feels:'feel',felt:'feel',keeps:'keep',kept:'keep',
  meets:'meet',met:'meet',runs:'run',ran:'run',swims:'swim',swam:'swim',swum:'swim',sits:'sit',sat:'sit',stands:'stand',stood:'stand',
  loses:'lose',lost:'lose',teaches:'teach',taught:'teach',catches:'catch',caught:'catch',becomes:'become',became:'become',
  begins:'begin',began:'begin',begun:'begin',builds:'build',built:'build',sends:'send',sent:'send',pays:'pay',paid:'pay',
  wears:'wear',wore:'wear',worn:'wear',breaks:'break',broke:'break',broken:'break',chooses:'choose',chose:'choose',chosen:'choose',
  flies:'fly',flew:'fly',flown:'fly',forgets:'forget',forgot:'forget',forgotten:'forget',hears:'hear',heard:'hear',holds:'hold',held:'hold',
  rides:'ride',rode:'ride',ridden:'ride',sells:'sell',sold:'sell',sleeps:'sleep',slept:'sleep',spends:'spend',spent:'spend',wins:'win',won:'win',
  better:'good',best:'good',worse:'bad',worst:'bad',farther:'far',farthest:'far',further:'far',furthest:'far'
}));
function lemmas(t) {
  const out=new Set([t]); if(irregular.has(t)) out.add(irregular.get(t));
  if(t.endsWith("n't")) out.add(t.slice(0,-3)); if(t.includes("'")) out.add(t.split("'")[0]);
  if(t.length>4&&t.endsWith('ies')) out.add(t.slice(0,-3)+'y');
  if(t.length>4&&t.endsWith('ves')) {out.add(t.slice(0,-3)+'f');out.add(t.slice(0,-3)+'fe');}
  if(t.length>3&&t.endsWith('es')) {out.add(t.slice(0,-2));out.add(t.slice(0,-1));}
  if(t.length>3&&t.endsWith('s')&&!t.endsWith('ss')) out.add(t.slice(0,-1));
  if(t.length>4&&t.endsWith('ied')) out.add(t.slice(0,-3)+'y');
  if(t.length>3&&t.endsWith('ed')) {out.add(t.slice(0,-2));out.add(t.slice(0,-1));}
  if(t.length>5&&t.endsWith('ying')) out.add(t.slice(0,-4)+'ie');
  if(t.length>4&&t.endsWith('ing')) {out.add(t.slice(0,-3));out.add(t.slice(0,-3)+'e');}
  if(t.length>4&&t.endsWith('ier')) out.add(t.slice(0,-3)+'y');
  if(t.length>5&&t.endsWith('iest')) out.add(t.slice(0,-4)+'y');
  if(t.length>3&&t.endsWith('er')) out.add(t.slice(0,-2));
  if(t.length>4&&t.endsWith('est')) out.add(t.slice(0,-3));
  for(const x of [...out]) if(x.length>3&&x.at(-1)===x.at(-2)) out.add(x.slice(0,-1));
  return [...out];
}

// These are grammatical/function words; their timing is enforced by passesPrereqGrammar,
// not by the lexical vocabulary gate.
const grammarCore=new Set(`a an the i you he she it we they me him her us them my your his its our their mine yours hers ours theirs
this that these those who which what when where why how whose am is are was were be been being do does did have has had
can could may might must should will would shall not no yes and but or so because if as than to of in on at for from with by
about into over under after before between here there more most less least please let let's`.split(/\s+/));
// Personal names are labels, not vocabulary targets. Keep this list explicit to avoid treating sentence-initial ordinary nouns as names.
const safeNames=new Set(`yuki mika takumi ken emi tom aya kenta mai aki saki miki rina taro hanako john mary mike bob ann kate jane jim ben amy lucy lisa
kevin david susan nancy meg kota sora haru rena eric alex emma olivia`.split(/\s+/));
const safeAcronyms=new Set(['tv','ai','ict']);

const problemHtml=fs.readFileSync(PROBLEM_HTML,'utf8');
const qb=scriptJson(problemHtml,'qb-data'); const meta=scriptJson(problemHtml,'meta-data');
const english=qb.filter(x=>x.subject==='英語');
if(english.length!==10511) throw new Error(`unexpected English count ${english.length}`);
if(new Set(english.map(x=>x.id)).size!==english.length) throw new Error('duplicate English IDs');
const table=parseCsv(fs.readFileSync(CSV_PATH,'utf8').replace(/^\uFEFF/,''));
const headers=table[0], idx=Object.fromEntries(headers.map((h,i)=>[h,i]));
for(const h of ['教科書','学年','大単元','単元名','英語','検索用基本形','変化形・別表記']) if(!(h in idx)) throw new Error(`missing ${h}`);
const rows=table.slice(1).filter(r=>r.some(v=>String(v).trim()));
const elementary=new Set();
for(const r of vocabData(fs.readFileSync(VOCAB_HTML,'utf8')).filter(x=>x&&x.dataset==='elementary')) for(const t of tokensOf(r.english)) elementary.add(t);
const books=['サンシャイン','ニューホライズン'];

function sections(tb,g){return meta.sections?.[tb]?.[String(g)]||[];}
function ordWhere(tb,g,pred){const i=sections(tb,g).findIndex(pred);return i<0?0:i+1;}
function lastPrefix(tb,g,prefix){let o=0;sections(tb,g).forEach((x,i)=>{if(key(x).toLowerCase().startsWith(prefix.toLowerCase()))o=i+1;});return o;}
function uiParts(label,prefix,n){const m=new RegExp(`^${prefix} ${n}-(.+)$`,'i').exec(key(label));return m?(m[1].match(/\d+/g)||[]).map(Number):[];}
function maxUiNumber(tb,g,kind){let max=0;for(const x of sections(tb,g)){const m=new RegExp(`${kind}\\s*(\\d+)`,'i').exec(key(x));if(m)max=Math.max(max,Number(m[1]));}return max;}
function sectionNumber(section,kind){const m=new RegExp(`${kind}\\s*(\\d+)`,'i').exec(key(section));return m?Number(m[1]):0;}
function mapSunshine(section,tb,g){
  const s=key(section); let m;
  if((m=/プレステップ\s*(\d+)/.exec(s))) return ordWhere(tb,g,x=>key(x).startsWith(`プレステップ${m[1]}`));
  if((m=/Get Ready\s*(\d+)/i.exec(s))) return ordWhere(tb,g,x=>key(x).toLowerCase().startsWith(`get ready ${m[1]}`));
  if((m=/PROGRAM\s*(\d+)\s+\d+-(\d+)(?:\s*[,・]\s*(\d+))?/i.exec(s))){
    const prog=Number(m[1]), parts=[Number(m[2]),m[3]?Number(m[3]):null].filter(Boolean); let o=0;
    for(const part of parts) o=Math.max(o,ordWhere(tb,g,x=>key(x).startsWith(`PROGRAM ${prog}-`)&&uiParts(x,'PROGRAM',prog).includes(part)));
    return o;
  }
  if((m=/PROGRAM\s*(\d+)\s+教科書本文/i.exec(s))) return lastPrefix(tb,g,`PROGRAM ${m[1]}-`);
  if((m=/PROGRAM\s*(\d+)\s+\d+(?:-\d+)?\s*~\s*\d+/i.exec(s))) return lastPrefix(tb,g,`PROGRAM ${m[1]}-`);
  if(/アクションコーナー/.test(s)) return ordWhere(tb,g,x=>key(x).includes('アクションコーナー'));
  if(/疑問詞のまとめ/.test(s)) return ordWhere(tb,g,x=>key(x).includes('疑問詞のまとめ'));
  if((m=/Our Project\s*(\d+)/i.exec(s))) return ordWhere(tb,g,x=>key(x).toLowerCase().includes(`our project ${m[1]}`));
  if((m=/Power-Up\s*(\d+)/i.exec(s))) {const a=ordWhere(tb,g,x=>key(x).toLowerCase().includes(`power-up ${m[1]}`));const b=/Step\s*(\d+)/i.exec(s);return Math.max(a,b?ordWhere(tb,g,x=>key(x).toLowerCase().includes(`step ${b[1]}`)):0);}
  if((m=/Reading\s*(\d+)/i.exec(s))) return ordWhere(tb,g,x=>key(x).toLowerCase().includes(`reading ${m[1]}`));
  if((m=/Step\s*(\d+)/i.exec(s))) return ordWhere(tb,g,x=>key(x).toLowerCase().includes(`step ${m[1]}`));
  if(/Special Project/i.test(s)) return ordWhere(tb,g,x=>/special project/i.test(key(x)));
  return 0;
}
function nhPart(section){const s=key(section);let m;if((m=/Unit\s*(\d+)\s+Part\s*(\d+)/i.exec(s)))return{unit:+m[1],kind:'part',n:+m[2]};if((m=/Unit\s*(\d+)\s+Read and Think\s*(\d+)/i.exec(s)))return{unit:+m[1],kind:'rt',n:+m[2]};return null;}
function mapNh(section,tb,g,maxPart){
  const s=key(section); let m;
  if((m=/プレステップ\s*(\d+)/.exec(s))) return ordWhere(tb,g,x=>key(x).startsWith(`プレステップ${m[1]}`));
  if(/^Unit\s*0\b/i.test(s)) return ordWhere(tb,g,x=>key(x)==='Unit 0');
  const sub=nhPart(s); if(sub){const n=sub.kind==='part'?sub.n:(maxPart[sub.unit]||2)+sub.n;return ordWhere(tb,g,x=>key(x).startsWith(`Unit ${sub.unit}-`)&&uiParts(x,'Unit',sub.unit).includes(n));}
  if((m=/Unit\s*(\d+)\s+Read and Think\b/i.exec(s))) return lastPrefix(tb,g,`Unit ${m[1]}-`);
  if((m=/Unit\s*(\d+)\s+教科書本文/i.exec(s))) return lastPrefix(tb,g,`Unit ${m[1]}-`);
  if((m=/Unit\s*(\d+)\s+\d+(?:-\d+)?\s*~\s*(?:RT\d*|\d+)/i.exec(s))) return lastPrefix(tb,g,`Unit ${m[1]}-`);
  if((m=/Real Life English\s*(\d+)/i.exec(s))) return ordWhere(tb,g,x=>key(x).toLowerCase().includes(`real life english ${m[1]}`));
  if((m=/Stage Activity\s*(\d+)/i.exec(s))) return ordWhere(tb,g,x=>key(x).toLowerCase().includes(`stage activity ${m[1]}`));
  if((m=/Let's Read\s*(\d+)/i.exec(s))) return ordWhere(tb,g,x=>key(x).toLowerCase().startsWith(`let's read ${m[1]}`));
  if(/Let's Read/i.test(s)){let o=0;sections(tb,g).forEach((x,i)=>{if(key(x).toLowerCase().startsWith("let's read"))o=i+1;});return o;}
  return 0;
}

const lex={}; const mapping={};
for(const tb of books){
  lex[tb]={}; mapping[tb]={};
  for(const g of [1,2,3]){
    const selected=rows.filter(r=>key(r[idx['教科書']])===tb&&gradeNum(r[idx['学年']])===g);
    const maxPart={}; if(tb==='ニューホライズン') for(const r of selected){const p=nhPart(r[idx['単元名']]);if(p?.kind==='part')maxPart[p.unit]=Math.max(maxPart[p.unit]||0,p.n);}
    const maxCurrent=maxUiNumber(tb,g,tb==='サンシャイン'?'PROGRAM':'Unit');
    const l=new Map(), unmapped=new Map(), mapped=new Map(); let explicitPrior=0, implicitPrior=0;
    for(const r of selected){
      const major=key(r[idx['大単元']]), sec=key(r[idx['単元名']]);
      const explicit=/^\[(\d+)年生\]/.exec(major); let prior=!!(explicit&&+explicit[1]<g);
      const n=sectionNumber(sec,tb==='サンシャイン'?'PROGRAM':'Unit');
      if(!prior&&g>1&&n>maxCurrent&&maxCurrent>0){prior=true;implicitPrior++;}
      if(prior&&explicit)explicitPrior++;
      let ord=prior?0:(tb==='サンシャイン'?mapSunshine(sec,tb,g):mapNh(sec,tb,g,maxPart));
      const pair=`${major} ⟶ ${sec}`;
      if(prior||ord>0)mapped.set(pair,{ord,prior});else unmapped.set(pair,(unmapped.get(pair)||0)+1);
      if(prior||ord>0) {
        const lexicalForms=[r[idx['英語']],r[idx['検索用基本形']],r[idx['変化形・別表記']]].filter(Boolean).join(' ');
        for(const t of tokensOf(lexicalForms)) {const old=l.get(t);if(old===undefined||ord<old)l.set(t,ord);}
      }
    }
    lex[tb][g]=l;
    mapping[tb][`中${g}`]={csv_rows:selected.length,ui_sections:sections(tb,g).length,max_current_number:maxCurrent,mapped_unique_pairs:mapped.size,unmapped_unique_pairs:unmapped.size,unmapped_pairs:[...unmapped.keys()],explicit_prior_rows:explicitPrior,implicit_prior_rows:implicitPrior};
  }
}
function tokenStage(tok,raw,tb,g){
  const cs=lemmas(tok);
  if(cs.some(x=>grammarCore.has(x)||elementary.has(x)||safeNames.has(x)||safeAcronyms.has(x))) return 0;
  if(/^[A-Z]$/.test(raw)) return 0; // worksheet labels A/B/C
  for(let pg=1;pg<g;pg++){for(const x of cs)if(lex[tb][pg].has(x))return 0;}
  let best=Infinity;for(const x of cs){const v=lex[tb][g].get(x);if(v!==undefined&&v<best)best=v;}
  return Number.isFinite(best)?best:null;
}

const candidate={};const audit={generated_at_utc:new Date().toISOString(),version:'v8-canonical-safe-20260825-1based',mapping,coverage:{},stage_distribution:{},unresolved_tokens:{},merge_policy:'reconstructed and trusted old positive are combined conservatively using later stage; unresolved stays -1'};
for(const item of english)candidate[item.id]={};
for(const tb of books){
  audit.coverage[tb]={};audit.stage_distribution[tb]={};audit.unresolved_tokens[tb]={};
  for(const g of[1,2,3]){
    const items=english.filter(x=>gradeNum(x.grade)===g);const unknown=new Map(),dist=new Map();let reconstructed=0,oldPositive=0,oldOnly=0,reconOnly=0,both=0,finalPositive=0;
    for(const item of items){
      const uniq=new Map();for(const t of tokenMatches(`${item.q??''} ${item.a??''}`))if(!uniq.has(t.lower))uniq.set(t.lower,t.raw);
      let req=0,blocked=false;for(const [tok,raw]of uniq){const st=tokenStage(tok,raw,tb,g);if(st===null){blocked=true;unknown.set(tok,(unknown.get(tok)||0)+1);}else req=Math.max(req,st);}
      const old=(meta.passMeta?.[item.id]||{})[tb];const oldOk=Number.isInteger(old)&&(old===-2||old>0);const recOk=!blocked;
      if(recOk)reconstructed++;if(oldOk)oldPositive++;if(recOk&&oldOk)both++;else if(recOk)reconOnly++;else if(oldOk)oldOnly++;
      let value=-1;
      const recValue=Math.max(1,req);
      if(recOk&&oldOk){value=old===-2?recValue:Math.max(recValue,old);}
      else if(recOk)value=recValue;
      else if(oldOk)value=old;
      const maxOrd=sections(tb,g).length;
      if(value>maxOrd) throw new Error(`${item.id} ${tb} ${g}: ${value}>${maxOrd}`);
      candidate[item.id][tb]=value;
      if(value===-2||value>0){finalPositive++;dist.set(value,(dist.get(value)||0)+1);}
    }
    const total=items.length;audit.coverage[tb][`中${g}`]={total,reconstructed,reconstructed_pct:+(reconstructed*100/total).toFixed(2),trusted_old:oldPositive,trusted_old_pct:+(oldPositive*100/total).toFixed(2),both,reconstructed_only:reconOnly,old_only:oldOnly,final_resolved:finalPositive,final_resolved_pct:+(finalPositive*100/total).toFixed(2)};
    audit.stage_distribution[tb][`中${g}`]=Object.fromEntries([...dist.entries()].sort((a,b)=>a[0]-b[0]));
    audit.unresolved_tokens[tb][`中${g}`]=[...unknown.entries()].sort((a,b)=>b[1]-a[1]).slice(0,120).map(([token,count])=>({token,count}));
  }
}
if(Object.keys(candidate).length!==10511)throw new Error('candidate ID count mismatch');
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({version:audit.version,passMeta:candidate},null,2)+'\n');
fs.writeFileSync(AUDIT,JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({mapping:audit.mapping,coverage:audit.coverage,stage1:Object.fromEntries(books.map(tb=>[tb,Object.fromEntries([1,2,3].map(g=>[`中${g}`,audit.stage_distribution[tb][`中${g}`]['1']||0]))]))},null,2));
