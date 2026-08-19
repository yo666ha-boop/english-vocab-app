#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

let src=fs.readFileSync('tools/test_pipeline_v3_integration.mjs','utf8');
if(!src.includes('tools/run_mikami_pipeline_v3.mjs')) throw new Error('V3 integration source changed');
src=src.replace('tools/run_mikami_pipeline_v3.mjs','tools/run_mikami_pipeline_v4.mjs');
src=src.replace('pipeline v3','pipeline v4');
src=src.replace('Mikami full v3 integration regression: OK','Mikami full v4 integration regression: OK');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-v4-integration-'));
const test=path.join(dir,'test.mjs');
fs.writeFileSync(test,src,'utf8');
try{
  execFileSync(process.execPath,[test],{stdio:'inherit',cwd:process.cwd()});
}finally{
  fs.rmSync(dir,{recursive:true,force:true});
}
