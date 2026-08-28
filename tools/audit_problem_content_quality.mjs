import fs from 'node:fs';

const HTML='problem-app/index.html';
const OUT='audit/PROBLEM_APP_CONTENT_QUALITY.json';
const html=fs.readFileSync(HTML,'utf8');
function scriptJson(id){
  const m=new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,'i').exec(html);
  if(!m)throw new Error(`${id} not found`);
  return JSON.parse(m[1]);
}
const all=scriptJson('qb-data');
const rows=all.filter(x=>x?.subject==='英語');
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const lower=s=>norm(s).toLowerCase();
const prefix=id=>{const m=/^(.+?)-\d+$/.exec(String(id||''));return m?m[1]:String(id||'').split('-')[0];};
const family=x=>`${x.grade}/${x.category}/${x.type}`;
const properNames=new Set(['Tom','Ken','Mike','Emi','Yuki','Aya','Bob','Lucy','Mary','John','Jim','Ann','Kate','Lisa','Ben','Alex','Kenta','Miki','Mika','Saki','Riku','Kota','Takumi']);
const wordRe=/[A-Za-z][A-Za-z'-]*/g;
function quotedJapanese(q){const m=/『([^』]*)』/.exec(String(q||''));return m?m[1]:'';}

const hybridJapanese=[];
for(const x of rows){
  if(!/次の日本語に合う英文/.test(String(x.q||'')))continue;
  const jp=quotedJapanese(x.q); if(!jp)continue;
  const tokens=(jp.match(wordRe)||[]);
  const bad=tokens.filter(t=>!properNames.has(t)&&!(/^[ABC]$/.test(t)));
  if(bad.length)hybridJapanese.push({id:x.id,grade:x.grade,category:x.category,type:x.type,source_japanese:jp,english_tokens:bad,q:x.q,a:x.a});
}

const agreementPatterns=[
  [/\byou was\b/i,'you_was'],[/\bwe was\b/i,'we_was'],[/\bthey was\b/i,'they_was'],
  [/\bi is\b/i,'i_is'],[/\byou is\b/i,'you_is'],[/\bwe is\b/i,'we_is'],[/\bthey is\b/i,'they_is'],
  [/\bhe are\b/i,'he_are'],[/\bshe are\b/i,'she_are'],[/\bit are\b/i,'it_are'],
  [/\bthe (?:shoes|books|pens|dogs|cats|bags|chairs|desks|bikes|pictures) is\b/i,'plural_is'],
  [/\b(?:these|those)\s+(?:[a-z]+\s+){0,3}(?:books|pens|dogs|cats|bags|chairs|desks|bikes|pictures|letters|students|windows|doors|questions|computers|songs)\s+is\b/i,'demonstrative_plural_is']
];
const subjectVerbAgreement=[];
for(const x of rows){
  const a=String(x.a||'');
  for(const [re,kind] of agreementPatterns){if(re.test(a)){subjectVerbAgreement.push({id:x.id,kind,grade:x.grade,category:x.category,type:x.type,q:x.q,a:x.a});break;}}
}

const possessiveSubstitution=[];
for(const x of rows){
  const jp=quotedJapanese(x.q); if(!jp)continue;
  if(!/^(彼|彼女)(は|が)/.test(jp))continue;
  if(/[私僕わたし]/.test(jp))continue;
  if(/\bmy\b/i.test(String(x.a||'')))possessiveSubstitution.push({id:x.id,grade:x.grade,category:x.category,type:x.type,source_japanese:jp,q:x.q,a:x.a});
}

const auxTenseErrors=[];
const collocationErrors=[];
for(const x of rows){
  const a=norm(x.a);
  const q=norm(x.q);
  if(/\bDid\b[^?.!]{0,80}\b(?:played|went|saw|ate|made|did|had|came|took|wrote)\b/i.test(a))
    auxTenseErrors.push({id:x.id,kind:'did_plus_past_in_answer',grade:x.grade,category:x.category,type:x.type,q:x.q,a:x.a});
  const badInAnswer=/\b(?:played|playing|play)\s+(?:swimming|running|skiing|skating)\b/i.test(a);
  const badNaturalSource=x.type!=='間違い直し' && /\b(?:played|playing|play)\s+(?:swimming|running|skiing|skating)\b/i.test(q);
  if(badInAnswer||badNaturalSource)
    collocationErrors.push({id:x.id,kind:badInAnswer?'bad_collocation_in_answer':'bad_collocation_in_source',grade:x.grade,category:x.category,type:x.type,q:x.q,a:x.a});
}

const semanticErrors=[];
const inanimateBadAdj=/^(?:This|That) (?:bag|book|chair|house|desk|table|car|bike|flower)\b.*\b(?:busier|busiest|kinder|kindest|younger|youngest)\b/i;
const animalBadVerb=/^This is the (?:cat|dog) which .*\b(?:made|fixed)\b/i;
const cakeFixed=/^This is the cake which .*\bfixed\b/i;
const meaningMismatchHints=[
  [/ピアノを練習/,/\b(?:tennis|soccer|baseball)\b/i,'piano_vs_sport'],
  [/テニスを練習/,/\bpiano\b/i,'tennis_vs_piano'],
  [/サッカーを練習/,/\bpiano\b/i,'soccer_vs_piano']
];
for(const x of rows){
  const a=norm(x.a); const q=norm(x.q); let kind=null;
  if(inanimateBadAdj.test(a))kind='inanimate_comparison_adjective';
  else if(animalBadVerb.test(a))kind='animal_made_or_fixed';
  else if(cakeFixed.test(a))kind='cake_fixed';
  else if(/^Do (?:tom and ken|emi and yuki)\b/.test(a))kind='lowercase_proper_names_after_do';
  else if(/^I\b.*を疑問文にしなさい。$/.test(q)&&/^Do you\b/.test(a))kind='i_question_changed_to_you';
  if(!kind){const jp=quotedJapanese(x.q);for(const [jre,are,k] of meaningMismatchHints){if(jre.test(jp)&&are.test(a)){kind=k;break;}}}
  if(kind)semanticErrors.push({id:x.id,kind,grade:x.grade,category:x.category,type:x.type,q:x.q,a:x.a});
}

const byQA=new Map();
for(const x of rows){const k=`${lower(x.q)}\u0000${lower(x.a)}`;const a=byQA.get(k)||[];a.push(x);byQA.set(k,a);}
const duplicateGroups=[]; let duplicateRows=0, duplicateExcess=0;
const duplicateFamilyRows={};
const duplicateFamilyGroups={};
for(const items of byQA.values())if(items.length>1){
  duplicateRows+=items.length;duplicateExcess+=items.length-1;
  duplicateGroups.push({count:items.length,q:items[0].q,a:items[0].a,sample_ids:items.slice(0,20).map(x=>x.id),grade_category_types:[...new Set(items.map(family))].slice(0,20)});
  const fams=new Set();
  for(const x of items){const f=family(x);duplicateFamilyRows[f]=(duplicateFamilyRows[f]||0)+1;fams.add(f);}
  for(const f of fams)duplicateFamilyGroups[f]=(duplicateFamilyGroups[f]||0)+1;
}
duplicateGroups.sort((a,b)=>b.count-a.count||String(a.q).localeCompare(String(b.q)));
function breakdown(items){const c={};for(const x of items){const k=family(x);c[k]=(c[k]||0)+1;}return Object.fromEntries(Object.entries(c).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])));}
function prefixBreakdown(items){const c={};for(const x of items){const k=prefix(x.id);c[k]=(c[k]||0)+1;}return Object.fromEntries(Object.entries(c).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])));}
function sortCounts(o){return Object.fromEntries(Object.entries(o).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])));}
const duplicateRowRatio=duplicateRows/Math.max(rows.length,1);
const duplicateExcessRatio=duplicateExcess/Math.max(rows.length,1);
const duplicateGroupsGe5=duplicateGroups.filter(g=>g.count>=5).length;
const duplicateGroupsGe10=duplicateGroups.filter(g=>g.count>=10).length;

const hardFailures=[];
if(hybridJapanese.length)hardFailures.push(`hybrid_japanese_translation:${hybridJapanese.length}`);
if(subjectVerbAgreement.length)hardFailures.push(`subject_verb_agreement:${subjectVerbAgreement.length}`);
if(possessiveSubstitution.length)hardFailures.push(`possessive_substitution:${possessiveSubstitution.length}`);
if(auxTenseErrors.length)hardFailures.push(`auxiliary_tense_error:${auxTenseErrors.length}`);
if(collocationErrors.length)hardFailures.push(`collocation_error:${collocationErrors.length}`);
if(semanticErrors.length)hardFailures.push(`semantic_template_error:${semanticErrors.length}`);
if(duplicateExcessRatio>.10)hardFailures.push(`duplicate_qa_excess_ratio:${duplicateExcessRatio.toFixed(4)}`);
if(duplicateGroupsGe5>0)hardFailures.push(`duplicate_qa_groups_ge5:${duplicateGroupsGe5}`);

const out={generated_at:new Date().toISOString(),source:HTML,result:hardFailures.length?'FAIL':'PASS',hard_failures:hardFailures,english_count:rows.length,
  hybrid_japanese_translation:{count:hybridJapanese.length,by_prefix:prefixBreakdown(hybridJapanese),by_grade_category_type:breakdown(hybridJapanese),samples:hybridJapanese.slice(0,250)},
  subject_verb_agreement:{count:subjectVerbAgreement.length,by_prefix:prefixBreakdown(subjectVerbAgreement),samples:subjectVerbAgreement.slice(0,250)},
  possessive_substitution:{count:possessiveSubstitution.length,by_prefix:prefixBreakdown(possessiveSubstitution),samples:possessiveSubstitution.slice(0,250)},
  auxiliary_tense_errors:{count:auxTenseErrors.length,by_prefix:prefixBreakdown(auxTenseErrors),samples:auxTenseErrors.slice(0,250)},
  collocation_errors:{count:collocationErrors.length,by_prefix:prefixBreakdown(collocationErrors),samples:collocationErrors.slice(0,250)},
  exact_duplicate_question_answer:{group_count:duplicateGroups.length,row_count:duplicateRows,duplicate_excess:duplicateExcess,row_ratio:Number(duplicateRowRatio.toFixed(6)),excess_ratio:Number(duplicateExcessRatio.toFixed(6)),groups_ge5:duplicateGroupsGe5,groups_ge10:duplicateGroupsGe10,by_family_rows:sortCounts(duplicateFamilyRows),by_family_groups:sortCounts(duplicateFamilyGroups),top:duplicateGroups.slice(0,250)},
  semantic_template_errors:{count:semanticErrors.length,by_prefix:prefixBreakdown(semanticErrors),by_grade_category_type:breakdown(semanticErrors),samples:semanticErrors.slice(0,250)},
  policy:'Content-quality hard gate. Hybrid Japanese, agreement including demonstrative plural + be, possessive substitution, actual-answer auxiliary tense, bad natural-source/answer collocation, high-confidence semantic/template errors, duplicate excess above 10%, or any exact QA cluster repeated 5+ times fail. Row ratio remains diagnostic because it counts both the retained original and redundant copies. Deliberately wrong error-correction prompts are not defects.'};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({result:out.result,english_count:rows.length,hard_failures:hardFailures,hybrid_japanese:hybridJapanese.length,agreement:subjectVerbAgreement.length,possessive:possessiveSubstitution.length,aux_tense:auxTenseErrors.length,collocation:collocationErrors.length,semantic_errors:semanticErrors.length,duplicate_groups:duplicateGroups.length,duplicate_rows:duplicateRows,duplicate_excess:duplicateExcess,duplicate_row_ratio:Number(duplicateRowRatio.toFixed(6)),duplicate_excess_ratio:Number(duplicateExcessRatio.toFixed(6)),duplicate_groups_ge5:duplicateGroupsGe5},null,2));
if(hardFailures.length)process.exitCode=2;
