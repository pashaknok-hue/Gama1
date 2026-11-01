import type { Life, LifeEvent } from './domain';
import { characterSubject } from './event-text';
import { caregiver, protagonist, type EventDraft } from './life-events';

type Choice = NonNullable<LifeEvent['choices']>[number];
type Decision = {
  id: string;
  minAge: number;
  maxAge?: number;
  title: string;
  context: string;
  prompt: string;
  choices: Choice[];
};
const decisions: Decision[] = [
  {
    id: 'early-evening',
    minAge: 3,
    maxAge: 5,
    title: 'Тихий вечер дома',
    context: 'Простой выбор рядом с родителем.',
    prompt: 'Родитель предлагает выбрать спокойное занятие дома и остаётся рядом.',
    choices: [
      {
        label: 'Порисовать рядом со взрослым',
        result: 'рисует карандашами, пока родитель помогает выбрать цвета.',
        effects: { curiosity: 3 },
      },
      {
        label: 'Послушать сказку',
        result: 'слушает сказку, которую читает близкий взрослый.',
        effects: { happiness: 3 },
      },
      {
        label: 'Поиграть кубиками',
        result: 'строит башню из кубиков вместе с родителем.',
        effects: { curiosity: 2, happiness: 2 },
      },
      { label: 'Отдохнуть', result: 'отдыхает дома рядом с семьёй.', effects: { energy: 5 } },
    ],
  },
  {
    id: 'early-outing',
    minAge: 3,
    maxAge: 5,
    title: 'На прогулке с родителем',
    context: 'Ребёнок выбирает занятие; маршрут и безопасность контролирует взрослый.',
    prompt:
      'На прогулке родитель предлагает остановиться ненадолго и спрашивает, что хочется рассмотреть.',
    choices: [
      {
        label: 'Посмотреть на деревья',
        result: 'рассматривает листья вместе с родителем.',
        effects: { curiosity: 3 },
      },
      {
        label: 'Послушать птиц',
        result: 'слушает птиц, держась рядом со взрослым.',
        effects: { happiness: 3 },
      },
      {
        label: 'Поиграть с мячом',
        result: 'катает мяч родителю на безопасной площадке.',
        effects: { health: 2, energy: -2 },
      },
      {
        label: 'Попросить вернуться домой',
        result: 'возвращается домой вместе со взрослым и отдыхает.',
        effects: { energy: 4 },
      },
    ],
  },
  {
    id: 'child-afternoon',
    minAge: 6,
    maxAge: 12,
    title: 'После занятий',
    context: 'Свободное время ребёнка; взрослые знают о планах.',
    prompt:
      'После занятий остаётся немного свободного времени. Родитель помогает договориться о планах.',
    choices: [
      {
        label: 'Почитать книгу',
        result: 'читает новую главу и делится впечатлениями с семьёй.',
        effects: { curiosity: 5 },
      },
      {
        label: 'Поиграть с друзьями',
        result: 'играет с друзьями во дворе, заранее предупредив родителя.',
        effects: { happiness: 4, energy: -3 },
      },
      {
        label: 'Помочь накрыть на стол',
        result: 'помогает семье подготовить стол к ужину.',
        effects: { happiness: 3 },
      },
      {
        label: 'Спокойно отдохнуть',
        result: 'остаётся дома и отдыхает после занятий.',
        effects: { energy: 6 },
      },
    ],
  },
  {
    id: 'child-hobby',
    minAge: 6,
    maxAge: 12,
    title: 'Попробовать новое занятие',
    context: 'Знакомство с увлечением при поддержке взрослого.',
    prompt:
      'Близкий взрослый предлагает попробовать новое занятие без обязательства продолжать его.',
    choices: [
      {
        label: 'Нарисовать открытку',
        result: 'рисует открытку для семьи.',
        effects: { curiosity: 4 },
      },
      {
        label: 'Собрать простую модель',
        result: 'собирает модель с помощью взрослого.',
        effects: { curiosity: 4, energy: -2 },
      },
      {
        label: 'Выучить небольшую песню',
        result: 'разучивает песню вместе с близким человеком.',
        effects: { happiness: 4 },
      },
      {
        label: 'Остаться с привычной игрой',
        result: 'выбирает знакомую игру и спокойно проводит вечер.',
        effects: { happiness: 2, energy: 2 },
      },
    ],
  },
  {
    id: 'teen-weekend',
    minAge: 13,
    maxAge: 17,
    title: 'Планы на свободный день',
    context: 'Подросток согласует планы с семьёй.',
    prompt:
      'Друг предлагает встретиться в свободный день. Можно выбрать встречу, своё занятие или отдых.',
    choices: [
      {
        label: 'Встретиться с другом',
        result: 'согласует планы с семьёй и встречается с другом.',
        effects: { happiness: 5, energy: -4 },
      },
      {
        label: 'Заняться своим проектом',
        result: 'работает над личным проектом дома.',
        effects: { curiosity: 5, energy: -3 },
      },
      {
        label: 'Провести время с семьёй',
        result: 'проводит свободный день вместе с семьёй.',
        effects: { happiness: 4 },
      },
      {
        label: 'Выбрать отдых',
        result: 'отдыхает и восстанавливает силы.',
        effects: { energy: 7 },
      },
    ],
  },
  {
    id: 'teen-learning',
    minAge: 13,
    maxAge: 17,
    title: 'Интересная тема',
    context: 'Выбор способа учиться без предположений о будущей профессии.',
    prompt:
      'Новая тема вызывает интерес. Есть несколько способов разобраться в ней в свободное время.',
    choices: [
      {
        label: 'Попросить совета у наставника',
        result: 'обсуждает тему с наставником.',
        effects: { curiosity: 5 },
      },
      {
        label: 'Почитать самостоятельно',
        result: 'находит книгу по интересующей теме.',
        effects: { curiosity: 4 },
      },
      {
        label: 'Обсудить с другом',
        result: 'обменивается идеями с другом.',
        effects: { curiosity: 2, happiness: 3 },
      },
      {
        label: 'Вернуться к теме позже',
        result: 'откладывает тему и отдыхает.',
        effects: { energy: 5 },
      },
    ],
  },
  {
    id: 'adult-personal-time',
    minAge: 18,
    title: 'Время для себя',
    context: 'Самостоятельное распределение свободного времени взрослым.',
    prompt: 'Появился свободный вечер. Бытовые дела позволяют выбрать, чему уделить время.',
    choices: [
      {
        label: 'Изучить новый навык',
        result: 'уделяет вечер самостоятельному обучению.',
        effects: { curiosity: 5, energy: -3 },
      },
      {
        label: 'Встретиться с близкими',
        result: 'договаривается о встрече и проводит время с близкими.',
        effects: { happiness: 5 },
      },
      {
        label: 'Заняться домашними делами',
        result: 'завершает небольшое домашнее дело.',
        effects: { happiness: 2, energy: -2 },
      },
      { label: 'Отдохнуть', result: 'отдыхает без дополнительных планов.', effects: { energy: 7 } },
    ],
  },
  {
    id: 'adult-idea',
    minAge: 18,
    title: 'Небольшая личная идея',
    context: 'Личный проект без навязанной работы, партнёра или детей.',
    prompt: 'Возникла идея для личного проекта. Можно начать с малого, обсудить её или отложить.',
    choices: [
      {
        label: 'Сделать первый шаг',
        result: 'делает первый небольшой шаг в личном проекте.',
        effects: { curiosity: 5, energy: -3 },
      },
      {
        label: 'Обсудить идею с другом',
        result: 'обсуждает идею с другом и получает обратную связь.',
        effects: { happiness: 3, curiosity: 2 },
      },
      {
        label: 'Собрать информацию',
        result: 'собирает полезную информацию, не торопясь с решением.',
        effects: { curiosity: 4 },
      },
      {
        label: 'Отложить идею',
        result: 'откладывает проект и освобождает время для отдыха.',
        effects: { energy: 5 },
      },
    ],
  },
];
const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));
export function createDecision(
  life: Life,
  random: () => number,
): (EventDraft & Pick<LifeEvent, 'choices' | 'eligibility'>) | null {
  if (life.age < 3) return null;
  const previous = life.events.filter((event) => event.kind === 'decision');
  if (previous[0] && monthIndex(life.currentDate) - monthIndex(previous[0].date) < 4) return null;
  const eligible = decisions.filter(
    (entry) =>
      life.age >= entry.minAge &&
      life.age <= (entry.maxAge ?? Infinity) &&
      !previous.some(
        (event) =>
          event.templateId === entry.id &&
          monthIndex(life.currentDate) - monthIndex(event.date) < 8,
      ),
  );
  if (!eligible.length || random() > 0.23) return null;
  const entry = eligible[Math.floor(random() * eligible.length)];
  const actor =
    life.age < 13
      ? caregiver(life).actor
      : entry.id === 'teen-weekend'
        ? { kind: 'person' as const, name: 'Друг персонажа' }
        : protagonist(life);
  return {
    kind: 'decision',
    templateId: entry.id,
    title: entry.title,
    description: entry.prompt,
    actor,
    target: protagonist(life),
    context: entry.context,
    eligibility: { minAge: entry.minAge, maxAge: entry.maxAge },
    choices: entry.choices.map((choice) => ({
      ...choice,
      result: `${characterSubject(life.character)} ${choice.result}`,
    })),
  };
}
