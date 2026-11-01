import { dateAge } from './generation';
import type { BirthProfile, Life, LifeEvent, Stats } from './domain';

const randomId = () => Math.random().toString(36).slice(2, 10);
export function makeLife(profile: BirthProfile): Life {
  const month = 1 + Math.floor(Math.random() * 12), day = 1 + Math.floor(Math.random() * 28);
  const birthDate = `200${Math.floor(Math.random() * 9)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dateLabel = new Date(`${birthDate}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const birth: LifeEvent = {
    id: randomId(), date: birthDate, age: 0, title: 'Первый день',
    description: `${profile.character.name} родился в семье ${profile.family.map((member) => member.name.split(' ')[0]).join(' и ')}. За окном ${profile.region.toLowerCase()} — начинается новая история.`,
  };
  const now = new Date().toISOString();
  return {
    id: randomId(), character: profile.character, birthDate,
    location: { country: profile.country, region: profile.region }, family: profile.family,
    conditions: { className: profile.className, home: profile.home, resources: profile.resources },
    currentDate: birthDate, age: 0,
    stats: { health: 82, happiness: 68, curiosity: 36, energy: 76 }, events: [birth], createdAt: now, updatedAt: now,
  };
}

const actions = {
  cuddle: { title: 'Обнять малыша', infant: true, description: 'Тепло и спокойствие рядом.', effects: { happiness: 7, health: 2, energy: -3 } },
  walk: { title: 'Прогуляться', infant: true, description: 'Свежий воздух и новые звуки.', effects: { health: 5, curiosity: 4, energy: -5 } },
  sleep: { title: 'Хорошо выспаться', infant: true, description: 'Набраться сил до завтра.', effects: { energy: 13, health: 2 } },
  play: { title: 'Играть во дворе', minAge: 2, description: 'День, полный открытий.', effects: { happiness: 6, curiosity: 5, energy: -7 } },
  read: { title: 'Рассматривать книгу', minAge: 3, description: 'Истории открывают целые миры.', effects: { curiosity: 8, happiness: 2, energy: -3 } },
  learn: { title: 'Учиться новому', minAge: 6, description: 'Небольшой шаг к большому открытию.', effects: { curiosity: 7, energy: -5, happiness: 1 } },
  help: { title: 'Помочь семье', minAge: 5, description: 'Дома стало немного уютнее.', effects: { happiness: 3, energy: -4 } },
  explore: { title: 'Исследовать окрестности', minAge: 10, description: 'Новый маршрут, новые впечатления.', effects: { curiosity: 6, happiness: 4, energy: -8 } },
  create: { title: 'Сделать что-то своё', minAge: 7, description: 'Идея обрела форму.', effects: { happiness: 5, curiosity: 4, energy: -4 } },
} as const;
export type ActionId = keyof typeof actions;
export type ActionInfo = { id: ActionId; title: string; description: string; effects: Partial<Stats> };

export function availableActions(age: number): ActionInfo[] {
  return Object.entries(actions).filter(([, action]) => !('minAge' in action) || age >= action.minAge)
    .map(([id, action]) => ({ id: id as ActionId, title: action.title, description: action.description, effects: action.effects }));
}
const clamp = (value: number) => Math.max(0, Math.min(100, value));
function addEvent(life: Life, title: string, description: string, effects?: Partial<Stats>): Life {
  const event: LifeEvent = { id: randomId(), date: life.currentDate, age: life.age, title, description };
  if (effects) for (const key of Object.keys(effects) as (keyof Stats)[]) life.stats[key] = clamp(life.stats[key] + (effects[key] ?? 0));
  life.events.unshift(event);
  return life;
}

function maybeMilestone(life: Life): Life {
  if (life.age === 1) return addEvent(life, 'Первые шаги', `${life.character.name} сделал первые неуверенные шаги. Весь дом на мгновение замер.`);
  if (life.age === 3) return addEvent(life, 'Первое большое «почему?»', 'Вопросов становится всё больше, а мир — всё интереснее.');
  if (life.age === 6) return addEvent(life, 'Новая глава', `${life.character.name} впервые переступил порог школы.`);
  if (life.age === 13) return addEvent(life, 'Свои решения', 'Всё чаще хочется самому выбирать, как провести день.');
  if (life.age === 18) return addEvent(life, 'Взрослая жизнь', 'Перед тобой открывается больше дорог, чем прежде.');
  return life;
}
function maybeChoice(life: Life): Life {
  if (life.age < 3 || Math.random() > .23) return life;
  const event: LifeEvent = {
    id: randomId(), date: life.currentDate, age: life.age, title: 'После уроков',
    description: 'Одноклассник зовёт тебя на кружок рисования. Дома ждут дела, но любопытство не отпускает.',
    choices: [
      { label: 'Пойти на кружок', result: 'Новый знакомый показал, как смешивать краски. Ты возвращаешься домой с хорошим настроением.', effects: { curiosity: 7, happiness: 5, energy: -5 } },
      { label: 'Позвать друга гулять', result: 'Вы придумали игру во дворе и договорились встретиться снова.', effects: { happiness: 7, curiosity: 3, energy: -7 } },
      { label: 'Помочь семье дома', result: 'Ты помог разобрать покупки, а потом вместе с родными пил чай на кухне.', effects: { happiness: 4, health: 2, energy: 1 } },
      { label: 'Попросить новую книгу', result: 'Вечером близкий человек читает тебе историю, и ты запоминаешь новое слово.', effects: { curiosity: 8, happiness: 2, energy: -2 } },
    ],
  };
  life.events.unshift(event);
  return life;
}
export function advance(life: Life, actionId: ActionId, months = 1): Life {
  const action = actions[actionId];
  if (!action || !availableActions(life.age).some((item) => item.id === actionId)) return life;
  const nextDate = new Date(`${life.currentDate}T12:00:00`);
  nextDate.setMonth(nextDate.getMonth() + months);
  life.currentDate = nextDate.toISOString().slice(0, 10);
  const previousAge = life.age;
  life.age = dateAge(life.currentDate, life.birthDate);
  const description = action.description;
  addEvent(life, action.title, description, action.effects);
  if (life.age > previousAge) maybeMilestone(life);
  maybeChoice(life);
  life.updatedAt = new Date().toISOString();
  return life;
}
export function resolveChoice(life: Life, eventId: string, choiceIndex: number): Life {
  const event = life.events.find((item) => item.id === eventId);
  const choice = event?.choices?.[choiceIndex];
  if (!event || !choice || event.outcome) return life;
  event.outcome = choice.result;
  for (const key of Object.keys(choice.effects) as (keyof Stats)[]) life.stats[key] = clamp(life.stats[key] + (choice.effects[key] ?? 0));
  life.updatedAt = new Date().toISOString();
  return life;
}
