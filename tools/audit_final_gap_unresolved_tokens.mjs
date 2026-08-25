import fs from 'node:fs';
import vm from 'node:vm';

const HTML='problem-app/index.html';
const CSV='data/v7_master.csv';
const GAPS='audit/PROBLEM_APP_VOCAB_FINAL_SECTION_GAPS.json';
const OUT='audit/PROBLEM_APP_VOCAB_FINAL_UNRESOLVED_TOKENS.json';

function parseCsv(text){
  const rows=[];let row=[],field='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else q=false;}else field+=c;}
    else if(c==='"')q=true;
    else if(c===','){row.push(field);field='';}
    else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  return rows;
}
function scriptJson(html,id){const m=new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i').exec(html);if(!m)throw new Error(`${id} not found`);return JSON.parse(m[1]);}
function matchingBrace(src,start){let d=0,q=null,e=false,l=false,b=false;for(let i=start;i<src.length;i++){const c=src[i],n=src[i+1];if(l){if(c==='\n')l=false;continue;}if(b){if(c==='*'&&n==='/'){b=false;i++;}continue;}if(q){if(e){e=false;continue;}if(c==='\\'){e=true;continue;}if(c===q)q=null;continue;}if(c==='/'&&n==='/'){l=true;i++;continue;}if(c==='/'&&n==='*'){b=true;i++;continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='{')d++;else if(c==='}'){d--;if(d===0)return i;}}return -1;}
function subjectConfig(html){const m=/\bconst\s+subjectConfig\s*=\s*/.exec(html);if(!m)throw new Error('subjectConfig not found');let s=m.index+m[0].length;while(/\s/.test(html[s]||''))s++;const e=matchingBrace(html,s);return vm.runInNewContext(`(${html.slice(s,e+1)})`,Object.create(null),{timeout:5000});}
const toks=s=>[...(String(s??'').replace(/[’‘]/g,"'").matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g))].map(m=>m[0].toLowerCase());
const irregular=new Map(Object.entries({am:'be',is:'be',are:'be',was:'be',were:'be',been:'be',being:'be',has:'have',had:'have',having:'have',does:'do',did:'do',done:'do',doing:'do',goes:'go',went:'go',gone:'go',comes:'come',came:'come',sees:'see',saw:'see',seen:'see',eats:'eat',ate:'eat',eaten:'eat',drinks:'drink',drank:'drink',drunk:'drink',takes:'take',took:'take',taken:'take',makes:'make',made:'make',writes:'write',wrote:'write',written:'write',buys:'buy',bought:'buy',brings:'bring',brought:'bring',thinks:'think',thought:'think',knows:'know',knew:'know',known:'know',speaks:'speak',spoke:'speak',spoken:'speak',tells:'tell',told:'tell',says:'say',said:'say',gets:'get',got:'get',gotten:'get',gives:'give',gave:'give',given:'give',finds:'find',found:'find',leaves:'leave',left:'leave',feels:'feel',felt:'feel',keeps:'keep',kept:'keep',meets:'meet',met:'meet',runs:'run',ran:'run',swims:'swim',swam:'swim',swum:'swim',sits:'sit',sat:'sit',stands:'stand',stood:'stand',loses:'lose',lost:'lose',teaches:'teach',taught:'teach',catches:'catch',caught:'catch',becomes:'become',became:'become',begins:'begin',began:'begin',begun:'begin',builds:'build',built:'build',sends:'send',sent:'send',pays:'pay',paid:'pay',wears:'wear',wore:'wear',worn:'wear',breaks:'break',broke:'break',broken:'break',chooses:'choose',chose:'choose',chosen:'choose',flies:'fly',flew:'fly',flown:'fly',forgets:'forget',forgot:'forget',forgotten:'forget',hears:'hear',heard:'hear',holds:'hold',held:'hold',rides:'ride',rode:'ride',ridden:'ride',sells:'sell',sold:'sell',sleeps:'sleep',slept:'sleep',spends:'spend',spent:'spend',wins:'win',won:'win',children:'child',men:'man',women:'woman',people:'person',mice:'mouse',feet:'foot',teeth:'tooth',better:'good',best:'good',worse:'bad',worst:'bad',farther:'far',farthest:'far',further:'far',furthest:'far'}));
function lemmas(t){const o=new Set([t]);if(irregular.has(t))o.add(irregular.get(t));if(t.endsWith("n't"))o.add(t.slice(0,-3));if(t.includes("'"))o.add(t.split("'")[0]);if(t.length>4&&t.endsWith('ies'))o.add(t.slice(0,-3)+'y');if(t.length>4&&t.endsWith('ves')){o.add(t.slice(0,-3)+'f');o.add(t.slice(0,-3)+'fe');}if(t.length>3&&t.endsWith('es')){o.add(t.slice(0,-2));o.add(t.slice(0,-1));}if(t.length>3&&t.endsWith('s')&&!t.endsWith('ss'))o.add(t.slice(0,-1));if(t.length>4&&t.endsWith('ied'))o.add(t.slice(0,-3)+'y');if(t.length>3&&t.endsWith('ed')){o.add(t.slice(0,-2));o.add(t.slice(0,-1));}if(t.length>5&&t.endsWith('ying'))o.add(t.slice(0,-4)+'ie');if(t.length>4&&t.endsWith('ing')){o.add(t.slice(0,-3));o.add(t.slice(0,-3)+'e');}if(t.length>4&&t.endsWith('ier'))o.add(t.slice(0,-3)+'y');if(t.length>5&&t.endsWith('iest'))o.add(t.slice(0,-4)+'y');if(t.length>3&&t.endsWith('er'))o.add(t.slice(0,-2));if(t.length>4&&t.endsWith('est'))o.add(t.slice(0,-3));for(const x of [...o])if(x.length>3&&x.at(-1)===x.at(-2))o.add(x.slice(0,-1));return [...o];}
const grammarCore=new Set(`a an the i you he she it we they me him her us them my your his its our their mine yours hers ours theirs this that these those who which what when where why how whose am is are was were be been being do does did have has had can could may might must should will would shall not no yes and but or so because if as than to of in on at for from with by about into over under after before between here there more most less least please let let's`.split(/\s+/));
const safeNames=new Set(`yuki mika takumi ken emi tom aya kenta mai aki saki miki rina taro hanako john mary mike bob ann kate jane jim ben amy lucy lisa kevin david susan nancy meg kota sora haru rena eric alex emma olivia`.split(/\s+/));
const safeAcronyms=new Set(['tv','ai','ict']);

const html=fs.readFileSync(HTML,'utf8');
const qb=scriptJson(html,'qb-data').filter(x=>x.subject==='英語');
const meta=scriptJson(html,'meta-data');
const stageMap=subjectConfig(html)?.['英語']?.stageMap||{};
const gaps=JSON.parse(fs.readFileSync(GAPS,'utf8'));
const gapRows=Array.isArray(gaps.gaps)?gaps.gaps:[];
const table=parseCsv(fs.readFileSync(CSV,'utf8').replace(/^\uFEFF/,''));
const idx=Object.fromEntries(table[0].map((h,i)=>[h,i]));
for(const h of ['教科書','学年','英語','検索用基本形','変化形・別表記'])if(!(h in idx))throw new Error(`missing ${h}`);
const rows=table.slice(1).filter(r=>r.some(v=>String(v).trim()));
const lexAll=new Set(), lexByBookGrade=new Map();
for(const r of rows){const tb=String(r[idx['教科書']]||'').trim(),g=String(r[idx['学年']]||'').trim();const k=`${tb}/${g}`;if(!lexByBookGrade.has(k))lexByBookGrade.set(k,new Set());const dst=lexByBookGrade.get(k);for(const h of ['英語','検索用基本形','変化形・別表記'])for(const t of toks(r[idx[h]])){lexAll.add(t);dst.add(t);for(const l of lemmas(t)){lexAll.add(l);dst.add(l);}}}

function resolvedByLexicon(t,book,grade){if(grammarCore.has(t)||safeNames.has(t)||safeAcronyms.has(t))return {ok:true,kind:'core_or_name'};const local=lexByBookGrade.get(`${book}/${grade}`)||new Set();for(const l of lemmas(t)){if(local.has(l))return {ok:true,kind:'book_grade_lexicon',lemma:l};}for(const l of lemmas(t)){if(lexAll.has(l))return {ok:false,kind:'other_scope_lexicon',lemma:l};}return {ok:false,kind:'globally_absent'};}
const records=[];
for(const gap of gapRows){
  const mapped=stageMap?.[gap.grade]?.[gap.category]||[gap.category],set=new Set(mapped);
  const unresolved=qb.filter(x=>x.grade===gap.grade&&set.has(x.category)&&Number((meta.passMeta?.[x.id]||{})[gap.textbook])===-1);
  const tokenStats=new Map();
  for(const item of unresolved){
    const seen=new Set();
    for(const t of toks(`${item.q||''} ${item.a||''}`)){
      const r=resolvedByLexicon(t,gap.textbook,gap.grade);
      if(r.ok)continue;
      const key=`${t}\t${r.kind}\t${r.lemma||''}`;
      if(seen.has(key))continue;seen.add(key);
      const prev=tokenStats.get(key)||{token:t,kind:r.kind,lemma:r.lemma||null,item_count:0,sample_ids:[],sample_texts:[]};
      prev.item_count++;if(prev.sample_ids.length<5)prev.sample_ids.push(item.id);if(prev.sample_texts.length<3)prev.sample_texts.push(`${item.q||''} || ${item.a||''}`);tokenStats.set(key,prev);
    }
  }
  const tokens=[...tokenStats.values()].sort((a,b)=>b.item_count-a.item_count||a.token.localeCompare(b.token));
  records.push({grade:gap.grade,textbook:gap.textbook,section:gap.section,category:gap.category,runtime_mapped_categories:mapped,unresolved_items:unresolved.length,unresolved_items_with_any_nonlocal_token:unresolved.filter(item=>toks(`${item.q||''} ${item.a||''}`).some(t=>!resolvedByLexicon(t,gap.textbook,gap.grade).ok)).length,top_nonlocal_tokens:tokens.slice(0,80),globally_absent_top:tokens.filter(x=>x.kind==='globally_absent').slice(0,40),other_scope_top:tokens.filter(x=>x.kind==='other_scope_lexicon').slice(0,40)});
}
const aggregate=new Map();for(const r of records)for(const t of r.top_nonlocal_tokens){const k=`${t.token}\t${t.kind}\t${t.lemma||''}`;const p=aggregate.get(k)||{token:t.token,kind:t.kind,lemma:t.lemma||null,item_count_sum:0,scopes:[]};p.item_count_sum+=t.item_count;p.scopes.push(`${r.grade}/${r.textbook}/${r.category}`);aggregate.set(k,p);}
const out={generated_at:new Date().toISOString(),source_gap_file:GAPS,design:'Token-level classifier for final under50 passMeta=-1 items. Diagnostic only; no whitelist and no passMeta mutation.',records,aggregate_top:[...aggregate.values()].sort((a,b)=>b.item_count_sum-a.item_count_sum||a.token.localeCompare(b.token)).slice(0,120)};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(records.map(r=>({scope:`${r.grade}/${r.textbook}/${r.category}`,unresolved:r.unresolved_items,top:r.top_nonlocal_tokens.slice(0,12).map(x=>[x.token,x.kind,x.lemma,x.item_count])})),null,2));
