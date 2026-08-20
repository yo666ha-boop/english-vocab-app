#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const MARKER = 'mikami-answer-gpt-handoff-v1';

function replacementBlock() {
  return `        <div class="row2" style="margin-top:12px">
          <div><label>写真の種類</label><select id="photoType"><option>みかみ塾オリジナル問題</option><option>学校テスト</option></select></div>
          <div><label>分析対象</label><select id="photoTarget"><option>中1英語</option><option>中2英語</option><option>中3英語</option></select></div>
        </div>
        <div class="resultBox" style="background:#eff6ff;border-color:#bfdbfe">
          <strong>新方式：答案写真は答案分析My GPTへ直接送ります。</strong>
          <div class="note" style="margin-top:6px">問題プリントには問題IDが印刷されるため、My GPT側でKnowledgeと完全一致照合します。アプリへ返答を貼り戻す必要はありません。</div>
        </div>
        <div class="btns" style="margin-top:14px">
          <button id="openAnswerGptBtn" class="primary">答案分析My GPTを開く</button>
          <button id="copyAnswerGptHandoffBtn">分析情報をコピー</button>
          <button id="setAnswerGptUrlBtn">My GPTリンク設定</button>
        </div>
        <div id="answerGptStatus" class="status">My GPTを開き、答案写真を直接送ってください。必要なときだけ「分析情報をコピー」を使います。</div>

        <details id="legacyPhotoAnalysisFallback" style="margin-top:16px">
          <summary style="cursor:pointer;font-weight:700">旧方式（予備）</summary>
          <div class="resultBox" style="margin-top:10px">
            <label>旧方式用：テストの写真</label>
            <input id="photoInput" type="file" accept="image/*">
            <div class="btns" style="margin-top:14px">
              <button id="copyPromptBtn">分析用プロンプトをコピー</button>
              <button id="applyResponseBtn">返答をレポートへ反映</button>
              <button id="openReportBtn">レポートを開く</button>
            </div>
            <div id="photoStatus" class="status">旧方式は予備です。My GPT実運用確認が終わるまで復旧用として残します。</div>
            <div class="resultBox">
              <label>分析用プロンプト</label>
              <textarea id="photoPrompt" style="min-height:180px"></textarea>
            </div>
            <div class="resultBox">
              <label>チャッピーの返答を貼る</label>
              <textarea id="photoResponse" style="min-height:240px" placeholder="見出しつきの返答をそのまま貼ってください。"></textarea>
            </div>
          </div>
        </details>`;
}

function handoffScript() {
  return `\n<script id="${MARKER}">\n(() => {\n  const GPT_URL_KEY = 'mikamijuku_answer_gpt_url_v1';\n  const byId = id => document.getElementById(id);\n\n  function sourceMode(){\n    const value = byId('photoType')?.value || '';\n    return value.includes('オリジナル') ? 'mikami_canonical' : 'school_test';\n  }\n\n  function buildHandoff(){\n    const ids = (typeof currentQuestions !== 'undefined' && Array.isArray(currentQuestions))\n      ? currentQuestions.map(q => q && q.id).filter(Boolean)\n      : [];\n    return {\n      schema_version: 'mikami-answer-gpt-handoff-v1',\n      source_mode: sourceMode(),\n      target: byId('photoTarget')?.value || null,\n      question_ids: ids,\n      question_count: ids.length,\n      usage: '答案写真はMy GPTへ直接添付。問題IDが見える場合はKnowledgeと完全一致で照合する。'\n    };\n  }\n\n  async function copyTextSafe(text){\n    try {\n      if (navigator.clipboard && window.isSecureContext) {\n        await navigator.clipboard.writeText(text);\n        return true;\n      }\n      const ta = document.createElement('textarea');\n      ta.value = text;\n      ta.style.position = 'fixed';\n      ta.style.opacity = '0';\n      document.body.appendChild(ta);\n      ta.select();\n      const ok = document.execCommand('copy');\n      ta.remove();\n      return ok;\n    } catch (_) { return false; }\n  }\n\n  function status(message, good=false){\n    const node = byId('answerGptStatus');\n    if (!node) return;\n    node.textContent = message;\n    node.classList.toggle('good', !!good);\n  }\n\n  function normalizeGptUrl(raw){\n    const value = String(raw || '').trim();\n    if (!value) return '';\n    try {\n      const url = new URL(value);\n      if (url.protocol !== 'https:') return '';\n      return url.href;\n    } catch (_) { return ''; }\n  }\n\n  function configureUrl(){\n    const current = localStorage.getItem(GPT_URL_KEY) || '';\n    const entered = window.prompt('答案分析My GPTの共有URLを貼り付けてください。', current);\n    if (entered === null) return '';\n    const normalized = normalizeGptUrl(entered);\n    if (!normalized) {\n      status('有効な https:// のMy GPT共有URLを設定してください。');\n      return '';\n    }\n    localStorage.setItem(GPT_URL_KEY, normalized);\n    status('答案分析My GPTのリンクを保存しました。', true);\n    return normalized;\n  }\n\n  byId('setAnswerGptUrlBtn')?.addEventListener('click', () => configureUrl());\n\n  byId('copyAnswerGptHandoffBtn')?.addEventListener('click', async () => {\n    const payload = JSON.stringify(buildHandoff(), null, 2);\n    const ok = await copyTextSafe(payload);\n    status(ok\n      ? '分析情報をコピーしました。答案写真はMy GPT側へ直接添付してください。'\n      : 'コピーできませんでした。ブラウザのクリップボード権限を確認してください。', ok);\n  });\n\n  byId('openAnswerGptBtn')?.addEventListener('click', async () => {\n    let url = normalizeGptUrl(localStorage.getItem(GPT_URL_KEY));\n    if (!url) url = configureUrl();\n    if (!url) return;\n    const opened = window.open(url, '_blank', 'noopener');\n    const payload = JSON.stringify(buildHandoff(), null, 2);\n    const copied = await copyTextSafe(payload);\n    if (!opened) {\n      status('My GPTを開けませんでした。ポップアップを許可してください。');\n      return;\n    }\n    status(copied\n      ? 'My GPTを開きました。問題セット情報もコピー済みです。答案写真をMy GPTへ直接送ってください。'\n      : 'My GPTを開きました。答案写真をMy GPTへ直接送ってください。', true);\n  });\n})();\n<\\/script>\n`;
}

export function patchHtml(source){
  if (source.includes(`id="${MARKER}"`)) return source;

  const start = source.indexOf('        <label>テストの写真</label>');
  const endNeedle = '          <textarea id="photoResponse" style="min-height:240px" placeholder="見出しつきの返答をそのまま貼ってください。"></textarea>\n        </div>';
  const endAt = source.indexOf(endNeedle, start);
  if (start < 0 || endAt < 0) {
    throw new Error('legacy photo-analysis block not found; refusing to patch an unknown HTML');
  }
  const end = endAt + endNeedle.length;
  let out = source.slice(0, start) + replacementBlock() + source.slice(end);

  const bodyClose = out.lastIndexOf('</body>');
  if (bodyClose < 0) throw new Error('</body> not found');
  out = out.slice(0, bodyClose) + handoffScript() + out.slice(bodyClose);

  for (const required of [
    'id="openAnswerGptBtn"',
    'id="copyAnswerGptHandoffBtn"',
    'id="setAnswerGptUrlBtn"',
    'id="legacyPhotoAnalysisFallback"',
    'id="copyPromptBtn"',
    'id="applyResponseBtn"',
    'id="photoPrompt"',
    'id="photoResponse"',
    `id="${MARKER}"`,
    "question_ids: ids"
  ]) {
    if (!out.includes(required)) throw new Error('patched output missing marker: ' + required);
  }
  if (out.includes('mikami_english_question_bank_knowledge.jsonl')) {
    throw new Error('private Knowledge filename unexpectedly embedded in app patch');
  }
  return out;
}

function selfTest(){
  const fixture = `<!doctype html><html><body>\n<div id="screen-photo" class="screen">\n        <label>テストの写真</label>\n        <input id="photoInput" type="file" accept="image/*">\n        <div class="row2" style="margin-top:12px">\n          <div><label>写真の種類</label><select id="photoType"><option>みかみ塾オリジナル問題</option><option>学校テスト</option></select></div>\n          <div><label>分析対象</label><select id="photoTarget"><option>中1英語</option><option>中2英語</option><option>中3英語</option></select></div>\n        </div>\n        <div class="btns" style="margin-top:14px">\n          <button id="copyPromptBtn" class="primary">分析用プロンプトをコピー</button>\n          <button id="applyResponseBtn">返答をレポートへ反映</button>\n          <button id="openReportBtn">レポートを開く</button>\n        </div>\n        <div id="photoStatus" class="status">旧</div>\n        <div class="resultBox">\n          <label>分析用プロンプト</label>\n          <textarea id="photoPrompt" style="min-height:180px"></textarea>\n        </div>\n        <div class="resultBox">\n          <label>チャッピーの返答を貼る</label>\n          <textarea id="photoResponse" style="min-height:240px" placeholder="見出しつきの返答をそのまま貼ってください。"></textarea>\n        </div>\n</div>\n</body></html>`;
  const once = patchHtml(fixture);
  const twice = patchHtml(once);
  if (once !== twice) throw new Error('patch is not idempotent');
  if (!once.includes('答案分析My GPTを開く')) throw new Error('new primary UI missing');
  if (!once.includes('旧方式（予備）')) throw new Error('fallback UI missing');
  if (!once.includes("source_mode: sourceMode()")) throw new Error('source mode missing');
  if (!once.includes("question_ids: ids")) throw new Error('question ID handoff missing');
  if (once.includes(' / 正答: ')) throw new Error('handoff patch must not add answers');
  console.log('PASS patch_mikami_answer_gpt_handoff self-test');
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  selfTest();
} else {
  const [input, output] = args;
  if (!input || !output) {
    console.error(`Usage: node ${path.basename(process.argv[1])} <input.html> <output.html> | --self-test`);
    process.exit(2);
  }
  const source = fs.readFileSync(input, 'utf8');
  const patched = patchHtml(source);
  fs.writeFileSync(output, patched, 'utf8');
  console.log(JSON.stringify({status:'PASS', input, output, changed: patched !== source, marker: MARKER}, null, 2));
}
