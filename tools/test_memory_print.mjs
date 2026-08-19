import fs from 'node:fs';
import { chromium } from 'playwright';

const pageUrl = process.env.PAGE_URL || 'https://yo666ha-boop.github.io/english-vocab-app/';
const indexSha = process.env.INDEX_SHA || '';
const status = {
  status: 'running',
  page_url: pageUrl,
  index_sha256: indexSha,
  engine: 'Chromium (Edge-equivalent)',
  checks: {},
  checked_at_utc: ''
};

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('.title', { hasText: '英単語アプリ（統合版）' }).waitFor({ timeout: 15000 });
  status.checks.page_loaded = true;

  await page.evaluate(() => {
    window.__alerts = [];
    window.__printCalled = 0;
    window.alert = m => window.__alerts.push(String(m));
    window.print = () => { window.__printCalled++; };
  });

  const initialCount = await page.evaluate(() => state.currentList.length);
  status.initial_current_list_count = initialCount;
  if (initialCount <= 300) throw new Error(`expected default selection >300, got ${initialCount}`);

  const t0 = Date.now();
  await page.locator('#memoryPrintBtn').click();
  await page.waitForTimeout(120);
  const guardMs = Date.now() - t0;
  const guard = await page.evaluate(() => ({ alerts: window.__alerts.slice(), prints: window.__printCalled }));
  status.guard_ms = guardMs;
  status.guard_message = guard.alerts[0] || '';
  if (guardMs > 2500) throw new Error(`default click too slow: ${guardMs}ms`);
  if (guard.prints !== 0) throw new Error('default full selection unexpectedly invoked print');
  if (!guard.alerts.some(x => x.includes('300 語以下'))) throw new Error(`safety guidance missing: ${JSON.stringify(guard)}`);
  status.checks.default_full_selection_returns_quickly = true;
  status.checks.default_full_selection_does_not_open_print = true;
  status.checks.large_selection_guidance = true;

  // Bypass only the safety gate to measure whether the new pagination itself can
  // render the user's full default 662-word range through Chromium's print engine.
  await page.evaluate(() => {
    state.dataset = 'textbook';
    const defaultRows = state.currentList.length;
    const source = DATA.filter(r => r.dataset === 'textbook');
    state.currentList = source.slice(0, defaultRows);
    const sheet = document.getElementById('printSheet');
    sheet.innerHTML = buildMemoryPrintHtml();
    document.body.classList.remove('test-print','answer-print','memory-print','answer-sheet');
    document.body.classList.add('print-sheet');
  });
  const fullLayout = await page.evaluate(() => ({
    rows: document.querySelectorAll('#printSheet .rb-mem-row').length,
    pages: document.querySelectorAll('#printSheet .rb-memory-page').length,
    maxRowsOnPage: Math.max(...[...document.querySelectorAll('#printSheet .rb-memory-page')].map(p => p.querySelectorAll('.rb-mem-row').length))
  }));
  status.full_default_layout = fullLayout;
  if (fullLayout.rows !== initialCount) throw new Error(`full layout row count mismatch: ${JSON.stringify(fullLayout)}`);
  if (fullLayout.pages !== Math.ceil(initialCount / 18)) throw new Error(`full layout page count mismatch: ${JSON.stringify(fullLayout)}`);
  if (fullLayout.maxRowsOnPage > 18) throw new Error(`full layout exceeds 18 rows/page: ${JSON.stringify(fullLayout)}`);

  await page.emulateMedia({ media: 'print' });
  const pdfStart = Date.now();
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  const pdfMs = Date.now() - pdfStart;
  status.full_default_pdf = { render_ms: pdfMs, bytes: pdf.length };
  if (pdfMs > 30000) throw new Error(`full default PDF render too slow: ${pdfMs}ms`);
  if (pdf.length < 100000) throw new Error(`full default PDF unexpectedly small: ${pdf.length}`);
  status.checks.full_default_662_paginated_layout = true;
  status.checks.full_default_print_engine_render = true;

  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => {
    document.body.classList.remove('test-print','answer-print','memory-print','print-sheet','answer-sheet');
    state.dataset = 'textbook';
    state.currentList = DATA.filter(r => r.dataset === 'textbook').slice(0, 45);
    window.__alerts = [];
    window.__printCalled = 0;
  });
  await page.locator('#memoryPrintBtn').click();
  await page.waitForFunction(() => window.__printCalled === 1, null, { timeout: 10000 });
  const textbook = await page.evaluate(() => ({
    pages: document.querySelectorAll('#printSheet .rb-memory-page').length,
    rows: [...document.querySelectorAll('#printSheet .rb-memory-page')].map(p => p.querySelectorAll('.rb-mem-row').length),
    prints: window.__printCalled
  }));
  status.textbook_45 = textbook;
  if (textbook.pages !== 3) throw new Error(`45 rows should make 3 pages: ${JSON.stringify(textbook)}`);
  if (textbook.rows.join(',') !== '18,18,9') throw new Error(`wrong pagination: ${JSON.stringify(textbook)}`);
  if (textbook.prints !== 1) throw new Error('safe selection print was not invoked exactly once');
  status.checks.textbook_45_paginated_18_18_9 = true;
  status.checks.print_invoked_for_safe_selection = true;

  await page.evaluate(() => {
    document.body.classList.remove('test-print','answer-print','memory-print','print-sheet','answer-sheet');
    state.dataset = 'elementary';
    state.currentList = DATA.filter(r => r.dataset === 'elementary').slice(0, 20);
    window.__alerts = [];
    window.__printCalled = 0;
  });
  await page.locator('#memoryPrintBtn').click();
  await page.waitForFunction(() => window.__printCalled === 1, null, { timeout: 10000 });
  const elementary = await page.evaluate(() => ({
    pages: document.querySelectorAll('#printSheet .rb-memory-page').length,
    firstHeading: document.querySelector('#printSheet .rb-memory-group h3')?.textContent?.trim() || ''
  }));
  status.elementary_20 = elementary;
  if (elementary.pages !== 2) throw new Error(`20 elementary rows should make 2 pages: ${JSON.stringify(elementary)}`);
  if (!elementary.firstHeading || elementary.firstHeading === 'その他') throw new Error(`elementary group heading broken: ${elementary.firstHeading}`);
  status.checks.elementary_group_heading_fixed = true;

  status.status = 'pass';
} catch (error) {
  status.status = 'fail';
  status.error = String(error?.stack || error);
  process.exitCode = 1;
} finally {
  status.checked_at_utc = new Date().toISOString();
  fs.mkdirSync('audit', { recursive: true });
  fs.writeFileSync('audit/MEMORY_PRINT_SMOKE.json', JSON.stringify(status, null, 2) + '\n');
  console.log(JSON.stringify(status, null, 2));
  if (browser) await browser.close();
}
