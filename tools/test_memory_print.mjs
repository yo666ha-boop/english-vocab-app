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
  if (initialCount !== 662) throw new Error(`expected default 662-word selection, got ${initialCount}`);

  const defaultStart = Date.now();
  await page.locator('#memoryPrintBtn').click();
  await page.waitForFunction(() => window.__printCalled === 1, null, { timeout: 10000 });
  const defaultMs = Date.now() - defaultStart;
  const defaultPrint = await page.evaluate(() => ({
    alerts: window.__alerts.slice(),
    prints: window.__printCalled,
    pages: document.querySelectorAll('#printSheet .rb-memory-page').length,
    rows: document.querySelectorAll('#printSheet .rb-mem-row').length,
    rowsPerPage: [...document.querySelectorAll('#printSheet .rb-memory-page')].map(p => p.querySelectorAll('.rb-mem-row').length)
  }));
  status.default_662 = { elapsed_ms: defaultMs, ...defaultPrint };
  if (defaultPrint.alerts.length) throw new Error(`default 662 unexpectedly alerted: ${JSON.stringify(defaultPrint.alerts)}`);
  if (defaultPrint.prints !== 1) throw new Error('default 662 did not invoke print exactly once');
  if (defaultPrint.pages !== 37) throw new Error(`default 662 should make 37 pages: ${JSON.stringify(defaultPrint)}`);
  if (defaultPrint.rows !== 662) throw new Error(`default 662 row count mismatch: ${defaultPrint.rows}`);
  if (Math.max(...defaultPrint.rowsPerPage) > 18) throw new Error(`default page exceeds 18 rows: ${JSON.stringify(defaultPrint.rowsPerPage)}`);
  if (defaultMs > 5000) throw new Error(`default 662 print preparation too slow: ${defaultMs}ms`);
  status.checks.default_662_prints_directly = true;
  status.checks.default_662_paginated_37_pages = true;
  status.checks.default_max_18_rows_per_page = true;

  await page.emulateMedia({ media: 'print' });
  const pdfStart = Date.now();
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  const pdfMs = Date.now() - pdfStart;
  status.full_default_pdf = { render_ms: pdfMs, bytes: pdf.length };
  if (pdfMs > 30000) throw new Error(`full default PDF render too slow: ${pdfMs}ms`);
  if (pdf.length < 100000) throw new Error(`full default PDF unexpectedly small: ${pdf.length}`);
  status.checks.full_default_print_engine_render = true;
  await page.emulateMedia({ media: 'screen' });

  await page.evaluate(() => {
    document.body.classList.remove('test-print','answer-print','memory-print','print-sheet','answer-sheet');
    state.dataset = 'textbook';
    state.currentList = DATA.filter(r => r.dataset === 'textbook').slice(0, 1001);
    window.__alerts = [];
    window.__printCalled = 0;
  });
  const guardStart = Date.now();
  await page.locator('#memoryPrintBtn').click();
  await page.waitForTimeout(120);
  const guardMs = Date.now() - guardStart;
  const guard = await page.evaluate(() => ({ alerts: window.__alerts.slice(), prints: window.__printCalled }));
  status.over_1000_guard = { elapsed_ms: guardMs, ...guard };
  if (guard.prints !== 0) throw new Error('1001-word selection unexpectedly invoked print');
  if (!guard.alerts.some(x => x.includes('1000 語以下'))) throw new Error(`1000-word safety guidance missing: ${JSON.stringify(guard)}`);
  if (guardMs > 2500) throw new Error(`1001-word guard too slow: ${guardMs}ms`);
  status.checks.over_1000_returns_quickly = true;
  status.checks.over_1000_does_not_open_print = true;
  status.checks.over_1000_guidance = true;

  await page.evaluate(() => {
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
  if (textbook.prints !== 1) throw new Error('45-word selection did not invoke print exactly once');
  status.checks.textbook_45_paginated_18_18_9 = true;

  // Exam vocabulary must support the same memory-print workflow, grouped by exam classification.
  await page.locator('button.tab[data-dataset="exam"]').click();
  await page.evaluate(() => {
    document.body.classList.remove('test-print','answer-print','memory-print','print-sheet','answer-sheet');
    state.dataset = 'exam';
    state.currentList = DATA.filter(r => r.dataset === 'exam').slice(0, 30);
    window.__alerts = [];
    window.__printCalled = 0;
  });
  await page.locator('#memoryPrintBtn').click();
  await page.waitForFunction(() => window.__printCalled === 1, null, { timeout: 10000 });
  const exam = await page.evaluate(() => ({
    pages: document.querySelectorAll('#printSheet .rb-memory-page').length,
    rows: [...document.querySelectorAll('#printSheet .rb-memory-page')].map(p => p.querySelectorAll('.rb-mem-row').length),
    prints: window.__printCalled,
    alerts: window.__alerts.slice(),
    firstHeading: document.querySelector('#printSheet .rb-memory-group h3')?.textContent?.trim() || ''
  }));
  status.exam_30 = exam;
  if (exam.alerts.length) throw new Error(`exam memory print unexpectedly alerted: ${JSON.stringify(exam.alerts)}`);
  if (exam.prints !== 1) throw new Error('exam memory print did not invoke print exactly once');
  if (exam.pages !== 2) throw new Error(`30 exam rows should make 2 pages: ${JSON.stringify(exam)}`);
  if (exam.rows.join(',') !== '18,12') throw new Error(`wrong exam pagination: ${JSON.stringify(exam)}`);
  if (!exam.firstHeading || exam.firstHeading === 'その他') throw new Error(`exam memory group heading broken: ${exam.firstHeading}`);
  status.checks.exam_memory_print_enabled = true;
  status.checks.exam_30_paginated_18_12 = true;
  status.checks.exam_group_heading_works = true;

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
