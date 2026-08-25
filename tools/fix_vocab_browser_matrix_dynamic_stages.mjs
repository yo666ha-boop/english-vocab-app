import fs from 'node:fs';
const path='.github/workflows/problem-app-vocab-browser-matrix.yml';
let s=fs.readFileSync(path,'utf8');
const oldLoop="                          rows = []\n                          for st in stages:\n";
const newLoop="                          rows = []\n                          section_stages = stage_defs(page)\n                          for st in section_stages:\n";
if(!s.includes(newLoop)) {
  if(!s.includes(oldLoop)) throw new Error('matrix stage-loop baseline not found');
  s=s.replace(oldLoop,newLoop);
}
const oldSummary="                          'stage_count': len(stages),\n                          'stages': stages,\n";
const newSummary="                          'stage_count': len(section_stages),\n                          'stages': section_stages,\n";
if(!s.includes(newSummary)) {
  if(!s.includes(oldSummary)) throw new Error('matrix stage-summary baseline not found');
  s=s.replace(oldSummary,newSummary);
}
fs.writeFileSync(path,s,'utf8');
console.log('matrix now measures the stage checkboxes rendered for each section');
