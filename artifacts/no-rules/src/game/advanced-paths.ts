import type { Life } from './domain';
import type { PathRule } from './life-paths';
import type { CoreDraft } from './causal-engine';
import { protagonist } from './life-events';
import { ensureSimulation, npcParticipant } from './causal-state';
import { isolateName } from './event-text';
// Independent rule modules share conditions, priorities and the durable effect queue.
export function advancedPaths(life: Life): PathRule[] {
  const s = ensureSimulation(life),
    hero = protagonist(life);
  const base = (id: string, title: string, description: string, facts: string[]): CoreDraft => ({
    kind: 'decision',
    templateId: id,
    title,
    description,
    actor: hero,
    target: hero,
    context: facts.join(' '),
    cause: { ruleId: id, facts, sourceEventIds: [] },
  });
  const rules: PathRule[] = [
    {
      id: 'sport-routine',
      priority: 42,
      minAge: 13,
      cooldown: 1200,
      conditions: [
        { type: 'flag', key: 'movement-practice', value: true },
        { type: 'stat', key: 'health', min: 50 },
        { type: 'flag', key: 'sport-chosen', value: false },
      ],
      build: () => ({
        ...base(
          'sport-routine',
          'Движение в повседневной жизни',
          'Можно выделить время для регулярной посильной активности или оставить прогулки свободными от расписания.',
          ['Возраст и самочувствие позволяют выбрать нагрузку.'],
        ),
        choices: [
          {
            label: 'Начать регулярные занятия',
            result: 'В распорядке появилось время для движения.',
            effects: {},
            plan: {
              effects: [
                { flags: { 'sport-chosen': true }, habits: { movement: 1 }, stats: { energy: -2 } },
              ],
              delayed: {
                afterMonths: 12,
                title: 'Год посильной активности',
                description:
                  'Регулярное движение стало привычной частью жизни и поддержало самочувствие.',
                actor: hero,
                target: hero,
                effects: [{ habits: { movement: 2 }, stats: { health: 4 } }],
                requires: { flag: 'sport-chosen' },
              },
            },
          },
          {
            label: 'Оставить свободные прогулки',
            result: 'Выбран гибкий распорядок без обязательных тренировок.',
            effects: {},
            plan: { effects: [{ flags: { 'sport-chosen': true } }] },
          },
        ],
      }),
    },
    {
      id: 'business-trial',
      priority: 44,
      minAge: 21,
      maxAge: 64,
      cooldown: 1200,
      conditions: [
        { type: 'skill', key: 'craft', min: 2 },
        { type: 'cash', min: s.world.costOfLiving * 5 },
        { type: 'flag', key: 'business-chosen', value: false },
      ],
      build: () => ({
        ...base(
          'business-trial',
          'Проверить идею небольшого дела?',
          'Практика и резерв позволяют попробовать небольшой заказ для клиента. Это проверка спроса, без гарантии устойчивого бизнеса.',
          ['Есть практический навык и денежный резерв.'],
        ),
        choices: [
          {
            label: `Выделить ${s.world.costOfLiving} усл. ед. на пробный заказ`,
            result: 'Началась работа над первым небольшим заказом.',
            effects: {},
            plan: {
              effects: [{ cash: -s.world.costOfLiving, flags: { 'business-chosen': true } }],
              delayed: {
                afterMonths: 6,
                title: 'Первый заказ завершён',
                description:
                  'Заказ принят клиентом. Поступила оплата, но для постоянного дохода одного заказа недостаточно.',
                actor: { kind: 'person', name: 'Первый клиент' },
                target: hero,
                effects: [
                  { cash: s.world.costOfLiving * 1.2, skills: { craft: 1 }, reputation: 3 },
                ],
                requires: { flag: 'business-chosen' },
              },
            },
          },
          {
            label: 'Сохранить резерв и прежнюю занятость',
            result: 'Резерв сохранён, основным остался прежний путь.',
            effects: {},
            plan: { effects: [{ flags: { 'business-chosen': true } }] },
          },
        ],
      }),
    },
  ];
  const friend = Object.values(s.npcs).find(
    (n) =>
      n.role === 'friend' &&
      n.age >= 18 &&
      n.age < 90 &&
      s.relationships[n.id].trust >= 45 &&
      s.relationships[n.id].bond >= 30,
  );
  if (friend)
    rules.push({
      id: 'romantic-boundary',
      priority: 46,
      minAge: 18,
      cooldown: 1200,
      conditions: [{ type: 'flag', key: 'romance-discussed', value: false }],
      build: () => ({
        ...base(
          'romantic-boundary',
          'Обсудить изменившиеся чувства?',
          `${isolateName(friend.name)} и персонаж замечают, что их общение стало особенно близким. Можно открыто поговорить, сохранив право каждого на собственный ответ.`,
          ['Длительное знакомство, близость и взаимное доверие.'],
        ),
        actor: npcParticipant(friend),
        cause: {
          ruleId: 'romantic-boundary',
          facts: ['Есть история доверительного общения.'],
          sourceEventIds: friend.memory.slice(-1).map((m) => m.eventId),
        },
        choices: [
          {
            label: 'Открыто поговорить без ожиданий',
            result:
              'Состоялся честный разговор. Решение о романтических отношениях требует взаимного согласия.',
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'romance-discussed': true },
                  relationship: { npcId: friend.id, bond: 3, trust: 4 },
                },
              ],
              delayed: {
                afterMonths: 6,
                title: 'Разговор о близости продолжился',
                description: `${isolateName(friend.name)} возвращается к разговору о чувствах. Доверие сохранилось; оба решили продолжить узнавать друг друга без обещаний.`,
                actor: npcParticipant(friend),
                target: hero,
                effects: [{ relationship: { npcId: friend.id, bond: 3, trust: 2 } }],
                requires: { relationship: { npcId: friend.id, minBond: 30, minTrust: 45 } },
              },
            },
          },
          {
            label: 'Обозначить дружескую границу',
            result: 'Сохранена дружба с ясно обозначенными границами.',
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'romance-discussed': true },
                  relationship: { npcId: friend.id, bond: 0, trust: 2 },
                },
              ],
            },
          },
        ],
      }),
    });
  return rules;
}
