import test from 'node:test';
import assert from 'node:assert/strict';
import { vadimKyiv, deterministicVadimKyiv } from './fixtures/vadim-kyiv';
import { advanceTime, availableActions } from '../src/game/simulation';
import { saveLife, loadLife } from '../src/game/storage';
import { monthIndex } from '../src/game/causal-state';
const bytes = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => bytes.get(k) ?? null,
    setItem: (k: string, v: string) => bytes.set(k, v),
  },
});

test('Vadim Yanyuk, Kyiv, 3 Dec 2000: January–March 2001 never repeat infant actions', () => {
  let life = vadimKyiv();
  const identity = JSON.stringify([life.character, life.family, life.location]);
  for (const date of ['2001-01-03', '2001-02-03', '2001-03-03']) {
    advanceTime(life, 1, () => 0); // Adversarial RNG always requests the first eligible template.
    assert.equal(life.currentDate, date);
    assert.equal(life.age, 0);
    assert.deepEqual(availableActions(life.age), []);
    assert.ok(saveLife(life));
    life = loadLife()!;
  }
  const entries = life.events.filter((e) => e.date > '2000-12-03');
  assert.equal(entries.length, 1);
  assert.ok(entries.every((e) => e.kind === 'life' && !e.choices));
  assert.ok(
    entries.every(
      (e) => (e.actor?.id !== life.id && e.target?.id === life.id) || e.actor?.kind === 'world',
    ),
  );
  assert.equal(new Set(entries.map((e) => e.templateId)).size, 1);
  assert.equal(entries.filter((e) => e.templateId === 'care-embrace').length, 1);
  assert.ok(
    !entries.some((e) =>
      ['Обнять ребёнка', 'Хорошо выспаться', 'Играть во дворе'].includes(e.title),
    ),
  );
  assert.equal(JSON.stringify([life.character, life.family, life.location]), identity);
});

test('The same Kyiv life respects a six-month care cooldown through the first birthday', () => {
  let life = deterministicVadimKyiv();
  for (let month = 0; month < 12; month++) {
    advanceTime(life);
    assert.ok(saveLife(life));
    life = loadLife()!;
  }
  assert.equal(life.currentDate, '2001-12-03');
  assert.equal(life.age, 1);
  assert.equal(life.events.filter((e) => e.templateId === 'milestone-1').length, 1);
  const last = new Map<string, number>();
  for (const e of [...life.events].reverse())
    if (e.kind === 'life' && e.templateId) {
      const now = monthIndex(e.date);
      if (last.has(e.templateId)) assert.ok(now - last.get(e.templateId)! >= 6);
      last.set(e.templateId, now);
    }
});

test('Browser regression uses exactly the same sourced Kyiv fixture', async () => {
  const { readFileSync } = await import('node:fs');
  assert.deepEqual(
    JSON.parse(readFileSync(new URL('./fixtures/vadim-kyiv.json', import.meta.url), 'utf8')),
    JSON.parse(JSON.stringify(vadimKyiv())),
  );
});
