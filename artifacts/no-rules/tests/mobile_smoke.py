"""Browser regression checks. See README.md for setup and scope."""
from playwright.sync_api import sync_playwright
import json
from pathlib import Path
import os
import shutil
import tempfile
OUT = Path(tempfile.mkdtemp(prefix='no-rules-mobile-'))
BASE_URL = os.environ.get('NO_RULES_TEST_URL', 'http://127.0.0.1:5173/')
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 390, 'height': 664}, is_mobile=True, has_touch=True, device_scale_factor=2)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE_URL)
    page.get_by_test_id('button-start-life').click()
    page.wait_for_timeout(2500)
    saved = json.loads(page.evaluate("localStorage.getItem('no-rules-life-v1')"))
    original_id = saved['id']
    page.get_by_test_id('button-next-month').click()
    page.wait_for_timeout(100)
    advanced = json.loads(page.evaluate("localStorage.getItem('no-rules-life-v1')"))
    assert advanced['currentDate'] != saved['currentDate']
    assert advanced['id'] == original_id
    page.get_by_test_id('button-speed').click()
    assert '2×' in page.get_by_test_id('button-speed').inner_text()
    page.get_by_test_id('button-play-time').click()
    assert page.get_by_test_id('button-pause-time').is_visible()
    page.get_by_test_id('button-pause-time').click()
    page.get_by_test_id('button-save').click()
    saved = json.loads(page.evaluate("localStorage.getItem('no-rules-life-v1')"))
    page.reload()
    page.get_by_test_id('button-load-life').click()
    assert json.loads(page.evaluate("localStorage.getItem('no-rules-life-v1')")) == saved
    print('PASS: month advance, speed, play/pause, save/reload preserve identity and progress')
    fixture = json.loads(json.dumps(saved))
    fixture['character']['name'] = 'Александра Мельникова'
    fixture['character']['traits'] = ['наблюдательный', 'самостоятельный']
    fixture['conditions']['className'] = 'Скромный достаток'
    fixture['location'] = {'country': 'Казахстан', 'region': 'Северный Казахстан'}
    fixture['events'] = [{'id': f'entry-{i}', 'date': f'2001-{i // 28 + 1:02d}-{i % 28 + 1:02d}', 'age': 0, 'title': f'Запись {i}', 'description': 'Обычный день с семьёй. ' + 'ОченьДлинноеСловоБезПробелов' * 4} for i in range(120)]
    fixture['events'] = fixture['events'][::2] + fixture['events'][1::2]
    page.evaluate("data => localStorage.setItem('no-rules-life-v1',JSON.stringify(data))", fixture)
    page.reload()
    page.get_by_test_id('button-load-life').click()
    page.wait_for_timeout(2500)
    assert page.locator('.nr-entry').count() == 120
    dates = page.locator('.nr-entry time').evaluate_all('(els)=>els.map(e=>e.dateTime)')
    assert dates == sorted(dates, reverse=True)
    assert json.loads(page.evaluate("localStorage.getItem('no-rules-life-v1')"))['events'] == fixture['events']
    print('PASS: newest-first diary, all 120 events retained, source history unmodified')

    def assert_layout(w, h):
        page.set_viewport_size({'width': w, 'height': h})
        page.wait_for_timeout(80)
        result = page.evaluate("() => {\n   const diary=document.querySelector('.nr-timeline'), dr=diary.getBoundingClientRect();\n   const scene=document.querySelector('.nr-scene').getBoundingClientRect();\n   const outside=[...document.querySelectorAll('.nr-game-screen :is(button,.nr-status-item,.nr-feed-heading,.nr-character-row,.nr-timebar,.nr-stage-wrap)')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.left < -1||r.right>innerWidth+1||r.bottom>innerHeight+1)}).map(e=>e.className);\n   const overlaps=[...document.querySelectorAll('.nr-status-title > span')].filter(e=>{const parent=e.parentElement.getBoundingClientRect(),r=e.getBoundingClientRect();return r.right>parent.right+1});\n   return {width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,diaryHeight:dr.height,diaryBottom:dr.bottom,sceneHeight:scene.height,outside,overlaps:overlaps.length,buttons:[...document.querySelectorAll('.nr-game-screen :is(.nr-control,.nr-topbar-icon)')].every(e=>e.getBoundingClientRect().height>=44)}\n  }")
        assert result['pageWidth'] == w and result['pageHeight'] == h, result
        assert result['diaryHeight'] >= 60 and result['diaryBottom'] <= h + 1, result
        assert not result['outside'] and (not result['overlaps']) and result['buttons'], result
        page.locator('.nr-timeline').evaluate('(el)=>el.scrollTop=200')
        assert page.locator('.nr-timeline').evaluate('(el)=>el.scrollTop') > 0
        page.mouse.move(100, 100)
        page.mouse.wheel(0, 300)
        assert page.evaluate('scrollY') == 0
        page.locator('.nr-timeline').evaluate('(el)=>el.scrollTop=0')
        page.screenshot(path=str(OUT / f'verified-{w}x{h}.png'))
        print('PASS layout', result)
    for w, h in [(320, 480), (320, 568), (375, 548), (375, 667), (390, 664), (393, 759), (430, 840), (667, 375), (844, 390), (852, 393), (932, 430), (1024, 768), (1440, 900)]:
        assert_layout(w, h)
    page.set_viewport_size({'width': 393, 'height': 759})
    safe = page.add_style_tag(content='.nr-game-screen{padding-top:47px;padding-bottom:34px;padding-left:0;padding-right:0}')
    assert_layout(393, 759)
    safe.evaluate('(el)=>el.remove()')
    page.set_viewport_size({'width': 844, 'height': 390})
    safe = page.add_style_tag(content='.nr-game-screen{padding-top:0;padding-bottom:21px;padding-left:47px;padding-right:47px}')
    assert_layout(844, 390)
    safe.evaluate('(el)=>el.remove()')
    print('PASS: simulated portrait and landscape safe-area geometry')
    page.set_viewport_size({'width': 320, 'height': 568})
    page.get_by_test_id('button-open-actions').click()
    assert page.get_by_role('dialog').is_visible()
    page.locator('.nr-action-option').first.click()
    assert page.get_by_role('dialog').count() == 0
    page.get_by_test_id('button-new-life').click()
    page.get_by_test_id('button-cancel-new-life').click()
    assert json.loads(page.evaluate("localStorage.getItem('no-rules-life-v1')"))['id'] == original_id
    print('PASS: actions dialog and cancel restart preserve current life')
    fixture['events'].insert(0, {'id': 'decision-test', 'date': '2002-01-01', 'age': 1, 'title': 'Важный момент', 'description': 'Обычное семейное событие. ' * 7, 'choices': [{'label': f'Вариант {i + 1}: провести время с семьёй', 'result': 'День прошёл вместе с близкими.', 'effects': {'happiness': 2, 'energy': -1}} for i in range(4)]})
    page.evaluate("data => localStorage.setItem('no-rules-life-v1',JSON.stringify(data))", fixture)
    page.reload()
    page.get_by_test_id('button-load-life').click()
    for w, h in [(320, 480), (390, 664), (667, 375), (844, 390)]:
        page.set_viewport_size({'width': w, 'height': h})
        dialog = page.get_by_role('dialog')
        assert dialog.is_visible()
        for i in range(4):
            choice = page.get_by_test_id(f'choice-decision-test-{i}')
            choice.scroll_into_view_if_needed()
            r = choice.bounding_box()
            assert r and r['x'] >= 0 and (r['x'] + r['width'] <= w + 1) and (r['y'] >= 0) and (r['y'] + r['height'] <= h + 1), r
        page.screenshot(path=str(OUT / f'decision-{w}x{h}.png'))
    page.get_by_test_id('choice-decision-test-3').click()
    assert page.get_by_role('dialog').count() == 0
    assert json.loads(page.evaluate("localStorage.getItem('no-rules-life-v1')"))['events'][0]['outcome'] == 'День прошёл вместе с близкими.'
    assert not errors, errors
    print('PASS: 4 decision choices accessible; outcome saved; no JavaScript errors')
    print('Screenshots:', OUT)
    browser.close()
