from pathlib import Path
from playwright.sync_api import sync_playwright
import json

URL = Path('problem-app/index.html').resolve().as_uri()
OUT = Path('audit/PROBLEM_APP_GRAMMAR_CHRONOLOGY_SMOKE.json')

CASES = [
    # grade, textbook, section prefix, must include, must exclude
    ('中1','サンシャイン','プレステップ2',['英語の語順'],['一般動詞（３単現）','現在進行形','be動詞（過去形）','一般動詞（過去形）','過去進行形','未来の文']),
    ('中1','サンシャイン','PROGRAM 5',['一般動詞（３単現）'],['現在進行形','be動詞（過去形）','一般動詞（過去形）','未来の文']),
    ('中1','サンシャイン','PROGRAM 10',['現在進行形','be動詞（過去形）','一般動詞（過去形）','過去進行形'],['未来の文']),
    ('中1','ニューホライズン','Unit 5',['一般動詞（３単現）'],['現在進行形','be動詞（過去形）','未来の文']),
    ('中1','ニューホライズン','Unit 10',['現在進行形','be動詞（過去形）','一般動詞（過去形）','過去進行形','there is ～，look ～ の文'],['未来の文','接続詞']),
    ('中2','サンシャイン','PROGRAM 1',['未来の文','動名詞'],['助動詞','比較','受動態','現在完了形（完了・経験）','現在完了形（継続），現在完了進行形']),
    ('中2','サンシャイン','PROGRAM 8',['未来の文','動名詞','接続詞','助動詞','比較','受動態'],['現在完了形（完了・経験）','現在完了形（継続），現在完了進行形','文型②（call A B，make A B）']),
    ('中2','ニューホライズン','Unit 1',['未来の文','文型①（look ～，give A B）','文型②（call A B，make A B）'],['動名詞','比較','受動態','現在完了形（完了・経験）']),
    ('中2','ニューホライズン','Unit 7',['未来の文','接続詞','動名詞','比較','受動態'],['現在完了形（完了・経験）','現在完了形（継続），現在完了進行形']),
    ('中3','サンシャイン','PROGRAM 1',['現在完了形（完了・経験）','不定詞②'],['現在完了形（継続），現在完了進行形','分詞と間接疑問文','関係代名詞','仮定法']),
    ('中3','サンシャイン','PROGRAM 2',['現在完了形（完了・経験）','現在完了形（継続），現在完了進行形'],['分詞と間接疑問文','関係代名詞','仮定法']),
    ('中3','サンシャイン','PROGRAM 4',['文型','分詞と間接疑問文'],['関係代名詞','仮定法']),
    ('中3','サンシャイン','PROGRAM 5',['関係代名詞'],['仮定法']),
    ('中3','サンシャイン','PROGRAM 7',['関係代名詞','仮定法'],[]),
    ('中3','ニューホライズン','Unit 1',['文型','現在完了形（完了・経験）'],['現在完了形（継続），現在完了進行形','不定詞②','分詞と間接疑問文','関係代名詞','仮定法']),
    ('中3','ニューホライズン','Unit 2',['現在完了形（完了・経験）','現在完了形（継続），現在完了進行形'],['不定詞②','分詞と間接疑問文','関係代名詞','仮定法']),
    ('中3','ニューホライズン','Unit 4',['不定詞②','分詞と間接疑問文'],['関係代名詞','仮定法']),
    ('中3','ニューホライズン','Unit 5',['関係代名詞'],['仮定法']),
    ('中3','ニューホライズン','Unit 6',['関係代名詞','仮定法'],[]),
]

def option_by_prefix(page, selector, prefix):
    options = page.locator(selector + ' option').evaluate_all("els => els.map(x => ({value:x.value,text:(x.textContent||'').trim()}))")
    matches = [o for o in options if o['text'].startswith(prefix)]
    if not matches:
        raise AssertionError(f'no option {selector} starting with {prefix!r}; have {[o["text"] for o in options]}')
    page.select_option(selector, matches[0]['value'])
    page.wait_for_timeout(15)
    return matches[0]['text']

def stages(page):
    return page.locator('input[data-stage]').evaluate_all("els => els.map(x => x.value)")

result = {
    'status':'pending',
    'url':URL,
    'expected_version':'r7-2025-publisher-plan-v1',
    'cases':[],
    'event_rerender':{},
    'console_errors':[],
    'page_errors':[]
}

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.on('console', lambda msg: result['console_errors'].append(msg.text) if msg.type == 'error' else None)
    page.on('pageerror', lambda exc: result['page_errors'].append(str(exc)))
    page.goto(URL, wait_until='load')
    page.select_option('#subjectSelect','英語')
    page.wait_for_timeout(20)

    version = page.evaluate('window.__mikamiGrammarChronologyVersion')
    if version != result['expected_version']:
        raise AssertionError(f'chronology version mismatch: {version!r}')

    for grade,tb,section_prefix,must,must_not in CASES:
        page.select_option('#gradeSelect',grade)
        page.wait_for_timeout(15)
        page.select_option('#textbookSelect',tb)
        page.wait_for_timeout(15)
        selected = option_by_prefix(page,'#sectionSelect',section_prefix)
        visible = stages(page)
        missing = [x for x in must if x not in visible]
        unexpected = [x for x in must_not if x in visible]
        rec = {'grade':grade,'textbook':tb,'section':selected,'stages':visible,'missing':missing,'unexpected':unexpected}
        result['cases'].append(rec)
        if missing or unexpected:
            raise AssertionError(rec)

    # Verify section change rerenders without a page reload.
    page.select_option('#gradeSelect','中1')
    page.select_option('#textbookSelect','サンシャイン')
    before_section = option_by_prefix(page,'#sectionSelect','PROGRAM 4')
    before = stages(page)
    after_section = option_by_prefix(page,'#sectionSelect','PROGRAM 5')
    after = stages(page)
    rerender_ok = '一般動詞（３単現）' not in before and '一般動詞（３単現）' in after
    result['event_rerender'] = {'before_section':before_section,'before':before,'after_section':after_section,'after':after,'ok':rerender_ok}
    if not rerender_ok:
        raise AssertionError(result['event_rerender'])

    # Verify textbook change rerenders chronology at the same grade.
    page.select_option('#gradeSelect','中2')
    page.select_option('#textbookSelect','サンシャイン')
    option_by_prefix(page,'#sectionSelect','PROGRAM 1')
    ss = stages(page)
    page.select_option('#textbookSelect','ニューホライズン')
    option_by_prefix(page,'#sectionSelect','Unit 1')
    nh = stages(page)
    if '動名詞' not in ss or '動名詞' in nh or '文型②（call A B，make A B）' not in nh:
        raise AssertionError({'textbook_rerender':{'ss':ss,'nh':nh}})
    result['textbook_rerender'] = {'ss_program1':ss,'nh_unit1':nh,'ok':True}

    browser.close()

if result['console_errors'] or result['page_errors']:
    raise AssertionError({'console_errors':result['console_errors'],'page_errors':result['page_errors']})
result['status'] = 'PASS'
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':result['status'],'cases':len(result['cases']),'event_rerender':result['event_rerender']['ok']},ensure_ascii=False,indent=2))
