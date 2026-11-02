import { validDevelopment } from './validate-development';
import type { SimulationState } from './causal-state';
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const strings = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
const flags = (v: unknown) => object(v) && Object.values(v).every((x) => typeof x === 'boolean');
const participant = (v: unknown) =>
  object(v) && typeof v.name === 'string' && typeof v.kind === 'string';
const job = (v: unknown) =>
  object(v) &&
  ['unemployed', 'employed', 'retired'].includes(String(v.status)) &&
  typeof v.title === 'string' &&
  finite(v.income) &&
  Number(v.income) >= 0;
function effect(v: unknown): boolean {
  if (!object(v)) return false;
  for (const key of ['cash', 'savings', 'debt', 'expenseMultiplier', 'reputation'])
    if (v[key] !== undefined && !finite(v[key])) return false;
  if (v.expenseMultiplier !== undefined && Number(v.expenseMultiplier) <= 0) return false;
  for (const key of ['stats', 'skills'])
    if (
      v[key] !== undefined &&
      (!object(v[key]) ||
        !Object.entries(v[key]).every(
          ([name, value]) =>
            (key === 'stats'
              ? ['health', 'happiness', 'energy', 'curiosity']
              : ['learning', 'craft', 'social']
            ).includes(name) && finite(value),
        ))
    )
      return false;
  if (v.habits !== undefined && (!object(v.habits) || !Object.values(v.habits).every(finite)))
    return false;
  if (v.flags !== undefined && !flags(v.flags)) return false;
  if (v.job !== undefined && !job(v.job)) return false;
  if (v.education !== undefined && !['none', 'school', 'vocational'].includes(String(v.education)))
    return false;
  if (
    v.relationship !== undefined &&
    (!object(v.relationship) ||
      typeof v.relationship.npcId !== 'string' ||
      !finite(v.relationship.bond) ||
      (v.relationship.trust !== undefined && !finite(v.relationship.trust)))
  )
    return false;
  if (
    v.npc !== undefined &&
    (!object(v.npc) || typeof v.npc.id !== 'string' || !finite(v.npc.happiness))
  )
    return false;
  return true;
}
function delayed(v: unknown): boolean {
  if (
    !object(v) ||
    typeof v.title !== 'string' ||
    typeof v.description !== 'string' ||
    !participant(v.actor) ||
    !participant(v.target) ||
    !Array.isArray(v.effects) ||
    !v.effects.every(effect)
  )
    return false;
  if (
    v.requires !== undefined &&
    (!object(v.requires) ||
      (v.requires.flag !== undefined && typeof v.requires.flag !== 'string') ||
      (v.requires.employment !== undefined &&
        !['unemployed', 'employed', 'retired'].includes(String(v.requires.employment))))
  )
    return false;
  if (object(v.requires) && v.requires.relationship !== undefined) {
    const r = v.requires.relationship;
    if (!object(r) || typeof r.npcId !== 'string' || !finite(r.minBond) || !finite(r.minTrust))
      return false;
  }
  return true;
}
export function validPlan(v: unknown): boolean {
  return (
    object(v) &&
    Array.isArray(v.effects) &&
    v.effects.every(effect) &&
    (v.delayed === undefined ||
      (delayed(v.delayed) &&
        object(v.delayed) &&
        Number.isInteger(v.delayed.afterMonths) &&
        Number(v.delayed.afterMonths) > 0))
  );
}
export function validSimulation(v: unknown): v is SimulationState {
  if (
    !object(v) ||
    v.version !== 1 ||
    !object(v.world) ||
    !object(v.person) ||
    !object(v.npcs) ||
    !object(v.relationships) ||
    !Array.isArray(v.queue) ||
    !object(v.fired) ||
    !Number.isInteger(v.sequence) ||
    !Number.isInteger(v.lastMonth)
  )
    return false;
  if (v.person.reputation !== undefined && !finite(v.person.reputation)) return false;
  if (
    v.person.habits !== undefined &&
    (!object(v.person.habits) || !Object.values(v.person.habits).every(finite))
  )
    return false;
  const world = v.world,
    p = v.person;
  if (
    typeof world.countryCode !== 'string' ||
    typeof world.incomeGroup !== 'string' ||
    world.calibration !== 'game-model' ||
    !finite(world.costOfLiving) ||
    !finite(world.wage) ||
    Number(world.costOfLiving) <= 0 ||
    Number(world.wage) <= 0
  )
    return false;
  if (
    !['none', 'school', 'vocational'].includes(String(p.education)) ||
    !job(p.job) ||
    !object(p.skills) ||
    !['learning', 'craft', 'social'].every((key) =>
      finite((p.skills as Record<string, unknown>)[key]),
    ) ||
    !flags(p.flags) ||
    !object(p.money) ||
    !['cash', 'savings', 'debt', 'expenses', 'lastIncome', 'lastExpenses'].every(
      (key) =>
        finite((p.money as Record<string, unknown>)[key]) &&
        Number((p.money as Record<string, unknown>)[key]) >= 0,
    )
  )
    return false;
  for (const [id, npc] of Object.entries(v.npcs)) {
    if (
      object(npc) &&
      npc.roles !== undefined &&
      (!Array.isArray(npc.roles) ||
        !npc.roles.every((role) =>
          [
            'parent',
            'sibling',
            'friend',
            'neighbor',
            'colleague',
            'partner',
            'child',
            'teacher',
            'classmate',
          ].includes(String(role)),
        ))
    )
      return false;
    if (
      !object(npc) ||
      npc.id !== id ||
      typeof npc.name !== 'string' ||
      ![
        'parent',
        'sibling',
        'friend',
        'neighbor',
        'colleague',
        'partner',
        'child',
        'teacher',
        'classmate',
      ].includes(String(npc.role)) ||
      !finite(npc.age) ||
      !Number.isInteger(npc.bornMonth) ||
      !strings(npc.traits) ||
      !object(npc.stats) ||
      !finite(npc.stats.health) ||
      !finite(npc.stats.happiness) ||
      !Array.isArray(npc.memory) ||
      !npc.memory.every(
        (m) =>
          object(m) &&
          typeof m.id === 'string' &&
          typeof m.eventId === 'string' &&
          typeof m.date === 'string' &&
          typeof m.summary === 'string',
      )
    )
      return false;
    const relation = v.relationships[id];
    if (
      !object(relation) ||
      relation.npcId !== id ||
      !finite(relation.bond) ||
      !finite(relation.trust) ||
      !Number.isInteger(relation.lastContactMonth)
    )
      return false;
  }
  if (!Object.values(v.fired).every(Number.isInteger)) return false;
  const ids = new Set<string>();
  for (const item of v.queue) {
    if (
      !delayed(item) ||
      !object(item) ||
      typeof item.id !== 'string' ||
      ids.has(item.id) ||
      typeof item.sourceEventId !== 'string' ||
      !Number.isInteger(item.dueMonth) ||
      !['pending', 'applied', 'cancelled'].includes(String(item.status))
    )
      return false;
    ids.add(item.id);
  }
  return validDevelopment(v as unknown as SimulationState);
}
