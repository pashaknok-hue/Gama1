import incomeData from '../../data/income-groups.json';
import type { Life, Stats, EventParticipant } from './domain';
import { worldCountries } from './world';
import { generateFamilyNames } from './names';

export type NpcRole =
  'parent' | 'sibling' | 'friend' | 'neighbor' | 'colleague' | 'partner' | 'child';
export type Memory = { id: string; date: string; eventId: string; summary: string };
export type Npc = {
  id: string;
  name: string;
  role: NpcRole;
  bornMonth: number;
  age: number;
  traits: string[];
  stats: { health: number; happiness: number };
  memory: Memory[];
};
export type Relationship = { npcId: string; bond: number; trust: number; lastContactMonth: number };
export type Job = { status: 'unemployed' | 'employed' | 'retired'; title: string; income: number };
export type Effect = {
  stats?: Partial<Stats>;
  cash?: number;
  savings?: number;
  debt?: number;
  skills?: Partial<Record<'learning' | 'craft' | 'social', number>>;
  relationship?: { npcId: string; bond: number; trust?: number };
  npc?: { id: string; happiness: number };
  education?: 'none' | 'school' | 'vocational';
  job?: Job;
  flags?: Record<string, boolean>;
  expenseMultiplier?: number;
};
export type ScheduledEffect = {
  id: string;
  dueMonth: number;
  sourceEventId: string;
  title: string;
  description: string;
  actor: EventParticipant;
  target: EventParticipant;
  effects: Effect[];
  requires?: {
    flag?: string;
    employment?: Job['status'];
    relationship?: { npcId: string; minBond: number; minTrust: number };
  };
  status: 'pending' | 'applied' | 'cancelled';
  completedEventId?: string;
};
export type CausalPlan = {
  effects: Effect[];
  delayed?: Omit<ScheduledEffect, 'id' | 'dueMonth' | 'sourceEventId' | 'status'> & {
    afterMonths: number;
  };
};
export type SimulationState = {
  version: 1;
  world: {
    countryCode: string;
    incomeGroup: string;
    costOfLiving: number;
    wage: number;
    calibration: 'game-model';
  };
  person: {
    education: 'none' | 'school' | 'vocational';
    skills: { learning: number; craft: number; social: number };
    job: Job;
    money: {
      cash: number;
      savings: number;
      debt: number;
      expenses: number;
      lastIncome: number;
      lastExpenses: number;
    };
    flags: Record<string, boolean>;
  };
  npcs: Record<string, Npc>;
  relationships: Record<string, Relationship>;
  queue: ScheduledEffect[];
  fired: Record<string, number>;
  sequence: number;
  lastMonth: number;
};
export const monthIndex = (date: string) =>
  Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
export const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
export function ensureSimulation(life: Life): SimulationState {
  if (life.simulation) return life.simulation;
  const country =
    worldCountries.find((c) => c.code === life.location.birthplace?.countryCode) ||
    worldCountries.find((c) => c.name === life.location.country);
  const group = (incomeData.groups as Record<string, string>)[country?.code ?? ''] ?? 'unknown';
  // Model units, NOT real salaries, prices, currency conversion or birth statistics.
  const calibration: Record<string, [number, number]> = {
    LIC: [20, 32],
    LMC: [35, 58],
    UMC: [50, 85],
    HIC: [75, 135],
    unknown: [40, 64],
  };
  const [cost, wage] = calibration[group];
  const state: SimulationState = {
    version: 1,
    world: {
      countryCode: country?.code ?? '',
      incomeGroup: group,
      costOfLiving: cost,
      wage,
      calibration: 'game-model',
    },
    person: {
      education: life.age >= 6 ? 'school' : 'none',
      skills: { learning: 0, craft: 0, social: 0 },
      job: { status: 'unemployed', title: 'Пока без работы', income: 0 },
      money: {
        cash: life.age >= 18 ? cost * 2 : 0,
        savings: 0,
        debt: 0,
        expenses: cost,
        lastIncome: 0,
        lastExpenses: 0,
      },
      flags: {},
    },
    npcs: {},
    relationships: {},
    queue: [],
    fired: {},
    sequence: 0,
    lastMonth: monthIndex(life.currentDate),
  };
  life.simulation = state;
  for (const person of life.family) {
    const age = person.age + life.age;
    state.npcs[person.id] = {
      id: person.id,
      name: person.name,
      role: person.relationship.includes('сестра') ? 'sibling' : 'parent',
      age,
      bornMonth: state.lastMonth - age * 12,
      traits: [person.personality],
      stats: { health: 80, happiness: 65 },
      memory: [],
    };
    state.relationships[person.id] = {
      npcId: person.id,
      bond: 65,
      trust: 65,
      lastContactMonth: state.lastMonth,
    };
  }
  return state;
}
export function addNpc(
  life: Life,
  role: 'friend' | 'neighbor' | 'colleague',
  random: () => number,
): Npc {
  const state = ensureSimulation(life);
  const country = worldCountries.find((c) => c.code === state.world.countryCode);
  const name = country
    ? generateFamilyNames(country, random() < 0.5 ? 'Девочка' : 'Мальчик', random).character.name
    : 'Имя не указано';
  const id = `npc-${life.id}-${++state.sequence}`,
    age = life.age + (role === 'neighbor' ? 20 : role === 'colleague' ? 3 : 0);
  const npc: Npc = {
    id,
    name,
    role,
    age,
    bornMonth: monthIndex(life.currentDate) - age * 12,
    traits: [random() < 0.5 ? 'общительный' : 'осторожный'],
    stats: { health: 80, happiness: 60 },
    memory: [],
  };
  state.npcs[id] = npc;
  state.relationships[id] = {
    npcId: id,
    bond: 30,
    trust: 30,
    lastContactMonth: monthIndex(life.currentDate),
  };
  return npc;
}
export function npcParticipant(npc: Npc): EventParticipant {
  const roles: Record<NpcRole, string> = {
    parent: 'Родитель',
    sibling: 'Родственник',
    friend: 'Друг',
    neighbor: 'Сосед',
    colleague: 'Коллега',
    partner: 'Партнёр',
    child: 'Ребёнок',
  };
  return {
    kind: 'person',
    id: npc.id,
    name: npc.name === 'Имя не указано' ? roles[npc.role] : npc.name,
  };
}
export function remember(life: Life, npcId: string, eventId: string, summary: string) {
  const state = ensureSimulation(life),
    npc = state.npcs[npcId];
  if (!npc) return;
  const id = `${eventId}:${npcId}`;
  if (npc.memory.some((memory) => memory.id === id)) return;
  npc.memory.push({ id, date: life.currentDate, eventId, summary });
  npc.memory = npc.memory.slice(-64);
}
export function applyEffects(
  life: Life,
  effects: Effect[],
  sourceEventId: string,
  summary: string,
) {
  const state = ensureSimulation(life),
    person = state.person;
  for (const effect of effects) {
    for (const [key, value] of Object.entries(effect.stats ?? {}))
      life.stats[key as keyof Stats] = clamp(life.stats[key as keyof Stats] + value);
    for (const key of ['cash', 'savings', 'debt'] as const)
      if (effect[key] !== undefined)
        person.money[key] = Math.max(0, Math.round((person.money[key] + effect[key]!) * 100) / 100);
    for (const [key, value] of Object.entries(effect.skills ?? {}))
      person.skills[key as keyof typeof person.skills] = clamp(
        person.skills[key as keyof typeof person.skills] + value,
      );
    if (effect.relationship) {
      const relation = state.relationships[effect.relationship.npcId];
      if (relation) {
        relation.bond = clamp(relation.bond + effect.relationship.bond, -100, 100);
        relation.trust = clamp(relation.trust + (effect.relationship.trust ?? 0));
        relation.lastContactMonth = monthIndex(life.currentDate);
        remember(life, relation.npcId, sourceEventId, summary);
      }
    }
    if (effect.npc && state.npcs[effect.npc.id])
      state.npcs[effect.npc.id].stats.happiness = clamp(
        state.npcs[effect.npc.id].stats.happiness + effect.npc.happiness,
      );
    if (effect.education) person.education = effect.education;
    if (effect.job) {
      if (effect.job.status === 'employed' && person.job.status !== 'employed')
        state.fired['career-review'] = monthIndex(life.currentDate);
      person.job = { ...effect.job };
    }
    Object.assign(person.flags, effect.flags ?? {});
    if (effect.expenseMultiplier !== undefined)
      person.money.expenses = Math.max(
        1,
        Math.round(state.world.costOfLiving * effect.expenseMultiplier),
      );
  }
}
export function canApplyPlan(life: Life, plan?: CausalPlan): boolean {
  if (!plan) return true;
  const state = ensureSimulation(life);
  let cash = state.person.money.cash,
    savings = state.person.money.savings;
  for (const effect of plan.effects) {
    cash += effect.cash ?? 0;
    savings += effect.savings ?? 0;
  }
  return (
    Number.isFinite(cash) &&
    Number.isFinite(savings) &&
    cash >= 0 &&
    savings >= 0 &&
    plan.effects.every(
      (effect) => !effect.relationship || !!state.relationships[effect.relationship.npcId],
    )
  );
}
