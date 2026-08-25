import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const html=fs.readFileSync('problem-app/index.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
const app=scripts.at(-1)?.[1]||'';
const tmp='.problem-app-runtime-check.js';
fs.writeFileSync(tmp,app);
const p=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
let functionParse=true,functionError='';
try{new Function(app);}catch(e){functionParse=false;functionError=String(e.stack||e);}
const out={
  generatedAt:new Date().toISOString(),
  htmlBytes:Buffer.byteLength(html),
  scriptCount:scripts.length,
  appScriptChars:app.length,
  nodeCheckStatus:p.status,
  nodeCheckStdout:p.stdout,
  nodeCheckStderr:p.stderr,
  newFunctionParse:functionParse,
  newFunctionError:functionError,
  markerCount:(html.match(/VOCAB_SAFE_FALLBACK_V1/g)||[]).length
};
fs.rmSync(tmp,{force:true});
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/PROBLEM_APP_RUNTIME_PARSE_CHECK.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
