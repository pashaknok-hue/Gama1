import type { BirthProfile, Character } from './domain';
import { nameInCase } from './names';

export function birthDescription(profile: BirthProfile): string {
  const verb = profile.character.gender === 'Девочка' ? 'Родилась' : 'Родился';
  const family = profile.family.map((member) => `${member.relationship.toLowerCase()} — ${member.name}`).join('; ');
  return `${verb} ${profile.character.name}. Семья: ${family}. Место рождения: ${profile.region}, ${profile.country}. Начинается новая история.`;
}

export function embraceDescription(character: Character): string {
  const accusative = nameInCase(character, 'accusative');
  return accusative
    ? `Мама обняла ${accusative}. Рядом тепло и спокойно.`
    : `${character.name} чувствует тепло маминых объятий. Рядом спокойно.`;
}

export function birthdayDescription(character: Character, age: number): string {
  const lastTwo = age % 100;
  const last = age % 10;
  const singular = last === 1 && lastTwo !== 11;
  const year = singular ? 'год' : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'года' : 'лет';
  const words: Record<number, string> = { 1: 'один', 2: 'два', 3: 'три', 4: 'четыре', 5: 'пять', 6: 'шесть', 13: 'тринадцать', 18: 'восемнадцать' };
  const ageLabel = `${words[age] ?? age} ${year}`;
  const dative = nameInCase(character, 'dative');
  return dative
    ? `${dative} ${singular ? 'исполнился' : 'исполнилось'} ${ageLabel}.`
    : `${character.name} отмечает день рождения: ${ageLabel}.`;
}
