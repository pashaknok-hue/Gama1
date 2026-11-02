import test from 'node:test';
import assert from 'node:assert/strict';
import { seededLife } from '../src/game/seeded-life';
import { addNpc, ensureSimulation, hasRole, remember } from '../src/game/causal-state';
import { runCoreMonth, coreDecision } from '../src/game/causal-engine';
import { resolveChoice, advanceTime } from '../src/game/simulation';
import { pendingDecision, canChoose } from '../src/game/event-rules';
import { validSimulation } from '../src/game/causal-validation';
function adult() {
  const life = seededLife(331);
  life.birthDate = '2000-01-01';
  life.currentDate = '2021-01-01';
  life.age = 21;
  life.events = [];
  delete life.simulation;
  const s = ensureSimulation(life);
  s.person.flags['training-planned'] = true;
  return life;
}
test('Childhood acquaintance returns as a colleague with the same identity and history', () => {
  const life = adult(),
    s = ensureSimulation(life),
    friend = addNpc(life, 'friend', () => 0.4);
  s.relationships[friend.id].trust = 60;
  life.events.push({
    id: 'shared',
    title: 'Общий проект',
    description: 'Встреча',
    date: life.currentDate,
    age: 21,
  });
  remember(life, friend.id, 'shared', 'Работали вместе');
  s.person.job = { status: 'employed', title: 'Работа', income: 100 };
  life.currentDate = '2021-02-01';
  const events = runCoreMonth(life, () => 0.5),
    returned = events.find((e) => e.templateId === 'new-colleague')!;
  assert.equal(returned.actor.id, friend.id);
  assert.ok(hasRole(friend, 'friend'));
  assert.ok(hasRole(friend, 'colleague'));
  assert.deepEqual(returned.cause?.sourceEventIds, ['shared']);
  assert.ok(validSimulation(s));
});
test('Sport, trial enterprise and closeness have different persistent results', () => {
  for (const path of ['sport-routine', 'business-trial', 'romantic-boundary']) {
    const life = adult(),
      s = ensureSimulation(life);
    s.person.flags['friend-request-answered'] = true;
    if (path === 'sport-routine') s.person.flags['movement-practice'] = true;
    if (path === 'business-trial') {
      s.person.money.cash = 1000;
      s.person.skills.craft = 3;
      s.person.flags['creative-chosen'] = true;
    }
    if (path === 'romantic-boundary') {
      const f = addNpc(life, 'friend', () => 0.5);
      s.relationships[f.id].bond = 60;
      s.relationships[f.id].trust = 60;
    }
    const draft = coreDecision(life)!;
    assert.equal(draft.templateId, path);
    const event = { ...draft, id: draft.id ?? 'chosen', date: life.currentDate, age: life.age };
    life.events.unshift(event);
    resolveChoice(life, event.id, 0);
    for (let i = 0; i < 12; i++) {
      advanceTime(life);
      const e = pendingDecision(life);
      if (e)
        resolveChoice(
          life,
          e.id,
          e.choices!.findIndex((_, i) => canChoose(life, e, i)),
        );
    }
    assert.equal(s.queue.find((q) => q.sourceEventId === event.id)?.status, 'applied');
    if (path === 'sport-routine') assert.equal(s.person.habits?.movement, 3);
    if (path === 'business-trial') assert.equal(s.person.reputation, 3);
    assert.ok(validSimulation(s));
  }
});

test('Optional random state and biography reject corruption while legacy data remains valid', async () => {
  const { isValidLife } = await import('../src/game/storage');
  const life = seededLife(6);
  assert.ok(isValidLife(life));
  life.rng!.state = NaN;
  assert.equal(isValidLife(life), false);
  delete life.rng;
  assert.ok(isValidLife(life));
  life.simulation!.person.habits = { movement: Infinity };
  assert.equal(isValidLife(life), false);
});
