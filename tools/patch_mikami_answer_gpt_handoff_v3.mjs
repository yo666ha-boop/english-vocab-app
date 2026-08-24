#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {patchHtml as patchV2} from './patch_mikami_answer_gpt_handoff_v2.mjs';

export const V3_MARKER='mikami-answer-gpt-handoff-opener-v3';

const OLD_BLOCK=`  byId('openAnswerGptBtn')?.addEventListener('click', async () => {\n    let url = normalizeGptUrl(localStorage.getItem(GPT_URL_KEY));\n    if (!url) url = configureUrl();\n    if (!url) return;\n    const opened = window.open(url, '_blank', 'noopener');\n    const payload = JSON.stringify(buildHandoff(), null, 2);\n    const copied = await copyTextSafe(payload);\n    if (!opened) {\n      status('My GPTを開けませんでした。ポップアップを許可してください。');\n      return;\n    }\n    status(copied\n      ? 'My GPTを開きました。問題セット情報もコピー済みです。答案写真をMy GPTへ直接送ってください。'\n      : 'My GPTを開きました。答案写真をMy GPTへ直接送ってください。', true);\n  });`;

const NEW_BLOCK=`  function openMyGptNoOpener(url){\n    const link = document.createElement('a');\n    link.href = url;\n    link.target = '_blank';\n    link.rel = 'noopener';\n    link.style.display = 'none';\n    document.body.appendChild(link);\n    link.click();\n    link.remove();\n  }\n\n  byId('openAnswerGptBtn')?.addEventListener('click', async () => {\n    let url = normalizeGptUrl(localStorage.getItem(GPT_URL_KEY));\n    if (!url) url = configureUrl();\n    if (!url) return;\n    openMyGptNoOpener(url);\n    const payload = JSON.stringify(buildHandoff(), null, 2);\n    const copied = await copyTextSafe(payload);\n    status(copied\n      ? 'My GPTを開きました。問題セット情報もコピー済みです。答案写真をMy GPTへ直接送ってください。'\n      : 'My GPTを開きました。答案写真をMy GPTへ直接送ってください。', true);\n  });\n  // ${V3_MARKER}`;

export function patchHtml(source){
  let out=patchV2(source);
  if(out.includes(V3_MARKER)) return out;
  if(!out.includes(OLD_BLOCK)) throw new Error('v2 My GPT opener block not found; refusing unknown artifact');
  out=out.replace(OLD_BLOCK,NEW_BLOCK);
  if(out.includes("window.open(url, '_blank', 'noopener')")) throw new Error('unsafe false-failure opener pattern still present');
  if(out.includes('if (!opened)')) throw new Error('false popup-failure branch still present');
  for(const required of [
    `link.target = '_blank'`,
    `link.rel = 'noopener'`,
    'openMyGptNoOpener(url);',
    V3_MARKER,
    "['chatgpt.com', 'chat.openai.com'].includes(url.hostname)",
    "/^\\/g\\/[A-Za-z0-9_-]+/.test(url.pathname)",
    'id="legacyPhotoAnalysisFallback"',
    'id="openAnswerGptBtn" class="primary"'
  ]) if(!out.includes(required)) throw new Error('v3 output missing: '+required);
  return out;
}

function selfTest(){
  const fixture=`<!doctype html><html><body>\n<div id="screen-photo" class="screen">\n        <label>テストの写真</label>\n        <input id="photoInput" type="file" accept="image/*">\n        <div class="row2" style="margin-top:12px">\n          <div><label>写真の種類</label><select id="photoType"><option>みかみ塾オリジナル問題</option><option>学校テスト</option></select></div>\n          <div><label>分析対象</label><select id="photoTarget"><option>中1英語</option><option>中2英語</option><option>中3英語</option></select></div>\n        </div>\n        <div class="btns" style="margin-top:14px">\n          <button id="copyPromptBtn" class="primary">分析用プロンプトをコピー</button>\n          <button id="applyResponseBtn">返答をレポートへ反映</button>\n          <button id="openReportBtn">レポートを開く</button>\n        </div>\n        <div id="photoStatus" class="status">旧</div>\n        <div class="resultBox">\n          <label>分析用プロンプト</label>\n          <textarea id="photoPrompt" style="min-height:180px"></textarea>\n        </div>\n        <div class="resultBox">\n          <label>チャッピーの返答を貼る</label>\n          <textarea id="photoResponse" style="min-height:240px" placeholder="見出しつきの返答をそのまま貼ってください。"></textarea>\n        </div>\n</div>\n</body></html>`;
  const once=patchHtml(fixture), twice=patchHtml(once);
  if(once!==twice) throw new Error('v3 patch not idempotent');
  if(once.includes("window.open(url, '_blank', 'noopener')")) throw new Error('old opener remains');
  if(once.includes('if (!opened)')) throw new Error('old false-failure branch remains');
  if(!once.includes(`link.rel = 'noopener'`)) throw new Error('noopener security missing');
  if(!once.includes('答案分析My GPTを開く')) throw new Error('primary CTA lost');
  if(!once.includes('旧方式（予備）')) throw new Error('legacy fallback lost');
  console.log('PASS patch_mikami_answer_gpt_handoff_v3 self-test');
  console.log('NOOPENER_FALSE_FAILURE_FIXED=true');
}

function runCli(){
  const args=process.argv.slice(2);
  if(args.includes('--self-test')) return selfTest();
  const [input,output]=args;
  if(!input||!output){console.error(`Usage: node ${path.basename(process.argv[1])} <input.html> <output.html> | --self-test`);process.exit(2)}
  const source=fs.readFileSync(input,'utf8');
  const patched=patchHtml(source);
  fs.writeFileSync(output,patched,'utf8');
  console.log(JSON.stringify({status:'PASS',version:3,input,output,changed:patched!==source,fix:'noopener-return-null-false-failure'},null,2));
}

const direct=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(direct) runCli();
