import assert from 'node:assert/strict';
import test from 'node:test';
import { generateBirthProfile } from '../src/game/generation';
import {
  advance,
  advanceTime,
  availableActions,
  makeLife,
  resolveChoice,
  type ActionId,
} from '../src/game/simulation';
import { canDecide, journalPresentation, pendingDecision } from '../src/game/event-rules';
import type { Life, LifeEvent } from '../src/game/domain';
import { loadLife, saveLife } from '../src/game/storage';

function lifeAt(age: number): Life {
  const life = makeLife(generateBirthProfile({ countryCode: 'RU' }));
  life.birthDate = '2000-01-01';
  life.currentDate = `${2000 + age}-01-01`;
  life.age = age;
  life.events = [];
  delete life.simulation;
  return life;
}
function rng(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
function assertEvent(event: LifeEvent) {
  assert.ok(
    event.actor?.name && event.target?.name && event.context && event.kind && event.templateId,
  );
  assert.ok(event.description.length > 20);
  assert.ok(!/^(Обнять|Отнять) ребёнка$/.test(event.title));
  assert.ok(!event.description.includes('undefined'));
}

test('Infancy: no player actions, no decisions; the timer produces attributed caregiving/world events', () => {
  const life = lifeAt(0),
    identity = JSON.stringify([life.character, life.family, life.location]);
  for (const age of [0, 1, 2]) assert.deepEqual(availableActions(age), []);
  const before = JSON.stringify(life);
  for (const id of ['sleep', 'play', 'read', 'cuddle', 'walk', 'explore'])
    advance(life, id as ActionId);
  assert.equal(
    JSON.stringify(life),
    before,
    'Infants cannot execute even injected/legacy action IDs',
  );
  const random = rng(10);
  for (let month = 0; month < 35; month++) {
    advanceTime(life, 1, random);
    assert.equal(pendingDecision(life), null);
    assert.ok(!life.events.some((e) => e.choices || e.kind === 'action'));
    assertEvent(life.events[0]);
  }
  assert.equal(JSON.stringify([life.character, life.family, life.location]), identity);
  assert.ok(life.events.some((e) => e.actor?.kind === 'family' && e.target?.id === life.id));
  assert.ok(life.events.filter((e) => e.kind === 'life').length <= 3);
});

for (const age of [3, 6, 12, 13, 17, 18, 35, 70]) {
  test(`Age ${age}: actions, automatic events and four-way decisions have an age-appropriate context`, () => {
    const life = lifeAt(age);
    const ids = availableActions(age).map((a) => a.id);
    assert.ok(ids.includes('sleep'));
    assert.equal(ids.includes('play'), age <= 12);
    assert.equal(ids.includes('explore'), age >= 10);
    advanceTime(life, 1, () => 0);
    const decision = pendingDecision(life);
    if (age < 13 && age !== 3) {
      assert.equal(decision, null, 'Minor life events do not interrupt childhood');
      return;
    }
    assert.ok(
      decision && decision.choices && decision.choices.length >= 2 && decision.choices.length <= 4,
    );
    assertEvent(decision!);
    assert.ok(canDecide(life, decision!));
    const text = JSON.stringify(decision);
    if (age < 6) assert.ok(!/одноклассник|после уроков|самостоятельно.*маршрут/i.test(text));
    if (age >= 18)
      assert.ok(!/одноклассник|после уроков|родитель помогает договориться/i.test(text));
    const locked = JSON.stringify(life);
    advanceTime(life, 12, () => 0);
    assert.equal(
      JSON.stringify(life),
      locked,
      'Time cannot pass while an eligible decision is pending',
    );
    resolveChoice(life, decision!.id, decision!.choices!.length - 1);
    assert.equal(pendingDecision(life), null);
    assert.equal(decision!.resolution?.actor.id, life.id);
    assert.equal(decision!.outcome, decision!.choices!.at(-1)!.result);
    const resolved = JSON.stringify(life.stats);
    resolveChoice(life, decision!.id, decision!.choices!.length - 1);
    assert.equal(JSON.stringify(life.stats), resolved, 'A result cannot be applied twice');
    const date = life.currentDate;
    advanceTime(life, 1, () => 0.99);
    assert.notEqual(life.currentDate, date);
  });
}

test('Capability checks apply to the API as well as the menu', () => {
  const life = lifeAt(15);
  life.stats.energy = 0;
  assert.deepEqual(
    availableActions(life.age, life.stats).map((a) => a.id),
    ['sleep'],
  );
  const before = JSON.stringify(life);
  advance(life, 'explore');
  assert.equal(JSON.stringify(life), before);
  advance(life, 'sleep', 1, () => 0.99);
  assert.ok(life.stats.energy > 0);
  const entry = life.events.find((e) => e.kind === 'action')!;
  assertEvent(entry);
  assert.equal(entry.actor?.id, life.id);
});

test('Baby caregiving uses real relatives and correct gender; absent relatives are not invented', () => {
  const life = lifeAt(0);
  advanceTime(life, 1, () => 0);
  const event = life.events[0];
  assert.equal(event.templateId, 'care-embrace');
  assert.equal(event.actor?.id, life.family.find((p) => p.relationship === 'Мама')?.id);
  assert.match(event.description, /Мама обняла/);
  life.family = [];
  life.events = [];
  delete life.simulation;
  advanceTime(life, 1, () => 0);
  assert.equal(life.events[0].actor?.kind, 'person');
  assert.match(life.events[0].description, /Близкий взрослый обнял/);
  assert.ok(!life.events[0].description.includes('Мама'));
});

test('Automatic templates have a rolling cooldown, also across save/reload', () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
    },
  });
  let life = lifeAt(0);
  for (let i = 0; i < 24; i++) {
    const recent = life.events
      .filter((e) => e.kind === 'life')
      .slice(0, 3)
      .map((e) => e.templateId);
    advanceTime(life, 1, () => 0);
    for (const event of life.events.filter((e) => e.date === life.currentDate))
      assert.ok(!recent.includes(event.templateId));
    assert.ok(saveLife(life));
    life = loadLife()!;
  }
  assert.ok(
    new Set(life.events.filter((e) => e.kind === 'life').map((e) => e.templateId)).size === 2,
  );
});

test('A year is twelve chronological months, with every birthday and the first decision respected', () => {
  const life = lifeAt(0);
  advanceTime(life, 12, () => 0.99);
  assert.equal(life.currentDate, '2001-01-01');
  assert.equal(life.age, 1);
  assert.equal(new Set(life.events.filter((e) => e.kind === 'life').map((e) => e.date)).size, 1);
  assert.equal(life.events.filter((e) => e.templateId === 'milestone-1').length, 1);
  const child = lifeAt(2);
  child.currentDate = '2002-12-01';
  advanceTime(child, 12, () => 0);
  assert.equal(child.currentDate, '2003-01-01');
  assert.equal(child.age, 3);
  assert.equal(pendingDecision(child)?.templateId, 'preschool-interest');
  const dates = life.events.map((e) => e.date);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

test('All four life stages remain coherent over thirty years', () => {
  const life = lifeAt(0),
    random = rng(987);
  const stages = new Set<string>();
  for (let i = 0; i < 360; i++) {
    advanceTime(life, 1, random);
    const pending = pendingDecision(life);
    if (pending) {
      assert.ok(life.age >= 3);
      assert.ok(
        life.age >= pending.eligibility!.minAge &&
          life.age <= (pending.eligibility!.maxAge ?? Infinity),
      );
      stages.add(
        life.age < 6 ? 'early' : life.age < 13 ? 'child' : life.age < 18 ? 'teen' : 'adult',
      );
      resolveChoice(life, pending.id, 0);
    }
  }
  assert.equal(life.age, 30);
  assert.deepEqual([...stages].sort(), ['adult', 'early', 'teen']);
  life.events.forEach(assertEvent);
  const decisions = life.events.filter((e) => e.kind === 'decision');
  const month = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));
  for (let i = 1; i < decisions.length; i++)
    assert.ok(month(decisions[i - 1].date) - month(decisions[i].date) >= 1);
});

test('Legacy history is preserved; impossible old choices do not block time or apply effects', () => {
  const life = lifeAt(0);
  const legacy: LifeEvent = {
    id: 'old',
    date: life.currentDate,
    age: 0,
    title: 'После уроков',
    description: 'Старая запись',
    choices: [{ label: 'Играть', result: 'Старый результат', effects: { happiness: 100 } }],
  };
  life.events.push(legacy);
  assert.equal(pendingDecision(life), null);
  const stats = JSON.stringify(life.stats);
  resolveChoice(life, legacy.id, 0);
  assert.equal(JSON.stringify(life.stats), stats);
  advanceTime(life, 1, () => 0.99);
  assert.equal(life.currentDate, '2000-02-01');
  assert.equal(legacy.outcome, undefined);
  const ambiguous = { ...legacy, title: 'Отнять ребёнка', choices: undefined };
  assert.equal(journalPresentation(ambiguous).title, 'Запись из старого дневника');
  assert.equal(ambiguous.title, 'Отнять ребёнка', 'The view must not rewrite saved history');
});

test('Calendar boundaries do not skip February or generate future events', () => {
  const life = lifeAt(20);
  life.currentDate = '2020-01-31';
  advanceTime(life, 1, () => 0.99);
  assert.equal(life.currentDate, '2020-02-29');
  assert.ok(life.events.every((e) => e.date <= life.currentDate));
  const before = JSON.stringify(life);
  advanceTime(life, NaN);
  advanceTime(life, -1);
  advanceTime(life, 1.5);
  assert.equal(JSON.stringify(life), before);
});
