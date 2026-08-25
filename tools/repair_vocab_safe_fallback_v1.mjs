import fs from 'node:fs';

const path='problem-app/index.html';
let html=fs.readFileSync(path,'utf8');
const start=html.indexOf('// ---- VOCAB_SAFE_FALLBACK_V1:');
const endMarker='// ---- END VOCAB_SAFE_FALLBACK_V1 ----';
const endStart=html.indexOf(endMarker,start);
if(start<0||endStart<0) throw new Error('fallback segment not found');
const end=endStart+endMarker.length;
const before=html.slice(start,end);
const badCount=(before.match(/\\`/g)||[]).length;
const after=before.replace(/\\`/g,'`');
if(!badCount) {
  console.log('no escaped backticks to repair');
} else {
  html=html.slice(0,start)+after+html.slice(end);
  fs.writeFileSync(path,html);
}
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/VOCAB_SAFE_FALLBACK_SYNTAX_REPAIR.json',JSON.stringify({repairedAt:new Date().toISOString(),escapedBackticksRemoved:badCount,htmlBytes:Buffer.byteLength(html)},null,2)+'\n');
console.log(JSON.stringify({escapedBackticksRemoved:badCount,htmlBytes:Buffer.byteLength(html)},null,2));
