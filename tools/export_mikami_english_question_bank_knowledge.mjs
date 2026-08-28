import fs from 'node:fs';
import crypto from 'node:crypto';
const HTML='problem-app/index.html';
const OUT='mygpt/01_mikami_english_question_bank_knowledge.jsonl';
const MAN='audit/MIKAMI_ENGLISH_QUESTION_BANK_KNOWLEDGE_MANIFEST.json';
const html=fs.readFileSync(HTML,'utf8');
const m=/<script\s+id=["']qb-data["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);if(!m)throw Error('qb-data missing');
const all=JSON.parse(m[1]), rows=all.filter(x=>x?.subject==='英語');
const fields=['id','subject','grade','category','type','q','a','mistake','cause'];
const required=['id','subject','grade','category','type','q','a'];
const lines=[];const missing=[];const parseErrors=[];
for(const x of rows){
 const o={};for(const k of fields)if(x[k]!==undefined&&x[k]!==null)o[k]=x[k];
 for(const k of required)if(o[k]===undefined||o[k]===null||String(o[k]).trim()==='')missing.push({id:x.id||null,field:k});
 lines.push(JSON.stringify(o));
}
const text=lines.join('\n')+'\n';fs.mkdirSync('mygpt',{recursive:true});fs.mkdirSync('audit',{recursive:true});fs.writeFileSync(OUT,text);
for(let i=0;i<lines.length;i++){try{JSON.parse(lines[i]);}catch(e){parseErrors.push({line:i+1,error:String(e)})}}
const ids=new Set(rows.map(x=>x.id));const sha256=crypto.createHash('sha256').update(text).digest('hex');
const manifest={generated_at:new Date().toISOString(),source:HTML,output:OUT,line_count:lines.length,parse_error_count:parseErrors.length,unique_id_count:ids.size,required_field_missing_count:missing.length,sha256,bytes:Buffer.byteLength(text),result:(lines.length===10511&&parseErrors.length===0&&ids.size===10511&&missing.length===0)?'PASS':'FAIL',missing_samples:missing.slice(0,50),parse_error_samples:parseErrors.slice(0,20)};
fs.writeFileSync(MAN,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));if(manifest.result!=='PASS')process.exit(2);
