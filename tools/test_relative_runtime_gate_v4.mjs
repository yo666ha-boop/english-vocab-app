#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-rel-gate-v4-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const oldGate=`  if (item.category === '関係代名詞') {
    if (!/\\b(?:who|which|that)\\b/i.test(both)) return false;
    if (item.type === '空所補充' && /^\\s*(?:Who|Which|That)\\s*$/i.test(a) && /\\(\\s*\\)/.test(q)) return false;
  }`;
fs.writeFileSync(input,`<!doctype html><script>function passesQualityGate(item){\n${oldGate}\nreturn true;}</script>`,'utf8');
execFileSync(process.execPath,['tools/fix_relative_runtime_gate_v4.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
if(!out.includes("if (!/who\\s*\\/\\s*which/i.test(q)) return false;")) throw new Error('unique-choice relative gate missing');
if(out.includes("/^\\s*(?:Who|Which|That)\\s*$/i.test(a)")) throw new Error('old blanket relative blank blocker remains');
console.log('Relative runtime gate V4 regression: OK');
