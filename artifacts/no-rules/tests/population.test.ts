import { reconcile } from '../src/game/finance';
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { seededLife } from '../src/game/seeded-life';
import { advanceTime, advance, availableActions, resolveChoice } from '../src/game/simulation';
import { pendingDecision, canChoose } from '../src/game/event-rules';
import { civilAge, validDate } from '../src/game/calendar';
import { monthIndex } from '../src/game/causal-state';
import { worldCountries } from '../src/game/world';
import { saveLife, loadLife } from '../src/game/storage';
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
  },
});
function settle(life: ReturnType<typeof seededLife>, policy: number) {
  const event = pendingDecision(life);
  if (!event) return;
  const choices = event.choices!.map((_, i) => i).filter((i) => canChoose(life, event, i));
  assert.ok(choices.length);
  resolveChoice(life, event.id, choices[policy % choices.length]);
}
test('Same seed and choices reproduce identities, complete history and random continuation across reload', () => {
  let a = seededLife(314),
    b = seededLife(314);
  assert.deepEqual(a, b);
  for (let i = 0; i < 300; i++) {
    advanceTime(a);
    advanceTime(b);
    settle(a, 0);
    settle(b, 0);
    if (i === 150) {
      assert.ok(saveLife(b));
      b = loadLife()!;
    }
  }
  assert.deepEqual(a, b);
});
test(
  '1000 seeded lives from birth to 85: calendar, names, choices, memory, links and storage',
  { timeout: 600_000 },
  () => {
    const started = Date.now(),
      countries = worldCountries.filter((c) => c.unMember),
      seen = new Set<string>();
    let events = 0,
      decisions = 0,
      missingNames = 0,
      saves = 0;
    const paths = new Set<string>();
    for (let index = 0; index < 1000; index++) {
      let life = seededLife(index + 10000, {
        countryCode: countries[index % countries.length].code,
      });
      seen.add(life.location.birthplace!.countryCode);
      for (const person of [life.character, ...life.family]) {
        assert.ok(person.name.trim());
        if (person.name === 'Имя не указано') missingNames++;
      }
      const identity = JSON.stringify([life.character, life.family, life.location]);
      for (let month = 0; month < 1020; month++) {
        const before = monthIndex(life.currentDate),
          actions = availableActions(life.age, life.stats);
        const desired = ['create', 'help', 'explore', 'walk', 'learn'][index % 5];
        if (month % 3 === 0 && actions.some((a) => a.id === desired)) advance(life, desired as any);
        else advanceTime(life);
        assert.equal(monthIndex(life.currentDate), before + 1);
        assert.equal(life.age, civilAge(life.currentDate, life.birthDate));
        assert.ok(validDate(life.currentDate));
        const decision = pendingDecision(life);
        if (decision) {
          decisions++;
          paths.add(decision.templateId!);
          assert.ok(decision.choices!.length >= 2 && decision.choices!.length <= 4);
          assert.ok(life.age >= decision.eligibility!.minAge);
          assert.ok(life.age <= (decision.eligibility!.maxAge ?? Infinity));
          settle(life, index);
          assert.ok(!pendingDecision(life));
        }
        if (month % 240 === 0) {
          assert.ok(saveLife(life));
          const prior = JSON.stringify(life);
          life = loadLife()!;
          assert.equal(JSON.stringify(life), prior);
          saves++;
        }
      }
      assert.equal(life.age, 85);
      assert.equal(JSON.stringify([life.character, life.family, life.location]), identity);
      const ids = new Set(life.events.map((e) => e.id));
      assert.equal(ids.size, life.events.length);
      const last = new Map<string, number>();
      for (const e of [...life.events].reverse()) {
        assert.equal(e.age, civilAge(e.date, life.birthDate));
        assert.ok(e.actor?.name.trim());
        assert.ok(e.target?.name.trim());
        for (const source of e.cause?.sourceEventIds ?? [])
          assert.ok(ids.has(source), `Dangling cause: ${source}`);
        if (
          e.templateId?.match(/^(care-|early-|child-|teen-|adult-|rain-|elder-)/) &&
          e.kind === 'life'
        ) {
          const now = monthIndex(e.date);
          if (last.has(e.templateId)) assert.ok(now - last.get(e.templateId)! >= 6);
          last.set(e.templateId, now);
        }
        if (e.templateId?.startsWith('care-') && e.templateId !== 'care-support')
          assert.ok(e.age <= 2);
        if (e.templateId?.startsWith('child-')) assert.ok(e.age >= 6 && e.age <= 12);
        if (e.templateId?.startsWith('teen-')) assert.ok(e.age >= 13 && e.age <= 17);
      }
      for (const q of life.simulation!.queue) {
        assert.ok(ids.has(q.sourceEventId));
        if (q.status !== 'pending') assert.ok(q.completedEventId && ids.has(q.completedEventId));
      }
      assert.ok(reconcile(life.simulation!), 'Every financial account must reconcile');
      assert.equal(
        life.simulation!.school!.status,
        'completed',
        'Full childhood must produce a school graduation',
      );
      for (const entry of life.simulation!.finance!.entries) {
        assert.ok(entry.reason.length > 0);
        if (entry.sourceEventId)
          assert.ok(ids.has(entry.sourceEventId), 'Transaction source must exist');
      }
      for (const npc of Object.values(life.simulation!.npcs)) {
        assert.ok(npc.name.trim());
        assert.ok(npc.memory.length <= 64);
        for (const m of npc.memory) assert.ok(ids.has(m.eventId));
      }
      assert.ok(saveLife(life));
      saves++;
      events += life.events.length;
      if (index % 100 === 99) console.log(`Checked ${index + 1}/1000 lives`);
    }
    for (const required of [
      'romantic-boundary',
      'business-trial',
      'sport-routine',
      'illegal-offer',
      'legal-response',
    ])
      assert.ok(paths.has(required), `Uncovered life path: ${required}`);
    const report = {
      lives: 1000,
      yearsPerLife: 85,
      months: 1020000,
      countries: seen.size,
      events,
      decisions,
      saves,
      missingNamePlaceholders: missingNames,
      paths: [...paths].sort(),
      failures: 0,
      durationSeconds: (Date.now() - started) / 1000,
    };
    mkdirSync('test-results', { recursive: true });
    writeFileSync('test-results/population-report.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  },
);
