import test from 'node:test';
import assert from 'node:assert/strict';
import { civilAge, nextLifeMonth, validDate } from '../src/game/calendar';
import { generateBirthProfile } from '../src/game/generation';
import { makeLife, advanceTime, advance, resolveChoice } from '../src/game/simulation';
import { ensureSimulation, addNpc, monthIndex } from '../src/game/causal-state';
import { pendingDecision, canChoose } from '../src/game/event-rules';
import { coreDecision } from '../src/game/causal-engine';
import { automaticEvent } from '../src/game/life-events';
import { generateFamilyNames, namePools } from '../src/game/names';
import { worldCountries } from '../src/game/world';
import { loadLife, saveLife } from '../src/game/storage';
import type { Life } from '../src/game/domain';
const bytes = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => bytes.get(k) ?? null,
    setItem: (k: string, v: string) => bytes.set(k, v),
  },
});
function at(age: number, birth = '2000-01-31'): Life {
  const life = makeLife(generateBirthProfile({ countryCode: 'CH' }));
  life.birthDate = birth;
  life.currentDate = `${2000 + age}-${birth.slice(5)}`;
  life.age = age;
  life.events = [];
  delete life.simulation;
  const s = ensureSimulation(life);
  s.person.flags['training-planned'] = true;
  s.person.flags['friend-request-answered'] = true;
  return life;
}
function settle(life: Life) {
  const e = pendingDecision(life);
  if (e)
    resolveChoice(
      life,
      e.id,
      e.choices!.findIndex((_, i) => canChoose(life, e, i)),
    );
}
function emit(life: Life) {
  const d = coreDecision(life);
  assert.ok(d);
  const e = {
    ...d,
    id: d.id ?? `test-${life.events.length}`,
    date: life.currentDate,
    age: life.age,
  };
  life.events.unshift(e);
  return e;
}
test('Civil calendar preserves month-end birthdays and handles leap years without timezone drift', () => {
  for (const zone of ['UTC', 'Pacific/Apia', 'America/New_York']) {
    process.env.TZ = zone;
    let date = '2000-01-31';
    for (let i = 0; i < 12; i++) date = nextLifeMonth(date, '2000-01-31');
    assert.equal(date, '2001-01-31');
    assert.equal(civilAge(date, '2000-01-31'), 1);
    assert.equal(civilAge('2001-02-28', '2000-02-29'), 1);
    assert.equal(civilAge('2004-02-28', '2000-02-29'), 3);
    assert.equal(nextLifeMonth('2001-02-28', '2000-01-31'), '2001-03-31');
  }
  assert.equal(validDate('2100-02-29'), false);
  assert.equal(validDate('2000-02-29'), true);
});
test('Every birthday occurs once; month-end age and dates survive save/reload', () => {
  let life = at(0);
  for (let i = 0; i < 60; i++) {
    advanceTime(life, 1, () => 0.5);
    settle(life);
    assert.ok(saveLife(life));
    life = loadLife()!;
  }
  assert.equal(life.age, 5);
  assert.equal(life.currentDate, '2005-01-31');
  for (let age = 1; age <= 5; age++)
    assert.equal(life.events.filter((e) => e.kind === 'milestone' && e.age === age).length, 1);
  const history = JSON.stringify(life.events);
  life.age = 99;
  assert.ok(saveLife(life));
  const loaded = loadLife()!;
  assert.equal(loaded.age, 5);
  assert.equal(JSON.stringify(loaded.events), history);
  bytes.set('no-rules-life-v1', JSON.stringify({ ...life, currentDate: '2005-02-31' }));
  assert.equal(loadLife(), null);
  assert.ok(bytes.get('no-rules-life-v1'));
});
test('Ambient cooldown cannot be defeated by NPC messages and persists across reload', () => {
  let life = at(0);
  const first = automaticEvent(life, () => 0)!;
  life.events.unshift({ ...first, id: 'first', date: life.currentDate, age: 0 });
  for (let i = 0; i < 20; i++)
    life.events.unshift({
      id: `noise-${i}`,
      kind: 'life',
      templateId: `npc-${i}`,
      date: life.currentDate,
      age: 0,
      title: 'Контакт',
      description: 'Встреча',
    });
  assert.ok(saveLife(life));
  life = loadLife()!;
  assert.notEqual(automaticEvent(life, () => 0)?.templateId, first.templateId);
  for (let i = 0; i < 48; i++) {
    advanceTime(life, 1, () => 0);
    settle(life);
  }
  const last = new Map<string, number>();
  for (const e of [...life.events].reverse())
    if (e.templateId?.match(/^(care-|early-|rain-)/)) {
      const now = monthIndex(e.date);
      if (last.has(e.templateId)) assert.ok(now - last.get(e.templateId)! >= 6);
      last.set(e.templateId, now);
    }
});
test('Mixed-language families choose the inherited language even without hereditary surname pairs', () => {
  const country = {
    ...worldCountries.find((c) => c.code === 'CH')!,
    code: 'XX',
    nameLocales: ['de_CH', 'fr_CH'],
  };
  const old = namePools.de_CH;
  namePools.de_CH = { ...old, familyPairs: [] };
  try {
    const samples = [0, 0.99, 0, 0, 0];
    let i = 0;
    const family = generateFamilyNames(country, 'Девочка', () => samples[i++] ?? 0);
    assert.equal(family.character.personalName.namingContext, 'de_CH');
    assert.equal(family.father.personalName.namingContext, 'de_CH');
  } finally {
    namePools.de_CH = old;
  }
});
test('Creative and community paths retain distinct delayed outcomes and source actions', () => {
  for (const [action, path, months, skill] of [
    ['create', 'creative-path', 9, 'craft'],
    ['help', 'community-path', 12, 'social'],
  ] as const) {
    let life = at(20);
    const s = ensureSimulation(life);
    s.person.skills[skill] = 0.4;
    life.events = [
      {
        id: 'activity',
        templateId: `action-${action}`,
        date: life.currentDate,
        age: 20,
        title: 'Занятие',
        description: 'Практика',
      },
    ];
    if(path==='creative-path')s.development={project:{title:'Проверяемый рисунок',direction:'art',progress:100,status:'ready',startedMonth:monthIndex(life.currentDate)-40,sourceEventId:'activity'}};
    const e = emit(life);
    assert.equal(e.templateId, path);
    assert.deepEqual(e.cause?.sourceEventIds, ['activity']);
    resolveChoice(life, e.id, 0);
    assert.ok(saveLife(life));
    life = loadLife()!;
    for (let i = 0; i < months; i++) {
      advanceTime(life, 1, () => 0.6);
      settle(life);
    }
    const q = life.simulation!.queue.find((q) => q.sourceEventId === e.id)!;
    assert.equal(q.status, 'applied');
    assert.ok(q.completedEventId);
    const after = JSON.stringify(q);
    advanceTime(life, 1, () => 0.6);
    assert.equal(JSON.stringify(q), after);
  }
});
test('Illegal path is adult, optional, remembered, and has durable costs and a way out', () => {
  for (const choice of [0, 1, 2]) {
    let life = at(20);
    let s = ensureSimulation(life);
    const friend = addNpc(life, 'friend', () => 0.4);
    s.person.flags['new-circles'] = true;
    const e = emit(life);
    assert.equal(e.templateId, 'illegal-offer');
    resolveChoice(life, e.id, choice);
    assert.ok(s.npcs[friend.id].memory.some((m) => m.eventId === e.id));
    assert.equal(s.queue.length, choice === 2 ? 1 : 0);
    if (choice !== 2) continue;
    assert.ok(saveLife(life));
    life = loadLife()!;
    s = life.simulation!;
    for (let i = 0; i < 6; i++) {
      advanceTime(life, 1, () => 0.6);
      if (i < 5) settle(life);
    }
    assert.equal(s.queue[0].status, 'applied');
    assert.ok(s.person.money.debt >= 90);
    const response = pendingDecision(life)!;
    assert.equal(response.templateId, 'legal-response');
    resolveChoice(life, response.id, 1);
    assert.equal(s.person.flags['illegal-involvement'], false);
    for (let i = 0; i < 12; i++) {
      advanceTime(life, 1, () => 0.6);
      settle(life);
    }
    assert.equal(s.queue.find((q) => q.sourceEventId === response.id)?.status, 'applied');
  }
  const child = at(12);
  ensureSimulation(child).person.flags['new-circles'] = true;
  addNpc(child, 'friend', () => 0.4);
  assert.notEqual(coreDecision(child)?.templateId, 'illegal-offer');
});
test('Exploration creates exposure only after adulthood, never just from birth country', () => {
  for (const age of [10, 18]) {
    const life = at(age);
    life.stats.energy = 100;
    advance(life, 'explore', 1, () => 0.6);
    assert.equal(!!life.simulation!.person.flags['new-circles'], age >= 18);
  }
});

test('Russian age endings handle 21, 22 and 111 and generated female traits agree', async () => {
  const { yearWord } = await import('../src/game/event-text');
  for (const [age, word] of [
    [1, 'год'],
    [2, 'года'],
    [5, 'лет'],
    [11, 'лет'],
    [21, 'год'],
    [22, 'года'],
    [111, 'лет'],
  ] as const)
    assert.equal(yearWord(age), word);
  for (let i = 0; i < 100; i++) {
    const p = generateBirthProfile({ countryCode: 'FR' });
    if (p.character.gender === 'Девочка')
      assert.ok(p.character.traits.every((t) => !t.endsWith('ый')));
  }
});

test('New NPCs use the sourced region of the saved location when choosing names', () => {
  const country = worldCountries.find((c) => c.code === 'CH')!;
  const place = country.settlements.find((p) =>
    /Vaud|Genève|Neuchâtel|Jura/.test(p.region?.name ?? ''),
  )!;
  assert.ok(place);
  const life = at(18);
  life.location.birthplace!.settlementId = place.geonameId;
  const expected = generateFamilyNames(country, 'Девочка', () => 0.4, place);
  assert.equal(addNpc(life, 'friend', () => 0.4).name, expected.character.name);
});
