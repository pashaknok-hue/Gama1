import type { Life } from './domain';
import type { PathRule } from './life-paths';
import type { CoreDraft } from './causal-engine';
import { caregiver, protagonist } from './life-events';
import { ensureSimulation, npcParticipant } from './causal-state';
import { isolateName } from './event-text';
export function childhoodDecisions(life: Life): PathRule[] {
  const s = ensureSimulation(life),
    hero = protagonist(life),
    adult = caregiver(life);
  const base = (id: string, title: string, description: string): CoreDraft => ({
    kind: 'decision',
    templateId: id,
    title,
    description,
    actor: adult.actor,
    target: hero,
    context: 'Посильный выбор ребёнка при поддержке взрослого.',
    cause: {
      ruleId: id,
      facts: [`Возраст: ${life.age}.`, 'Рядом есть поддержка взрослого.'],
      sourceEventIds: [],
    },
  });
  const rules: PathRule[] = [
    {
      id: 'preschool-interest',
      priority: 70,
      minAge: 3,
      maxAge: 5,
      cooldown: 1200,
      conditions: [{ type: 'flag', key: 'preschool-interest-chosen', value: false }],
      build: () => ({
        ...base(
          'preschool-interest',
          'Во что поиграем вместе?',
          'Взрослый предлагает выбрать занятие. Можно попробовать разные интересы, не решая сейчас, кем стать.',
        ),
        choices: [
          {
            label: 'Рисовать вместе',
            result: 'Начались совместные рисунки. К творчеству хочется возвращаться.',
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'preschool-interest-chosen': true, 'interest-art': true },
                  skills: { craft: 0.5 },
                },
              ],
            },
          },
          {
            label: 'Строить и разбирать',
            result: 'Игра с деталями пробудила интерес к устройству вещей.',
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'preschool-interest-chosen': true, 'interest-building': true },
                  skills: { learning: 0.5 },
                },
              ],
            },
          },
          {
            label: 'Придумать общую игру',
            result: 'Общая игра помогла попробовать договариваться и распределять роли.',
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'preschool-interest-chosen': true, 'interest-company': true },
                  skills: { social: 0.5 },
                },
              ],
            },
          },
        ],
      }),
    },
  ];
  const friend = Object.values(s.npcs).find((n) => n.role === 'friend');
  if (friend)
    rules.push({
      id: 'preschool-sharing',
      priority: 65,
      minAge: 4,
      maxAge: 5,
      cooldown: 1200,
      conditions: [{ type: 'flag', key: 'preschool-sharing-chosen', value: false }],
      build: () => ({
        ...base(
          'preschool-sharing',
          'Одна игрушка на двоих',
          `${isolateName(friend.name)} тоже хочет играть с новой игрушкой. Взрослый рядом и поможет договориться.`,
        ),
        actor: npcParticipant(friend),
        cause: {
          ruleId: 'preschool-sharing',
          facts: ['Знакомые дети хотят одну игрушку.', 'Взрослый помогает разрешить спор.'],
          sourceEventIds: friend.memory.slice(-1).map((m) => m.eventId),
        },
        choices: [
          {
            label: 'Предложить играть по очереди',
            result: 'Дети попробовали дождаться своей очереди и продолжили игру.',
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'preschool-sharing-chosen': true },
                  relationship: { npcId: friend.id, bond: 5, trust: 3 },
                  skills: { social: 0.3 },
                },
              ],
              delayed: {
                afterMonths: 12,
                title: 'Общая игра спустя год',
                description: `${isolateName(friend.name)} вспоминает, как удалось договориться. Новую общую игру начать стало легче.`,
                actor: npcParticipant(friend),
                target: hero,
                effects: [{ relationship: { npcId: friend.id, bond: 3, trust: 2 } }],
                requires: { relationship: { npcId: friend.id, minBond: 15, minTrust: 20 } },
              },
            },
          },
          {
            label: 'Попросить взрослого помочь',
            result: 'Взрослый выслушал обоих и помог найти другую игрушку для общей игры.',
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'preschool-sharing-chosen': true },
                  relationship: { npcId: friend.id, bond: 2, trust: 2 },
                },
              ],
            },
          },
          {
            label: 'Отойти и выбрать другую игру',
            result: 'Понадобилась пауза. Игра продолжилась отдельно, без ссоры.',
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'preschool-sharing-chosen': true },
                  relationship: { npcId: friend.id, bond: -1 },
                },
              ],
            },
          },
        ],
      }),
    });
  rules.push({
    id: 'preschool-family',
    priority: 60,
    minAge: 5,
    maxAge: 5,
    cooldown: 1200,
    conditions: [{ type: 'flag', key: 'preschool-family-chosen', value: false }],
    build: () => ({
      ...base(
        'preschool-family',
        'Своя часть общего дела',
        'Семья готовит совместный вечер. Взрослый предлагает выбрать небольшую посильную роль.',
      ),
      choices: [
        {
          label: 'Помочь накрыть на стол',
          result: 'Общее дело получилось при поддержке взрослого.',
          effects: {},
          plan: {
            effects: [
              {
                flags: { 'preschool-family-chosen': true },
                habits: { helping: 1 },
                skills: { social: 0.3 },
              },
            ],
          },
        },
        {
          label: 'Придумать украшение',
          result: 'Рисунок стал частью семейного вечера.',
          effects: {},
          plan: {
            effects: [{ flags: { 'preschool-family-chosen': true }, skills: { craft: 0.3 } }],
          },
        },
        {
          label: 'Сказать, что хочется отдохнуть',
          result: 'Взрослый услышал просьбу и оставил время на отдых.',
          effects: {},
          plan: { effects: [{ flags: { 'preschool-family-chosen': true }, stats: { energy: 3 } }] },
        },
      ],
    }),
  });
  return rules;
}
