#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const args=process.argv.slice(2);
const canonicalMode=args.includes('--canonical');
const paths=args.filter(x=>x!=='--canonical');
const [finalPath,sourcePath,auditPath=finalPath?finalPath+'.final-audit.json':null]=paths;
if(!finalPath){
  console.error('Usage: node tools/audit_final_canonical.mjs <final.html> [source.html] [audit.json] [--canonical]');
  process.exit(2);
}

const readApp=(p)=>{
  const html=fs.readFileSync(p,'utf8');
  const qbm=html.match(/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/);
  const mm=html.match(/<script\s+id=["']meta-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/);
  if(!qbm) throw new Error(`${p}: qb-data missing`);
  if(!mm) throw new Error(`${p}: meta-data missing`);
  const qb=JSON.parse(qbm[1]);
  const meta=JSON.parse(mm[1]);
  if(!Array.isArray(qb)) throw new Error(`${p}: qb-data is not an array`);
  return {html,qb,meta,sha256:crypto.createHash('sha256').update(html).digest('hex')};
};

try{
  const final=readApp(finalPath);
  const source=sourcePath?readApp(sourcePath):null;
  const errors=[];
  const ids=final.qb.map(x=>String(x?.id||''));
  const idSet=new Set(ids);
  const englishCount=final.qb.filter(x=>x?.subject==='英語').length;

  if(ids.some(x=>!x)) errors.push('blank question id');
  if(idSet.size!==ids.length) errors.push(`duplicate question ids: total=${ids.length} unique=${idSet.size}`);
  if(final.qb.length<10000) errors.push(`question bank too small: ${final.qb.length}`);

  if(canonicalMode){
    if(final.qb.length!==10513) errors.push(`canonical question count changed: ${final.qb.length} != 10513`);
    if(englishCount!==10511) errors.push(`canonical English question count changed: ${englishCount} != 10511`);
  }

  if(source){
    const sourceIds=source.qb.map(x=>String(x?.id||''));
    const sourceSet=new Set(sourceIds);
    const sourceEnglish=source.qb.filter(x=>x?.subject==='英語').length;
    if(source.qb.length!==final.qb.length) errors.push(`question count changed: ${source.qb.length} -> ${final.qb.length}`);
    if(sourceSet.size!==sourceIds.length) errors.push(`source already has duplicate ids: total=${sourceIds.length} unique=${sourceSet.size}`);
    const missing=[...sourceSet].filter(id=>!idSet.has(id));
    const added=[...idSet].filter(id=>!sourceSet.has(id));
    if(missing.length) errors.push(`question ids missing after repair: ${missing.slice(0,20).join(',')}`);
    if(added.length) errors.push(`question ids added after repair: ${added.slice(0,20).join(',')}`);
    if(sourceEnglish!==englishCount) errors.push(`English question count changed: ${sourceEnglish} -> ${englishCount}`);
    const sourceShape=new Map(source.qb.map(x=>[String(x.id||''),`${x.subject||''}\u0000${x.grade||''}`]));
    for(const x of final.qb){
      const id=String(x.id||'');
      if(sourceShape.has(id)&&sourceShape.get(id)!==`${x.subject||''}\u0000${x.grade||''}`) errors.push(`${id}: subject/grade changed`);
    }
  }

  for(const x of final.qb){
    const id=String(x?.id||''), q=String(x?.q||''), a=String(x?.a||'').trim(), type=String(x?.type||'');
    if(!q) errors.push(`${id}: blank question`);
    if(!a) errors.push(`${id}: blank answer`);
    if(/日本語で説明しなさい/.test(q)&&/^[A-Za-z]/.test(a)) errors.push(`${id}: Japanese-answer prompt still has English answer`);
    if(id.startsWith('GEN-BE-')){
      if(type==='空所補充'&&/^(?:Am|Is|Are)$/.test(a)) errors.push(`${id}: capitalized GEN-BE mid-sentence answer ${a}`);
      if(type==='変形'&&/\bWe are\b/.test(q)&&/^Are you\b/i.test(a)) errors.push(`${id}: GEN-BE subject drift we->you`);
      if(type==='変形'&&/\bI am\b/.test(q)&&/^Are you\b/i.test(a)) errors.push(`${id}: GEN-BE subject drift I->you`);
    }
    if(id.startsWith('GEN-PRS-')&&type==='空所補充'&&/^[A-Z][a-z]/.test(a)) errors.push(`${id}: capitalized GEN-PRS mid-sentence answer ${a}`);
    if(id.startsWith('M2-GER2-')&&type==='空所補充'&&/^[A-Z][a-z]/.test(a)) errors.push(`${id}: capitalized gerund mid-sentence answer ${a}`);
    if(id.startsWith('M2-COMP2-')&&/\bthan He\b|than\s*\/\s*He\b/.test(`${q}\n${a}`)) errors.push(`${id}: comparison placeholder He remains`);
    if(id.startsWith('M2X-INF-')&&/否定文または疑問文/.test(q)) errors.push(`${id}: ambiguous infinitive transformation prompt remains`);
    if(id.startsWith('R1-PRON-')&&/^\(\s*(?:I\s*\/\s*me\s*\/\s*my|we\s*\/\s*us\s*\/\s*our|they\s*\/\s*them\s*\/\s*their)\s*\)\s+is my friend/i.test(q)) errors.push(`${id}: unnatural pronoun singular-copula prompt remains`);
  }

  for(const marker of ['passesPrereqGrammar(item)','passesQualityGate(item)','v7-2026-08-18-1based']){
    if(!final.html.includes(marker)) errors.push(`runtime/final marker missing: ${marker}`);
  }
  if(final.meta?.vocabCoordinateVersion!=='v7-2026-08-18-1based') errors.push(`vocabCoordinateVersion mismatch: ${final.meta?.vocabCoordinateVersion}`);

  const report={
    status:errors.length?'FAILED':'OK',
    final:finalPath,
    source:sourcePath||null,
    canonical_mode:canonicalMode,
    sha256_final:final.sha256,
    sha256_source:source?.sha256||null,
    question_count:final.qb.length,
    english_question_count:englishCount,
    unique_question_ids:idSet.size,
    id_set_preserved:source?errors.every(e=>!e.startsWith('question ids ')):null,
    subject_grade_preserved:source?errors.every(e=>!e.endsWith('subject/grade changed')):null,
    final_quality_errors:errors.length,
    errors
  };
  if(auditPath) fs.writeFileSync(auditPath,JSON.stringify(report,null,2),'utf8');
  console.log(JSON.stringify(report,null,2));
  if(errors.length) process.exit(3);
}catch(e){
  console.error(`FINAL CANONICAL AUDIT FAILED: ${e.message}`);
  process.exit(4);
}
