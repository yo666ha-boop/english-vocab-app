#!/usr/bin/env node
import fs from 'node:fs';

const [,,inputPath,outputPath=inputPath]=process.argv;
if(!inputPath){console.error('Usage: node tools/migrate_vocab_coordinates_v7.mjs <html> [output.html]');process.exit(2);}
let html=fs.readFileSync(inputPath,'utf8');
for(const m of ['id="qb-data"','id="meta-data"','function passesVocab(item, overrideMode)']) if(!html.includes(m)) throw new Error(`NOT CANONICAL: missing ${m}`);

const qb=JSON.parse(extractJson(html,'qb-data'));
const meta=JSON.parse(extractJson(html,'meta-data'));
const def=JSON.parse(fs.readFileSync('data/v7_app_sections.json','utf8'));
const rules=JSON.parse(fs.readFileSync('data/old_section_to_v7_rules.json','utf8'));
if(!Array.isArray(qb)||qb.length<10000) throw new Error(`NOT CANONICAL: qb count=${qb.length}`);
if(meta.vocabCoordinateVersion===def.version){console.log(JSON.stringify({status:'ALREADY_V7',version:def.version}));fs.writeFileSync(outputPath,html,'utf8');process.exit(0);}

const legacySections=structuredClone(meta.sections||{});
const gradeOf=id=>{const x=qbById.get(id);return x?.grade||null;};
const qbById=new Map(qb.map(x=>[x.id,x]));
const stats={translated:0,legacyUnknown:0,blockedObsolete:0,outOfRange:0,priorGrade:0,totalValues:0};
const samples={blocked:[],translated:[]};

for(const [id,rec] of Object.entries(meta.passMeta||{})){
  const grade=gradeOf(id);
  if(!grade) continue;
  const g=grade.replace('中','');
  for(const tb of meta.textbooks||['サンシャイン','ニューホライズン']){
    if(!Object.prototype.hasOwnProperty.call(rec,tb)) continue;
    stats.totalValues++;
    const old=rec[tb];
    if(old===-2){stats.priorGrade++;continue;}
    if(!Number.isInteger(old)||old<=0){stats.legacyUnknown++;continue;}
    const arr=((legacySections[tb]||{})[g]||[]);
    const oldLabel=arr[old];
    if(!oldLabel){rec[tb]=-1;stats.outOfRange++;pushSample(samples.blocked,{id,tb,grade,old,reason:'out_of_range'});continue;}
    const target=mapLabel(tb,grade,oldLabel,def,rules);
    if(!target){rec[tb]=-1;stats.blockedObsolete++;pushSample(samples.blocked,{id,tb,grade,old,oldLabel,reason:'obsolete_or_unsupported'});continue;}
    const newArr=def.sections[tb]?.[grade]||[];
    const idx=newArr.indexOf(target);
    if(idx<0){rec[tb]=-1;stats.blockedObsolete++;pushSample(samples.blocked,{id,tb,grade,old,oldLabel,target,reason:'target_missing'});continue;}
    rec[tb]=idx+1;
    stats.translated++;
    pushSample(samples.translated,{id,tb,grade,old,oldLabel,newPos:idx+1,target});
  }
}

meta.sections={};
for(const [tb,byGrade] of Object.entries(def.sections)){
  meta.sections[tb]={};
  for(const [grade,arr] of Object.entries(byGrade)) meta.sections[tb][grade.replace('中','')]=arr;
}
meta.vocabCoordinateVersion=def.version;
meta.vocabCoordinateSemantics=def.semantics;
meta.vocabMigrationAudit={...stats,policy:rules.policy};

html=replaceJson(html,'meta-data',JSON.stringify(meta));
const newPass=`function passesVocab(item, overrideMode) {\n  if (item.subject !== '英語') return true;\n  const mode = overrideMode || (useVocabGate() ? 'on' : 'off');\n  if (mode === 'off') return true;\n  if (item.grade !== currentGrade()) return true;\n  const rec = meta.passMeta[item.id] || {};\n  const minIdx = rec[currentTextbook()];\n  if (meta.vocabCoordinateVersion !== 'v7-2026-08-18-1based') return false;\n  if (minIdx === -2) return true;\n  if (!Number.isInteger(minIdx) || minIdx <= 0) return false;\n  const selectedOrdinal = currentSectionIndex() + 1;\n  return minIdx <= selectedOrdinal;\n}`;
html=replaceFunction(html,'passesVocab',newPass);

const audit=auditFinal(meta,def);
if(audit.errors.length){console.error(JSON.stringify({status:'FAILED_V7_COORDINATE_AUDIT',stats,audit},null,2));process.exit(3);}
fs.writeFileSync(outputPath,html,'utf8');
fs.writeFileSync(outputPath+'.v7-coordinate.audit.json',JSON.stringify({status:'OK',version:def.version,stats,samples,audit},null,2),'utf8');
console.log(JSON.stringify({status:'OK',version:def.version,stats,audit},null,2));

function mapLabel(tb,grade,label,def,rules){
  const blocked=(rules.blockedExact?.[tb]?.[grade]||[]).includes(label)||rules.blockedPatterns.some(p=>new RegExp(p).test(label));
  if(blocked) return null;
  const aliases=rules.aliases?.[tb]?.[grade]||{};
  if(aliases[label]) return aliases[label];
  const arr=def.sections?.[tb]?.[grade]||[];
  return arr.includes(label)?label:null;
}
function pushSample(a,x){if(a.length<40)a.push(x);}
function auditFinal(meta,def){
  const errors=[];
  if(meta.vocabCoordinateVersion!==def.version) errors.push('version mismatch');
  for(const [tb,byGrade] of Object.entries(def.sections)) for(const [grade,arr] of Object.entries(byGrade)){
    const actual=meta.sections?.[tb]?.[grade.replace('中','')]||[];
    if(JSON.stringify(actual)!==JSON.stringify(arr)) errors.push(`sections mismatch ${tb}/${grade}`);
  }
  for(const [id,rec] of Object.entries(meta.passMeta||{})) for(const [tb,v] of Object.entries(rec||{})){
    if(!Number.isInteger(v)) errors.push(`${id}/${tb}: noninteger ${v}`);
    if(v===0||v===-1||v===-2) continue;
    const grade=qbById.get(id)?.grade;
    const max=grade?(def.sections?.[tb]?.[grade]?.length||0):0;
    if(v<1||v>max) errors.push(`${id}/${tb}: out of v7 range ${v}/${max}`);
    if(errors.length>100) break;
  }
  return {errors};
}
function extractJson(src,id){const re=new RegExp(`<script\\s+id=["']${id}["']\\s+type=["']application/json["']>([\\s\\S]*?)<\\/script>`);const m=src.match(re);if(!m)throw new Error(`missing ${id}`);return m[1];}
function replaceJson(src,id,json){const re=new RegExp(`(<script\\s+id=["']${id}["']\\s+type=["']application/json["']>)[\\s\\S]*?(<\\/script>)`);return src.replace(re,`$1${json}$2`);}
function replaceFunction(src,name,replacement){
  const needle=`function ${name}(`;const start=src.indexOf(needle);if(start<0)throw new Error(`missing function ${name}`);
  const open=src.indexOf('{',start);let depth=0,end=-1;
  for(let i=open;i<src.length;i++){if(src[i]==='{')depth++;else if(src[i]==='}'){depth--;if(depth===0){end=i+1;break;}}}
  if(end<0)throw new Error(`unterminated function ${name}`);
  return src.slice(0,start)+replacement+src.slice(end);
}
