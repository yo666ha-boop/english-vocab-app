import fs from 'node:fs';
import { chromium, webkit } from 'playwright';

const pageUrl=process.env.PAGE_URL||'https://yo666ha-boop.github.io/english-vocab-app/';
const indexSha=process.env.INDEX_SHA||'';
const status={status:'running',page_url:pageUrl,index_sha256:indexSha,checks:{},checked_at_utc:''};
let browser, mobileBrowser;
try {
  browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1365,height:768}});
  await page.goto(pageUrl,{waitUntil:'networkidle',timeout:60000});
  await page.locator('.title',{hasText:'英単語アプリ（統合版）'}).waitFor({timeout:15000});
  status.checks.page_loaded=true;
  if(await page.locator('#pageStartInput').count()!==1||await page.locator('#pageEndInput').count()!==1) throw new Error('page range inputs missing');
  status.checks.page_inputs_present=true;

  const before=await page.evaluate(()=>state.currentList.length);
  status.before_count=before;
  if(before<20) throw new Error('unexpectedly small initial textbook list '+before);

  await page.locator('#pageStartInput').fill('34');
  await page.locator('#pageEndInput').fill('41');
  await page.waitForTimeout(150);
  const range=await page.evaluate(()=>({
    count:state.currentList.length,
    bad:state.currentList.filter(r=>r.page_start==null||r.page_end==null||Number(r.page_start)>41||Number(r.page_end)<34).length,
    sample:state.currentList.slice(0,5).map(r=>({english:r.english,page_start:r.page_start,page_end:r.page_end,textbook_page:r.textbook_page}))
  }));
  status.range_34_41=range;
  if(!range.count||range.count>=before) throw new Error('34-41 range did not narrow results '+JSON.stringify(range));
  if(range.bad) throw new Error('out-of-range rows found '+JSON.stringify(range));
  status.checks.range_overlap_filter_works=true;

  await page.locator('#makeTestBtn').click();
  await page.waitForFunction(()=>state.currentTest.length>0,null,{timeout:10000});
  const test=await page.evaluate(()=>({count:state.currentTest.length,bad:state.currentTest.filter(r=>Number(r.page_start)>41||Number(r.page_end)<34).length}));
  status.test_range=test;
  if(test.count!==10||test.bad) throw new Error('test creation ignored page range '+JSON.stringify(test));
  status.checks.test_creation_obeys_page_range=true;

  await page.evaluate(()=>{window.__pagePrintCalled=0;window.print=()=>window.__pagePrintCalled++;});
  await page.locator('#memoryPrintBtn').click();
  await page.waitForFunction(()=>window.__pagePrintCalled===1,null,{timeout:10000});
  const memory=await page.evaluate(()=>({
    rows:document.querySelectorAll('#printSheet .rb-mem-row').length,
    pages:document.querySelectorAll('#printSheet .rb-memory-page').length,
    maxRows:Math.max(0,...[...document.querySelectorAll('#printSheet .rb-memory-page')].map(p=>p.querySelectorAll('.rb-mem-row').length)),
    rangeText:document.querySelector('#printSheet .rb-memory-sub')?.textContent||''
  }));
  status.memory_range=memory;
  if(memory.rows!==range.count||memory.pages!==Math.ceil(range.count/18)||memory.maxRows>18||!memory.rangeText.includes('p.34〜41')) throw new Error('memory print ignored page range '+JSON.stringify(memory));
  status.checks.memory_print_obeys_page_range=true;
  status.checks.print_range_label_includes_pages=true;

  document;
  await page.locator('#pageEndInput').fill('');
  await page.locator('#pageStartInput').fill('120');
  await page.waitForTimeout(100);
  const startOnly=await page.evaluate(()=>({count:state.currentList.length,bad:state.currentList.filter(r=>r.page_end==null||Number(r.page_end)<120).length}));
  status.start_only=startOnly;
  if(!startOnly.count||startOnly.bad) throw new Error('start-only page filter failed '+JSON.stringify(startOnly));
  status.checks.start_only_filter_works=true;

  await page.locator('#pageStartInput').fill('');
  await page.locator('#pageEndInput').fill('20');
  await page.waitForTimeout(100);
  const endOnly=await page.evaluate(()=>({count:state.currentList.length,bad:state.currentList.filter(r=>r.page_start==null||Number(r.page_start)>20).length}));
  status.end_only=endOnly;
  if(!endOnly.count||endOnly.bad) throw new Error('end-only page filter failed '+JSON.stringify(endOnly));
  status.checks.end_only_filter_works=true;

  await page.locator('#pageEndInput').fill('');
  await page.waitForTimeout(100);
  const restored=await page.evaluate(()=>state.currentList.length);
  status.restored_count=restored;
  if(restored!==before) throw new Error(`clearing page range did not restore list ${restored} != ${before}`);
  status.checks.clear_restores_list=true;
  await browser.close(); browser=null;

  mobileBrowser=await webkit.launch();
  const context=await mobileBrowser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const mobile=await context.newPage();
  await mobile.goto(pageUrl,{waitUntil:'networkidle',timeout:60000});
  const boxes=await Promise.all(['#pageStartInput','#pageEndInput'].map(async s=>await mobile.locator(s).boundingBox()));
  if(boxes.some(b=>!b||b.x<0||b.x+b.width>390)) throw new Error('page inputs overflow iPhone viewport '+JSON.stringify(boxes));
  await mobile.locator('#pageStartInput').fill('34');
  await mobile.locator('#pageEndInput').fill('41');
  await mobile.waitForTimeout(120);
  const mobileCheck=await mobile.evaluate(()=>({count:state.currentList.length,bad:state.currentList.filter(r=>Number(r.page_start)>41||Number(r.page_end)<34).length}));
  status.mobile_webkit={boxes, ...mobileCheck};
  if(!mobileCheck.count||mobileCheck.bad) throw new Error('iPhone WebKit page filter failed '+JSON.stringify(mobileCheck));
  status.checks.iphone_webkit_layout_and_filter=true;
  await mobileBrowser.close(); mobileBrowser=null;
  status.status='pass';
} catch(e) {
  status.status='fail';
  status.error=String(e?.stack||e);
  process.exitCode=1;
} finally {
  if(browser) await browser.close();
  if(mobileBrowser) await mobileBrowser.close();
  status.checked_at_utc=new Date().toISOString();
  fs.mkdirSync('audit',{recursive:true});
  fs.writeFileSync('audit/TEXTBOOK_PAGE_FILTER_SMOKE.json',JSON.stringify(status,null,2)+'\n');
  console.log(JSON.stringify(status,null,2));
}
