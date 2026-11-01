"""Verify generated names, event wording and legacy saves in the actual UI."""
import json
import os
import shutil
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get('NO_RULES_TEST_URL', 'http://127.0.0.1:5173/')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 393, 'height': 844}, is_mobile=True, has_touch=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE_URL)
    fixtures = page.evaluate('''async () => {
      const {birthRegions, namePools, generateFamilyNames} = await import('/src/game/names.ts');
      const {generateBirthProfile} = await import('/src/game/generation.ts');
      const {makeLife} = await import('/src/game/simulation.ts');
      const {embraceDescription} = await import('/src/game/event-text.ts');
      return Object.keys(namePools).flatMap(context => ['Девочка', 'Мальчик'].map(gender => {
        const region = birthRegions.find(place => place.naming.some(([key]) => key === context));
        const names = generateFamilyNames({...region, naming: [[context, 1]]}, gender, () => 0);
        const profile = generateBirthProfile();
        profile.country = region.country; profile.region = region.region;
        profile.character = {...names.character, gender, traits: []};
        profile.family = profile.family.slice(0, 2).map((person, index) => ({...person, ...(index ? names.father : names.mother)}));
        profile.family.push({...profile.family[0], ...names.sister, id: 'test-sister', relationship: 'Старшая сестра', age: 5});
        return {context, life: makeLife(profile), embrace: embraceDescription(profile.character)};
      }));
    }''')

    def load(life):
        page.evaluate("data => localStorage.setItem('no-rules-life-v1', JSON.stringify(data))", life)
        page.reload()
        page.get_by_test_id('button-load-life').click()
        page.get_by_test_id('button-pause-time').click()
        assert page.locator('.nr-character-row h1').inner_text() == life['character']['name']
        relatives = page.get_by_test_id('display-family').inner_text()
        for person in life['family']:
            assert person['name'] in relatives
        page.wait_for_timeout(80)
        loaded = json.loads(page.evaluate("localStorage.getItem('no-rules-life-v1')"))
        assert loaded == life, 'Loading must not rename a person or rewrite historical events'

    for fixture in fixtures:
        life = fixture['life']
        load(life)
        birth = page.locator('.nr-entry p').last.inner_text()
        assert birth == life['events'][0]['description']
        assert birth.startswith(('Родилась ' if life['character']['gender'] == 'Девочка' else 'Родился ') + life['character']['name'])
        page.get_by_test_id('button-open-actions').click()
        page.locator('.nr-action-option').filter(has_text='Обнять ребёнка').click()
        assert page.locator('.nr-entry p').first.inner_text() == fixture['embrace']
        page.get_by_test_id('button-save').click()
        current = json.loads(page.evaluate("localStorage.getItem('no-rules-life-v1')"))
        load(current)
        assert current['character'] == life['character'] and current['family'] == life['family']
        print('PASS:', fixture['context'], life['character']['gender'], life['character']['name'])

    legacy = fixtures[0]['life']
    legacy['character'].pop('personalName', None)
    legacy['character']['name'] = 'Лида Соколов'
    for person in legacy['family']:
        person.pop('personalName', None)
    legacy['family'][0]['name'] = 'Мама С Необычным Именем'
    load(legacy)
    page.get_by_test_id('button-open-actions').click()
    page.locator('.nr-action-option').filter(has_text='Обнять ребёнка').click()
    assert page.locator('.nr-entry p').first.inner_text().startswith('Лида Соколов чувствует')
    assert page.locator('.nr-entry p').last.inner_text() == legacy['events'][0]['description']
    assert not errors, errors
    print('PASS: legacy display strings, multiword relatives, unchanged history and safe new event text')
    browser.close()
