import type { Life, LifeEvent, EventParticipant } from './domain';
import { type EventDraft, protagonist } from './life-events';
import { characterSubject, isolateName } from './event-text';
import {
  ensureSimulation,
  monthIndex,
  clamp,
  addNpc,
  npcParticipant,
  remember,
  applyEffects,
  canApplyPlan,
  type Effect,
  type CausalPlan,
} from './causal-state';

export type CoreDraft = EventDraft & { id?: string } & Pick<
    LifeEvent,
    'choices' | 'eligibility' | 'cause' | 'appliedConsequences' | 'consequenceStatus'
  >;
export type Condition =
  | { type: 'age'; min: number; max?: number }
  | {
      type: 'stat';
      key: 'health' | 'energy' | 'curiosity' | 'happiness';
      min?: number;
      max?: number;
    }
  | { type: 'cash'; min?: number; max?: number }
  | { type: 'skill'; key: 'learning' | 'craft' | 'social'; min: number }
  | { type: 'education'; value: 'none' | 'school' | 'vocational' }
  | { type: 'job'; value: 'unemployed' | 'employed' | 'retired' }
  | { type: 'flag'; key: string; value: boolean }
  | { type: 'trait'; pattern: string }
  | { type: 'location'; country?: string; minPopulation?: number }
  | { type: 'relationship'; npcId: string; maxBond?: number; minTrust?: number };
export function conditionsMatch(life: Life, conditions: Condition[]): boolean {
  const state = ensureSimulation(life),
    person = state.person;
  const range = (value: number, min = -Infinity, max = Infinity) => value >= min && value <= max;
  return conditions.every((condition) => {
    switch (condition.type) {
      case 'age':
        return range(life.age, condition.min, condition.max);
      case 'stat':
        return range(life.stats[condition.key], condition.min, condition.max);
      case 'cash':
        return range(person.money.cash, condition.min, condition.max);
      case 'skill':
        return person.skills[condition.key] >= condition.min;
      case 'education':
        return person.education === condition.value;
      case 'job':
        return person.job.status === condition.value;
      case 'flag':
        return !!person.flags[condition.key] === condition.value;
      case 'trait':
        return life.character.traits.some((trait) => trait.includes(condition.pattern));
      case 'location':
        return (
          (!condition.country || state.world.countryCode === condition.country) &&
          (life.location.birthplace?.population ?? 0) >= (condition.minPopulation ?? 0)
        );
      case 'relationship': {
        const relation = state.relationships[condition.npcId];
        return (
          !!relation &&
          range(relation.bond, -Infinity, condition.maxBond) &&
          relation.trust >= (condition.minTrust ?? 0)
        );
      }
    }
  });
}
function event(
  life: Life,
  id: string,
  title: string,
  description: string,
  actor: EventParticipant,
  facts: string[],
  sources: string[] = [],
): CoreDraft {
  return {
    id: `core-${life.id}-${id}-${monthIndex(life.currentDate)}`,
    kind: 'life',
    templateId: id,
    title,
    description,
    actor,
    target: protagonist(life),
    context: facts.join(' '),
    cause: { ruleId: id, facts, sourceEventIds: sources },
  };
}
function automatic(life: Life, draft: CoreDraft, effects: Effect[]): CoreDraft {
  applyEffects(life, effects, draft.id!, draft.description);
  draft.appliedConsequences = effects;
  return draft;
}
export function runCoreMonth(life: Life, random: () => number): CoreDraft[] {
  const state = ensureSimulation(life),
    now = monthIndex(life.currentDate),
    person = state.person,
    events: CoreDraft[] = [];
  if (now <= state.lastMonth) return events;
  state.lastMonth = now;
  for (const npc of Object.values(state.npcs)) {
    const previousAge = npc.age;
    npc.age = Math.floor((now - npc.bornMonth) / 12);
    if (npc.age > previousAge && npc.age >= 65) npc.stats.health = clamp(npc.stats.health - 1);
    npc.stats.happiness = clamp(npc.stats.happiness - 0.1);
    const relation = state.relationships[npc.id];
    if (relation && now - relation.lastContactMonth > 3)
      relation.bond = clamp(relation.bond - 0.25, -100, 100);
  }
  if (life.age >= 6 && person.education === 'none') {
    person.education = 'school';
    events.push(
      event(
        life,
        'school-start',
        'Новый распорядок обучения',
        `${characterSubject(life.character)} начинает регулярно заниматься при поддержке семьи.`,
        protagonist(life),
        ['Возраст не менее шести лет.', 'Ранее регулярного обучения не было.'],
      ),
    );
  }
  if (life.age >= 6 && !Object.values(state.npcs).some((npc) => npc.role === 'friend')) {
    const npc = addNpc(life, 'friend', random);
    events.push(
      event(
        life,
        'new-friend',
        'Новое знакомство',
        `${isolateName(npcParticipant(npc).name)} знакомится с персонажем во время общего занятия. Общение может продолжиться.`,
        npcParticipant(npc),
        ['Начались совместные занятия со сверстниками.'],
      ),
    );
  }
  if (
    person.job.status === 'employed' &&
    !Object.values(state.npcs).some((npc) => npc.role === 'colleague')
  ) {
    const colleague = addNpc(life, 'colleague', random);
    events.push(
      event(
        life,
        'new-colleague',
        'Знакомство на работе',
        `${isolateName(npcParticipant(colleague).name)} помогает освоиться в рабочих задачах.`,
        npcParticipant(colleague),
        ['Началась новая работа.'],
      ),
    );
  }
  if (
    life.age >= 12 &&
    !Object.values(state.npcs).some((npc) => npc.role === 'neighbor') &&
    conditionsMatch(life, [{ type: 'location', minPopulation: 100_000 }])
  ) {
    const npc = addNpc(life, 'neighbor', random);
    events.push(
      event(
        life,
        'new-neighbor',
        'Знакомство по соседству',
        `${isolateName(npcParticipant(npc).name)} представляется семье во дворе дома.`,
        npcParticipant(npc),
        [`Место проживания: ${life.location.birthplace?.settlement}.`, 'Рядом живут другие семьи.'],
      ),
    );
  }
  if (life.age >= 65 && life.currentDate.slice(5, 7) === life.birthDate.slice(5, 7))
    life.stats.health = clamp(life.stats.health - 1);
  if (life.age >= 6 && life.age < 18)
    person.skills.learning = clamp(person.skills.learning + 0.015);
  if (life.age >= 12 && life.age < 18)
    person.money.cash =
      Math.round(
        (person.money.cash +
          state.world.wage *
            0.03 *
            (life.conditions.className === 'Рабочая семья'
              ? 0.5
              : life.conditions.className === 'Уверенный достаток'
                ? 1.7
                : 1)) *
          100,
      ) / 100;
  if (life.age >= 18) {
    const income = person.job.income,
      expenses = person.money.expenses;
    person.money.lastIncome = income;
    person.money.lastExpenses = expenses;
    person.money.cash = Math.round((person.money.cash + income - expenses) * 100) / 100;
    if (person.money.cash < 0) {
      person.money.debt += -person.money.cash;
      person.money.cash = 0;
    }
    person.money.debt = Math.round(person.money.debt * 100) / 100;
  }
  if (person.job.status === 'employed') {
    person.skills.craft = clamp(person.skills.craft + 0.02);
    const colleague = Object.values(state.npcs).find((npc) => npc.role === 'colleague');
    if (
      colleague &&
      now - (state.fired['career-review'] ?? now) >= 24 &&
      (person.skills.learning >= 4 || person.skills.craft >= 2) &&
      state.relationships[colleague.id].trust >= 35
    ) {
      const previousIncome = person.job.income;
      person.job.income = Math.round(previousIncome * 1.05);
      state.fired['career-review'] = now;
      events.push(
        event(
          life,
          'career-review',
          'Опыт изменил рабочую роль',
          'Накопленный опыт и доверие коллег позволили пересмотреть рабочую роль и доход.',
          npcParticipant(colleague),
          [
            'Не менее двух лет с прошлого пересмотра.',
            `Навыки и доверие коллеги выросли. Доход: ${previousIncome} → ${person.job.income} усл. ед.`,
          ],
          life.events
            .filter((event) => event.cause?.ruleId === 'job-offer' && event.outcome)
            .slice(0, 1)
            .map((event) => event.id),
        ),
      );
    }
  }
  for (const queued of state.queue.filter(
    (item) => item.status === 'pending' && item.dueMonth <= now,
  )) {
    const relationRequired = queued.requires?.relationship;
    const relationNow = relationRequired ? state.relationships[relationRequired.npcId] : null;
    const valid =
      (!relationRequired ||
        (!!relationNow &&
          relationNow.bond >= relationRequired.minBond &&
          relationNow.trust >= relationRequired.minTrust)) &&
      (!queued.requires?.flag || person.flags[queued.requires.flag]) &&
      (!queued.requires?.employment || person.job.status === queued.requires.employment);
    const draft = event(
      life,
      `due-${queued.id}`,
      valid ? queued.title : 'Планы изменились',
      valid
        ? queued.description
        : 'Отложенный план больше не соответствует текущей ситуации; повторного эффекта нет.',
      queued.actor,
      [
        `Наступил срок плана: ${life.events.find((event) => event.id === queued.sourceEventId)?.title ?? 'ранее принятое решение'}.`,
        valid ? 'Условия плана по-прежнему выполнены.' : 'Условия плана больше не выполнены.',
      ],
      [queued.sourceEventId],
    );
    queued.status = valid ? 'applied' : 'cancelled';
    draft.consequenceStatus = queued.status;
    if (valid) automatic(life, draft, queued.effects);
    events.push(draft);
  }
  if (
    life.age < 13 &&
    life.stats.health < 55 &&
    now - (state.fired['care-support'] ?? -Infinity) >= 6
  ) {
    const parent = Object.values(state.npcs).find((npc) => npc.role === 'parent');
    const actor = parent
      ? npcParticipant(parent)
      : { kind: 'person' as const, name: 'Близкий взрослый' };
    events.push(
      automatic(
        life,
        event(
          life,
          'care-support',
          'Дополнительная забота',
          'Взрослый замечает плохое самочувствие ребёнка, помогает с отдыхом и обращается за поддержкой.',
          actor,
          ['Самочувствие ребёнка снизилось.', 'Решения о заботе принимает взрослый.'],
        ),
        [{ stats: { health: 4, energy: 3 } }],
      ),
    );
    state.fired['care-support'] = now;
  }
  if (
    life.age >= 8 &&
    conditionsMatch(life, [
      { type: 'trait', pattern: 'любознатель' },
      { type: 'education', value: 'school' },
      { type: 'flag', key: 'interest-noticed', value: false },
    ])
  ) {
    events.push(
      automatic(
        life,
        event(
          life,
          'interest-noticed',
          'Интерес замечен',
          'Наставник замечает любознательность персонажа и предлагает дополнительные материалы.',
          { kind: 'person', name: 'Наставник' },
          ['Есть регулярные занятия.', 'В характере выражена любознательность.'],
        ),
        [{ skills: { learning: 1 }, flags: { 'interest-noticed': true } }],
      ),
    );
  }
  const npc = Object.values(state.npcs).find(
    (npc) =>
      life.age >= 6 &&
      npc.age >= 6 &&
      npc.role !== 'parent' &&
      npc.age < 90 &&
      npc.stats.happiness < 65 &&
      state.relationships[npc.id].bond >= 10 &&
      now - state.relationships[npc.id].lastContactMonth >=
        (npc.traits.includes('общительный') ? 4 : 8),
  );
  if (npc) {
    const memories = npc.memory.slice(-1).map((memory) => memory.eventId);
    events.push(
      automatic(
        life,
        event(
          life,
          `npc-contact-${npc.id}`,
          'Весточка от знакомого',
          `${isolateName(npcParticipant(npc).name)} самостоятельно выходит на связь. Короткий разговор поддерживает обоих.`,
          npcParticipant(npc),
          [
            'Некоторое время не было общения.',
            'NPC нуждается в контакте и помнит прошлые встречи.',
          ],
          memories,
        ),
        [{ relationship: { npcId: npc.id, bond: 3, trust: 1 }, npc: { id: npc.id, happiness: 4 } }],
      ),
    );
  }
  return events;
}
function plan(effects: Effect[], delayed?: CausalPlan['delayed']): CausalPlan {
  return { effects, delayed };
}
function choice(
  label: string,
  result: string,
  p: CausalPlan,
): NonNullable<LifeEvent['choices']>[number] {
  return { label, result, effects: {}, plan: p };
}
type Rule = {
  id: string;
  priority: number;
  minAge: number;
  maxAge?: number;
  cooldown: number;
  conditions: Condition[];
  build: () => CoreDraft;
};
export function coreDecision(life: Life): CoreDraft | null {
  const state = ensureSimulation(life),
    person = state.person,
    now = monthIndex(life.currentDate),
    hero = protagonist(life);
  const friend = Object.values(state.npcs).find((npc) => npc.role === 'friend');
  const relation = friend ? state.relationships[friend.id] : null;
  const rules: Rule[] = [];
  const add = (rule: Rule) => rules.push(rule);
  add({
    id: 'training-path',
    priority: 40,
    minAge: 16,
    maxAge: 50,
    cooldown: 24,
    conditions: [
      { type: 'flag', key: 'training-planned', value: false },
      { type: 'job', value: 'unemployed' },
    ],
    build: () => {
      const draft = event(
        life,
        'training-path',
        'Куда направить обучение?',
        'Доступен двухлетний путь обучения. Выбор повлияет на навыки и будущие предложения работы.',
        hero,
        ['Возраст позволяет осознанно выбрать обучение.', 'Дальнейший путь ещё не выбран.'],
      );
      const delay = (education: 'school' | 'vocational', skill: number) => ({
        afterMonths: 24,
        title: 'Обучение дало результат',
        description: `${characterSubject(life.character)} завершает выбранный двухлетний путь и получает новые навыки.`,
        actor: hero,
        target: hero,
        effects: [
          {
            skills: { learning: skill },
            education,
            flags: { qualified: education === 'vocational' },
          },
        ],
        requires: { flag: 'training-planned' },
      });
      draft.choices = [
        choice(
          'Пойти на курс — 40 усл. ед.',
          'Началось обучение на курсе.',
          plan([{ cash: -40, flags: { 'training-planned': true } }], delay('vocational', 4)),
        ),
        choice(
          'Учиться самостоятельно',
          'Выбран самостоятельный путь обучения.',
          plan([{ flags: { 'training-planned': true } }], delay('school', 2)),
        ),
        choice('Пока отложить', 'Решение об обучении отложено.', plan([{ stats: { energy: 3 } }])),
      ];
      return draft;
    },
  });
  add({
    id: 'job-offer',
    priority: 30,
    minAge: 18,
    maxAge: 64,
    cooldown: 6,
    conditions: [
      { type: 'job', value: 'unemployed' },
      { type: 'skill', key: 'learning', min: 2 },
    ],
    build: () => {
      const qualified = person.education === 'vocational',
        income = Math.round(
          state.world.wage *
            (1 + Math.min(person.skills.learning, 10) * 0.05 + (qualified ? 0.3 : 0)),
        );
      const draft = event(
        life,
        'job-offer',
        'Предложение работы',
        `Навыки позволяют претендовать на работу. Доход в модели: ${income} усл. ед. за месяц.`,
        { kind: 'world', name: 'Местная организация' },
        [
          'Нет действующей работы.',
          `Навык обучения: ${person.skills.learning.toFixed(1)}.`,
          `Образование: ${qualified ? 'профессиональное обучение' : 'регулярные занятия'}.`,
        ],
        life.events
          .filter((e) =>
            e.appliedConsequences?.some(
              (effect) => (effect.skills?.learning ?? 0) > 0 || effect.education,
            ),
          )
          .slice(0, 1)
          .map((e) => e.id),
      );
      draft.choices = [
        choice(
          'Принять предложение',
          'Работа началась.',
          plan([
            {
              job: {
                status: 'employed',
                title: qualified ? 'Специалист службы поддержки' : 'Помощник в мастерской',
                income,
              },
            },
          ]),
        ),
        choice(
          'Продолжить поиск',
          'Поиск работы продолжается без гарантии дохода.',
          plan([{ stats: { energy: -2 } }]),
        ),
      ];
      return draft;
    },
  });
  add({
    id: 'health-plan',
    priority: 90,
    minAge: 18,
    cooldown: 12,
    conditions: [{ type: 'stat', key: 'health', max: 55 }],
    build: () => {
      const draft = event(
        life,
        'health-plan',
        'Самочувствие требует внимания',
        'Накопившаяся усталость и плохое самочувствие мешают повседневным делам. Можно выделить ресурсы на заботу о себе.',
        hero,
        [`Здоровье снизилось до ${life.stats.health}.`],
      );
      draft.choices = [
        choice(
          'План восстановления — 20 усл. ед.',
          'Выделены средства и время на восстановление.',
          plan([{ cash: -20, stats: { health: 5 }, flags: { 'health-plan': true } }], {
            afterMonths: 6,
            title: 'Результат заботы о себе',
            description: 'Регулярная забота о себе постепенно улучшила самочувствие.',
            actor: hero,
            target: hero,
            effects: [{ stats: { health: 10 } }],
            requires: { flag: 'health-plan' },
          }),
        ),
        choice(
          'Начать с бесплатного отдыха',
          'Распорядок изменён в пользу отдыха.',
          plan([{ stats: { health: 2, energy: 6 } }]),
        ),
      ];
      return draft;
    },
  });
  if (friend && relation) {
    add({
      id: 'friend-request',
      priority: 50,
      minAge: 13,
      cooldown: 24,
      conditions: [
        { type: 'relationship', npcId: friend.id, minTrust: 20 },
        { type: 'flag', key: 'friend-request-answered', value: false },
      ],
      build: () => {
        const draft = event(
          life,
          'friend-request',
          'Друг просит поддержки',
          `${isolateName(npcParticipant(friend).name)} просит найти время для доверительного разговора.`,
          npcParticipant(friend),
          [`Доверие: ${Math.round(relation.trust)}.`, 'Есть история знакомства.'],
          friend.memory.slice(-1).map((memory) => memory.eventId),
        );
        draft.choices = [
          choice(
            'Найти время для разговора',
            'Разговор укрепил доверие.',
            plan(
              [
                {
                  relationship: { npcId: friend.id, bond: 12, trust: 10 },
                  npc: { id: friend.id, happiness: 8 },
                  stats: { energy: -3 },
                  flags: { 'friend-request-answered': true },
                },
              ],
              {
                afterMonths: 36,
                title: 'Поддержка вернулась',
                description: `${isolateName(npcParticipant(friend).name)} вспоминает прежний разговор и поддерживает персонажа в ответ.`,
                actor: npcParticipant(friend),
                target: hero,
                effects: [
                  {
                    stats: { happiness: 8 },
                    relationship: { npcId: friend.id, bond: 8, trust: 5 },
                  },
                ],
                requires: { relationship: { npcId: friend.id, minBond: 20, minTrust: 20 } },
              },
            ),
          ),
          choice(
            'Честно отложить разговор',
            'Друг знает, что сейчас не хватает сил.',
            plan([
              {
                relationship: { npcId: friend.id, bond: -2, trust: 1 },
                flags: { 'friend-request-answered': true },
              },
            ]),
          ),
          choice(
            'Не отвечать',
            'Отсутствие ответа усилило дистанцию.',
            plan([
              {
                relationship: { npcId: friend.id, bond: -25, trust: -15 },
                npc: { id: friend.id, happiness: -10 },
                flags: { 'friend-request-answered': true },
              },
            ]),
          ),
        ];
        return draft;
      },
    });
    add({
      id: 'repair-friendship',
      priority: 60,
      minAge: 6,
      cooldown: 12,
      conditions: [{ type: 'relationship', npcId: friend.id, maxBond: 10 }],
      build: () => {
        const draft = event(
          life,
          'repair-friendship',
          'Восстановить общение?',
          'В отношениях накопилась дистанция. Можно попробовать вернуться к разговору.',
          npcParticipant(friend),
          [`Близость снизилась до ${Math.round(relation.bond)}.`],
          friend.memory.slice(-2).map((memory) => memory.eventId),
        );
        draft.choices = [
          choice(
            'Выслушать и признать свою часть',
            'Начался спокойный разговор о накопившихся обидах.',
            plan([
              {
                relationship: { npcId: friend.id, bond: 20, trust: 8 },
                npc: { id: friend.id, happiness: 5 },
              },
            ]),
          ),
          choice(
            'Сохранить дистанцию',
            'Пока решено не возобновлять тесное общение.',
            plan([{ relationship: { npcId: friend.id, bond: -2 } }]),
          ),
        ];
        return draft;
      },
    });
  }
  if (person.money.debt > state.world.costOfLiving * 2)
    add({
      id: 'budget-pressure',
      priority: 80,
      minAge: 18,
      cooldown: 12,
      conditions: [],
      build: () => {
        const draft = event(
          life,
          'budget-pressure',
          'Расходы превышают возможности',
          'Доходов не хватает на текущие расходы, накопился долг. Нужен пересмотр бюджета.',
          hero,
          [
            `Долг: ${person.money.debt} усл. ед.`,
            `Доход: ${person.job.income}, расходы: ${person.money.expenses}.`,
          ],
        );
        draft.choices = [
          choice(
            'Пересмотреть повседневные расходы',
            'Выбран более скромный бытовой бюджет.',
            plan([{ expenseMultiplier: 0.7, stats: { happiness: -3 } }]),
          ),
          choice(
            'Направить 20 усл. ед. на долг',
            'Часть долга погашена.',
            plan([{ cash: -20, debt: -Math.min(20, person.money.debt) }]),
          ),
          choice('Пока сохранить бюджет', 'Бюджет пока не изменён; долг может расти.', plan([])),
        ];
        if (person.money.savings >= 20)
          draft.choices.push(
            choice(
              'Погасить 20 усл. ед. из резерва',
              'Сбережения уменьшили долг.',
              plan([{ savings: -20, debt: -Math.min(20, person.money.debt) }]),
            ),
          );
        return draft;
      },
    });
  add({
    id: 'financial-reserve',
    priority: 20,
    minAge: 18,
    cooldown: 12,
    conditions: [
      { type: 'job', value: 'employed' },
      { type: 'cash', min: person.money.expenses * 3 },
    ],
    build: () => {
      const amount = person.money.expenses;
      const draft = event(
        life,
        'financial-reserve',
        'Создать запас на будущее?',
        'Доход позволил накопить свободные деньги. Часть можно отложить на будущие расходы.',
        hero,
        [`На руках не менее трёх месячных бюджетов.`, `Есть действующий доход.`],
      );
      draft.choices = [
        choice(
          `Отложить ${amount} усл. ед.`,
          'Создан денежный резерв.',
          plan([{ cash: -amount, savings: amount }]),
        ),
        choice(
          'Оставить деньги на текущем счёте',
          'Деньги оставлены доступными для текущих расходов.',
          plan([]),
        ),
      ];
      return draft;
    },
  });
  add({
    id: 'retirement',
    priority: 100,
    minAge: 65,
    cooldown: 1200,
    conditions: [{ type: 'flag', key: 'retirement-chosen', value: false }],
    build: () => {
      const draft = event(
        life,
        'retirement',
        'Новый ритм старшего возраста',
        'Можно уменьшить рабочую нагрузку и пересмотреть повседневный ритм.',
        hero,
        ['Наступил старший возраст.', 'Распорядок ещё не пересмотрен.'],
      );
      draft.choices = [
        choice(
          'Перейти к спокойному ритму',
          'Выбран более спокойный распорядок.',
          plan([
            {
              job: {
                status: 'retired',
                title: 'Спокойный ритм',
                income: Math.round(state.world.wage * 0.6),
              },
              stats: { energy: 8 },
              flags: { 'retirement-chosen': true },
            },
          ]),
        ),
        choice(
          'Оставить частичную занятость',
          'Сохранена посильная частичная занятость.',
          plan([
            {
              job: {
                status: 'retired',
                title: 'Частичная занятость',
                income: Math.round(state.world.wage * 0.85),
              },
              flags: { 'retirement-chosen': true },
            },
          ]),
        ),
      ];
      return draft;
    },
  });
  const rule = rules
    .filter(
      (rule) =>
        life.age >= rule.minAge &&
        life.age <= (rule.maxAge ?? Infinity) &&
        now - (state.fired[rule.id] ?? -Infinity) >= rule.cooldown &&
        conditionsMatch(life, rule.conditions),
    )
    .sort((a, b) => b.priority - a.priority)[0];
  if (!rule) return null;
  // Important decisions are deterministic consequences of conditions, not a lottery.
  const draft = rule.build();
  draft.kind = 'decision';
  draft.eligibility = { minAge: rule.minAge, maxAge: rule.maxAge };
  state.fired[rule.id] = now;
  return draft;
}
export function commitPlan(life: Life, event: LifeEvent, index: number): boolean {
  const selected = event.choices?.[index];
  if (!selected || !canApplyPlan(life, selected.plan)) return false;
  const state = ensureSimulation(life),
    plan = selected.plan;
  if (!plan) return true;
  applyEffects(life, plan.effects, event.id, selected.result);
  event.appliedConsequences = structuredClone(plan.effects);
  if (plan.delayed) {
    const { afterMonths, ...delayed } = plan.delayed;
    const id = `effect-${life.id}-${++state.sequence}`;
    state.queue.push({
      ...structuredClone(delayed),
      id,
      dueMonth: monthIndex(life.currentDate) + afterMonths,
      sourceEventId: event.id,
      status: 'pending',
    });
    event.scheduledConsequenceIds = [id];
  }
  return true;
}
export function observeEvent(life: Life, event: LifeEvent) {
  const state = ensureSimulation(life);
  if (event.actor?.id && state.npcs[event.actor.id]) {
    remember(life, event.actor.id, event.id, event.outcome ?? event.description);
    if (event.kind === 'life' && event.actor.kind === 'family') {
      const relation = state.relationships[event.actor.id];
      relation.lastContactMonth = monthIndex(life.currentDate);
      relation.bond = clamp(relation.bond + 0.2, -100, 100);
    }
  }
  if (event.cause?.sourceEventIds.length && event.consequenceStatus) {
    const queued = state.queue.find((item) => `due-${item.id}` === event.templateId);
    if (queued) queued.completedEventId = event.id;
  }
}
