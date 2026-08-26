import fs from 'node:fs';

// Compact evidence for deciding which under-50 groups still persist late enough to need a generic fix.
// 2026-08-26: refresh after supplemental-only fallback allowance matrix.
const IN='audit/PROBLEM_APP_VOCAB_LOW_RETENTION_ROWS.json';
const OUT='audit/PROBLEM_APP_VOCAB_LOW_RETENTION_SUMMARY.json';
const audit=JSON.parse(fs.readFileSync(IN,'utf8'));
const progression=Array.isArray(audit.progression)?audit.progression:[];
const rows=Array.isArray(audit.records)?audit.records:[];
const byClass={};
for(const p of progression) byClass[p.classification]=(byClass[p.classification]||0)+1;
const persistent=progression.filter(p=>p.classification!=='early_or_mid_only');
const final=progression.filter(p=>p.classification==='persistent_to_final');
const early=progression.filter(p=>p.classification==='early_or_mid_only');
const result={
  generated_at:new Date().toISOString(),
  source:IN,
  audit_threshold_pct:audit.audit_threshold_pct,
  under_threshold_rows:rows.length,
  severe_under_25pct_rows:rows.filter(r=>Number(r.retention_pct)<25).length,
  progression_groups:progression.length,
  classification_counts:byClass,
  persistent_or_late_groups:persistent.length,
  early_or_mid_only_groups:early.length,
  final_persistent_groups:final.length,
  final_persistent:final,
  worst_persistent_groups:persistent.slice().sort((a,b)=>Number(a.min_retention_pct)-Number(b.min_retention_pct)||Number(b.rows)-Number(a.rows)).slice(0,30),
  worst_early_or_mid_groups:early.slice().sort((a,b)=>Number(a.min_retention_pct)-Number(b.min_retention_pct)||Number(b.rows)-Number(a.rows)).slice(0,20)
};
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
