import assert from 'node:assert/strict';
import test from 'node:test';
import { generateBirthProfile } from '../src/game/generation';
import { advanceTime, makeLife, resolveChoice } from '../src/game/simulation';
import { canChoose, pendingDecision } from '../src/game/event-rules';
import { ensureSimulation, monthIndex, addNpc } from '../src/game/causal-state';
import { coreDecision, conditionsMatch, runCoreMonth } from '../src/game/causal-engine';
import { saveLife, loadLife } from '../src/game/storage';
import { validSimulation } from '../src/game/causal-validation';
import type { Life, LifeEvent } from '../src/game/domain';

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  },
});
function lifeAt(age: number, countryCode = 'RU'): Life {
  const life = makeLife(generateBirthProfile({ countryCode }));
  life.birthDate = '2000-01-01';
  life.currentDate = `${2000 + age}-01-01`;
  life.age = age;
  life.events = [];
  delete life.simulation;
  ensureSimulation(life);
  return life;
}
function rng(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
function emit(life: Life): LifeEvent {
  const draft = coreDecision(life);
  assert.ok(draft);
  const event = { ...draft, id: draft.id!, date: life.currentDate, age: life.age };
  life.events.unshift(event);
  return event;
}
function chooseAffordable(life: Life, index = 0) {
  const event = pendingDecision(life);
  if (!event) return;
  const chosen = canChoose(life, event, index)
    ? index
    : event.choices!.findIndex((_, i) => canChoose(life, event, i));
  assert.ok(chosen >= 0);
  resolveChoice(life, event.id, chosen);
}

test('Old saves are upgraded lazily without renaming or rewriting history', () => {
  const life = lifeAt(3);
  delete life.simulation;
  const old = structuredClone(life);
  assert.ok(saveLife(life));
  assert.deepEqual(loadLife(), old);
  advanceTime(life, 1, () => 0.99);
  assert.equal(life.simulation?.version, 1);
  assert.deepEqual(life.character, old.character);
  assert.deepEqual(life.family, old.family);
  assert.deepEqual(life.location, old.location);
});

test('Conditions cover age, location, health, finances, traits, education, work and relationships', () => {
  const life = lifeAt(18),
    s = ensureSimulation(life);
  life.character.traits = ['любознательный'];
  const npc = addNpc(life, 'friend', () => 0.4);
  assert.ok(
    conditionsMatch(life, [
      { type: 'age', min: 18 },
      { type: 'location', country: 'RU' },
      { type: 'stat', key: 'health', min: 50 },
      { type: 'cash', min: 1 },
      { type: 'trait', pattern: 'любознатель' },
      { type: 'education', value: 'school' },
      { type: 'job', value: 'unemployed' },
      { type: 'relationship', npcId: npc.id, minTrust: 20 },
      { type: 'flag', key: 'absent', value: false },
    ]),
  );
  assert.ok(!conditionsMatch(life, [{ type: 'location', country: 'JP' }]));
  assert.ok(!conditionsMatch(life, [{ type: 'skill', key: 'learning', min: 5 }]));
  s.person.skills.learning = 5;
  assert.ok(conditionsMatch(life, [{ type: 'skill', key: 'learning', min: 5 }]));
});

test('Paid training has an immediate cost, a two-year outcome and a better job offer', () => {
  const life = lifeAt(16),
    s = ensureSimulation(life);
  s.person.money.cash = 100;
  const event = emit(life);
  assert.equal(event.templateId, 'training-path');
  resolveChoice(life, event.id, 0);
  assert.equal(s.person.money.cash, 60);
  assert.equal(s.queue.length, 1);
  assert.equal(s.queue[0].dueMonth, monthIndex(life.currentDate) + 24);
  const paid = structuredClone(life),
    self = lifeAt(16);
  ensureSimulation(self).person.money.cash = 100;
  const selfEvent = emit(self);
  resolveChoice(self, selfEvent.id, 1);
  for (let i = 0; i < 24; i++) {
    advanceTime(paid, 1, () => 0.99);
    chooseAffordable(paid);
    advanceTime(self, 1, () => 0.99);
    chooseAffordable(self);
  }
  const a = ensureSimulation(paid),
    b = ensureSimulation(self);
  assert.equal(a.person.education, 'vocational');
  assert.notEqual(b.person.education, 'vocational');
  assert.equal(a.queue[0].status, 'applied');
  assert.ok(a.queue[0].completedEventId);
  const follow = paid.events.find((e) => e.id === a.queue[0].completedEventId)!;
  assert.ok(follow.cause?.sourceEventIds.includes(event.id));
  assert.ok(a.person.job.income > b.person.job.income);
  const before = structuredClone(a.queue[0]);
  runCoreMonth(paid, () => 0.99);
  assert.deepEqual(a.queue[0], before, 'Same month cannot apply a delayed outcome twice');
});

test('A job offer cites learning rather than an unrelated recent health consequence', () => {
  const life = lifeAt(18),
    s = ensureSimulation(life);
  s.person.flags['training-planned'] = true;
  s.person.skills.learning = 4;
  const learning: LifeEvent = {
    id: 'learning-result',
    date: life.currentDate,
    age: 18,
    title: 'Завершено обучение',
    description: 'Получены навыки.',
    appliedConsequences: [{ skills: { learning: 4 }, education: 'vocational' }],
  };
  const health: LifeEvent = {
    id: 'health-result',
    date: life.currentDate,
    age: 18,
    title: 'Самочувствие улучшилось',
    description: 'Отдых помог.',
    cause: { ruleId: 'due-health', facts: [], sourceEventIds: [] },
    appliedConsequences: [{ stats: { health: 10 } }],
  };
  life.events = [health, learning];
  const offer = emit(life);
  assert.equal(offer.templateId, 'job-offer');
  assert.deepEqual(offer.cause?.sourceEventIds, [learning.id]);
});

test('A queued consequence survives reload, and can be cancelled by changed prerequisites', () => {
  let life = lifeAt(16),
    s = ensureSimulation(life);
  const event = emit(life);
  resolveChoice(life, event.id, 1);
  for (let i = 0; i < 12; i++) {
    advanceTime(life, 1, () => 0.99);
    chooseAffordable(life, 1);
  }
  assert.ok(saveLife(life));
  life = loadLife()!;
  s = ensureSimulation(life);
  assert.equal(s.queue[0].status, 'pending');
  s.person.flags['training-planned'] = false;
  for (let i = 0; i < 12; i++) {
    advanceTime(life, 1, () => 0.99);
    chooseAffordable(life, 1);
  }
  assert.equal(s.queue[0].status, 'cancelled');
  assert.equal(s.person.education, 'school');
  assert.ok(
    life.events.some(
      (e) => e.consequenceStatus === 'cancelled' && e.cause?.sourceEventIds.includes(event.id),
    ),
  );
});

test('Insufficient money disables a choice and rejects direct invocation without mutation', () => {
  const life = lifeAt(16),
    s = ensureSimulation(life);
  s.person.money.cash = 0;
  const event = emit(life);
  assert.equal(canChoose(life, event, 0), false);
  assert.equal(canChoose(life, event, 1), true);
  const before = JSON.stringify(life);
  resolveChoice(life, event.id, 0);
  assert.equal(JSON.stringify(life), before);
  resolveChoice(life, event.id, 1);
  const after = JSON.stringify(life);
  resolveChoice(life, event.id, 1);
  assert.equal(JSON.stringify(life), after);
});

test('NPC remembers support and initiates a reciprocal consequence three years later', () => {
  const life = lifeAt(13),
    s = ensureSimulation(life);
  const friend = addNpc(life, 'friend', () => 0.4);
  const event = emit(life);
  assert.equal(event.templateId, 'friend-request');
  resolveChoice(life, event.id, 0);
  assert.ok(friend.memory.some((m) => m.eventId === event.id));
  assert.ok(s.relationships[friend.id].trust > 30);
  for (let i = 0; i < 36; i++) {
    advanceTime(life, 1, () => 0.99);
    chooseAffordable(life, 1);
  }
  const queued = s.queue.find((item) => item.sourceEventId === event.id)!;
  assert.equal(queued.status, 'applied');
  assert.ok(life.events.find((e) => e.id === queued.completedEventId)?.actor?.id === friend.id);
});

test('Relationships can worsen and recover, with NPC memory preserving both decisions', () => {
  const life = lifeAt(13),
    s = ensureSimulation(life),
    friend = addNpc(life, 'friend', () => 0.4);
  const request = emit(life);
  resolveChoice(life, request.id, 2);
  assert.ok(s.relationships[friend.id].bond < 10);
  const repair = emit(life);
  assert.equal(repair.templateId, 'repair-friendship');
  resolveChoice(life, repair.id, 0);
  assert.ok(s.relationships[friend.id].bond >= 20);
  assert.ok(friend.memory.some((m) => m.eventId === request.id));
  assert.ok(friend.memory.some((m) => m.eventId === repair.id));
});

test('NPC autonomously contacts an acquaintance without pausing for a minor event', () => {
  const life = lifeAt(8),
    s = ensureSimulation(life),
    friend = addNpc(life, 'friend', () => 0.4);
  s.relationships[friend.id].lastContactMonth -= 18;
  const intro={id:'intro-'+friend.id,title:'Знакомство на занятии',description:'Первая общая игра.',date:'2006-01-01',age:6,kind:'life' as const,templateId:'new-friend'};
  life.events.push(intro);friend.memory.push({id:'memory-'+friend.id,eventId:intro.id,date:intro.date,summary:intro.description});
  friend.stats.happiness = 40;
  advanceTime(life, 1, () => 0.99);
  const contact = life.events.find((e) => e.templateId === `npc-contact-${friend.id}`)!;
  assert.ok(contact?.actor?.id === friend.id);
  assert.equal(contact.kind, 'life');
  assert.equal(pendingDecision(life), null);
  assert.ok(friend.memory.some((m) => m.eventId === contact.id));
});

test('Income groups change only documented model parameters; missing countries use an explicit neutral profile', () => {
  const high = ensureSimulation(lifeAt(18, 'CH')),
    low = ensureSimulation(lifeAt(18, 'BI'));
  assert.notEqual(high.world.incomeGroup, low.world.incomeGroup);
  assert.ok(high.world.wage > low.world.wage);
  const life = lifeAt(18);
  delete life.simulation;
  delete life.location.birthplace;
  life.location.country = 'Unknown source country';
  const neutral = ensureSimulation(life);
  assert.equal(neutral.world.incomeGroup, 'unknown');
  assert.equal(neutral.world.calibration, 'game-model');
});

test('Monthly budget, savings and debt are real state transitions, never charged to an infant', () => {
  const baby = lifeAt(0);
  advanceTime(baby, 12, () => 0.99);
  assert.equal(ensureSimulation(baby).person.money.debt, 0);
  const adult = lifeAt(30),
    s = ensureSimulation(adult);
  s.person.flags['training-planned'] = true;
  const before = s.person.money.cash;
  advanceTime(adult, 1, () => 0.99);
  assert.equal(s.person.money.cash, before - s.person.money.expenses);
  s.person.money.cash = 0;
  chooseAffordable(adult);
  advanceTime(adult, 1, () => 0.99);
  assert.ok(s.person.money.debt > 0);
  const worker = lifeAt(30),
    w = ensureSimulation(worker);
  w.person.job = { status: 'employed', title: 'Работа', income: 200 };
  w.person.flags['training-planned'] = true;
  w.person.money.cash = w.person.money.expenses * 4;
  const reserve = emit(worker);
  assert.equal(reserve.templateId, 'financial-reserve');
  resolveChoice(worker, reserve.id, 0);
  assert.ok(w.person.money.savings > 0);
});

test('Unsupported/corrupt simulation versions are rejected without erasing stored bytes', () => {
  const life = lifeAt(18),
    raw = JSON.parse(JSON.stringify(life));
  raw.simulation.version = 9;
  memory.set('no-rules-life-v1', JSON.stringify(raw));
  const bytes = memory.get('no-rules-life-v1');
  assert.equal(loadLife(), null);
  assert.equal(memory.get('no-rules-life-v1'), bytes);
  raw.simulation.version = 1;
  raw.simulation.person.money.cash = 'bad';
  assert.equal(validSimulation(raw.simulation), false);
});

test('Twenty lives reach age 85 with finite budgets, chronological events, valid saves and bounded NPC memory', () => {
  for (let seed = 1; seed <= 20; seed++) {
    let life = lifeAt(0, ['RU', 'JP', 'IN', 'ZA', 'CH'][seed % 5]);
    const random = rng(seed);
    for (let month = 0; month < 85 * 12; month++) {
      advanceTime(life, 1, random);
      chooseAffordable(life, seed % 3);
      if (month % 60 === 0) {
        assert.ok(saveLife(life));
        life = loadLife()!;
        assert.ok(life);
      }
    }
    assert.equal(life.age, 85);
    const state = ensureSimulation(life);
    assert.ok(validSimulation(state));
    assert.equal(state.person.job.status, 'retired');
    assert.ok(state.person.flags['retirement-chosen']);
    assert.ok(Object.values(state.npcs).every((npc) => npc.memory.length <= 64));
    assert.ok(life.events.every((e) => e.date <= life.currentDate));
    assert.equal(new Set(state.queue.map((effect) => effect.id)).size, state.queue.length);
  }
});

test('NPC native RTL names remain unchanged and isolated in a Russian causal event', () => {
  const life = lifeAt(8),
    state = ensureSimulation(life),
    friend = addNpc(life, 'friend', () => 0.4);
  friend.name = 'أحمد علي';
  const intro={id:'intro-'+friend.id,title:'Знакомство на занятии',description:'Первая общая игра.',date:'2006-01-01',age:6,kind:'life' as const,templateId:'new-friend'};
  life.events.push(intro);friend.memory.push({id:'memory-'+friend.id,eventId:intro.id,date:intro.date,summary:intro.description});
  friend.stats.happiness = 40;
  state.relationships[friend.id].lastContactMonth -= 18;
  advanceTime(life, 1, () => 0.99);
  const contact = life.events.find((e) => e.templateId === `npc-contact-${friend.id}`)!;
  assert.ok(contact.description.includes(`\u2068${friend.name}\u2069`));
  assert.equal(friend.name, 'أحمد علي');
});

test('Career review requires experience, skills and colleague trust rather than a random promotion', () => {
  const life = lifeAt(25),
    s = ensureSimulation(life);
  s.person.flags['training-planned'] = true;
  s.person.skills.learning = 6;
  s.person.job = { status: 'employed', title: 'Специалист', income: 150 };
  s.fired['career-review'] = monthIndex(life.currentDate) - 24;
  const colleague = addNpc(life, 'colleague', () => 0.4);
  s.relationships[colleague.id].trust = 40;
  advanceTime(life, 1, () => 0.99);
  assert.ok(s.person.job.income > 150);
  assert.ok(life.events.some((e) => e.templateId === 'career-review' && e.cause?.facts.length));
});

test('NPC autonomy never asks an infant or toddler to hold an adult conversation', () => {
  const life = lifeAt(0),
    state = ensureSimulation(life);
  const sibling = addNpc(life, 'friend', () => 0.4);
  sibling.role = 'sibling';
  sibling.age = 2;
  sibling.bornMonth = monthIndex(life.currentDate) - 24;
  sibling.stats.happiness = 10;
  state.relationships[sibling.id].lastContactMonth -= 20;
  advanceTime(life, 12, () => 0.99);
  assert.ok(!life.events.some((event) => event.templateId?.startsWith('npc-contact-')));
  assert.equal(pendingDecision(life), null);
});
