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
replaceOne("'M2-GER2-1001':{a:'Mika enjoys listening to music.'}","'M2-GER2-1001':{type:'変形',q:'次の英文の（　）内の動詞を動名詞に直して、英文を完成させなさい。 Mika loves (listen) to music.',a:'Mika loves listening to music.'}","GER rebuilt expectation");
replaceOne("q:'He is smaller than He.',a:'He is smaller than He.'","q:'She is popularer than He.',a:'She is more popular than He.'","COMP generated fixture");
replaceOne("'M2-COMP2-1001':{a:'Ken is smaller than Tom.'}","'M2-COMP2-1001':{q:'She is popularer than Ken.',a:'She is more popular than Ken.'}","COMP generated expectation");
replaceOne("q:'We want to play tennis. を否定文または疑問文に直しなさい。',a:'Do you want to play tennis?'","q:'You went to the library to study. を否定文または疑問文に直しなさい。',a:'You do not went to the library to study.'","INF past-tense fixture");
replaceOne("'M2X-INF-1001':{q:'We want to play tennis. を疑問文にしなさい。',a:'Do we want to play tennis?'}","'M2X-INF-1001':{q:'You went to the library to study. を疑問文にしなさい。',a:'Did you go to the library to study?'}","INF past-tense expectation");
replaceOne(
  "  {id:'M2X-INF-1001',subject:'英語',grade:'中2',category:'不定詞①',type:'変形',q:'You went to the library to study. を否定文または疑問文に直しなさい。',a:'You do not went to the library to study.'},\n  {id:'M2-RD2-1549'",
  "  {id:'M2X-INF-1001',subject:'英語',grade:'中2',category:'不定詞①',type:'変形',q:'You went to the library to study. を否定文または疑問文に直しなさい。',a:'You do not went to the library to study.'},\n  {id:'M2-INF2-TEST',subject:'英語',grade:'中2',category:'不定詞',type:'空所補充',q:'He need to (      ) study harder.',a:'To'},\n  {id:'M2-RD2-1549'",
  'M2 infinitive bank fixture'
);
replaceOne(
  " 'M2X-INF-1001':{q:'You went to the library to study. を疑問文にしなさい。',a:'Did you go to the library to study?'},\n 'M2-RD2-1549'",
  " 'M2X-INF-1001':{q:'You went to the library to study. を疑問文にしなさい。',a:'Did you go to the library to study?'},\n 'M2-INF2-TEST':{q:'He needs (      ) study harder.',a:'to'},\n 'M2-RD2-1549'",
  'M2 infinitive bank expectation'
);
replaceOne(
  "  {id:'M3N-00246',subject:'英語',grade:'中3',category:'be動詞と一般動詞（過去形）',type:'変形',q:'I played tennis yesterday. を疑問文にしなさい。',a:'Did you play tennis yesterday?'}\n];",
  "  {id:'M3N-00246',subject:'英語',grade:'中3',category:'be動詞と一般動詞（過去形）',type:'変形',q:'I played tennis yesterday. を疑問文にしなさい。',a:'Did you play tennis yesterday?'},\n  {id:'M3N-WORD-TEST',subject:'英語',grade:'中3',category:'英語の語順',type:'読解',q:'This dog play tennis at six. 問い：この英文の意味を書きなさい。',a:'This dogはat sixにtennisをします。'},\n  {id:'M3N-INF2-TEST',subject:'英語',grade:'中3',category:'不定詞②',type:'間違い直し',q:'My father went there to played swimming. の誤りを直しなさい。',a:'My father went there to go swimming.'}\n];",
  'M3 word-order + infinitive II fixture'
);
replaceOne(
  " 'M3N-00246':{a:'Did I play tennis yesterday?'}\n};",
  " 'M3N-00246':{a:'Did I play tennis yesterday?'},\n 'M3N-WORD-TEST':{q:'This dog plays tennis at six. 問い：この英文の意味を書きなさい。',a:'この犬は6時にテニスをします。'},\n 'M3N-INF2-TEST':{q:'My father went there to swam. の誤りを直しなさい。',a:'My father went there to swim.'}\n};",
  'M3 word-order + infinitive II expectation'
);
replaceOne("Mikami full v2 repair regression: OK","Mikami full v3 integration regression: OK","success label");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-v3-integration-'));
const test=path.join(dir,'test.mjs');
fs.writeFileSync(test,src,'utf8');
try{
  execFileSync(process.execPath,[test],{stdio:'inherit',cwd:process.cwd()});
}finally{
  fs.rmSync(dir,{recursive:true,force:true});
}
