import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const PAGE_MAP_GZIP_B64 = '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';
const pageMap = JSON.parse(zlib.gunzipSync(Buffer.from(PAGE_MAP_GZIP_B64, 'base64')).toString('utf8'));
const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');

function findData(src) {
  const m = /\b(?:const|let|var)\s+DATA\s*=\s*/g.exec(src);
  if (!m) throw new Error('DATA declaration not found');
  let start = m.index + m[0].length;
  while (/\s/.test(src[start] || '')) start++;
  if (src[start] !== '[') throw new Error('DATA array start missing');
  let depth=0, quote='', esc=false, line=false, block=false;
  for (let i=start;i<src.length;i++) {
    const c=src[i], n=src[i+1];
    if (line) { if (c==='\n') line=false; continue; }
    if (block) { if (c==='*'&&n==='/') { block=false; i++; } continue; }
    if (quote) { if (esc) { esc=false; continue; } if (c==='\\') { esc=true; continue; } if (c===quote) quote=''; continue; }
    if (c==='/'&&n==='/') { line=true; i++; continue; }
    if (c==='/'&&n==='*') { block=true; i++; continue; }
    if (c==='"'||c==="'"||c==='`') { quote=c; continue; }
    if (c==='[') depth++;
    else if (c===']') { depth--; if (depth===0) return {start,end:i}; }
  }
  throw new Error('DATA array end missing');
}

const loc=findData(html);
const data=vm.runInNewContext(`(${html.slice(loc.start,loc.end+1)})`, Object.create(null), {timeout:5000});
const textbook=data.filter(r=>r&&r.dataset==='textbook');
if (textbook.length!==3975 || pageMap.pages.length!==3975) throw new Error(`textbook/page count mismatch ${textbook.length}/${pageMap.pages.length}`);
const ids=textbook.map(r=>[String(r.textbook??''),String(r.grade??'').replace('.0',''),String(r.major_unit??''),String(r.section??''),String(r.english??''),String(r.japanese??''),String(r.kana??'')]);
const identityHash=crypto.createHash('sha256').update(JSON.stringify(ids),'utf8').digest('hex');
if (identityHash!==pageMap.identity_sha256) throw new Error(`canonical identity mismatch ${identityHash} != ${pageMap.identity_sha256}`);
const nonTextBefore=crypto.createHash('sha256').update(JSON.stringify(data.filter(r=>r?.dataset!=='textbook'))).digest('hex');
let ti=0;
for (const r of data) {
  if (r?.dataset!=='textbook') continue;
  const [ps,pe,display]=pageMap.pages[ti++];
  r.page_start=ps;
  r.page_end=pe;
  r.textbook_page=display;
}
const nonTextAfter=crypto.createHash('sha256').update(JSON.stringify(data.filter(r=>r?.dataset!=='textbook'))).digest('hex');
if (nonTextBefore!==nonTextAfter) throw new Error('non-textbook data changed');
html=html.slice(0,loc.start)+JSON.stringify(data)+html.slice(loc.end+1);

const posDetail='<details><summary>品詞 <span class="meta" id="posMeta"></span></summary><div class="checklist" id="posBox"></div></details>';
const pageUi=`${posDetail}\n        <div class="section" id="textbookPageFilter" style="border:1px solid var(--line);border-radius:12px;padding:10px;background:#fafbfc;margin-bottom:8px">\n          <div style="font-weight:700;margin-bottom:8px">教科書ページ</div>\n          <div class="page-range-row" style="display:flex;align-items:center;gap:7px;flex-wrap:nowrap">\n            <span>p.</span><input id="pageStartInput" type="number" min="1" inputmode="numeric" placeholder="開始" aria-label="開始ページ" style="width:92px;min-width:0;padding:8px;border:1px solid var(--line);border-radius:10px;background:#fff">\n            <span>〜 p.</span><input id="pageEndInput" type="number" min="1" inputmode="numeric" placeholder="終了" aria-label="終了ページ" style="width:92px;min-width:0;padding:8px;border:1px solid var(--line);border-radius:10px;background:#fff">\n          </div>\n          <div class="smallnote" style="margin-top:6px">例：34〜41ページ。片方だけでも指定できます。</div>\n        </div>`;
if (!html.includes('id="pageStartInput"')) {
  if (!html.includes(posDetail)) throw new Error('textbook POS filter markup not found');
  html=html.replace(posDetail,pageUi);
}

const elNeedle="  pdfPreviewBtn: document.getElementById('pdfPreviewBtn'),";
if (!html.includes("pageStartInput: document.getElementById('pageStartInput')")) {
  if (!html.includes(elNeedle)) throw new Error('els insertion point missing');
  html=html.replace(elNeedle,`${elNeedle}\n  pageStartInput: document.getElementById('pageStartInput'),\n  pageEndInput: document.getElementById('pageEndInput'),`);
}

const helpers=`function textbookPageRangeValues() {\n  const sRaw = String(els.pageStartInput?.value ?? '').trim();\n  const eRaw = String(els.pageEndInput?.value ?? '').trim();\n  let start = sRaw ? Number(sRaw) : -Infinity;\n  let end = eRaw ? Number(eRaw) : Infinity;\n  if (!Number.isFinite(start) && start !== -Infinity) start = -Infinity;\n  if (!Number.isFinite(end) && end !== Infinity) end = Infinity;\n  if (start !== -Infinity && end !== Infinity && start > end) [start,end] = [end,start];\n  return {start,end,active:!!(sRaw||eRaw),sRaw,eRaw};\n}\nfunction matchesTextbookPageRange(r) {\n  const q = textbookPageRangeValues();\n  if (!q.active) return true;\n  if (r.page_start == null && r.page_end == null) return false;\n  const rs = Number(r.page_start ?? r.page_end);\n  const re = Number(r.page_end ?? r.page_start);\n  if (!Number.isFinite(rs) || !Number.isFinite(re)) return false;\n  return rs <= q.end && re >= q.start;\n}\nfunction textbookPageRangeLabel() {\n  const q = textbookPageRangeValues();\n  if (!q.active) return '';\n  if (q.sRaw && q.eRaw) return 'p.' + Math.min(Number(q.sRaw),Number(q.eRaw)) + '〜' + Math.max(Number(q.sRaw),Number(q.eRaw));\n  if (q.sRaw) return 'p.' + q.sRaw + '〜';\n  return 'p.〜' + q.eRaw;\n}\n`;
if (!html.includes('function matchesTextbookPageRange')) {
  const needle='function filteredRows() {';
  if (!html.includes(needle)) throw new Error('filteredRows insertion point missing');
  html=html.replace(needle,helpers+needle);
}

if (!html.includes('matchesTextbookPageRange(r) &&')) {
  const needle='      matches(state.filters.section, r.section) &&\n      matches(state.filters.pos, r.pos) &&';
  if (!html.includes(needle)) throw new Error('textbook filter chain missing');
  html=html.replace(needle,'      matches(state.filters.section, r.section) &&\n      matches(state.filters.pos, r.pos) &&\n      matchesTextbookPageRange(r) &&');
}

if (!html.includes('/* textbook-page-range-events */')) {
  const needle='[els.qCount, els.quizMode, els.starQuizRule].forEach(sel => {';
  if (!html.includes(needle)) throw new Error('page event insertion point missing');
  const events=`/* textbook-page-range-events */\n[els.pageStartInput, els.pageEndInput].forEach(input => {\n  if (input) input.addEventListener('input', () => { clearCurrentTest(); refresh(); });\n});\n`;
  html=html.replace(needle,events+needle);
}

if (!html.includes("const pageRange = textbookPageRangeLabel();")) {
  const old="    return `${textbooks}｜${grades}｜${sections}`;";
  if (!html.includes(old)) throw new Error('print range return missing');
  html=html.replace(old,"    const pageRange = textbookPageRangeLabel();\n    return `${textbooks}｜${grades}｜${sections}${pageRange ? '｜' + pageRange : ''}`;");
}

const checkLoc=findData(html);
const patched=vm.runInNewContext(`(${html.slice(checkLoc.start,checkLoc.end+1)})`, Object.create(null), {timeout:5000});
const patchedText=patched.filter(r=>r?.dataset==='textbook');
const tagged=patchedText.filter(r=>r.page_start!=null||r.page_end!=null).length;
const blank=patchedText.length-tagged;
if (patched.length!==4613 || patchedText.length!==3975 || tagged!==3773 || blank!==202) throw new Error(`post counts bad total=${patched.length} textbook=${patchedText.length} tagged=${tagged} blank=${blank}`);
for (const marker of ['id="pageStartInput"','id="pageEndInput"','function matchesTextbookPageRange','matchesTextbookPageRange(r) &&','textbook-page-range-events','const pageRange = textbookPageRangeLabel();']) if (!html.includes(marker)) throw new Error('missing marker '+marker);

fs.writeFileSync(path,html,'utf8');
fs.mkdirSync('audit',{recursive:true});
const audit={status:'pass',source:pageMap.source,source_sheet:pageMap.sheet,total_count:patched.length,textbook_count:patchedText.length,page_tagged_count:tagged,page_blank_count:blank,identity_sha256:identityHash,non_textbook_sha256_unchanged:true,ui:'教科書ページ p.開始〜p.終了',behavior:['一覧へ反映','テスト作成へ反映','暗記プリントへ反映','片側だけの範囲指定','ページ不明語はページ指定時のみ除外'],checked_at_utc:new Date().toISOString()};
fs.writeFileSync('audit/TEXTBOOK_PAGE_FILTER_PATCH.json',JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify(audit,null,2));
