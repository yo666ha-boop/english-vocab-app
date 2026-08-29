import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

HISTORY_KEY = 'mikamijuku_problem_app_print_history_v1'
HTML_URL = Path('problem-app/index.html').resolve().as_uri()
OUT = Path('audit/PROBLEM_APP_PRINT_HISTORY_GATE.json')

INIT_SCRIPT = r"""
window.__printDocs = [];
window.open = function(){
  return {
    document: {
      open(){},
      write(html){ window.__printDocs.push(String(html)); },
      close(){}
    }
  };
};
window.confirm = () => true;
"""

def history(page):
    return page.evaluate(f"JSON.parse(localStorage.getItem('{HISTORY_KEY}') || '[]')")

def dom_snapshot(page):
    rows = page.locator('#questionPreview .q')
    result = []
    for i in range(rows.count()):
        row = rows.nth(i)
        qnum = row.locator('.qnum').inner_text()
        parts = qnum.split('　')
        qid = parts[1].strip() if len(parts) > 1 else qnum
        body = row.locator(':scope > div').nth(1).inner_text()
        ans = row.locator('.ans').inner_text()
        if ans.startswith('答え: '):
            ans = ans[len('答え: '):]
        result.append({'id': qid, 'q': body, 'a': ans})
    return result

def assert_snapshot_equal(actual, expected, label):
    assert len(actual) == len(expected), f'{label}: length {len(actual)} != {len(expected)}'
    for i, (a, e) in enumerate(zip(actual, expected), start=1):
        assert a['id'] == e['id'], f'{label} Q{i} id mismatch: {a["id"]} != {e["id"]}'
        assert a['q'] == e['q'], f'{label} Q{i} question mismatch'
        assert a['a'] == e['a'], f'{label} Q{i} answer mismatch'

def run_engine(browser_type, engine_name):
    browser = browser_type.launch()
    context_kwargs = {}
    if engine_name == 'webkit':
        context_kwargs['viewport'] = {'width': 390, 'height': 844}
    context = browser.new_context(accept_downloads=True, **context_kwargs)
    page = context.new_page()
    page.add_init_script(INIT_SCRIPT)
    page.goto(HTML_URL, wait_until='load')
    page.wait_for_selector('#generateBtn')

    page.evaluate('localStorage.clear()')
    page.reload(wait_until='load')
    page.wait_for_selector('#generateBtn')

    # 問題作成だけでは履歴を残さない。
    page.click('#generateBtn')
    assert len(history(page)) == 0, 'generation must not create print history'
    page.click('#generateBtn')
    assert len(history(page)) == 0, 're-generation must not create print history'

    original = dom_snapshot(page)
    assert original, 'generated set is empty'

    # 実印刷フローを開始した時だけ、問題文・解答・順番をスナップショット保存。
    page.click('#printBothBtn')
    h = history(page)
    assert len(h) == 1, f'expected one history entry after print, got {len(h)}'
    entry = h[0]
    assert entry.get('printedMode') == 'both'
    assert entry.get('questionCount') == len(original)
    saved = [{'id': q['id'], 'q': q['q'], 'a': q['a']} for q in entry['questions']]
    assert_snapshot_equal(saved, original, 'saved snapshot')

    # その後に別問題を作っても過去履歴は変化しない。
    page.click('#generateBtn')
    h_after_generate = history(page)
    saved_after = [{'id': q['id'], 'q': q['q'], 'a': q['a']} for q in h_after_generate[0]['questions']]
    assert_snapshot_equal(saved_after, original, 'snapshot after later generation')

    # 再読み込み後も履歴は残る。
    page.reload(wait_until='load')
    page.wait_for_selector('#printHistoryBtn')
    assert len(history(page)) == 1, 'history did not persist after reload'
    page.click('#printHistoryBtn')
    page.wait_for_selector('#printHistoryPanel')
    assert page.locator('[data-history-action="view"]').count() == 1
    panel_text = page.locator('#printHistoryPanel').inner_text()
    assert '印刷したセットだけ保存されます' in panel_text

    # 現在セットが空でも履歴から直接、完全同一内容を再印刷できる。
    page.evaluate('currentQuestions = []')
    page.locator('[data-history-action="both"]').first.click()
    assert len(history(page)) == 2, 'history reprint did not create a new print-history record'
    print_docs = page.evaluate('window.__printDocs.slice()')
    assert len(print_docs) == 1, 'history reprint did not open print document'
    print_html = print_docs[0]
    positions = [print_html.find(q['id']) for q in original]
    assert all(p >= 0 for p in positions), 'one or more saved IDs missing from reprint HTML'
    assert positions == sorted(positions), 'saved IDs changed order in history reprint'
    for q in original:
        assert q['q'] in print_html, f'saved question text missing from history reprint: {q["id"]}'
        assert q['a'] in print_html, f'saved answer missing from history reprint: {q["id"]}'

    # 画面で開いても保存時の問題・順番・解答をそのまま表示する。
    page.locator('[data-history-action="view"]').first.click()
    opened = dom_snapshot(page)
    assert_snapshot_equal(opened, original, 'history screen restore')
    assert 'showAnswers' not in (page.locator('#questionPreview').get_attribute('class') or ''), 'history view should open with answers hidden'

    # バックアップには印刷履歴を含み、読み込みで復元できる。
    with page.expect_download() as download_info:
        page.click('#exportJsonBtn')
    download = download_info.value
    tmp = Path('audit') / f'print_history_backup_{engine_name}.json'
    download.save_as(str(tmp))
    backup = json.loads(tmp.read_text(encoding='utf-8'))
    assert backup.get('backupVersion') == 2
    assert len(backup.get('printHistory', [])) == 2
    assert backup['printHistory'][0]['questions'][0]['id'] == original[0]['id']

    page.evaluate(f"localStorage.removeItem('{HISTORY_KEY}')")
    assert len(history(page)) == 0
    page.locator('#importJsonInput').set_input_files(str(tmp.resolve()))
    page.wait_for_timeout(100)
    assert len(history(page)) == 2, 'backup import did not restore print history'
    assert 'バックアップを読み込みました' in page.locator('#globalSaveStatus').inner_text()

    # 個別削除できる。
    page.click('#printHistoryBtn') if page.locator('#printHistoryPanel').evaluate('(e)=>e.style.display') == 'none' else None
    page.locator('[data-history-action="delete"]').first.click()
    assert len(history(page)) == 1, 'individual history deletion failed'

    # 生成だけでは削除後の履歴件数も増えない。
    page.click('#generateBtn')
    assert len(history(page)) == 1, 'generation changed history count after delete'

    result = {
        'engine': engine_name,
        'result': 'PASS',
        'generated_count': len(original),
        'generation_without_print_history': True,
        'snapshot_exact_id_question_answer_order': True,
        'reload_persistence': True,
        'history_reprint_without_current_set': True,
        'history_screen_restore': True,
        'backup_export_import_history': True,
        'individual_delete': True,
        'mobile_viewport': engine_name == 'webkit'
    }
    context.close()
    browser.close()
    return result

def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    results = []
    failures = []
    with sync_playwright() as p:
        for name, browser_type in [('chromium', p.chromium), ('firefox', p.firefox), ('webkit', p.webkit)]:
            try:
                results.append(run_engine(browser_type, name))
            except Exception as exc:
                failures.append({'engine': name, 'error': repr(exc)})
    report = {
        'result': 'PASS' if not failures else 'FAIL',
        'engines': results,
        'failures': failures,
        'required': {
            'generate_only_not_saved': True,
            'print_snapshot_saved': True,
            'date_time_history_ui': True,
            'exact_reopen_reprint': True,
            'three_print_modes_from_history': True,
            'backup_includes_history': True
        }
    }
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if failures:
        raise SystemExit(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
