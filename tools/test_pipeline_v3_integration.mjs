#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

let src=fs.readFileSync('tools/test_pipeline_v2_full.mjs','utf8');
const replaceOne=(from,to,label)=>{
  if(!src.includes(from)) throw new Error(`fixture transform missing: ${label}`);
  src=src.replace(from,to);
};
replaceOne("tools/run_mikami_pipeline_v2.mjs","tools/run_mikami_pipeline_v3.mjs","pipeline v3");
replaceOne("q:'We (      ) every day. 「ピアノを練習します」',a:'Practice tennis'","q:'He (      ) every day. 「ピアノを練習します」',a:'Practice tennis'","GEN third-person fixture");
replaceOne("'GEN-PRS-0731':{a:'practice the piano'}","'GEN-PRS-0731':{a:'practices the piano'}","GEN third-person expectation");
replaceOne("q:'He is smaller than He.',a:'He is smaller than He.'","q:'She is popularer than He.',a:'She is more popular than He.'","COMP generated fixture");
replaceOne("'M2-COMP2-1001':{a:'Ken is smaller than Tom.'}","'M2-COMP2-1001':{q:'She is popularer than Ken.',a:'She is more popular than Ken.'}","COMP generated expectation");
replaceOne("q:'We want to play tennis. を否定文または疑問文に直しなさい。',a:'Do you want to play tennis?'","q:'You went to the library to study. を否定文または疑問文に直しなさい。',a:'You do not went to the library to study.'","INF past-tense fixture");
replaceOne("'M2X-INF-1001':{q:'We want to play tennis. を疑問文にしなさい。',a:'Do we want to play tennis?'}","'M2X-INF-1001':{q:'You went to the library to study. を疑問文にしなさい。',a:'Did you go to the library to study?'}","INF past-tense expectation");
replaceOne("Mikami full v2 repair regression: OK","Mikami full v3 integration regression: OK","success label");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-v3-integration-'));
const test=path.join(dir,'test.mjs');
fs.writeFileSync(test,src,'utf8');
try{
  execFileSync(process.execPath,[test],{stdio:'inherit',cwd:process.cwd()});
}finally{
  fs.rmSync(dir,{recursive:true,force:true});
}
