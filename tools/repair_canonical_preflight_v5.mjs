#!/usr/bin/env node
import fs from 'node:fs';

const [,,inputPath,outputPath=inputPath]=process.argv;
if(!inputPath){
  console.error('Usage: node tools/repair_canonical_preflight_v5.mjs <canonical.html> [output.html]');
  process.exit(2);
}
let html=fs.readFileSync(inputPath,'utf8');
for(const marker of ['id="qb-data"','id="meta-data"','GEN-PRS-']){
  if(!html.includes(marker)) throw new Error(`NOT CANONICAL: missing ${marker}`);
}
if(!html.includes('M2-COMP-')&&!html.includes('M2-COMP2-')){
  throw new Error('NOT CANONICAL: missing M2-COMP-/M2-COMP2-');
}
const re=/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;
const m=html.match(re);
if(!m) throw new Error('missing qb-data');
const qb=JSON.parse(m[1]);
if(!Array.isArray(qb)||qb.length<10000) throw new Error(`NOT CANONICAL: qb count=${qb?.length}`);

const changes=[];
for(const x of qb){
  const beforeQ=String(x.q||''), beforeA=String(x.a||'');
  x.q=repairText(beforeQ);
  x.a=repairText(beforeA);
  if(x.q!==beforeQ||x.a!==beforeA){
    changes.push({id:x.id,q_before:beforeQ,q_after:x.q,a_before:beforeA,a_after:x.a});
  }
}

const errors=[];
for(const x of qb){
  const pair=`${x.q||''}\n${x.a||''}`;
  if(/\(\s*she\s*\/\s*her\s*\/\s*her\s*\)/i.test(pair)) errors.push(`duplicate choice:${x.id}`);
  if(/\bthan He\b/.test(pair)) errors.push(`comparison pronoun:${x.id}`);
  if(/\b(?:Mika|She) (?:love|begin|stop)\b/.test(pair)) errors.push(`3sg/gerund template:${x.id}`);
  if(/Did You ne\b|Do You\b|Does She\b|Do They\b/.test(pair)) errors.push(`auxiliary/case transform:${x.id}`);
}
if(errors.length){
  console.error(JSON.stringify({status:'FAILED_PREFLIGHT_V5',changed:changes.length,errors},null,2));
  process.exit(3);
}

html=html.replace(re,`<script id="qb-data" type="application/json">${JSON.stringify(qb)}</script>`);
fs.writeFileSync(outputPath,html,'utf8');
const report={status:'OK',version:'v5',changed:changes.length,errors:[],changes};
fs.writeFileSync(outputPath+'.preflight-v5.audit.json',JSON.stringify(report,null,2),'utf8');
console.log(JSON.stringify({status:'OK',version:'v5',changed:changes.length,errors:[]},null,2));

function repairText(value){
  let s=String(value||'');

  // Normalize malformed/capitalized auxiliary forms that were generated inside sentences.
  s=s.replace(/Did You ne\b/g,'Do you need')
     .replace(/\bDo You\b/g,'Do you')
     .replace(/\bDoes She\b/g,'Does she')
     .replace(/\bDoes He\b/g,'Does he')
     .replace(/\bDo They\b/g,'Do they');

  // Never compare a person with the same placeholder pronoun.
  s=s.replace(/\bHe is ([^.\n]+?) than He\b/g,'Ken is $1 than Tom')
     .replace(/\bthan\s*\/\s*He\b/g,'than / Ken')
     .replace(/\bthan He\b/g,'than Ken');

  // Third-person singular agreement in the legacy gerund families.
  s=s.replace(/\bMika love\b/g,'Mika loves')
     .replace(/\bShe love\b/g,'She loves')
     .replace(/\bMika begin\b/g,'Mika begins')
     .replace(/\bShe begin\b/g,'She begins')
     .replace(/\bMika stop\b/g,'Mika stops')
     .replace(/\bShe stop\b/g,'She stops');

  // Remove legacy article tokens from activity names in word-order choices.
  s=s.replace(/\bpractice\s*\/\s*the\s*\/\s*tennis\b/gi,'practice / tennis');

  // Restore the missing possessive-pronoun option instead of leaving a duplicated choice.
  s=s.replace(/\(\s*she\s*\/\s*her\s*\/\s*her\s*\)/gi,'( she / her / hers )');
  return s;
}
