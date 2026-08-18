#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const [,,inputPath,outputPath='14b01a93-de5d-4c95-a655-932d2f3f2513_repaired.html']=process.argv;
if(!inputPath){console.error('Usage: node tools/run_mikami_pipeline_v3.mjs <canonical.html> [output.html]');process.exit(2);}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-v3-pipeline-'));
const s1=path.join(tmp,'01-targeted-pre.html');
const s2=path.join(tmp,'02-base.html');
const s3=path.join(tmp,'03-targeted-post.html');
const s3a=path.join(tmp,'03a-gen-be-v4.html');
const s3p=path.join(tmp,'03p-gen-pbe-v4.html');
const s3b=path.join(tmp,'03b-m2-infinitive-bank.html');
const s4=path.join(tmp,'04-infinitive.html');
const s5=path.join(tmp,'05-present-perfect.html');
const s6=path.join(tmp,'06-reading.html');
const s7=path.join(tmp,'07-m3-word-order.html');
const s8=path.join(tmp,'08-m3-infinitive2.html');
const s9=path.join(tmp,'09-m3.html');
const s10=path.join(tmp,'10-case.html');
const s11=path.join(tmp,'11-vocab-v7.html');
const run=(script,args)=>execFileSync(process.execPath,[script,...args],{stdio:'inherit'});
try{
  run('tools/repair_targeted_patterns_v3.mjs',[inputPath,s1]);
  run('tools/fix_mikami_canonical.mjs',[s1,s2]);
  run('tools/repair_targeted_patterns_v3.mjs',[s2,s3]);
  run('tools/repair_gen_be_v4.mjs',[s3,s3a]);
  run('tools/repair_gen_pbe_v4.mjs',[s3a,s3p]);
  run('tools/repair_m2_infinitive_bank_v4.mjs',[s3p,s3b]);
  run('tools/repair_infinitive_v3.mjs',[s3b,s4]);
  run('tools/repair_present_perfect_v3.mjs',[s4,s5]);
  run('tools/repair_reading_v3.mjs',[s5,s6]);
  run('tools/repair_m3_word_order_v4.mjs',[s6,s7]);
  run('tools/repair_m3_infinitive2_v4.mjs',[s7,s8]);
  run('tools/repair_m3_review.mjs',[s8,s9]);
  run('tools/normalize_question_subject_case.mjs',[s9,s10]);
  run('tools/migrate_vocab_coordinates_v7.mjs',[s10,s11]);
  run('tools/apply_mikami_runtime_gates.mjs',[s11,outputPath]);

  const out=fs.readFileSync(outputPath,'utf8');
  for(const marker of [
    'id="qb-data"','id="meta-data"','passesPrereqGrammar(item)','passesQualityGate(item)',
    'v7-2026-08-18-1based','if (minIdx === -2) return true','const selectedOrdinal = currentSectionIndex() + 1'
  ]){
    if(!out.includes(marker)) throw new Error(`FINAL GATE MISSING: ${marker}`);
  }
  const m=out.match(/<script\s+id=["']qb-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/);
  if(!m) throw new Error('FINAL qb-data missing');
  const qb=JSON.parse(m[1]);
  const metaMatch=out.match(/<script\s+id=["']meta-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/);
  if(!metaMatch) throw new Error('FINAL meta-data missing');
  const meta=JSON.parse(metaMatch[1]);
  if(meta.vocabCoordinateVersion!=='v7-2026-08-18-1based') throw new Error('FINAL vocab coordinate version mismatch');
  const bankText=qb.map(x=>`${x.id}\n${x.q||''}\n${x.a||''}`).join('\n');
  const forbidden=[
    /This is (?:he|she|we)\b/i,
    /\bthan He\b|than\s*\/\s*He\b/,
    /否定文または疑問文/,
    /(?:Do|Does)\s+.+\s+have\s+(?:finished|visited|been|lost|lived|studied)/i,
    /\b(?:Mika|She) (?:love|begin|stop)\b/,
    /Did You ne\b|Do You\b|Do They\b|Does She\b|Does He\b/,
    /practice\s*\/\s*the\s*\/\s*tennis/i,
    /^(?:Do|Does)\s+.+\s+(?:went|came|saw|made|took)\b/im,
    /^Did\s+.+\s+(?:went|came|saw|made|took)\b/im
  ];
  for(const re of forbidden) if(re.test(bankText)) throw new Error(`FINAL KNOWN-BAD QUESTION PATTERN: ${re}`);
  const singular=/^(?:He|She|Yuki|Mika|Ken|Emi|Tom|The student|The teacher|Our team|This dog|My mother|My father|My brother|My sister|My friend) (?:play|go)\b/;
  const badM2InfThird=/^(?:He|She|Yuki|Mika|Takumi|Ken|Emi|Tom|The student|The teacher|This boy|This girl|My mother|My father|My brother|My sister|My friend) (?:want|need|like) to\b/i;
  for(const x of qb){
    if(/日本語で説明しなさい/.test(String(x.q||''))&&/^[A-Za-z]/.test(String(x.a||''))) throw new Error(`FINAL Japanese-answer mismatch: ${x.id}`);
    if(String(x.id||'').startsWith('GEN-BE-')){
      const q=String(x.q||''),a=String(x.a||'');
      if(x.type==='空所補充'&&/^(Am|Is|Are)$/.test(a)) throw new Error(`FINAL capitalized GEN-BE blank: ${x.id}`);
      if(/^(?:Am|Is|Are) (?:You|We|They|He|She)\b/.test(a)) throw new Error(`FINAL GEN-BE question pronoun case: ${x.id}`);
      if(x.type==='変形'&&/\bWe are\b/.test(q)&&/^Are you\b/i.test(a)) throw new Error(`FINAL GEN-BE subject changed we->you: ${x.id}`);
      if(x.type==='変形'&&/\bI am\b/.test(q)&&/^Are you\b/i.test(a)) throw new Error(`FINAL GEN-BE subject changed I->you: ${x.id}`);
      if(x.type==='答え方'&&/^Are you\b/i.test(q)&&/^Yes, you are\.$/i.test(a)) throw new Error(`FINAL GEN-BE response perspective mismatch: ${x.id}`);
    }
    if(String(x.id||'').startsWith('GEN-PBE-')){
      const q=String(x.q||''),a=String(x.a||'');
      if(x.type==='空所補充'&&/^(Was|Were)$/.test(a)) throw new Error(`FINAL capitalized GEN-PBE blank: ${x.id}`);
      if(/^(?:Was|Were) (?:You|We|They|He|She)\b/.test(a)) throw new Error(`FINAL GEN-PBE question pronoun case: ${x.id}`);
      if(x.type==='変形'&&/\bWe were\b/.test(q)&&/^Were you\b/i.test(a)) throw new Error(`FINAL GEN-PBE subject changed we->you: ${x.id}`);
      if(x.type==='変形'&&/\bI was\b/.test(q)&&/^Were you\b/i.test(a)) throw new Error(`FINAL GEN-PBE subject changed I->you: ${x.id}`);
      if(x.type==='答え方'&&/^Were you\b/i.test(q)&&/^Yes, you were\.$/i.test(a)) throw new Error(`FINAL GEN-PBE response perspective mismatch: ${x.id}`);
    }
    if(String(x.id||'').startsWith('GEN-PRS-')&&x.type==='空所補充'&&/^[A-Z]/.test(String(x.a||''))) throw new Error(`FINAL capitalized GEN blank: ${x.id}`);
    if(String(x.id||'').startsWith('M2-GER2-')&&x.type==='空所補充'&&/^[A-Z]/.test(String(x.a||''))) throw new Error(`FINAL capitalized GER blank: ${x.id}`);
    const cat=String(x.category||''),q=String(x.q||''),a=String(x.a||'');
    if(String(x.id||'').startsWith('M2-INF2-')&&cat==='不定詞'){
      if(x.type==='空所補充'&&/^To$/.test(a)) throw new Error(`FINAL M2 infinitive capitalized to: ${x.id}`);
      if(x.type==='空所補充'&&/^to$/i.test(a)&&/\bto\s*\(\s*\)\s*(?=[A-Za-z])/i.test(q)) throw new Error(`FINAL M2 infinitive double-to blank: ${x.id}`);
      if(badM2InfThird.test(a)) throw new Error(`FINAL M2 infinitive third-person agreement: ${x.id}`);
    }
    if(cat.startsWith('現在完了形')){
      if(/^You have (?:finished my homework|lost my key)\b/.test(q)||/^We have (?:finished my homework|lost my key)\b/.test(q)||/^They have (?:finished my homework|lost my key)\b/.test(q)||/^He has (?:finished my homework|lost my key)\b/.test(q)||/^She has (?:finished my homework|lost my key)\b/.test(q)) throw new Error(`FINAL present-perfect possessive mismatch: ${x.id}`);
    }
    if(String(x.id||'').startsWith('M3N-')&&cat==='英語の語順'){
      const source=q.split(/\s*(?:問い：|を|は be動詞)/)[0].replace(/^(?:次のうち正しい英文を選びなさい。\s*)/,'');
      if(singular.test(source)) throw new Error(`FINAL M3 word-order bare verb: ${x.id}`);
      if(x.type==='空所補充'&&/^[A-Z]/.test(a)) throw new Error(`FINAL M3 word-order capitalized blank: ${x.id}`);
      if(/(?:は(?:at |every |after |before |in the |on )|に(?:soccer|tennis|baseball|basketball|volleyball|running|swimming)\b|the\s+\w+へ)/i.test(`${q} ${a}`)) throw new Error(`FINAL M3 word-order pseudo-Japanese: ${x.id}`);
    }
    if(String(x.id||'').startsWith('M3N-')&&cat==='不定詞②'){
      if(x.type==='空所補充'&&/^To$/.test(a)) throw new Error(`FINAL M3 infinitive2 capitalized to: ${x.id}`);
      if(/\bHe gots up\b/i.test(`${q} ${a}`)) throw new Error(`FINAL M3 infinitive2 gots: ${x.id}`);
      if(/to played (?:swimming|running)\b/i.test(q)) throw new Error(`FINAL M3 infinitive2 mixed error: ${x.id}`);
      if(/\bwents there\b/i.test(a)) throw new Error(`FINAL M3 infinitive2 wents: ${x.id}`);
    }
  }

  const preAudit=JSON.parse(fs.readFileSync(s1+'.targeted-v3.audit.json','utf8'));
  const baseAudit=JSON.parse(fs.readFileSync(s2+'.audit.json','utf8'));
  const postAudit=JSON.parse(fs.readFileSync(s3+'.targeted-v3.audit.json','utf8'));
  const genBeAudit=JSON.parse(fs.readFileSync(s3a+'.gen-be-v4.audit.json','utf8'));
  const genPbeAudit=JSON.parse(fs.readFileSync(s3p+'.gen-pbe-v4.audit.json','utf8'));
  const m2InfAudit=JSON.parse(fs.readFileSync(s3b+'.m2-infinitive-bank-v4.audit.json','utf8'));
  const wordOrderAudit=JSON.parse(fs.readFileSync(s7+'.m3-word-order-v4.audit.json','utf8'));
  const inf2Audit=JSON.parse(fs.readFileSync(s8+'.m3-infinitive2-v4.audit.json','utf8'));
  const m3Audit=JSON.parse(fs.readFileSync(s9+'.m3-review.audit.json','utf8'));
  const vocabAudit=JSON.parse(fs.readFileSync(s11+'.v7-coordinate.audit.json','utf8'));
  const report={
    status:'OK',input:inputPath,output:outputPath,
    question_count:baseAudit.question_count,
    targeted_v3_pre_changed:preAudit.changed,
    base_changed:baseAudit.changed_items,
    targeted_v3_post_changed:postAudit.changed,
    gen_be_v4_changed:genBeAudit.changed,
    gen_pbe_v4_changed:genPbeAudit.changed,
    m2_infinitive_bank_v4_changed:m2InfAudit.changed,
    m3_word_order_v4_changed:wordOrderAudit.changed,
    m3_infinitive2_v4_changed:inf2Audit.changed,
    m3_changed:m3Audit.changed,
    vocab_coordinate_version:vocabAudit.version,
    vocab_migration:vocabAudit.stats,
    gates:{vocab_v7_1based:true,vocab_unknown_fail_closed:true,vocab_prior_grade_pass:true,prerequisite:true,quality:true,gen_be:true,gen_pbe:true,m2_infinitive_bank:true}
  };
  fs.writeFileSync(outputPath+'.pipeline-v3.audit.json',JSON.stringify(report,null,2),'utf8');
  console.log(JSON.stringify(report,null,2));
}catch(e){
  try{if(fs.existsSync(outputPath))fs.unlinkSync(outputPath);}catch{}
  console.error(`MIKAMI V3 PIPELINE FAILED: ${e.message}`);
  process.exit(4);
}finally{
  try{fs.rmSync(tmp,{recursive:true,force:true});}catch{}
}
