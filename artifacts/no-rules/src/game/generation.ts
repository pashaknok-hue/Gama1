import type { BirthProfile, FamilyMember, Gender } from './domain';
import { generateFamilyNames } from './names';
import { chooseBirthplace, type BirthOptions } from './world';

const pick = <T>(items: T[], random: () => number): T => items[Math.floor(random() * items.length)];
const parents = [
  {
    relationship: 'Мама',
    jobs: ['фельдшер', 'библиотекарь', 'повар', 'швея', 'учительница', 'почтальон'],
    traits: ['заботливая', 'терпеливая', 'мечтательная'],
  },
  {
    relationship: 'Папа',
    jobs: ['механик', 'садовник', 'водитель', 'плотник', 'электрик', 'пекарь'],
    traits: ['спокойный', 'весёлый', 'задумчивый'],
  },
];
const traitPool = [
  'наблюдательный',
  'упорный',
  'мягкий характер',
  'любознательный',
  'осторожный',
  'общительный',
  'самостоятельный',
];

export function generateBirthProfile(options: BirthOptions = {}): BirthProfile {
  const random = options.random ?? Math.random;
  const choose = <T>(items: T[]) => pick(items, random);
  const { country, settlement, birthplace } = chooseBirthplace(options);
  const gender: Gender = random() > 0.5 ? 'Девочка' : 'Мальчик';
  const names = generateFamilyNames(country, gender, options.random, settlement);
  const family: FamilyMember[] = parents.map((parent, index) => ({
    id: `${index}-${random().toString(36).slice(2, 7)}`,
    ...(index === 0 ? names.mother : names.father),
    relationship: parent.relationship,
    age: 25 + Math.floor(random() * 13),
    occupation: choose(parent.jobs),
    personality: choose(parent.traits),
  }));
  if (random() > 0.66)
    family.push({
      id: `s-${random().toString(36).slice(2, 7)}`,
      ...names.sister,
      relationship: 'Старшая сестра',
      age: 2 + Math.floor(random() * 8),
      occupation: 'школьница',
      personality: 'любит задавать вопросы',
    });
  const className = choose(['Рабочая семья', 'Скромный достаток', 'Уверенный достаток']);
  const home =
    className === 'Рабочая семья'
      ? choose(['комната в старом доме', 'небольшой дом у станции', 'квартира на окраине'])
      : className === 'Скромный достаток'
        ? choose(['уютная квартира', 'дом с маленьким садом', 'квартира над булочной'])
        : choose(['просторная квартира', 'дом у парка', 'светлый дом на тихой улице']);
  return {
    country: country.name,
    region: settlement.region?.name ?? 'Регион не указан',
    birthplace,
    family,
    className,
    home,
    resources:
      className === 'Рабочая семья'
        ? ['Вещи по наследству', 'Соседи рядом', 'Много забот']
        : className === 'Скромный достаток'
          ? ['Книги на полке', 'Надёжный быт', 'Выходные вместе']
          : ['Свой двор', 'Запас на будущее', 'Время для семьи'],
    character: {
      ...names.character,
      gender,
      traits: [...new Set([choose(traitPool), choose(traitPool)])].map((trait) =>
        gender === 'Девочка' ? trait.replace(/ый$/, 'ая') : trait,
      ),
    },
  };
}

export { civilAge as dateAge } from './calendar';
