"""Browser verification of the real global birth generator, UI and persistence."""
import json
import os
import shutil
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get('NO_RULES_TEST_URL', 'http://127.0.0.1:5173/')
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 393, 'height': 844}, is_mobile=True, has_touch=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE_URL)
    page.get_by_label('Распределение стран').select_option('population')
    page.get_by_label('Включать дополнительные территории').check()
    assert page.get_by_label('Распределение стран').input_value() == 'population'
    assert page.get_by_label('Включать дополнительные территории').is_checked()
    page.get_by_label('Распределение стран').select_option('uniform')
    page.get_by_label('Включать дополнительные территории').uncheck()
    for label, marker in [('Страны и данные имён', '193'), ('Источники', 'GeoNames')]:
        response = page.request.get(urljoin(BASE_URL,page.get_by_role('link', name=label, exact=True).get_attribute('href')))
        assert response.ok and marker in response.text()
    result = page.evaluate('''async () => {
      const {generateBirthProfile} = await import('/src/game/generation.ts');
      const {worldCountries} = await import('/src/game/world.ts');
      const {makeLife} = await import('/src/game/simulation.ts');
      const {saveLife,loadLife} = await import('/src/game/storage.ts');
      const {embraceDescription} = await import('/src/game/event-text.ts');
      let seed=129042;
      const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
      const countries=new Set(), names=new Set(), genders=new Set();
      let missing=0;
      for(let i=0;i<1200;i++) {
        const profile=generateBirthProfile({random});
        const country=worldCountries.find(c=>c.code===profile.birthplace.countryCode);
        if(!country.settlements.some(s=>s.geonameId===profile.birthplace.settlementId && s.name===profile.birthplace.settlement)) throw Error('Invalid geographic relation');
        countries.add(profile.birthplace.countryCode);genders.add(profile.character.gender);
        if(profile.character.personalName.status==='missing') missing++; else names.add(profile.character.name);
        const life=makeLife(profile);
        if(!saveLife(life)||JSON.stringify(loadLife())!==JSON.stringify(life)) throw Error('Name/family/birthplace changed on reload');
      }
      const fixtures=[];
      for(const countryCode of ['RU','KZ','JP','CN','NG','BR','IS','BD','GE','CA','ZA','BY','DZ','IL']) {
        for(const gender of ['Девочка','Мальчик']) {
          let profile;
          do {profile=generateBirthProfile({countryCode,random});} while(profile.character.gender!==gender);
          fixtures.push({countryCode,life:makeLife(profile),embrace:embraceDescription(profile.character)});
        }
      }
      return {births:1200,countries:countries.size,names:names.size,genders:genders.size,missing,fixtures};
    }''')
    assert result['countries'] >= 180 and result['names'] > 300 and result['genders'] == 2
    assert result['missing'] > 0
    print('PASS actual browser generator:', {key:value for key,value in result.items() if key!='fixtures'}, flush=True)

    def load(life):
        page.evaluate("data=>localStorage.setItem('no-rules-life-v1',JSON.stringify(data))", life)
        page.reload()
        page.get_by_test_id('button-load-life').click()
        page.get_by_test_id('button-pause-time').click()
        assert page.locator('.nr-character-row h1').inner_text() == life['character']['name']
        assert page.locator('.nr-character-row h1 bdi').evaluate('(el)=>getComputedStyle(el).unicodeBidi') == 'isolate'
        if any('\u0590' <= char <= '\u08ff' for char in life['character']['name']):
            assert page.locator('.nr-character-row h1 bdi').evaluate('(el)=>getComputedStyle(el).direction') == 'rtl'
        for relative in life['family']:
            assert relative['name'] in page.get_by_test_id('display-family').inner_text()
        if life['location'].get('birthplace'):
            assert life['location']['birthplace']['settlement'] in page.locator('.nr-character-sub').inner_text()
        page.wait_for_timeout(80)
        assert json.loads(page.evaluate("localStorage.getItem('no-rules-life-v1')")) == life

    for fixture in result['fixtures']:
        life=fixture['life']
        load(life)
        assert page.locator('.nr-entry p').last.inner_text() == life['events'][0]['description']
        page.get_by_test_id('button-open-actions').click()
        page.locator('.nr-action-option').filter(has_text='Обнять ребёнка').click()
        assert page.locator('.nr-entry p').first.inner_text() == fixture['embrace']
        page.get_by_test_id('button-save').click()
        current=json.loads(page.evaluate("localStorage.getItem('no-rules-life-v1')"))
        load(current)
        assert current['character']==life['character'] and current['family']==life['family']
        print('PASS UI:',fixture['countryCode'],life['character']['gender'],life['character']['name'],flush=True)

    legacy=result['fixtures'][0]['life']
    legacy['location'].pop('birthplace',None)
    legacy['character'].pop('personalName',None)
    legacy['character']['name']='Зоя Волков'
    for relative in legacy['family']: relative.pop('personalName',None)
    legacy['family'][0]['name']='Старое многословное имя родственника'
    load(legacy)
    assert page.locator('.nr-entry p').last.inner_text()==legacy['events'][0]['description']
    assert not errors,errors
    print('PASS legacy names, relatives and history; no browser JavaScript errors',flush=True)
    browser.close()
