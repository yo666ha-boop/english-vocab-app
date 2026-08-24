#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const EXPECTED_BYTES=3812347;
const EXPECTED_SHA256='2ed299a025d416d8bcd4abd7b36bdbb2a2c6c247740645a7d3ba5fb8a1c9c1c0';
const EXPECTED_QB_SHA256='c00d3e798bcc64acec67f1d8d295c6bd136fb44712248e4872a3c576f15459ee';
const PRIVATE_KNOWLEDGE_NAME='mikami_english_question_bank_knowledge.jsonl';
const LEGACY_IDS=['photoInput','copyPromptBtn','applyResponseBtn','openReportBtn','photoPrompt','photoResponse'];
const V3_MARKER='mikami-answer-gpt-handoff-opener-v3';

function fail(msg){throw new Error(msg)}
function assert(c,msg){if(!c)fail(msg)}
function count(haystack,needle){let n=0,p=0;while((p=haystack.indexOf(needle,p))!==-1){n++;p+=needle.length}return n}
function sha256(buf){return crypto.createHash('sha256').update(buf).digest('hex')}

export function validateHtml(html,{requireExactArtifact=true,bytes=null,sha=null}={}){
  if(requireExactArtifact){
    assert(bytes===EXPECTED_BYTES,`public v3 bytes mismatch: ${bytes}`);
    assert(sha===EXPECTED_SHA256,`public v3 SHA256 mismatch: ${sha}`);
  }

  const primaryNeedle='<button id="openAnswerGptBtn" class="primary">答案分析My GPTを開く</button>';
  const primaryAt=html.indexOf(primaryNeedle);
  const fallbackNeedle='id="legacyPhotoAnalysisFallback"';
  const fallbackIdAt=html.indexOf(fallbackNeedle);
  const detailsOpenAt=html.lastIndexOf('<details',fallbackIdAt);
  const detailsOpenEnd=html.indexOf('>',detailsOpenAt);
  const fallbackCloseAt=html.indexOf('</details>',fallbackIdAt);
  assert(primaryAt>=0,'primary My GPT CTA missing or not primary-styled');
  assert(fallbackIdAt>=0&&detailsOpenAt>=0&&detailsOpenEnd>detailsOpenAt&&fallbackCloseAt>fallbackIdAt,'legacy fallback details missing');
  assert(primaryAt<detailsOpenAt,'My GPT CTA must precede legacy fallback');
  const detailsOpeningTag=html.slice(detailsOpenAt,detailsOpenEnd+1);
  assert(!/\sopen(?:\s|>)/i.test(detailsOpeningTag),'legacy fallback must be collapsed by default');
  assert(html.includes('<summary style="cursor:pointer;font-weight:700">旧方式（予備）</summary>'),'legacy fallback must be explicitly labeled 旧方式（予備）');
  assert(html.includes('新方式：答案写真は答案分析My GPTへ直接送ります。'),'direct-to-My-GPT primary instruction missing');
  assert(html.includes('アプリへ返答を貼り戻す必要はありません。'),'no-paste-back primary instruction missing');
  assert(html.includes('My GPTを開き、答案写真を直接送ってください。必要なときだけ「分析情報をコピー」を使います。'),'primary status must say copy handoff is optional');

  const fallback=html.slice(detailsOpenAt,fallbackCloseAt+'</details>'.length);
  for(const id of LEGACY_IDS){
    const needle=`id="${id}"`;
    assert(count(html,needle)===1,`${id} must exist exactly once`);
    assert(fallback.includes(needle),`${id} escaped legacy fallback`);
  }
  assert(fallback.includes('旧方式用：テストの写真'),'legacy photo input must be explicitly labeled old-method-only');
  assert(fallback.includes('旧方式は予備です。My GPT実運用確認が終わるまで復旧用として残します。'),'legacy fallback purpose text missing');
  assert(!html.includes('        <label>テストの写真</label>'),'unqualified legacy photo label escaped fallback conversion');

  assert(count(html,'id="openAnswerGptBtn"')===1,'primary My GPT CTA must exist exactly once');
  assert(count(html,'id="copyAnswerGptHandoffBtn"')===1,'handoff-copy button must exist exactly once');
  assert(count(html,'id="setAnswerGptUrlBtn"')===1,'GPT URL settings button must exist exactly once');
  assert(count(html,'id="mikami-answer-gpt-handoff-v1"')===1,'handoff runtime script must exist exactly once');
  assert(count(html,V3_MARKER)===1,'v3 opener-fix marker must exist exactly once');
  assert(html.includes("['chatgpt.com', 'chat.openai.com'].includes(url.hostname)"),'ChatGPT hostname gate missing');
  assert(html.includes("/^\\/g\\/[A-Za-z0-9_-]+/.test(url.pathname)"),'Custom GPT /g/ path gate missing');
  assert(html.includes("question_ids: ids"),'question ID handoff missing');
  assert(html.includes("source_mode: sourceMode()"),'source-mode handoff missing');
  assert(html.includes("usage: '答案写真はMy GPTへ直接添付。問題IDが見える場合はKnowledgeと完全一致で照合する。'"),'direct-photo handoff usage missing');

  assert(html.includes('function openMyGptNoOpener(url){'),'v3 safe opener helper missing');
  assert(html.includes("link.target = '_blank';"),'v3 opener target=_blank missing');
  assert(html.includes("link.rel = 'noopener';"),'v3 opener rel=noopener missing');
  assert(html.includes('openMyGptNoOpener(url);'),'v3 opener invocation missing');
  assert(!html.includes("window.open(url, '_blank', 'noopener')"),'old noopener return-value opener pattern must be absent');
  assert(!html.includes('if (!opened)'),'old false popup-failure branch must be absent');
  assert(!html.includes(PRIVATE_KNOWLEDGE_NAME),'private Knowledge filename must not be embedded in public app');

  const qbOpen='<script id="qb-data" type="application/json">';
  assert(count(html,qbOpen)===1,'qb-data script must exist exactly once');
  const qbAt=html.indexOf(qbOpen);
  const qbClose=html.indexOf('</script>',qbAt+qbOpen.length);
  assert(qbClose>qbAt,'qb-data closing tag missing');
  const qbRaw=html.slice(qbAt+qbOpen.length,qbClose);
  assert(Buffer.byteLength(qbRaw,'utf8')>1000000,'qb-data payload unexpectedly small');
  if(requireExactArtifact) assert(sha256(Buffer.from(qbRaw,'utf8'))===EXPECTED_QB_SHA256,'qb-data SHA256 mismatch');

  return {
    status:'PASS',
    artifact_version:'v3-opener-fix',
    exact_artifact:requireExactArtifact,
    bytes:bytes??Buffer.byteLength(html,'utf8'),
    sha256:sha??sha256(Buffer.from(html,'utf8')),
    qb_data_sha256:sha256(Buffer.from(qbRaw,'utf8')),
    my_gpt_primary:true,
    legacy_fallback_collapsed:true,
    legacy_controls_inside_fallback:true,
    direct_photo_to_my_gpt:true,
    paste_back_not_required:true,
    optional_handoff_copy:true,
    chatgpt_host_gate:true,
    custom_gpt_g_path_gate:true,
    noopener_false_failure_fixed:true,
    safe_anchor_noopener_opener:true,
    private_knowledge_embedded:false,
    vocabulary_root_touched:false
  };
}

function selfTest(){
  const primary='<div>新方式：答案写真は答案分析My GPTへ直接送ります。 アプリへ返答を貼り戻す必要はありません。</div><button id="openAnswerGptBtn" class="primary">答案分析My GPTを開く</button><button id="copyAnswerGptHandoffBtn">分析情報をコピー</button><button id="setAnswerGptUrlBtn">My GPTリンク設定</button><div>My GPTを開き、答案写真を直接送ってください。必要なときだけ「分析情報をコピー」を使います。</div>';
  const fallback='<details id="legacyPhotoAnalysisFallback" style="margin-top:16px"><summary style="cursor:pointer;font-weight:700">旧方式（予備）</summary><label>旧方式用：テストの写真</label><input id="photoInput"><button id="copyPromptBtn"></button><button id="applyResponseBtn"></button><button id="openReportBtn"></button><div>旧方式は予備です。My GPT実運用確認が終わるまで復旧用として残します。</div><textarea id="photoPrompt"></textarea><textarea id="photoResponse"></textarea></details>';
  const runtime='<script id="mikami-answer-gpt-handoff-v1">const x=1; [\'chatgpt.com\', \'chat.openai.com\'].includes(url.hostname); /^\\/g\\/[A-Za-z0-9_-]+/.test(url.pathname); question_ids: ids; source_mode: sourceMode(); usage: \'答案写真はMy GPTへ直接添付。問題IDが見える場合はKnowledgeと完全一致で照合する。\'; function openMyGptNoOpener(url){ const link={}; link.target = \'_blank\'; link.rel = \'noopener\'; } openMyGptNoOpener(url); // mikami-answer-gpt-handoff-opener-v3</script>';
  const qb='<script id="qb-data" type="application/json">'+('x'.repeat(1000001))+'</script>';
  const good=primary+fallback+runtime+qb;
  validateHtml(good,{requireExactArtifact:false});
  const mutations=[
    x=>x.replace(' class="primary"',''),
    x=>x.replace('<details id="legacyPhotoAnalysisFallback"','<details open id="legacyPhotoAnalysisFallback"'),
    x=>x.replace(fallback, '<input id="photoInput">'+fallback.replace('<input id="photoInput">','')),
    x=>x.replace('アプリへ返答を貼り戻す必要はありません。',''),
    x=>x.replace("['chatgpt.com', 'chat.openai.com'].includes(url.hostname)", 'true'),
    x=>x.replace('旧方式（予備）','旧方式'),
    x=>x.replace(V3_MARKER,'v3-marker-removed'),
    x=>x.replace("link.rel = 'noopener';","link.rel = 'opener';"),
    x=>x.replace('openMyGptNoOpener(url);',"window.open(url, '_blank', 'noopener'); if (!opened){}")
  ];
  let rejected=0;
  for(const mutate of mutations){try{validateHtml(mutate(good),{requireExactArtifact:false})}catch{rejected++}}
  assert(rejected===mutations.length,`negative cases rejected ${rejected}/${mutations.length}`);
  console.log('PASS_MIKAMI_PROBLEM_APP_UI_CONTRACT_V3_SELF_TEST');
  console.log(`NEGATIVE_CASES_REJECTED=${rejected}`);
  console.log('NOOPENER_FALSE_FAILURE_FIXED_REQUIRED=true');
}

try{
  const args=process.argv.slice(2);
  if(args.includes('--self-test')) selfTest();
  else {
    const file=args[0];
    assert(file,'Usage: node tools/validate_mikami_problem_app_ui_contract.mjs <problem-app.html> | --self-test');
    const raw=fs.readFileSync(file);
    const html=raw.toString('utf8');
    const result=validateHtml(html,{bytes:raw.length,sha:sha256(raw)});
    console.log(JSON.stringify(result,null,2));
  }
}catch(e){console.error('MIKAMI_PROBLEM_APP_UI_CONTRACT=FAIL');console.error(e?.message||String(e));process.exit(1)}
