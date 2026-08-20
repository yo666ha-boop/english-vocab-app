#!/usr/bin/env node
import crypto from 'node:crypto';

const url = process.env.PROBLEM_APP_URL || process.argv[2] || 'https://mikami-juku-english-problem-app.vercel.app/';
const expectedSha = process.env.EXPECTED_HTML_SHA256 || '6c3c5c6e42939ee701667cc18cf07d10403afa063ece557ed3052c44c95e0c81';
const expectedBytes = Number(process.env.EXPECTED_HTML_BYTES || 3812063);
const privateKnowledgeSha = 'be820c3e4d5c26773d642f1c055fea33f2796d71b6fca16f4e1edf5efc6f9213';
const privateKnowledgeIds = [
  '1t51uacLDfzhv8gBsyi9H_czRnbGsuCaC',
  '1_F6scCbMtPK0jw0Hi9eExqstDz2vWahk'
];
const required = [
  'id="openAnswerGptBtn"',
  '答案分析My GPTを開く',
  'id="legacyPhotoAnalysisFallback"',
  '答案写真はMy GPTへ直接添付',
  'mikami-answer-gpt-handoff-v1',
  '<script id="qb-data" type="application/json">'
];

const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
const out = {url, expectedSha, expectedBytes, checkedAt: new Date().toISOString()};
let exitCode = 1;
try {
  const res = await fetch(url, {redirect: 'follow', headers: {'cache-control':'no-cache'}});
  const ab = await res.arrayBuffer();
  const body = Buffer.from(ab);
  const text = body.toString('utf8');
  out.httpStatus = res.status;
  out.contentType = res.headers.get('content-type') || '';
  out.bytes = body.length;
  out.sha256 = sha256(body);
  out.requiredMarkers = Object.fromEntries(required.map(x => [x, text.includes(x)]));
  out.privateKnowledgeLeak = text.includes(privateKnowledgeSha) || privateKnowledgeIds.some(x => text.includes(x));
  out.pathStringOnly = /^\s*\/mnt\/data\/.+\.html\s*$/.test(text);
  out.pass = res.ok && body.length === expectedBytes && out.sha256 === expectedSha &&
    Object.values(out.requiredMarkers).every(Boolean) && !out.privateKnowledgeLeak && !out.pathStringOnly;
  exitCode = out.pass ? 0 : 1;
} catch (err) {
  out.pass = false;
  out.error = String(err?.stack || err);
}
console.log(JSON.stringify(out, null, 2));
process.exit(exitCode);
