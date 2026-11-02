"""Exercise the actual React timer in Chromium (virtual and real browser time)."""
import json
import os
import shutil
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get('NO_RULES_TEST_URL', 'http://127.0.0.1:5173/')
KEY = 'no-rules-life-v1'


def saved(page):
    # React commits the timer update and then persists it in a passive effect.
    page.wait_for_timeout(50)
    return json.loads(page.evaluate(f"localStorage.getItem('{KEY}')"))


def months_between(before, after):
    return (int(after[:4]) - int(before[:4])) * 12 + int(after[5:7]) - int(before[5:7])


def pause(page):
    page.get_by_test_id('button-pause-time').click()


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 390, 'height': 664}, is_mobile=True, has_touch=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.clock.install(time=datetime(2026, 1, 1, tzinfo=timezone.utc))
    page.clock.pause_at(datetime(2026, 1, 1, 0, 0, 1, tzinfo=timezone.utc))
    page.goto(BASE_URL)
    page.get_by_test_id('button-start-life').click()
    assert page.get_by_test_id('button-pause-time').is_visible(), 'New game must start running'
    initial = saved(page)
    page.clock.run_for(10_000)
    first = saved(page)
    assert months_between(initial['currentDate'], first['currentDate']) == 1
    assert len(first['events']) > len(initial['events'])
    assert page.locator('.nr-entry time').first.get_attribute('datetime') == first['currentDate']
    print('PASS: automatic start, date advance and new events at 1x')

    page.clock.run_for(4_000)
    pause(page)
    paused = saved(page)
    page.clock.run_for(60_000)
    assert saved(page) == paused, 'Pause must freeze date, stats, events and save'
    page.get_by_test_id('button-play-time').click()
    page.clock.run_for(5_000)
    assert saved(page) == paused, 'Resume must retain the unfinished month'
    page.clock.run_for(1_000)
    assert months_between(paused['currentDate'], saved(page)['currentDate']) == 1
    print('PASS: complete pause; resume keeps the remaining six seconds')

    page.clock.run_for(4_000)
    page.get_by_test_id('button-speed').click()  # 2x
    page.get_by_test_id('button-speed').click()  # 4x
    assert '4×' in page.get_by_test_id('button-speed').inner_text()
    before_speed = saved(page)
    page.clock.run_for(1_000)
    assert saved(page) == before_speed
    page.clock.run_for(500)
    assert months_between(before_speed['currentDate'], saved(page)['currentDate']) == 1
    start_fast = saved(page)
    page.clock.run_for(10_000)
    assert months_between(start_fast['currentDate'], saved(page)['currentDate']) == 4
    page.get_by_test_id('button-speed').click()  # 1x
    start_slow = saved(page)
    page.clock.run_for(10_000)
    assert months_between(start_slow['currentDate'], saved(page)['currentDate']) == 1
    print('PASS: speed change keeps fractional progress; 4x advances four months versus one at 1x')

    pause(page)
    page.get_by_test_id('button-save').click()
    paused = saved(page)
    page.clock.run_for(20_000)
    assert saved(page) == paused, 'Saving must not restart a paused timer'
    page.get_by_test_id('button-load').click()
    loaded = saved(page)
    assert loaded == paused
    assert page.get_by_test_id('button-pause-time').is_visible()
    page.clock.run_for(10_000)
    assert months_between(loaded['currentDate'], saved(page)['currentDate']) == 1
    print('PASS: save respects pause; loading runs a single timer without resetting progress')

    fixture = saved(page)
    fixture.pop('simulation',None)
    fixture['birthDate'] = fixture['currentDate'] = '2001-01-01'
    fixture['age'] = 0
    fixture['events'] = [dict(fixture['events'][-1], date='2001-01-01', age=0)]
    page.evaluate("data => localStorage.setItem('no-rules-life-v1', JSON.stringify(data))", fixture)
    page.reload()
    page.get_by_test_id('button-load-life').click()
    page.clock.run_for(120_000)
    birthday = saved(page)
    assert birthday['currentDate'] == '2002-01-01'
    assert birthday['age'] == 1
    assert page.get_by_test_id('display-age').locator('strong').inner_text() == '1'
    assert any(event['title'] == 'Первые шаги' for event in birthday['events'])
    page.clock.run_for(10_000)
    assert saved(page)['currentDate'] == '2002-02-01', 'Birthday must not stop/restart the clock'
    print('PASS: reload, twelve automatic months, exact birthday, age and milestone; timer continues')

    decision = dict(birthday['events'][0], id='timer-decision', kind='decision', age=3, date='2004-01-01', eligibility={'minAge':3,'maxAge':5}, outcome=None, choices=[
        {'label': f'Выбор {i}', 'result': 'Семейный день', 'effects': {'happiness': 1}}
        for i in range(4)
    ])
    fixture = saved(page)
    fixture['age'] = 3
    fixture['currentDate'] = '2004-01-01'
    fixture['events'].insert(0, decision)
    page.evaluate("data => localStorage.setItem('no-rules-life-v1', JSON.stringify(data))", fixture)
    page.get_by_test_id('button-load').click()
    frozen = saved(page)
    page.clock.run_for(30_000)
    assert saved(page) == frozen
    assert page.get_by_test_id('button-play-time').is_disabled()
    page.get_by_test_id('choice-timer-decision-0').click()
    page.get_by_test_id('button-play-time').click()
    page.clock.run_for(10_000)
    assert months_between(frozen['currentDate'], saved(page)['currentDate']) == 1
    print('PASS: unresolved decisions block ticking; explicit resume after choice works')

    # Separate context: no virtual clocks, no altered timeouts or injected timer settings.
    real = browser.new_page(viewport={'width': 390, 'height': 664})
    real.on('pageerror', lambda error: errors.append(str(error)))
    real.goto(BASE_URL)
    real.get_by_test_id('button-start-life').click()
    before = saved(real)
    real.wait_for_function("date => JSON.parse(localStorage.getItem('no-rules-life-v1')).currentDate !== date",
                           arg=before['currentDate'], timeout=15_000)
    assert months_between(before['currentDate'], saved(real)['currentDate']) == 1
    pause(real)
    frozen = saved(real)
    real.wait_for_timeout(2_700)
    assert saved(real) == frozen
    print('PASS: actual wall-clock tick and pause in Chromium, without mocked timers')
    assert not errors, errors
    browser.close()
