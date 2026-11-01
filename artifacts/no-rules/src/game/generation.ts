import type { BirthProfile, FamilyMember, Gender } from './domain';
import { birthRegions, generateFamilyNames } from './names';

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const parents = [
  { relationship: 'Мама', jobs: ['фельдшер', 'библиотекарь', 'повар', 'швея', 'учительница', 'почтальон'], traits: ['заботливая', 'терпеливая', 'мечтательная'] },
  { relationship: 'Папа', jobs: ['механик', 'садовник', 'водитель', 'плотник', 'электрик', 'пекарь'], traits: ['спокойный', 'весёлый', 'задумчивый'] },
];
const traitPool = ['наблюдательный', 'упорный', 'мягкий характер', 'любознательный', 'осторожный', 'общительный', 'самостоятельный'];

export function generateBirthProfile(): BirthProfile {
  const country = pick([...new Set(birthRegions.map((place) => place.country))]);
  const place = pick(birthRegions.filter((region) => region.country === country));
  const gender: Gender = Math.random() > .5 ? 'Девочка' : 'Мальчик';
  const names = generateFamilyNames(place, gender);
  const family: FamilyMember[] = parents.map((parent, index) => ({
    id: `${index}-${Math.random().toString(36).slice(2, 7)}`,
    ...(index === 0 ? names.mother : names.father),
    relationship: parent.relationship, age: 25 + Math.floor(Math.random() * 13),
    occupation: pick(parent.jobs), personality: pick(parent.traits),
  }));
  if (Math.random() > .66) family.push({
    id: `s-${Math.random().toString(36).slice(2, 7)}`, ...names.sister,
    relationship: 'Старшая сестра', age: 2 + Math.floor(Math.random() * 8), occupation: 'школьница', personality: 'любит задавать вопросы',
  });
  const className = pick(['Рабочая семья', 'Скромный достаток', 'Уверенный достаток']);
  const home = className === 'Рабочая семья' ? pick(['комната в старом доме', 'небольшой дом у станции', 'квартира на окраине']) :
    className === 'Скромный достаток' ? pick(['уютная квартира', 'дом с маленьким садом', 'квартира над булочной']) :
    pick(['просторная квартира', 'дом у парка', 'светлый дом на тихой улице']);
  return {
    country: place.country, region: place.region, family, className, home,
    resources: className === 'Рабочая семья' ? ['Вещи по наследству', 'Соседи рядом', 'Много забот'] :
      className === 'Скромный достаток' ? ['Книги на полке', 'Надёжный быт', 'Выходные вместе'] :
        ['Свой двор', 'Запас на будущее', 'Время для семьи'],
    character: { ...names.character, gender, traits: [pick(traitPool), pick(traitPool)] },
  };
}

export function dateAge(date: string, birthDate: string): number {
  const current = new Date(`${date}T12:00:00`), born = new Date(`${birthDate}T12:00:00`);
  let age = current.getFullYear() - born.getFullYear();
  if (current.getMonth() < born.getMonth() || (current.getMonth() === born.getMonth() && current.getDate() < born.getDate())) age--;
  return Math.max(0, age);
}
