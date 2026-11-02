import type { EventParticipant, Life, LifeEvent, Stats } from './domain';
import { monthIndex } from './causal-state';
import { characterSubject } from './event-text';
import { nameInCase } from './names';

export type EventDraft = Pick<LifeEvent, 'title' | 'description'> & {
  templateId: string;
  kind: NonNullable<LifeEvent['kind']>;
  actor: EventParticipant;
  target: EventParticipant;
  context: string;
  effects?: Partial<Stats>;
};
export const protagonist = (life: Life): EventParticipant => ({
  kind: 'character',
  id: life.id,
  name: life.character.name,
});
const object = (name: string): EventParticipant => ({ kind: 'object', name });
const place = (name: string): EventParticipant => ({ kind: 'place', name });
export function caregiver(life: Life, preferFather = false) {
  const roles = preferFather ? ['Папа', 'Мама'] : ['Мама', 'Папа'];
  const person = roles
    .map((role) => life.family.find((member) => member.relationship === role))
    .find(Boolean);
  const female = person?.relationship === 'Мама';
  const label = person ? (female ? 'Мама' : 'Отец') : 'Близкий взрослый';
  return {
    actor: {
      kind: person ? 'family' : 'person',
      id: person?.id,
      name: person ? `${label} — ${person.name}` : label,
    } as EventParticipant,
    label,
    female,
  };
}
const childObject = (life: Life) =>
  nameInCase(life.character, 'accusative') ??
  (life.family.some((p) => p.relationship === 'Мама' || p.relationship === 'Папа')
    ? life.character.gender === 'Девочка'
      ? 'дочь'
      : 'сына'
    : 'ребёнка');

type Template = {
  id: string;
  minAge: number;
  maxAge?: number;
  build: (life: Life) => Omit<EventDraft, 'templateId' | 'kind'>;
};
const care =
  (
    title: string,
    text: (life: Life, adult: ReturnType<typeof caregiver>) => string,
    context: string,
    father = false,
  ) =>
  (life: Life) => {
    const adult = caregiver(life, father);
    return {
      title,
      description: text(life, adult),
      actor: adult.actor,
      target: protagonist(life),
      context,
      effects: { happiness: 2, energy: 1, curiosity: 1 },
    };
  };
const self =
  (title: string, target: string, context: string, text: (name: string) => string) =>
  (life: Life) => ({
    title,
    description: text(characterSubject(life.character)),
    actor: protagonist(life),
    target: object(target),
    context,
    effects: { curiosity: 2, energy: 1, happiness: 1 },
  });
const templates: Template[] = [
  {
    id: 'elder-memories',
    minAge: 65,
    build: self(
      'Сохранить воспоминания',
      'Записи о жизни',
      'Спокойный день старшего возраста.',
      (n) => `${n} возвращается к памятным событиям и записывает важные детали для близких.`,
    ),
  },
  {
    id: 'elder-rhythm',
    minAge: 65,
    build: self(
      'Посильный ритм',
      'Отдых и повседневные дела',
      'Распорядок учитывает возраст и самочувствие.',
      (n) => `${n} распределяет дела так, чтобы оставалось время на отдых и общение.`,
    ),
  },
  {
    id: 'care-embrace',
    minAge: 0,
    maxAge: 2,
    build: care(
      'Тепло объятий',
      (l, a) =>
        `${a.label} ${a.female ? 'обняла' : 'обнял'} ${childObject(l)} перед сном. В комнате стало тихо и спокойно.`,
      'Родитель успокаивает ребёнка дома перед сном.',
    ),
  },
  {
    id: 'care-arms',
    minAge: 0,
    maxAge: 2,
    build: care(
      'На руках у родителя',
      (l, a) =>
        `${a.label} ${a.female ? 'взяла' : 'взял'} ${childObject(l)} на руки после пробуждения и тихо заговорил${a.female ? 'а' : ''} с ребёнком.`,
      'Забота после пробуждения.',
      true,
    ),
  },
  {
    id: 'care-walk',
    minAge: 0,
    maxAge: 2,
    build: care(
      'Прогулка возле дома',
      (_l, a) =>
        `${a.label} ${a.female ? 'вышла' : 'вышел'} с ребёнком на короткую прогулку возле дома. Листья шелестели над коляской.`,
      'Прогулка со взрослым; младенец не выбирает маршрут.',
    ),
  },
  {
    id: 'care-song',
    minAge: 0,
    maxAge: 2,
    build: care(
      'Тихая песня',
      (_l, a) =>
        `${a.label} ${a.female ? 'спела' : 'спел'} ребёнку знакомую песню, пока за окном темнело.`,
      'Вечер дома с близким взрослым.',
    ),
  },
  {
    id: 'care-toy',
    minAge: 0,
    maxAge: 2,
    build: care(
      'Звук погремушки',
      (_l, a) =>
        `${a.label} ${a.female ? 'показала' : 'показал'} ребёнку погремушку. Малыш прислушивался к негромкому звуку.`,
      'Взрослый знакомит малыша с безопасной игрушкой.',
      true,
    ),
  },
  {
    id: 'care-feeding',
    minAge: 0,
    maxAge: 2,
    build: care(
      'После кормления',
      (_l, a) =>
        `${a.label} ${a.female ? 'устроила' : 'устроил'} ребёнка поудобнее после кормления и ${a.female ? 'осталась' : 'остался'} рядом.`,
      'Повседневный уход и отдых.',
    ),
  },
  {
    id: 'care-book',
    minAge: 0,
    maxAge: 2,
    build: care(
      'Голос рядом',
      (_l, a) =>
        `${a.label} ${a.female ? 'прочитала' : 'прочитал'} ребёнку короткую сказку. Малыш слушал голос, ещё не понимая всех слов.`,
      'Книгу читает взрослый, а не младенец.',
    ),
  },
  {
    id: 'rain-window',
    minAge: 0,
    build: (life) => ({
      title: 'Дождь за окном',
      description:
        'Ночной дождь оставил лужи во дворе дома. Утром семья наблюдала за каплями на окне.',
      actor: { kind: 'world', name: 'Ночной дождь' },
      target: place('Двор возле дома'),
      context: `Обычный дождливый день: ${life.location.birthplace?.settlement ?? life.location.region}.`,
      effects: { energy: 2 },
    }),
  },
  {
    id: 'early-blocks',
    minAge: 3,
    maxAge: 5,
    build: self(
      'Башня из кубиков',
      'Кубики',
      'Игра дома рядом со взрослыми.',
      (n) => `${n} строит башню из кубиков. Родитель помогает поставить последний кубик.`,
    ),
  },
  {
    id: 'early-questions',
    minAge: 3,
    maxAge: 5,
    build: self(
      'Почему движутся облака?',
      'Облака за окном',
      'Разговор с близким взрослым дома.',
      (n) =>
        `${n} спрашивает у родителя, почему облака меняют форму. Взрослый отвечает и показывает на небо.`,
    ),
  },
  {
    id: 'early-drawing',
    minAge: 3,
    maxAge: 5,
    build: self(
      'Рисунок для семьи',
      'Бумага и карандаши',
      'Спокойный вечер за общим столом.',
      (n) => `${n} рисует дом цветными карандашами и показывает рисунок семье.`,
    ),
  },
  {
    id: 'early-walk',
    minAge: 3,
    maxAge: 5,
    build: self(
      'Листья у дорожки',
      'Опавшие листья',
      'Прогулка вместе со взрослым возле дома.',
      (n) => `${n} собирает красивые листья, пока родитель идёт рядом и следит за дорогой.`,
    ),
  },
  {
    id: 'child-project',
    minAge: 6,
    maxAge: 12,
    build: self(
      'Небольшое открытие',
      'Книга с заданиями',
      'Занятие дома после учёбы.',
      (n) =>
        `${n} разбирается с новым заданием в книге. Близкий взрослый помогает с трудным вопросом.`,
    ),
  },
  {
    id: 'child-game',
    minAge: 6,
    maxAge: 12,
    build: self(
      'Игра с друзьями',
      'Игра во дворе',
      'Свободное время после занятий, рядом со знакомыми.',
      (n) =>
        `${n} договаривается с друзьями о правилах игры во дворе. У каждого находится своя роль.`,
    ),
  },
  {
    id: 'child-reading',
    minAge: 6,
    maxAge: 12,
    build: self(
      'Новая история',
      'Книга из домашней коллекции',
      'Чтение дома в свободный вечер.',
      (n) => `${n} читает новую историю и обсуждает её с родителем за ужином.`,
    ),
  },
  {
    id: 'child-help',
    minAge: 6,
    maxAge: 12,
    build: self(
      'Общее дело',
      'Семейный ужин',
      'Посильная помощь взрослым дома.',
      (n) => `${n} помогает накрыть на стол. Семья вместе готовится к ужину.`,
    ),
  },
  {
    id: 'teen-project',
    minAge: 13,
    maxAge: 17,
    build: self(
      'Своя идея',
      'Личный проект',
      'Свободное время после учёбы.',
      (n) => `${n} пробует воплотить собственную идею и делает первые заметки для проекта.`,
    ),
  },
  {
    id: 'teen-friends',
    minAge: 13,
    maxAge: 17,
    build: self(
      'Разговор с другом',
      'Общие планы',
      'Встреча со сверстником после занятий.',
      (n) => `${n} обсуждает с другом планы на выходные и договаривается о времени встречи.`,
    ),
  },
  {
    id: 'teen-study',
    minAge: 13,
    maxAge: 17,
    build: self(
      'Сложная тема',
      'Учебный материал',
      'Подготовка к занятиям дома.',
      (n) => `${n} разбирается в сложной теме и просит наставника объяснить непонятное.`,
    ),
  },
  {
    id: 'teen-home',
    minAge: 13,
    maxAge: 17,
    build: self(
      'Своя часть забот',
      'Домашние дела',
      'Разделение посильных обязанностей с семьёй.',
      (n) => `${n} берёт на себя часть домашних дел и обсуждает с семьёй удобный распорядок.`,
    ),
  },
  {
    id: 'adult-skill',
    minAge: 18,
    build: self(
      'Новый навык',
      'Материал для обучения',
      'Самостоятельное обучение в свободное время.',
      (n) => `${n} изучает новый навык и пробует применить его на практике.`,
    ),
  },
  {
    id: 'adult-friends',
    minAge: 18,
    build: self(
      'Время для близких',
      'Встреча с близкими',
      'Заранее согласованная встреча в свободный день.',
      (n) => `${n} встречается с близкими за чаем. Разговор помогает почувствовать поддержку.`,
    ),
  },
  {
    id: 'adult-household',
    minAge: 18,
    build: self(
      'Повседневные заботы',
      'Домашние дела',
      'Обычный вечер дома.',
      (n) => `${n} завершает домашние дела и освобождает время для отдыха.`,
    ),
  },
  {
    id: 'adult-project',
    minAge: 18,
    build: self(
      'Шаг в своём деле',
      'Личный проект',
      'Работа над личной идеей без предположений о профессии.',
      (n) => `${n} возвращается к личному проекту и доводит до конца одну небольшую задачу.`,
    ),
  },
];

export function automaticEvent(life: Life, random: () => number): EventDraft | null {
  const now = monthIndex(life.currentDate);
  const lastSeen = new Map<string, number>();
  for (const entry of life.events) {
    if (entry.templateId && !lastSeen.has(entry.templateId))
      lastSeen.set(entry.templateId, monthIndex(entry.date));
  }
  // Quiet months are intentional. Childhood observations are rare and never cycle.
  const ids = new Set(templates.map((t) => t.id));
  const observations = life.events.filter((e) => e.templateId && ids.has(e.templateId));
  const interval = life.age < 18 ? 12 : 6;
  if (observations.some((e) => now - monthIndex(e.date) < interval)) return null;
  // Persistent per-template cooldown, independent of NPC messages and reloads.
  const eligible = templates.filter(
    (t) =>
      (!['teen-project','adult-project'].includes(t.id) || !!life.simulation?.development?.project) &&
      life.age >= t.minAge &&
      life.age <= (t.maxAge ?? Infinity) &&
      (life.age < 18 ? !lastSeen.has(t.id) : now - (lastSeen.get(t.id) ?? -Infinity) >= 36),
  );
  if (!eligible.length) return null; // A quiet month is better than a forced duplicate.
  const oldest = Math.min(...eligible.map((t) => lastSeen.get(t.id) ?? -Infinity));
  const pool = eligible.filter((t) => (lastSeen.get(t.id) ?? -Infinity) === oldest);
  const template = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  const draft={ ...template.build(life), templateId: template.id, kind: 'life' as const };
  if(['teen-project','adult-project'].includes(template.id)){const project=life.simulation!.development!.project!;draft.title=`Проект «${project.title}»`;draft.description=`${characterSubject(life.character)} возвращается к работе «${project.title}». Готовность: ${project.progress}%.`;draft.target={kind:'object',name:project.title};}
  return draft;
}
