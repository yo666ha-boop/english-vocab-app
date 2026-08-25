import fs from 'node:fs';

const HTML_PATH='problem-app/index.html';
const CANDIDATE_PATH='audit/PROBLEM_APP_PASSMETA_SAFE_CANDIDATE.json';
const SAFE_AUDIT_PATH='audit/PROBLEM_APP_PASSMETA_SAFE_AUDIT.json';
const APPLY_AUDIT_PATH='audit/PROBLEM_APP_PASSMETA_APPLY_RESULT.json';

const html=fs.readFileSync(HTML_PATH,'utf8');
const cand=JSON.parse(fs.readFileSync(CANDIDATE_PATH,'utf8'));
const safeAudit=JSON.parse(fs.readFileSync(SAFE_AUDIT_PATH,'utf8'));
const metaRe=/(<script\s+id=["']meta-data["'][^>]*>)([\s\S]*?)(<\/script>)/i;
const m=metaRe.exec(html);
if(!m) throw new Error('meta-data script not found');
const meta=JSON.parse(m[2]);
if(meta.vocabCoordinateVersion!=='v7-2026-08-18-1based') throw new Error(`unexpected coordinate version ${meta.vocabCoordinateVersion}`);
if(cand.version!=='v8-canonical-safe-20260825-1based') throw new Error(`unexpected candidate version ${cand.version}`);
const ids=Object.keys(cand.passMeta||{});
if(ids.length!==10511) throw new Error(`candidate id count ${ids.length}`);
const sections=meta.sections||{};
let invalid=0,resolved=0,unknown=0;
for(const [id,rec] of Object.entries(cand.passMeta)){
  if(!rec||typeof rec!=='object') throw new Error(`bad record ${id}`);
  for(const tb of ['サンシャイン','ニューホライズン']){
    const v=rec[tb];
    if(!Number.isInteger(v)) {invalid++;continue;}
    if(v===-1){unknown++;continue;}
    if(v===-2||v>0){resolved++;continue;}
    invalid++;
  }
}
if(invalid) throw new Error(`invalid candidate values ${invalid}`);

const oldMeta=meta.passMeta||{};
let changed=0,same=0,oldResolved=0,newResolved=0;
for(const id of ids){
  for(const tb of ['サンシャイン','ニューホライズン']){
    const ov=oldMeta[id]?.[tb]; const nv=cand.passMeta[id][tb];
    if(ov===nv)same++;else changed++;
    if(Number.isInteger(ov)&&(ov===-2||ov>0))oldResolved++;
    if(nv===-2||nv>0)newResolved++;
  }
}
meta.passMeta=cand.passMeta;
// The coordinate semantics stay 1-based, so keep the app's compatibility version.
// Record the canonical rebuild version separately for auditability.
meta.vocabMigrationAudit={
  ...(meta.vocabMigrationAudit||{}),
  safeRebuildVersion:cand.version,
  safeRebuildPolicy:safeAudit.merge_policy,
  safeRebuildGeneratedAt:safeAudit.generated_at_utc,
  safeRebuildAppliedAt:new Date().toISOString(),
  safeRebuildChangedValues:changed,
  safeRebuildUnchangedValues:same,
  safeRebuildOldResolved:oldResolved,
  safeRebuildNewResolved:newResolved,
  safeRebuildUnknown:unknown,
  safeRebuildMapping:safeAudit.mapping,
  safeRebuildCoverage:safeAudit.coverage
};
const newMeta=JSON.stringify(meta);
const newHtml=html.slice(0,m.index)+m[1]+newMeta+m[3]+html.slice(m.index+m[0].length);
// Sanity: target script remains exactly once and qb-data is untouched.
if((newHtml.match(/id=["']meta-data["']/g)||[]).length!==1) throw new Error('meta-data count changed');
const qbBefore=(html.match(/<script\s+id=["']qb-data["'][^>]*>[\s\S]*?<\/script>/i)||[])[0];
const qbAfter=(newHtml.match(/<script\s+id=["']qb-data["'][^>]*>[\s\S]*?<\/script>/i)||[])[0];
if(!qbBefore||qbBefore!==qbAfter) throw new Error('qb-data changed unexpectedly');
fs.writeFileSync(HTML_PATH,newHtml,'utf8');
const result={
  applied_at_utc:new Date().toISOString(),
  candidate_version:cand.version,
  coordinate_version_preserved:meta.vocabCoordinateVersion,
  ids:ids.length,
  values:ids.length*2,
  changed_values:changed,
  unchanged_values:same,
  old_resolved:oldResolved,
  new_resolved:newResolved,
  unknown_values:unknown,
  html_bytes_before:Buffer.byteLength(html),
  html_bytes_after:Buffer.byteLength(newHtml),
  qb_data_unchanged:true
};
fs.writeFileSync(APPLY_AUDIT_PATH,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
