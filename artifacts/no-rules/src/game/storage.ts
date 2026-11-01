import type { Life, LifeEvent } from './domain';
const KEY = 'no-rules-life-v1';
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
export function isValidLife(value: unknown): value is Life {
  if (!isObject(value) || !isObject(value.character) || !isObject(value.location) || !isObject(value.conditions) || !isObject(value.stats)) return false;
  const stats = value.stats as Record<string, unknown>;
  return typeof value.id === 'string' && typeof value.currentDate === 'string' &&
    typeof value.birthDate === 'string' && typeof value.age === 'number' &&
    typeof value.character.name === 'string' && ['health', 'happiness', 'curiosity', 'energy'].every((key) => typeof stats[key] === 'number') &&
    Array.isArray(value.family) && Array.isArray(value.events) && Array.isArray(value.conditions.resources);
}
export function saveLife(life: Life): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(life)); return true; } catch { return false; }
}
function migrateDecisionChoices(life: Life): Life {
  const defaultChoices: NonNullable<LifeEvent['choices']> = [
    { label: 'Пойти на кружок', result: 'Новый знакомый показал, как смешивать краски. Ты возвращаешься домой с хорошим настроением.', effects: { curiosity: 7, happiness: 5, energy: -5 } },
    { label: 'Позвать друга гулять', result: 'Вы придумали игру во дворе и договорились встретиться снова.', effects: { happiness: 7, curiosity: 3, energy: -7 } },
    { label: 'Помочь семье дома', result: 'Ты помог разобрать покупки, а потом вместе с родными пил чай на кухне.', effects: { happiness: 4, health: 2, energy: 1 } },
    { label: 'Попросить новую книгу', result: 'Вечером близкий человек читает тебе историю, и ты запоминаешь новое слово.', effects: { curiosity: 8, happiness: 2, energy: -2 } },
  ];
  for (const event of life.events) {
    if (event.title !== 'После уроков' || !event.choices || event.outcome || event.choices.length >= 4) continue;
    const existingLabels = new Set(event.choices.map((choice) => choice.label));
    event.choices = [
      ...event.choices,
      ...defaultChoices.filter((choice) => !existingLabels.has(choice.label)),
    ].slice(0, 4);
  }
  return life;
}
export function loadLife(): Life | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isValidLife(value) ? migrateDecisionChoices(value) : null;
  } catch { return null; }
}
export function clearLife() { try { localStorage.removeItem(KEY); } catch { /* storage may be unavailable */ } }
