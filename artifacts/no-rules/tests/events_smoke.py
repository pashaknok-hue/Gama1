"""Actual React UI/timer checks for infant, child, teen and adult events."""
import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL=os.environ.get('NO_RULES_TEST_URL','http://127.0.0.1:5173/')
OUT=Path(tempfile.mkdtemp(prefix='no-rules-events-'))
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':664},is_mobile=True,has_touch=True)
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.clock.install(time=datetime(2026,1,1,tzinfo=timezone.utc))
    page.clock.pause_at(datetime(2026,1,1,0,0,1,tzinfo=timezone.utc))
    page.goto(BASE_URL)
    fixtures=page.evaluate('''async()=>{
      const {generateBirthProfile}=await import('/src/game/generation.ts');
      const {makeLife}=await import('/src/game/simulation.ts');
      return [0,4,8,15,25].map(age=>{
        const life=makeLife(generateBirthProfile({countryCode:'KZ'}));
        life.birthDate='2000-01-01';life.currentDate=`${2000+age}-01-01`;life.age=age;
        life.events[0].date='2000-01-01';
        return life;
      });
    }''')

    def saved():
        page.wait_for_timeout(80)
        return json.loads(page.evaluate("localStorage.getItem('no-rules-life-v1')"))

    def load(life):
        page.evaluate("life=>localStorage.setItem('no-rules-life-v1',JSON.stringify(life))",life)
        page.reload()
        page.get_by_test_id('button-load-life').click()
        page.evaluate('Math.random=()=>.1')

    infant=fixtures[0]
    load(infant)
    page.clock.run_for(30_000)
    current=saved()
    assert current['currentDate']=='2000-04-01'
    assert not any(event.get('kind') in ['action','decision'] for event in current['events'])
    for event in current['events']:
        assert event.get('actor') and event.get('target') and event.get('context')
        assert event['title'] not in ['Обнять ребёнка','Отнять ребёнка']
    page.get_by_test_id('button-open-actions').click()
    assert page.get_by_test_id('infant-actions-note').is_visible()
    assert page.locator('.nr-action-option').count()==0
    page.get_by_test_id('button-close-actions').click()
    page.screenshot(path=str(OUT/'infant.png'))
    print('PASS infant: automatic months, caregiving/world events, no choices or adult actions',flush=True)

    for life in fixtures[1:]:
        load(life)
        page.get_by_test_id('button-pause-time').click()
        page.get_by_test_id('button-open-actions').click()
        assert page.get_by_test_id('modal-action-read').is_visible()
        assert page.get_by_test_id('modal-action-play').count()==(1 if life['age']<=12 else 0)
        assert page.get_by_test_id('modal-action-explore').count()==(1 if life['age']>=10 else 0)
        assert page.get_by_test_id('modal-action-cuddle').count()==0
        page.get_by_test_id('modal-action-read').click()
        current=saved()
        action=next(event for event in current['events'] if event.get('kind')=='action')
        assert action['actor']['id']==life['id'] and action['target']['name']=='Книга'
        decision=next(event for event in current['events'] if event.get('kind')=='decision')
        assert decision['eligibility']['minAge']<=life['age']<=decision['eligibility'].get('maxAge',999)
        assert len(decision['choices'])==4
        if life['age']>=18: assert decision['title'] not in ['После уроков','После занятий']
        dialog=page.get_by_role('dialog')
        assert dialog.is_visible()
        page.screenshot(path=str(OUT/f'age-{life["age"]}-decision.png'))
        page.get_by_test_id(f'choice-{decision["id"]}-0').click()
        current=saved()
        resolved=next(event for event in current['events'] if event['id']==decision['id'])
        assert resolved['resolution']['actor']['id']==life['id'] and resolved['outcome']
        page.get_by_test_id('button-play-time').click()
        page.clock.run_for(10_000)
        assert saved()['currentDate']!=current['currentDate']
        assert saved()['character']==life['character'] and saved()['family']==life['family']
        print('PASS age',life['age'],': age/capability menu, separate player action, decision and timer resume',flush=True)

    legacy=fixtures[0]
    legacy['events'].insert(0,{'id':'ambiguous','date':'2000-01-01','age':0,'title':'Отнять ребёнка','description':'Старая строка'})
    legacy['events'].insert(0,{'id':'school','date':'2000-01-01','age':0,'title':'После уроков','description':'Старый неподходящий выбор','choices':[{'label':'Выбрать','result':'Старый исход','effects':{'happiness':10}}]})
    load(legacy)
    assert page.get_by_test_id('button-pause-time').is_enabled()
    assert page.get_by_role('dialog').count()==0
    assert page.locator('.nr-entry h3').filter(has_text='Отнять ребёнка').count()==0
    page.clock.run_for(10_000)
    assert saved()['currentDate']=='2000-02-01'
    assert next(event for event in saved()['events'] if event['id']=='ambiguous')['title']=='Отнять ребёнка'
    print('PASS legacy: history retained, ambiguous display clarified, invalid old choice cannot freeze infancy',flush=True)
    assert not errors,errors
    print('Screenshots:',OUT,flush=True)
    browser.close()
