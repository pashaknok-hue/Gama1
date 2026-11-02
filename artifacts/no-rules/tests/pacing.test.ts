import test from 'node:test';
import assert from 'node:assert/strict';
import { monthDurationMs } from '../src/game/pacing';
import { seededLife } from '../src/game/seeded-life';
import { advanceTime, advanceToNextDecision, resolveChoice } from '../src/game/simulation';
import { pendingDecision } from '../src/game/event-rules';
import { saveLife, loadLife } from '../src/game/storage';
const bytes = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => bytes.get(k) ?? null,
    setItem: (k: string, v: string) => bytes.set(k, v),
  },
});
function makuu() {
  const life = seededLife(20040521, { countryCode: 'KE' });
  life.birthDate = life.currentDate = '2004-05-21';
  life.age = 0;
  life.character.name = 'Makuu Owuor';
  delete life.character.personalName;
  life.events = [];
  delete life.simulation;
  return life;
}
test('Age bands give exactly 5/10/25/40 seconds per year and retain the adult month', () => {
  for (const [age, year] of [
    [0, 5],
    [2, 5],
    [3, 10],
    [5, 10],
    [6, 25],
    [11, 25],
    [12, 40],
    [17, 40],
  ])
    assert.ok(Math.abs(monthDurationMs(age) * 12 - year * 1000) < 0.0001);
  assert.equal(monthDurationMs(18), 10000);
});
test('Makuu: first decision at the third birthday after 36 months / 15 real seconds', () => {
  const life = makuu();
  let realMs = 0;
  for (let m = 0; m < 36; m++) {
    realMs += monthDurationMs(life.age);
    advanceTime(life);
    if (m < 35) assert.equal(pendingDecision(life), null);
  }
  assert.equal(life.currentDate, '2007-05-21');
  assert.equal(life.age, 3);
  assert.ok(Math.abs(realMs - 15000) < 0.001);
  assert.equal(pendingDecision(life)?.templateId, 'preschool-interest');
  const observations = life.events.filter((e) => /^care-|rain-window/.test(e.templateId ?? ''));
  assert.ok(observations.length <= 3);
  assert.equal(new Set(observations.map((e) => e.templateId)).size, observations.length);
  const paused = JSON.stringify(life);
  advanceTime(life, 12);
  assert.equal(JSON.stringify(life), paused);
});
test('Next-choice search is identical to monthly simulation and survives reload', () => {
  const fast = makuu(),
    normal = structuredClone(fast);
  for (let m = 0; m < 36; m++) advanceTime(normal);
  assert.equal(advanceToNextDecision(fast), 36);
  assert.deepEqual(fast, normal);
  assert.ok(saveLife(fast));
  const loaded = loadLife()!;
  assert.deepEqual(loaded, fast);
  assert.equal(advanceToNextDecision(loaded), 0);
  const first = pendingDecision(loaded)!;
  resolveChoice(loaded, first.id, 0);
  assert.equal(advanceToNextDecision(loaded), 12);
  assert.equal(loaded.currentDate, '2008-05-21');
  const sharing = pendingDecision(loaded)!;
  assert.equal(sharing.templateId, 'preschool-sharing');
  resolveChoice(loaded, sharing.id, 0);
  assert.equal(advanceToNextDecision(loaded), 12);
  assert.equal(loaded.currentDate, '2009-05-21');
  assert.ok(loaded.simulation!.queue.some((q) => q.status === 'applied'));
  for (const age of [1, 3])
    assert.equal(loaded.events.filter((e) => e.templateId === `milestone-${age}`).length, 1);
  assert.ok(loaded.events.some((e) => e.templateId === 'birthday-2'));
  assert.ok(loaded.events.some((e) => e.templateId === 'birthday-4'));
});
test('Legacy toddler save progresses from April to first birthday choice, never regenerating identity', () => {
  const life = makuu();
  life.currentDate = '2007-04-21';
  life.age = 2;
  const identity = JSON.stringify(life.character);
  assert.ok(saveLife(life));
  const loaded = loadLife()!;
  assert.equal(advanceToNextDecision(loaded), 1);
  assert.equal(loaded.currentDate, '2007-05-21');
  assert.equal(JSON.stringify(loaded.character), identity);
});

test('Quiet months include ordinary recovery without draining every child before school', () => {
  const life = makuu(),
    energy = life.stats.energy,
    mood = life.stats.happiness;
  advanceTime(life, 12);
  assert.ok(life.stats.energy >= energy);
  assert.ok(life.stats.happiness >= mood);
  assert.ok(life.events.filter((e) => e.kind === 'life').length <= 1);
});
