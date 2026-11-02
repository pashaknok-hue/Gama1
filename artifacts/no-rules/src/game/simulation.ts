import { randomState, nextRandom } from './random';
import { eventCategory } from './event-category';
import { birthDescription, birthdayDescription, characterSubject } from './event-text';
import { nextLifeMonth } from './calendar';
import { dateAge } from './generation';
import type { BirthProfile, Life, LifeEvent, Stats } from './domain';
import { automaticEvent, protagonist, type EventDraft } from './life-events';
import {
  runCoreMonth,
  coreDecision,
  commitPlan,
  observeEvent,
  type CoreDraft,
} from './causal-engine';
import { ensureSimulation, applyEffects } from './causal-state';
import { canDecide, pendingDecision } from './event-rules';

let idSequence = 0;
const randomId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${++idSequence}-${Math.random().toString(36).slice(2, 10)}`;
export function makeLife(
  profile: BirthProfile,
  options: { random?: () => number; id?: string; now?: string } = {},
): Life {
  const random = options.random ?? Math.random;
  const month = 1 + Math.floor(random() * 12),
    day = 1 + Math.floor(random() * 28);
  const birthDate = `200${Math.floor(random() * 9)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const id = options.id ?? randomId(),
    now = options.now ?? new Date().toISOString();
  const birth: LifeEvent = {
    id: randomId(),
    date: birthDate,
    age: 0,
    title: 'Первый день',
    description: birthDescription(profile),
    kind: 'milestone',
    templateId: 'birth',
    actor: { kind: 'character', id, name: profile.character.name },
    target: { kind: 'place', name: profile.birthplace?.settlement ?? profile.region },
    context: 'Рождение ребёнка в семье.',
  };
  const life: Life = {
    id,
    character: profile.character,
    birthDate,
    location: {
      country: profile.country,
      region: profile.region,
      ...(profile.birthplace ? { birthplace: profile.birthplace } : {}),
    },
    family: profile.family,
    conditions: { className: profile.className, home: profile.home, resources: profile.resources },
    currentDate: birthDate,
    age: 0,
    stats: { health: 82, happiness: 68, curiosity: 36, energy: 76 },
    events: [birth],
    createdAt: now,
    updatedAt: now,
  };
  ensureSimulation(life);
  return life;
}
const actions = {
  sleep: {
    title: 'Отдохнуть',
    description: 'Самостоятельно выбрать спокойный отдых.',
    minAge: 3,
    minEnergy: 0,
    effects: { energy: 13, health: 2 },
    target: 'Отдых дома',
    narrative: 'отдыхает дома и восстанавливает силы.',
  },
  walk: {
    title: 'Прогуляться',
    description: 'До подросткового возраста — рядом со взрослым.',
    minAge: 3,
    minEnergy: 10,
    effects: { health: 5, curiosity: 4, energy: -5 },
    target: 'Прогулка возле дома',
    narrative: 'выходит на знакомую прогулку возле дома.',
  },
  play: {
    title: 'Поиграть',
    description: 'Посильная игра; маленьким детям помогает взрослый.',
    minAge: 3,
    maxAge: 12,
    minEnergy: 12,
    effects: { happiness: 6, curiosity: 5, energy: -7 },
    target: 'Игра',
    narrative: 'играет в знакомую игру.',
  },
  read: {
    title: 'Почитать или рассмотреть книгу',
    description: 'Маленьким детям книгу читает взрослый.',
    minAge: 3,
    minEnergy: 5,
    effects: { curiosity: 8, happiness: 2, energy: -3 },
    target: 'Книга',
    narrative: 'читает книгу и обдумывает новую историю.',
  },
  learn: {
    title: 'Узнать что-то новое',
    description: 'Посильное обучение по интересам.',
    minAge: 6,
    minEnergy: 8,
    effects: { curiosity: 7, energy: -5, happiness: 1 },
    target: 'Новая тема',
    narrative: 'изучает новую тему и разбирает непонятные детали.',
  },
  help: {
    title: 'Помочь дома',
    description: 'Посильная часть общих домашних дел.',
    minAge: 5,
    minEnergy: 8,
    effects: { happiness: 3, energy: -4 },
    target: 'Домашние дела',
    narrative: 'выполняет посильную часть общих домашних дел.',
  },
  explore: {
    title: 'Изучить знакомый маршрут',
    description: 'До 13 лет — только со взрослым.',
    minAge: 10,
    minEnergy: 20,
    effects: { curiosity: 6, happiness: 4, energy: -8 },
    target: 'Знакомый маршрут',
    narrative: 'исследует новый участок знакомого маршрута.',
  },
  create: {
    title: 'Заняться своим проектом',
    description: 'Небольшая творческая задача по силам.',
    minAge: 7,
    minEnergy: 8,
    effects: { happiness: 5, curiosity: 4, energy: -4 },
    target: 'Личный проект',
    narrative: 'работает над личным проектом и завершает небольшой этап.',
  },
} as const;
export type ActionId = keyof typeof actions;
export type ActionInfo = {
  id: ActionId;
  title: string;
  description: string;
  effects: Partial<Stats>;
};
export function availableActions(age: number, stats?: Stats): ActionInfo[] {
  return Object.entries(actions)
    .filter(
      ([, action]) =>
        age >= action.minAge &&
        age <= ('maxAge' in action ? action.maxAge : Infinity) &&
        (!stats || stats.energy >= action.minEnergy),
    )
    .map(([id, action]) => ({
      id: id as ActionId,
      title: action.title,
      description: action.description,
      effects: action.effects,
    }));
}
function effects(life: Life, change: Partial<Stats>) {
  applyEffects(life, [{ stats: change }], 'ambient-tick', 'Ход повседневной жизни');
}
function record(life: Life, draft: CoreDraft) {
  const { effects: change, ...event } = draft;
  if (change) effects(life, change);
  const recorded: LifeEvent = {
    ...event,
    id: draft.id ?? (life.rng ? `entry-${life.id}-${++life.rng.sequence}` : randomId()),
    category: draft.category ?? eventCategory(draft.templateId),
    date: life.currentDate,
    age: life.age,
    cause: draft.cause ?? {
      ruleId: draft.templateId,
      facts: [`Возраст: ${life.age}.`, draft.context],
      sourceEventIds: [],
    },
    appliedConsequences: draft.appliedConsequences ?? (change ? [{ stats: change }] : []),
  };
  life.events.unshift(recorded);
  observeEvent(life, recorded);
  return recorded;
}
function milestone(life: Life) {
  const content: Record<number, [string, string]> = {
    1: [
      'Первые шаги',
      `${characterSubject(life.character)} делает первые неуверенные шаги рядом с близким взрослым.`,
    ],
    3: ['Первое большое «почему?»', 'Близкий взрослый отвечает на первые большие вопросы ребёнка.'],
    6: [
      'Новая глава',
      `${characterSubject(life.character)} знакомится с новым распорядком занятий при поддержке семьи.`,
    ],
    13: [
      'Свои решения',
      `${characterSubject(life.character)} обсуждает с близкими больше самостоятельности.`,
    ],
    18: [
      'Взрослая жизнь',
      `${characterSubject(life.character)} получает больше самостоятельности в повседневных делах.`,
    ],
  };
  const entry = content[life.age];
  if (entry && !life.events.some((event) => event.templateId === `milestone-${life.age}`))
    record(life, {
      kind: 'milestone',
      templateId: `milestone-${life.age}`,
      title: entry[0],
      description: `${birthdayDescription(life.character, life.age)} ${entry[1]}`,
      actor: protagonist(life),
      target: { kind: 'object', name: 'Новый этап жизни' },
      context: 'День рождения и возрастная веха.',
    });
}
function actionEvent(life: Life, id: ActionId): EventDraft {
  const action = actions[id],
    name = characterSubject(life.character);
  let description = `${name} ${action.narrative}`;
  if (life.age < 6 && id === 'read')
    description = `${name} рассматривает картинки в книге, пока близкий взрослый читает вслух.`;
  if (life.age < 13 && (id === 'walk' || id === 'explore'))
    description += ' Рядом идёт близкий взрослый, который следит за безопасностью.';
  if (life.age < 6 && id === 'play') description += ' Близкий взрослый остаётся рядом и помогает.';
  return {
    kind: 'action',
    templateId: `action-${id}`,
    title: action.target,
    description,
    actor: protagonist(life),
    target: { kind: 'object', name: action.target },
    context:
      life.age < 13
        ? 'Посильное занятие, при необходимости с поддержкой взрослого.'
        : 'Самостоятельное занятие по возможностям персонажа.',
    effects: action.effects,
  };
}
function progress(
  life: Life,
  months: number,
  random: (() => number) | undefined,
  actionId?: ActionId,
): Life {
  if (!Number.isInteger(months) || months < 1 || months > 1200 || pendingDecision(life))
    return life;
  if (actionId && !availableActions(life.age, life.stats).some((action) => action.id === actionId))
    return life;
  ensureSimulation(life);
  if (!random) {
    life.rng ??= randomState(Math.floor(Math.random() * 4294967296));
    random = () => nextRandom(life.rng!);
  }
  for (let month = 0; month < months; month++) {
    if (pendingDecision(life)) break;
    if (
      actionId &&
      !availableActions(life.age, life.stats).some((action) => action.id === actionId)
    )
      break;
    const oldAge = life.age;
    life.currentDate = nextLifeMonth(life.currentDate, life.birthDate);
    life.age = dateAge(life.currentDate, life.birthDate);
    if (life.age > oldAge) {
      milestone(life);
      if (!life.events.some((e) => e.age === life.age && e.kind === 'milestone'))
        record(life, {
          kind: 'milestone',
          templateId: `birthday-${life.age}`,
          title: 'День рождения',
          description: birthdayDescription(life.character, life.age),
          actor: protagonist(life),
          target: { kind: 'object', name: 'Новый год жизни' },
          context: 'Наступила годовщина рождения.',
        });
    }
    // Ordinary recovery is state evolution, not a reason to spam a diary entry.
    effects(life, { energy: 2 });
    if (actionId && availableActions(life.age).some((action) => action.id === actionId)) {
      const action = record(life, actionEvent(life, actionId));
      if (life.age >= 13 && actionId === 'walk')
        applyEffects(
          life,
          [{ flags: { 'movement-practice': true } }],
          action.id,
          action.description,
        );
      if (life.age >= 18 && actionId === 'explore')
        applyEffects(life, [{ flags: { 'new-circles': true } }], action.id, action.description);
      const skill =
        actionId === 'read' || actionId === 'learn'
          ? 'learning'
          : actionId === 'create'
            ? 'craft'
            : actionId === 'help'
              ? 'social'
              : null;
      if (skill) {
        const consequences = [{ skills: { [skill]: 0.1 } }];
        applyEffects(life, consequences, action.id, action.description);
        action.appliedConsequences?.push(...consequences);
      }
    }
    for (const draft of runCoreMonth(life, random)) record(life, draft);
    const ambient = automaticEvent(life, random);
    if (ambient) record(life, ambient);
    const decision = coreDecision(life);
    if (decision) record(life, decision);
    life.updatedAt = life.rng ? `${life.currentDate}T12:00:00.000Z` : new Date().toISOString();
  }
  return life;
}
export function advanceTime(life: Life, months = 1, random?: () => number): Life {
  return progress(life, months, random);
}
// Player actions remain a separate API and cannot be used for infant caregiving.
export function advance(life: Life, actionId: ActionId, months = 1, random?: () => number): Life {
  if (!Object.hasOwn(actions, actionId)) return life;
  return progress(life, months, random, actionId);
}
export function resolveChoice(life: Life, eventId: string, choiceIndex: number): Life {
  const event = life.events.find((item) => item.id === eventId);
  if (
    !event ||
    pendingDecision(life)?.id !== eventId ||
    !canDecide(life, event) ||
    !Number.isInteger(choiceIndex)
  )
    return life;
  const choice = event.choices?.[choiceIndex];
  if (!choice) return life;
  if (!commitPlan(life, event, choiceIndex)) return life;
  event.outcome = choice.result;
  event.resolution = { actor: protagonist(life), choiceIndex };
  effects(life, choice.effects);
  life.updatedAt = life.rng ? `${life.currentDate}T12:00:00.000Z` : new Date().toISOString();
  return life;
}

// Bound runaway searches in worlds where no future decision is currently possible.
export function advanceToNextDecision(life: Life, limit = 1200): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1200) return 0;
  let months = 0;
  while (months < limit && !pendingDecision(life)) {
    const before = life.currentDate;
    advanceTime(life, 1);
    if (life.currentDate === before) break;
    months++;
  }
  return months;
}
