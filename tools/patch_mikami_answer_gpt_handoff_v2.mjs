#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {patchHtml as patchV1} from './patch_mikami_answer_gpt_handoff.mjs';

const OLD = `      if (url.protocol !== 'https:') return '';\n      return url.href;`;
const NEW = `      if (url.protocol !== 'https:') return '';\n      if (!['chatgpt.com', 'chat.openai.com'].includes(url.hostname)) return '';\n      if (!/^\\/g\\/[A-Za-z0-9_-]+/.test(url.pathname)) return '';\n      return url.href;`;

export function patchHtml(source){
  let out = patchV1(source);
  if (out.includes(NEW)) return out;
  if (!out.includes(OLD)) throw new Error('My GPT URL normalization block not found; refusing unknown handoff script');
  out = out.replace(OLD, NEW);
  if (!out.includes("['chatgpt.com', 'chat.openai.com'].includes(url.hostname)")) throw new Error('ChatGPT host gate missing');
  if (!out.includes("/^\\/g\\/[A-Za-z0-9_-]+/.test(url.pathname)")) throw new Error('Custom GPT /g/ path gate missing');
  return out;
}

function selfTest(){
  const fixture=`<!doctype html><html><body>\n        <label>テストの写真</label>\n        <input id="photoInput" type="file" accept="image/*">\n        <div class="row2" style="margin-top:12px">\n          <div><label>写真の種類</label><select id="photoType"><option>みかみ塾オリジナル問題</option><option>学校テスト</option></select></div>\n          <div><label>分析対象</label><select id="photoTarget"><option>中1英語</option><option>中2英語</option><option>中3英語</option></select></div>\n        </div>\n        <div class="btns" style="margin-top:14px">\n          <button id="copyPromptBtn" class="primary">分析用プロンプトをコピー</button>\n          <button id="applyResponseBtn">返答をレポートへ反映</button>\n          <button id="openReportBtn">レポートを開く</button>\n        </div>\n        <div id="photoStatus" class="status">旧</div>\n        <div class="resultBox"><label>分析用プロンプト</label><textarea id="photoPrompt" style="min-height:180px"></textarea></div>\n        <div class="resultBox"><label>チャッピーの返答を貼る</label><textarea id="photoResponse" style="min-height:240px" placeholder="見出しつきの返答をそのまま貼ってください。"></textarea>\n        </div>\n</body></html>`;
  const once=patchHtml(fixture); const twice=patchHtml(once);
  if(once!==twice) throw new Error('v2 patch not idempotent');
  if(!once.includes("['chatgpt.com', 'chat.openai.com'].includes(url.hostname)")) throw new Error('host gate missing');
  if(!once.includes("/^\\/g\\/[A-Za-z0-9_-]+/.test(url.pathname)")) throw new Error('/g/ gate missing');
  console.log('PASS patch_mikami_answer_gpt_handoff_v2 self-test');
}

function runCli(){
  const args=process.argv.slice(2);
  if(args.includes('--self-test')) return selfTest();
  const [input,output]=args;
  if(!input||!output){console.error(`Usage: node ${path.basename(process.argv[1])} <input.html> <output.html> | --self-test`);process.exit(2)}
  const source=fs.readFileSync(input,'utf8');
  const patched=patchHtml(source);
  fs.writeFileSync(output,patched,'utf8');
  console.log(JSON.stringify({status:'PASS',version:2,input,output,custom_gpt_url_gate:'chatgpt-host-plus-g-path'},null,2));
}

const direct=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(direct) runCli();
