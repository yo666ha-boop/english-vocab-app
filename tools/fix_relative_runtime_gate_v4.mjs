#!/usr/bin/env node
import fs from 'node:fs';

const [,, inputPath, outputPath=inputPath]=process.argv;
if(!inputPath){
  console.error('Usage: node tools/fix_relative_runtime_gate_v4.mjs <html> [output.html]');
  process.exit(2);
}
let html=fs.readFileSync(inputPath,'utf8');
if(!html.includes('function passesQualityGate(item)')) throw new Error('runtime quality gate missing');

const oldGate=`  if (item.category === '関係代名詞') {
    if (!/\\b(?:who|which|that)\\b/i.test(both)) return false;
    if (item.type === '空所補充' && /^\\s*(?:Who|Which|That)\\s*$/i.test(a) && /\\(\\s*\\)/.test(q)) return false;
  }`;
const newGate=`  if (item.category === '関係代名詞') {
    if (!/\\b(?:who|which|that)\\b/i.test(both)) return false;
    if (item.type === '空所補充' && /\\(\\s*\\)/.test(q)) {
      if (!/who\\s*\\/\\s*which/i.test(q)) return false;
      if (!/^(?:who|which)$/i.test(a)) return false;
    }
  }`;
if(!html.includes(oldGate)) throw new Error('expected V3 relative-pronoun quality gate not found');
html=html.replace(oldGate,newGate);
if(html.includes(oldGate)||!html.includes("if (!/who\\s*\\/\\s*which/i.test(q)) return false;")) throw new Error('relative runtime gate replacement failed');
fs.writeFileSync(outputPath,html,'utf8');
console.log(JSON.stringify({status:'OK',output:outputPath,relative_pronoun_unique_blank_gate:true}));
