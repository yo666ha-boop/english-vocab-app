import fs from 'node:fs';
import vm from 'node:vm';

const PROBLEM_HTML = 'problem-app/index.html';
const VOCAB_HTML = 'index.html';
const CSV_PATH = 'data/v7_master.csv';
const OUT_PATH = 'audit/PROBLEM_APP_VOCAB_REBUILD_ANALYSIS.json';

function parseCsv(text) {
  const rows=[]; let row=[], field='', quoted=false;
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (quoted) {
      if (c==='"') { if (text[i+1]==='"') { field+='"'; i++; } else quoted=false; }
      else field+=c;
    } else {
      if (c==='"') quoted=true;
      else if (c===',') { row.push(field); field=''; }
      else if (c==='\n') { row.push(field.replace(/\r$/,'')); rows.push(row); row=[]; field=''; }
      else field+=c;
    }
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/,'')); rows.push(row); }
  return rows;
}

function extractScriptJson(html, id) {
  const re = new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i');
  const m = re.exec(html);
  if (!m) throw new Error(`${id} not found`);
  return JSON.parse(m[1]);
}

function findMatchingBracket(src, start) {
  let depth=0, quote=null, escaped=false, lineComment=false, blockComment=false;
  for (let p=start;p<src.length;p++) {
    const c=src[p], n=src[p+1];
    if (lineComment) { if (c==='\n') lineComment=false; continue; }
    if (blockComment) { if (c==='*' && n==='/') { blockComment=false; p++; } continue; }
    if (quote) {
      if (escaped) { escaped=false; continue; }
      if (c==='\\') { escaped=true; continue; }
      if (c===quote) quote=null;
      continue;
    }
    if (c==='/' && n==='/') { lineComment=true; p++; continue; }
    if (c==='/' && n==='*') { blockComment=true; p++; continue; }
    if (c==='"' || c==="'" || c==='`') { quote=c; continue; }
    if (c==='[') depth++;
    else if (c===']') { depth--; if (depth===0) return p; }
  }
  return -1;
}

function extractVocabData(html) {
  const decl=/\b(?:const|let|var)\s+DATA\s*=\s*/g.exec(html);
  if (!decl) throw new Error('DATA declaration not found');
  let start=decl.index+decl[0].length;
  while (/\s/.test(html[start]??'')) start++;
  const end=findMatchingBracket(html,start);
  if (end<0) throw new Error('DATA closing bracket not found');
  return vm.runInNewContext(`(${html.slice(start,end+1)})`, Object.create(null), {timeout:10000});
}

const norm = s => String(s ?? '').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9' -]+/g,' ').replace(/\s+/g,' ').trim();
const tokensOf = s => (String(s??'').replace(/[’‘]/g,"'").match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).map(x=>x.toLowerCase());
const gradeNum = g => Number(String(g??'').replace(/\D/g,''));

const irregular = new Map(Object.entries({
  am:'be',is:'be',are:'be',was:'be',were:'be',been:'be',being:'be',
  has:'have',had:'have',having:'have',
  does:'do',did:'do',done:'do',doing:'do',
  goes:'go',went:'go',gone:'go',going:'go',
  comes:'come',came:'come',coming:'come',
  sees:'see',saw:'see',seen:'see',seeing:'see',
  eats:'eat',ate:'eat',eaten:'eat',eating:'eat',
  drinks:'drink',drank:'drink',drunk:'drink',drinking:'drink',
  takes:'take',took:'take',taken:'take',taking:'take',
  makes:'make',made:'make',making:'make',
  writes:'write',wrote:'write',written:'write',writing:'write',
  reads:'read',reading:'read',
  buys:'buy',bought:'buy',buying:'buy',
  brings:'bring',brought:'bring',bringing:'bring',
  thinks:'think',thought:'think',thinking:'think',
  knows:'know',knew:'know',known:'know',knowing:'know',
  speaks:'speak',spoke:'speak',spoken:'speak',speaking:'speak',
  tells:'tell',told:'tell',telling:'tell',
  says:'say',said:'say',saying:'say',
  gets:'get',got:'get',getting:'get',
  gives:'give',gave:'give',given:'give',giving:'give',
  finds:'find',found:'find',finding:'find',
  leaves:'leave',left:'leave',leaving:'leave',
  feels:'feel',felt:'feel',feeling:'feel',
  keeps:'keep',kept:'keep',keeping:'keep',
  meets:'meet',met:'meet',meeting:'meet',
  runs:'run',ran:'run',running:'run',
  swims:'swim',swam:'swim',swum:'swim',swimming:'swim',
  sits:'sit',sat:'sit',sitting:'sit',
  stands:'stand',stood:'stand',standing:'stand',
  loses:'lose',lost:'lose',losing:'lose',
  teaches:'teach',taught:'teach',teaching:'teach',
  catches:'catch',caught:'catch',catching:'catch',
  becomes:'become',became:'become',becoming:'become',
  begins:'begin',began:'begin',begun:'begin',beginning:'begin',
  builds:'build',built:'build',building:'build',
  sends:'send',sent:'send',sending:'send'
}));

function lemmaCandidates(token) {
  const t=token.toLowerCase();
  const out=new Set([t]);
  if (irregular.has(t)) out.add(irregular.get(t));
  if (t.endsWith("n't")) out.add(t.slice(0,-3));
  if (t.endsWith("'s")) out.add(t.slice(0,-2));
  if (t.endsWith("'re")||t.endsWith("'ve")||t.endsWith("'ll")) out.add(t.split("'")[0]);
  if (t.endsWith("'d")||t.endsWith("'m")) out.add(t.split("'")[0]);
  if (t.length>4 && t.endsWith('ies')) out.add(t.slice(0,-3)+'y');
  if (t.length>4 && t.endsWith('ves')) { out.add(t.slice(0,-3)+'f'); out.add(t.slice(0,-3)+'fe'); }
  if (t.length>3 && t.endsWith('es')) { out.add(t.slice(0,-2)); out.add(t.slice(0,-1)); }
  if (t.length>3 && t.endsWith('s') && !t.endsWith('ss')) out.add(t.slice(0,-1));
  if (t.length>4 && t.endsWith('ied')) out.add(t.slice(0,-3)+'y');
  if (t.length>3 && t.endsWith('ed')) { out.add(t.slice(0,-2)); out.add(t.slice(0,-1)); }
  if (t.length>5 && t.endsWith('ying')) out.add(t.slice(0,-4)+'ie');
  if (t.length>4 && t.endsWith('ing')) { out.add(t.slice(0,-3)); out.add(t.slice(0,-3)+'e'); }
  if (t.length>4 && t.endsWith('ier')) out.add(t.slice(0,-3)+'y');
  if (t.length>5 && t.endsWith('iest')) out.add(t.slice(0,-4)+'y');
  if (t.length>3 && t.endsWith('er')) out.add(t.slice(0,-2));
  if (t.length>4 && t.endsWith('est')) out.add(t.slice(0,-3));
  // handle doubled final consonants: stopped->stop, running->run, bigger->big
  for (const x of [...out]) {
    if (x.length>3 && x.at(-1)===x.at(-2)) out.add(x.slice(0,-1));
  }
  return [...out];
}

const structural = new Set(`a an the i you he she it we they me him her us them my your his its our their mine yours hers ours theirs this that these those who which what when where why how whose am is are was were be been being do does did have has had can could may might must should will would shall not no yes and but or so because if as than to of in on at for from with by about into over under after before between near here there now then very too also only just ever never already yet still every all some any many much more most less least one two three first second third today tomorrow yesterday morning afternoon evening night day week month year please let's let`.split(/\s+/));

const problemHtml=fs.readFileSync(PROBLEM_HTML,'utf8');
const qb=extractScriptJson(problemHtml,'qb-data');
const meta=extractScriptJson(problemHtml,'meta-data');
const english=qb.filter(x=>x.subject==='英語');

const csv=parseCsv(fs.readFileSync(CSV_PATH,'utf8').replace(/^\uFEFF/,''));
const headers=csv[0];
const idx=Object.fromEntries(headers.map((h,i)=>[h,i]));
const rows=csv.slice(1).filter(r=>r.some(v=>String(v).trim()));

const vocabHtml=fs.readFileSync(VOCAB_HTML,'utf8');
const vocabData=extractVocabData(vocabHtml);
const elementaryTokens=new Set();
for (const r of vocabData.filter(x=>x && x.dataset==='elementary')) for (const t of tokensOf(r.english)) elementaryTokens.add(t);

const metaSections=meta.sections || {};
const sectionSamples={};
for (const [tb,byGrade] of Object.entries(metaSections)) {
  sectionSamples[tb]={};
  if (byGrade && typeof byGrade==='object' && !Array.isArray(byGrade)) {
    for (const [g,v] of Object.entries(byGrade)) sectionSamples[tb][g]=Array.isArray(v)?v.slice(0,12):v;
  }
}

const csvSections={};
const stageLex={};
for (const tb of ['サンシャイン','ニューホライズン']) {
  csvSections[tb]={}; stageLex[tb]={};
  for (const g of [1,2,3]) {
    const selected=rows.filter(r=>norm(r[idx['教科書']])===norm(tb) && gradeNum(r[idx['学年']])===g);
    const sections=[]; const seen=new Set();
    for (const r of selected) {
      const s=String(r[idx['単元名']]??'').trim();
      if (s && !seen.has(s)) { seen.add(s); sections.push(s); }
    }
    csvSections[tb][g]=sections;
    const lex=new Map();
    for (const r of selected) {
      const sec=String(r[idx['単元名']]??'').trim();
      let ordinal=sections.indexOf(sec)+1;
      if (ordinal<=0) ordinal=1;
      for (const t of tokensOf(r[idx['英語']])) {
        if (!lex.has(t) || ordinal<lex.get(t)) lex.set(t,ordinal);
      }
    }
    stageLex[tb][g]=lex;
  }
}

function tokenStage(token,tb,g) {
  const candidates=lemmaCandidates(token);
  if (candidates.some(x=>structural.has(x)||elementaryTokens.has(x))) return {stage:0,via:'core'};
  // Prior-grade textbook vocabulary is always allowed.
  for (let pg=1;pg<g;pg++) {
    const lex=stageLex[tb][pg];
    if (candidates.some(x=>lex.has(x))) return {stage:0,via:'prior'};
  }
  const lex=stageLex[tb][g];
  let best=Infinity, via=null;
  for (const x of candidates) if (lex.has(x) && lex.get(x)<best) { best=lex.get(x); via=x; }
  if (Number.isFinite(best)) return {stage:best,via};
  return null;
}

const properNamePattern=/^[A-Z][a-z]+$/;
const result={
  generated_at_utc:new Date().toISOString(),
  english_items:english.length,
  elementary_token_count:elementaryTokens.size,
  meta_vocab_migration_audit:meta.vocabMigrationAudit,
  meta_section_samples:sectionSamples,
  csv_section_counts:Object.fromEntries(Object.entries(csvSections).map(([tb,bg])=>[tb,Object.fromEntries(Object.entries(bg).map(([g,v])=>[g,v.length]))])),
  csv_section_samples:Object.fromEntries(Object.entries(csvSections).map(([tb,bg])=>[tb,Object.fromEntries(Object.entries(bg).map(([g,v])=>[g,v.slice(0,12)]))])),
  by_textbook_grade:{},
  global_unresolved_tokens:[]
};
const globalUnknown=new Map();

for (const tb of ['サンシャイン','ニューホライズン']) {
  result.by_textbook_grade[tb]={};
  for (const g of [1,2,3]) {
    const items=english.filter(x=>gradeNum(x.grade)===g);
    let solvable=0, solvableIgnoringProper=0, oldPositive=0;
    const requiredStages=new Map();
    const unknownTokenCount=new Map();
    const unknownExample=new Map();
    const categoryStats=new Map();
    for (const item of items) {
      const rawTokens=tokensOf(`${item.q??''} ${item.a??''}`);
      const unique=[...new Set(rawTokens)];
      let req=0, blocked=false, blockedIgnoringProper=false;
      const unknown=[];
      for (const tok of unique) {
        const hit=tokenStage(tok,tb,g);
        if (hit) req=Math.max(req,hit.stage);
        else {
          blocked=true;
          const originalMatches=(String(item.q??'')+' '+String(item.a??'')).match(new RegExp(`\\b${tok}\\b`,'i'));
          const original=originalMatches?.[0]||tok;
          const looksProper=properNamePattern.test(original);
          if (!looksProper) blockedIgnoringProper=true;
          unknown.push(tok);
          unknownTokenCount.set(tok,(unknownTokenCount.get(tok)||0)+1);
          if (!unknownExample.has(tok)) unknownExample.set(tok,{id:item.id,category:item.category,q:item.q,a:item.a});
          globalUnknown.set(tok,(globalUnknown.get(tok)||0)+1);
        }
      }
      if (!blocked) { solvable++; requiredStages.set(req,(requiredStages.get(req)||0)+1); }
      if (!blockedIgnoringProper) solvableIgnoringProper++;
      const old=(meta.passMeta?.[item.id]||{})[tb];
      if (Number.isInteger(old)&&old>0) oldPositive++;
      const c=String(item.category||'');
      if (!categoryStats.has(c)) categoryStats.set(c,{total:0,exact_solvable:0,solvable_ignoring_proper:0,old_positive:0});
      const cs=categoryStats.get(c); cs.total++;
      if (!blocked) cs.exact_solvable++;
      if (!blockedIgnoringProper) cs.solvable_ignoring_proper++;
      if (Number.isInteger(old)&&old>0) cs.old_positive++;
    }
    const total=items.length;
    result.by_textbook_grade[tb][`中${g}`]={
      total,
      old_positive:oldPositive,
      old_positive_pct:+(oldPositive*100/total).toFixed(2),
      reconstructed_exact_solvable:solvable,
      reconstructed_exact_solvable_pct:+(solvable*100/total).toFixed(2),
      reconstructed_solvable_ignoring_proper_names:solvableIgnoringProper,
      reconstructed_solvable_ignoring_proper_names_pct:+(solvableIgnoringProper*100/total).toFixed(2),
      reconstructed_required_stage_counts:Object.fromEntries([...requiredStages.entries()].sort((a,b)=>a[0]-b[0])),
      top_unresolved_tokens:[...unknownTokenCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0,80).map(([token,count])=>({token,count,example:unknownExample.get(token)})),
      category_stats:[...categoryStats.entries()].map(([category,s])=>({category,...s,exact_pct:+(s.exact_solvable*100/s.total).toFixed(2),ignore_proper_pct:+(s.solvable_ignoring_proper*100/s.total).toFixed(2)})).sort((a,b)=>b.total-a.total)
    };
  }
}
result.global_unresolved_tokens=[...globalUnknown.entries()].sort((a,b)=>b[1]-a[1]).slice(0,150).map(([token,count])=>({token,count}));

fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync(OUT_PATH,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({english_items:result.english_items, elementary_token_count:result.elementary_token_count, by_textbook_grade:Object.fromEntries(Object.entries(result.by_textbook_grade).map(([tb,bg])=>[tb,Object.fromEntries(Object.entries(bg).map(([g,v])=>[g,{old:v.old_positive_pct,reconstructed:v.reconstructed_exact_solvable_pct,ignoreProper:v.reconstructed_solvable_ignoring_proper_names_pct}]))]))},null,2));
