import { advancedPaths } from './advanced-paths';
import type { Life } from './domain';
import { ensureSimulation, npcParticipant } from './causal-state';
import { protagonist } from './life-events';
import type { CoreDraft, Condition } from './causal-engine';

export type PathRule = {
  id: string;
  priority: number;
  minAge: number;
  maxAge?: number;
  cooldown: number;
  conditions: Condition[];
  build: () => CoreDraft;
};
export function lifePathRules(life: Life): PathRule[] {
  const s = ensureSimulation(life),
    hero = protagonist(life);
  const source = (template: string) =>
    life.events
      .filter((e) => e.templateId === template)
      .slice(0, 1)
      .map((e) => e.id);
  const draft = (
    id: string,
    title: string,
    description: string,
    facts: string[],
    sources: string[] = [],
  ): CoreDraft => ({
    kind: 'decision',
    templateId: id,
    title,
    description,
    actor: hero,
    target: hero,
    context: facts.join(' '),
    cause: { ruleId: id, facts, sourceEventIds: sources },
  });
  const rules: PathRule[] = [
    {
      id: 'community-path',
      priority: 45,
      minAge: 14,
      cooldown: 1200,
      conditions: [
        { type: 'skill', key: 'social', min: 0.3 },
        { type: 'flag', key: 'community-chosen', value: false },
      ],
      build: () => ({
        ...draft(
          'community-path',
          'Общее дело в районе',
          'Знакомые предлагают регулярно помогать в общественном проекте. Можно выбрать посильную нагрузку.',
          ['Есть опыт помощи другим.'],
          source('action-help'),
        ),
        choices: [
          {
            label: 'Участвовать регулярно',
            result: 'Началось участие в общем проекте.',
            effects: {},
            plan: {
              effects: [{ flags: { 'community-chosen': true }, stats: { energy: -3 } }],
              delayed: {
                afterMonths: 12,
                title: 'Год общего дела',
                description:
                  'Регулярное участие помогло научиться договариваться и укрепило уверенность.',
                actor: hero,
                target: hero,
                effects: [{ skills: { social: 2 }, stats: { happiness: 6 } }],
                requires: { flag: 'community-chosen' },
              },
            },
          },
          {
            label: 'Ограничиться разовой помощью',
            result: 'Выбрана небольшая посильная помощь.',
            effects: {},
            plan: { effects: [{ flags: { 'community-chosen': true }, skills: { social: 0.5 } }] },
          },
        ],
      }),
    },
    {
      id: 'creative-path',
      priority: 45,
      minAge: 18,
      cooldown: 1200,
      conditions: [
        { type: 'skill', key: 'craft', min: 0.3 },
        { type: 'flag', key: 'creative-chosen', value: false },
      ],
      build: () => ({
        ...draft(
          'creative-path',
          'Показать свою работу?',
          `Проект «${s.development?.project?.title}» готов к первой открытой встрече. Показ не гарантирует известность.`,
          ['Есть практика самостоятельного творчества.'],
          source('action-create'),
        ),
        choices: [
          {
            label: 'Подготовить открытый показ',
            result: 'Началась подготовка небольшого показа.',
            effects: {},
            plan: {
              effects: [{ flags: { 'creative-chosen': true }, stats: { energy: -4 } }],
              delayed: {
                afterMonths: 9,
                title: `Первый показ: ${s.development?.project?.title}`,
                description:
                  'Подготовка завершилась встречей с небольшой аудиторией. Обратная связь помогла развить мастерство.',
                actor: hero,
                target: hero,
                effects: [{ skills: { craft: 2, social: 1 }, stats: { happiness: 5 } }],
                requires: { flag: 'creative-chosen' },
              },
            },
          },
          {
            label: 'Продолжать для себя',
            result: 'Творчество осталось личным занятием.',
            effects: {},
            plan: { effects: [{ flags: { 'creative-chosen': true }, stats: { happiness: 3 } }] },
          },
        ],
      }),
    },
  ];
  const acquaintance = Object.values(s.npcs).find(
    (n) => n.role === 'neighbor' || n.role === 'friend',
  );
  if (acquaintance) {
    const actor = npcParticipant(acquaintance);
    rules.push({
      id: 'illegal-offer',
      priority: 55,
      minAge: 18,
      cooldown: 1200,
      conditions: [
        { type: 'flag', key: 'new-circles', value: true },
        { type: 'flag', key: 'illegal-offer-answered', value: false },
      ],
      build: () => ({
        ...draft(
          'illegal-offer',
          'Опасное предложение',
          'Знакомый предлагает участвовать в незаконной подработке. Быстрые деньги связаны с вредом другим людям и риском разбирательства.',
          ['После знакомства с новым кругом общения поступило конкретное предложение.'],
          source('action-explore'),
        ),
        actor,
        choices: [
          {
            label: 'Отказаться',
            result: 'Незаконное предложение отклонено.',
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'illegal-offer-answered': true },
                  relationship: { npcId: acquaintance.id, bond: -3 },
                },
              ],
            },
          },
          {
            label: 'Прекратить общение',
            result: 'Контакт с этим кругом общения прекращён.',
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'illegal-offer-answered': true },
                  relationship: { npcId: acquaintance.id, bond: -20, trust: -10 },
                },
              ],
            },
          },
          {
            label: 'Согласиться и принять риск',
            result:
              'Участие принесло деньги, но создало обязательства и риск правовых последствий.',
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'illegal-offer-answered': true, 'illegal-involvement': true },
                  cash: 60,
                  reputation: -8,
                  stats: { happiness: -5 },
                  relationship: { npcId: acquaintance.id, bond: 5, trust: -5 },
                },
              ],
              delayed: {
                afterMonths: 6,
                title: 'Последствия незаконной подработки',
                description:
                  'Появились требования возместить ущерб и необходимость правовой консультации. Лёгкие деньги обернулись долгом и тревогой.',
                actor: { kind: 'world', name: 'Участники разбирательства' },
                target: hero,
                effects: [{ debt: 90, stats: { happiness: -10 }, flags: { 'legal-review': true } }],
                requires: { flag: 'illegal-involvement' },
              },
            },
          },
        ],
      }),
    });
  }
  rules.push({
    id: 'legal-response',
    priority: 95,
    minAge: 18,
    cooldown: 1200,
    conditions: [
      { type: 'flag', key: 'legal-review', value: true },
      { type: 'flag', key: 'legal-response-chosen', value: false },
    ],
    build: () => ({
      ...draft(
        'legal-response',
        'Как исправить последствия?',
        'Нужно прекратить незаконное участие и заняться последствиями. Размеры выплат здесь — условные параметры игры, а не законодательство страны.',
        ['Есть незавершённые последствия прежнего участия.'],
        source('illegal-offer'),
      ),
      choices: [
        {
          label: 'Возместить 30 усл. ед. ущерба',
          result: 'Часть ущерба возмещена; дальнейшее незаконное участие прекращено.',
          effects: {},
          plan: {
            effects: [
              {
                cash: -30,
                debt: -Math.min(30, s.person.money.debt),
                flags: {
                  'illegal-involvement': false,
                  'legal-review': false,
                  'legal-response-chosen': true,
                },
                stats: { happiness: 3 },
              },
            ],
          },
        },
        {
          label: 'Обратиться за бесплатной правовой помощью',
          result: 'Началась работа с консультантом. Долг остаётся, незаконное участие прекращено.',
          effects: {},
          plan: {
            effects: [
              {
                flags: {
                  'illegal-involvement': false,
                  'legal-review': false,
                  'legal-response-chosen': true,
                },
              },
            ],
            delayed: {
              afterMonths: 12,
              title: 'Возвращение к устойчивому распорядку',
              description:
                'Год без незаконных подработок и работа над последствиями помогли восстановить уверенность. Долг требует отдельного погашения.',
              actor: hero,
              target: hero,
              effects: [{ stats: { happiness: 5 }, skills: { social: 1 } }],
              requires: { flag: 'legal-response-chosen' },
            },
          },
        },
      ],
    }),
  });
  return [...rules.filter(rule=>rule.id!=='creative-path'||s.development?.project?.status==='ready'), ...advancedPaths(life)];
}
