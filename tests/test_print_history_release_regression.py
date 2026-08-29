import io
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

URL = Path('problem-app/index.html').resolve().as_uri()
OUT = Path('audit/PROBLEM_APP_PRINT_HISTORY_RELEASE_REGRESSION.json')
HISTORY_KEY = 'mikamijuku_problem_app_print_history_v1'


def ids_from_preview(page):
    texts = page.locator('#questionPreview .qnum').all_inner_texts()
    ids = []
    for text in texts:
        m = re.search(r'Q\d+\s+([^\s　/]+)', text)
        if m:
            ids.append(m.group(1))
    return ids


def set_all_checks(page):
    page.evaluate("""()=>{
      for (const x of document.querySelectorAll('input[data-stage],input[data-type]')) {
        x.checked=true;
        x.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }""")


def install_print_hook(page):
    page.evaluate("""()=>{
      window.__printHtml='';
      window.open=()=>({
        document:{open:()=>{},write:s=>{window.__printHtml=String(s)},close:()=>{}},
        focus:()=>{},print:()=>{},onload:null
      });
    }""")


def capture(page, selector):
    install_print_hook(page)
    page.locator(selector).click()
    page.wait_for_timeout(80)
    html = page.evaluate('window.__printHtml')
    assert len(html) > 1000, (selector, len(html))
    return html


def section_ids(html, cls):
    sections = re.findall(r'<section class="page '+re.escape(cls)+r'">([\s\S]*?)</section>', html)
    joined = ''.join(sections)
    return re.findall(r'Q\d+　([^<\s]+)', joined)


def browser_regression(browser_type, name):
    browser = browser_type.launch()
    page = browser.new_page(viewport={'width': 390, 'height': 844} if name == 'webkit' else {'width':1280,'height':900})
    errors=[]
    page.on('pageerror', lambda exc,e=errors:e.append('page:'+str(exc)))
    page.on('console', lambda msg,e=errors:e.append('console:'+msg.text) if msg.type=='error' else None)
    page.goto(URL, wait_until='load')
    page.evaluate('localStorage.clear()')
    page.reload(wait_until='load')
    page.select_option('#subjectSelect','英語')
    page.select_option('#gradeSelect','中1')
    page.select_option('#vocabMode','off')
    page.select_option('#questionCount','20')
    page.select_option('#pickMode','random')
    set_all_checks(page)
    page.locator('#generateBtn').click(); page.wait_for_timeout(120)
    ids=ids_from_preview(page)
    assert len(ids)==20, (name, ids)
    assert len(set(ids))==20, (name, 'duplicate generated ids', ids)
    assert json.loads(page.evaluate(f"localStorage.getItem('{HISTORY_KEY}') || '[]'")) == []

    page.locator('#toggleAnswersBtn').click(); page.wait_for_timeout(50)
    toggled=ids_from_preview(page)
    assert toggled==ids, (name, 'answer toggle changed set', ids, toggled)
    assert page.locator('#questionPreview').evaluate("e=>e.classList.contains('showAnswers')") is True

    page.reload(wait_until='load'); page.wait_for_timeout(100)
    restored=ids_from_preview(page)
    assert restored==ids, (name, 'reload after toggle changed set', ids, restored)

    both=capture(page,'#printBothBtn')
    qonly=capture(page,'#printQuestionsOnlyBtn')
    aonly=capture(page,'#printAnswersOnlyBtn')

    both_q=section_ids(both,'question-page'); both_a=section_ids(both,'answer-page')
    qonly_q=section_ids(qonly,'question-page'); qonly_a=section_ids(qonly,'answer-page')
    aonly_q=section_ids(aonly,'question-page'); aonly_a=section_ids(aonly,'answer-page')
    assert both_q==ids and both_a==ids, (name,'both mismatch',both_q,both_a,ids)
    assert qonly_q==ids and not qonly_a, (name,'questions-only mismatch')
    assert not aonly_q and aonly_a==ids, (name,'answers-only mismatch')
    assert both.index('question-page') < both.index('answer-page'), (name,'answers not separated after questions')

    h=json.loads(page.evaluate(f"localStorage.getItem('{HISTORY_KEY}') || '[]'"))
    assert len(h)==3, (name,'three actual print actions should create three history rows',len(h))
    for entry in h:
        assert [q['id'] for q in entry['questions']]==ids, (name,'history snapshot order mismatch')
    assert not errors, (name,errors)

    result={
      'browser':name,
      'generated_ids':ids,
      'answer_toggle_exact':True,
      'reload_exact':True,
      'both_question_ids_exact':True,
      'both_answer_ids_exact':True,
      'questions_only_exact':True,
      'answers_only_exact':True,
      'question_pages_before_answer_pages':True,
      'history_rows_after_three_prints':3,
      'history_snapshots_exact':True,
      'unexpected_errors':[]
    }
    page.close(); browser.close()
    return result, (both,qonly,aonly) if name=='chromium' else None


def render_pdf(browser, html):
    safe=re.sub(r'<script>window\.onload=\(\)=>window\.print\(\)<\\/script>','',html)
    p=browser.new_page(viewport={'width':1280,'height':900})
    p.set_content(safe,wait_until='load');p.emulate_media(media='print')
    pdf=p.pdf(format='A4',print_background=True,prefer_css_page_size=True)
    p.close()
    reader=PdfReader(io.BytesIO(pdf))
    dims=[]
    for pg in reader.pages:
        dims.append([round(float(pg.mediabox.width),2),round(float(pg.mediabox.height),2)])
    return len(pdf),len(reader.pages),dims


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    report={'result':'FAIL','url':URL,'browsers':[]}
    with sync_playwright() as p:
        chromium_prints=None
        for name, launcher in [('chromium',p.chromium),('firefox',p.firefox),('webkit',p.webkit)]:
            result, prints=browser_regression(launcher,name)
            report['browsers'].append(result)
            if prints: chromium_prints=prints
        assert chromium_prints is not None
        browser=p.chromium.launch()
        both_stats=render_pdf(browser,chromium_prints[0])
        q_stats=render_pdf(browser,chromium_prints[1])
        a_stats=render_pdf(browser,chromium_prints[2])
        browser.close()
        assert both_stats[1]==3, both_stats
        assert q_stats[1]==2, q_stats
        assert a_stats[1]==1, a_stats
        for dims in [both_stats[2],q_stats[2],a_stats[2]]:
            for w,h in dims:
                assert 590<=w<=600 and 838<=h<=846,(w,h)
        report['a4']={
          'combined_pages':both_stats[1],
          'questions_only_pages':q_stats[1],
          'answers_only_pages':a_stats[1],
          'combined_pdf_bytes':both_stats[0],
          'questions_pdf_bytes':q_stats[0],
          'answers_pdf_bytes':a_stats[0],
          'combined_page_points':both_stats[2],
          'questions_page_points':q_stats[2],
          'answers_page_points':a_stats[2],
          'result':'PASS'
        }
    report['result']='PASS'
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':
    main()
