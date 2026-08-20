#!/usr/bin/env node
import {patchHtml} from './patch_mikami_answer_gpt_handoff.mjs';

const fixture = `<!doctype html><html><body>
<div id="screen-photo" class="screen">
        <label>テストの写真</label>
        <input id="photoInput" type="file" accept="image/*">
        <div class="row2" style="margin-top:12px">
          <div><label>写真の種類</label><select id="photoType"><option>みかみ塾オリジナル問題</option><option>学校テスト</option></select></div>
          <div><label>分析対象</label><select id="photoTarget"><option>中1英語</option><option>中2英語</option><option>中3英語</option></select></div>
        </div>
        <div class="btns" style="margin-top:14px">
          <button id="copyPromptBtn" class="primary">分析用プロンプトをコピー</button>
          <button id="applyResponseBtn">返答をレポートへ反映</button>
          <button id="openReportBtn">レポートを開く</button>
        </div>
        <div id="photoStatus" class="status">旧</div>
        <div class="resultBox"><label>分析用プロンプト</label><textarea id="photoPrompt" style="min-height:180px"></textarea></div>
        <div class="resultBox"><label>チャッピーの返答を貼る</label><textarea id="photoResponse" style="min-height:240px" placeholder="見出しつきの返答をそのまま貼ってください。"></textarea></div>
</div>
</body></html>`;

const html = patchHtml(fixture);
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const openGptAt = html.indexOf('id="openAnswerGptBtn"');
const fallbackAt = html.indexOf('id="legacyPhotoAnalysisFallback"');
const fallbackCloseAt = html.indexOf('</details>', fallbackAt);
const photoInputAt = html.indexOf('id="photoInput"');

assert(openGptAt >= 0, 'primary My GPT open button missing');
assert(fallbackAt >= 0, 'legacy fallback missing');
assert(openGptAt < fallbackAt, 'My GPT must be the primary route before fallback');
assert(photoInputAt > fallbackAt && photoInputAt < fallbackCloseAt,
  'photo input must exist only inside legacy fallback');
assert(html.indexOf('id="photoInput"', photoInputAt + 1) === -1,
  'multiple photo inputs found');
assert(html.includes('答案写真はMy GPTへ直接添付'),
  'direct My GPT photo attachment instruction missing');
assert(html.includes("question_ids: ids"), 'question ID handoff missing');
assert(!html.includes('question_texts:'), 'question text must not be sent in primary handoff');
assert(!html.includes('correct_answers:'), 'answer key must not be sent in primary handoff');
assert(!html.includes('photo_base64:'), 'photo bytes must not be sent through app handoff');
assert(!html.includes('photo_file:'), 'photo file must not be sent through app handoff');
assert(!html.includes('image_data:'), 'image data must not be sent through app handoff');

console.log(JSON.stringify({
  status: 'PASS',
  photo_attachment_location: 'MY_GPT_ONLY',
  app_photo_analysis_primary: false,
  app_photo_input_scope: 'legacy_fallback_only',
  primary_handoff: ['source_mode','target','question_ids','question_count']
}, null, 2));
