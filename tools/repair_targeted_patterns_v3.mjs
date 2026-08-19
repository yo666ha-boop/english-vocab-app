#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// Compatibility entrypoint: the pipeline and existing tests call V3 by name.
// Run the legacy-wide canonical cleanup first, then the stricter V4 targeted repair.
const [,,inputPath,outputPath=inputPath]=process.argv;
if(!inputPath){
  console.error('Usage: node tools/repair_targeted_patterns_v3.mjs <html> [output.html]');
  process.exit(2);
}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-targeted-v5-'));
const pre=path.join(dir,'preflight.html');
try{
  execFileSync(process.execPath,['tools/repair_canonical_preflight_v5.mjs',inputPath,pre],{stdio:'inherit'});
  execFileSync(process.execPath,['tools/repair_targeted_patterns_v4.mjs',pre,outputPath],{stdio:'inherit'});
} finally {
  fs.rmSync(dir,{recursive:true,force:true});
}
