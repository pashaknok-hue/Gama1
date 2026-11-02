"""Actual browser flow: costs, delayed education, work, save/reload and mobile causality UI."""
import json,os,shutil,tempfile
from pathlib import Path
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
BASE=os.environ.get('NO_RULES_TEST_URL','http://127.0.0.1:5173/')
OUT=Path(tempfile.mkdtemp(prefix='no-rules-causal-'))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':664},is_mobile=True,has_touch=True)
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.clock.install(time=datetime(2026,1,1,tzinfo=timezone.utc));page.clock.pause_at(datetime(2026,1,1,0,0,1,tzinfo=timezone.utc))
 page.goto(BASE)
 fixture=page.evaluate('''async()=>{
 const {generateBirthProfile}=await import('/src/game/generation.ts');
 const {makeLife}=await import('/src/game/simulation.ts');const {ensureSimulation}=await import('/src/game/causal-state.ts');
 const life=makeLife(generateBirthProfile({countryCode:'CH'}));life.birthDate='2000-01-01';life.currentDate='2016-01-01';life.age=16;life.events=[];delete life.simulation;
 ensureSimulation(life).person.money.cash=100;return life;
 }''')
 def saved():
  page.wait_for_timeout(80);return json.loads(page.evaluate("localStorage.getItem('no-rules-life-v1')"))
 def load(life):
  page.evaluate("life=>localStorage.setItem('no-rules-life-v1',JSON.stringify(life))",life);page.reload();page.get_by_test_id('button-load-life').click()
 load(fixture)
 page.clock.run_for(10_000)
 # A friend may initiate the first important conversation. Resolve it without a new delay.
 current=saved();decision=next(e for e in current['events'] if e.get('choices') and not e.get('outcome'))
 if decision['templateId']=='friend-request':
  page.get_by_test_id(f'choice-{decision["id"]}-1').click();page.get_by_test_id('button-play-time').click();page.clock.run_for(10_000);current=saved();decision=next(e for e in current['events'] if e.get('choices') and not e.get('outcome'))
 assert decision['templateId']=='training-path'
 assert len(decision['choices'])==3
 page.screenshot(path=str(OUT/'training.png'))
 page.get_by_test_id(f'choice-{decision["id"]}-0').click()
 current=saved();assert current['simulation']['person']['money']['cash']<100
 queued=current['simulation']['queue'][0];assert queued['status']=='pending' and queued['sourceEventId']==decision['id']
 load(current)
 # Use actual time controls for 24 months, resolving important intervening choices.
 for i in range(24):
  current=saved();pending=next((e for e in current['events'] if e.get('choices') and not e.get('outcome') and e.get('kind')=='decision'),None)
  if pending:
   buttons=page.get_by_role('dialog').locator('.nr-choice');enabled=[j for j in range(buttons.count()) if buttons.nth(j).is_enabled()];assert enabled;buttons.nth(enabled[0]).click()
  page.get_by_test_id('button-next-month').click()
 current=saved();assert current['simulation']['queue'][0]['status']=='applied';assert current['simulation']['person']['education']=='vocational'
 applied=current['simulation']['queue'][0]['completedEventId'];outcome=next(e for e in current['events'] if e['id']==applied)
 assert outcome['cause']['sourceEventIds']==[decision['id']]
 # Resolve any current job choice and inspect durable state through the real UI.
 for _ in range(3):
  current=saved();pending=next((e for e in current['events'] if e.get('choices') and not e.get('outcome') and e.get('kind')=='decision'),None)
  if not pending:break
  page.get_by_role('dialog').locator('.nr-choice').first.click()
  if saved()['simulation']['person']['job']['status']=='employed':break
  page.get_by_test_id('button-next-month').click()
 current=saved();assert current['simulation']['person']['job']['status']=='employed'
 page.get_by_test_id('button-open-actions').click();page.locator('[data-testid="life-overview"] summary').click()
 assert page.get_by_test_id('life-overview').is_visible();page.screenshot(path=str(OUT/'state.png'))
 page.get_by_test_id('button-close-actions').click()
 for w,h in [(320,568),(390,664),(844,390)]:
  page.set_viewport_size({'width':w,'height':h});assert page.evaluate('document.documentElement.scrollWidth')==w;assert page.evaluate('scrollY')==0
 assert current['character']==fixture['character'] and current['family']==fixture['family'] and current['location']==fixture['location']
 print('PASS browser: training cost, durable two-year plan, causality link, qualification, job, mobile state panel and identities',flush=True)
 # Insufficient funds must disable the paid path while keeping a free path.
 poor=fixture;poor['simulation']['person']['money']['cash']=0
 load(poor);page.clock.run_for(10_000)
 current=saved();pending=next(e for e in current['events'] if e.get('choices') and not e.get('outcome'))
 if pending['templateId']=='friend-request':
  page.get_by_test_id(f'choice-{pending["id"]}-1').click();page.get_by_test_id('button-next-month').click();current=saved();pending=next(e for e in current['events'] if e.get('choices') and not e.get('outcome'))
 assert pending['templateId']=='training-path';assert page.get_by_test_id(f'choice-{pending["id"]}-0').is_disabled();assert page.get_by_test_id(f'choice-{pending["id"]}-1').is_enabled()
 # A real long-life save must fit browser storage, not just an in-memory test map.
 old=page.evaluate('''async()=>{
 const {generateBirthProfile}=await import('/src/game/generation.ts');const {makeLife,advanceTime,resolveChoice}=await import('/src/game/simulation.ts');
 const {pendingDecision,canChoose}=await import('/src/game/event-rules.ts');const {saveLife,loadLife}=await import('/src/game/storage.ts');
 const life=makeLife(generateBirthProfile({countryCode:'JP'}));life.birthDate=life.currentDate='2000-01-01';life.age=0;life.events=[];delete life.simulation;
 for(let i=0;i<85*12;i++){advanceTime(life,1,()=>.4);const event=pendingDecision(life);if(event){const choice=event.choices.findIndex((_,index)=>canChoose(life,event,index));if(choice<0)throw Error('No affordable choice');resolveChoice(life,event.id,choice);}}
 if(!saveLife(life)||JSON.stringify(loadLife())!==JSON.stringify(life))throw Error('Long-life save failed');return JSON.parse(JSON.stringify(life));
 }''')
 assert old['age']==85 and old['simulation']['person']['job']['status']=='retired'
 load(old);page.get_by_test_id('button-pause-time').click();assert page.get_by_test_id('display-age').locator('strong').inner_text()=='85'
 assert page.get_by_text('ТВОЯ ИСТОРИЯ · СТАРШИЙ ВОЗРАСТ',exact=True).is_visible()
 page.screenshot(path=str(OUT/'old-age.png'))
 print('PASS browser: birth to age 85, affordable decisions, retirement, complete localStorage round trip and old-age UI',flush=True)
 assert not errors,errors
 print('PASS browser: unaffordable choice disabled, free alternative available; no JavaScript errors. Screenshots:',OUT,flush=True)
 b.close()
