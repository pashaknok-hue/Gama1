import type { Gender } from './domain';

// Names are stored in the nominative. Case forms are opt-in lexical data, never
// guessed from spelling or birthplace. Language describes this spelling, not ethnicity.
export type NameCases = { accusative: string; dative: string };
export type PersonalName = {
  givenName: string;
  familyName: string;
  language: string;
  namingContext: string;
  cases?: NameCases;
};
type GivenName = { name: string; cases?: NameCases };
type Surname = { male: GivenName; female: GivenName };
type NamePool = { language: string; male: GivenName[]; female: GivenName[]; surnames: Surname[] };
const literal = (name: string): GivenName => ({ name });
const lexical = (name: string, accusative: string, dative: string): GivenName => ({ name, cases: { accusative, dative } });
const invariant = (name: string): Surname => ({ male: literal(name), female: literal(name) });
const paired = (male: string, female: string): Surname => ({ male: literal(male), female: literal(female) });

export const namePools = {
  ru: {
    language: 'ru',
    male: [lexical('Александр', 'Александра', 'Александру'), lexical('Михаил', 'Михаила', 'Михаилу'), lexical('Илья', 'Илью', 'Илье'), lexical('Лев', 'Льва', 'Льву'), lexical('Дмитрий', 'Дмитрия', 'Дмитрию'), lexical('Егор', 'Егора', 'Егору')],
    female: [lexical('Анна', 'Анну', 'Анне'), lexical('Мария', 'Марию', 'Марии'), lexical('Вера', 'Веру', 'Вере'), lexical('Софья', 'Софью', 'Софье'), lexical('Зоя', 'Зою', 'Зое'), lexical('Ирина', 'Ирину', 'Ирине')],
    surnames: [
      { male: lexical('Соколов', 'Соколова', 'Соколову'), female: lexical('Соколова', 'Соколову', 'Соколовой') },
      { male: lexical('Мельников', 'Мельникова', 'Мельникову'), female: lexical('Мельникова', 'Мельникову', 'Мельниковой') },
      { male: lexical('Орлов', 'Орлова', 'Орлову'), female: lexical('Орлова', 'Орлову', 'Орловой') },
      { male: lexical('Лебедев', 'Лебедева', 'Лебедеву'), female: lexical('Лебедева', 'Лебедеву', 'Лебедевой') },
    ],
  },
  kk: {
    language: 'kk-Cyrl',
    male: ['Әлихан', 'Айдос', 'Данияр', 'Нұрлан', 'Ерлан', 'Арман'].map(literal),
    female: ['Әйгерім', 'Аружан', 'Мадина', 'Дана', 'Жанар', 'Әсел'].map(literal),
    surnames: [paired('Омаров', 'Омарова'), paired('Нұртаев', 'Нұртаева'), paired('Сәрсенов', 'Сәрсенова'), paired('Әбдірахманов', 'Әбдірахманова')],
  },
  ka: {
    language: 'ka-Cyrl',
    male: ['Гиорги', 'Леван', 'Давит', 'Иракли', 'Ника', 'Зураб'].map(literal),
    female: ['Нино', 'Тамар', 'Мариам', 'Саломе', 'Кетеван', 'Элене'].map(literal),
    surnames: ['Беридзе', 'Капанадзе', 'Гелашвили', 'Церетели'].map(invariant),
  },
  hy: {
    language: 'hy-Cyrl',
    male: ['Арам', 'Айк', 'Тигран', 'Армен', 'Гор', 'Нарек'].map(literal),
    female: ['Анаит', 'Мариам', 'Лусине', 'Нарине', 'Арпине', 'Сона'].map(literal),
    surnames: ['Саргсян', 'Григорян', 'Петросян', 'Арутюнян'].map(invariant),
  },
  be: {
    language: 'be-Cyrl',
    male: ['Алесь', 'Ян', 'Мікола', 'Павел', 'Андрэй', 'Уладзімір'].map(literal),
    female: ['Алена', 'Вольга', 'Ганна', 'Надзея', 'Кацярына', 'Марыя'].map(literal),
    surnames: [invariant('Міцкевіч'), invariant('Кавальчук'), paired('Дубоўскі', 'Дубоўская'), paired('Іваноў', 'Іванова')],
  },
  pl: {
    language: 'pl',
    male: ['Jan', 'Piotr', 'Michał', 'Paweł', 'Adam', 'Tomasz'].map(literal),
    female: ['Anna', 'Zofia', 'Maria', 'Ewa', 'Julia', 'Alicja'].map(literal),
    surnames: [paired('Kowalski', 'Kowalska'), paired('Wiśniewski', 'Wiśniewska'), invariant('Nowak'), invariant('Wójcik')],
  },
  krl: {
    language: 'krl-Latn',
    male: ['Antti', 'Mikko', 'Juho', 'Pekka', 'Matti', 'Ilja'].map(literal),
    female: ['Aino', 'Helmi', 'Anni', 'Vieno', 'Liisa', 'Olga'].map(literal),
    surnames: ['Karjalainen', 'Korhonen', 'Lesonen', 'Perttunen'].map(invariant),
  },
  tt: {
    language: 'tt-Cyrl',
    male: ['Айдар', 'Рустам', 'Тимур', 'Ильдар', 'Марат', 'Ринат'].map(literal),
    female: ['Алия', 'Гузель', 'Лейсан', 'Амина', 'Алсу', 'Эльвира'].map(literal),
    surnames: [paired('Юсупов', 'Юсупова'), paired('Хасанов', 'Хасанова'), paired('Галимов', 'Галимова'), paired('Сафиуллин', 'Сафиуллина')],
  },
} satisfies Record<string, NamePool>;
export type NamingContext = keyof typeof namePools;
type WeightedContext = readonly [NamingContext, number];
type BirthRegion = { country: string; region: string; naming: readonly WeightedContext[] };
// Editorial variety weights, not demographic probabilities. Each region allows
// multiple family language contexts; no name is a nationality classifier.
export const birthRegions: readonly BirthRegion[] = [
  { country: 'Россия', region: 'Тверская область', naming: [['ru', 8], ['tt', 2]] },
  { country: 'Россия', region: 'Карелия', naming: [['ru', 5], ['krl', 5]] },
  { country: 'Россия', region: 'Алтайский край', naming: [['ru', 7], ['kk', 3]] },
  { country: 'Россия', region: 'Псковская область', naming: [['ru', 8], ['be', 2]] },
  { country: 'Россия', region: 'Урал', naming: [['ru', 5], ['tt', 5]] },
  { country: 'Казахстан', region: 'Алматинская область', naming: [['kk', 8], ['ru', 2]] },
  { country: 'Казахстан', region: 'Караганда', naming: [['kk', 6], ['ru', 4]] },
  { country: 'Казахстан', region: 'Северный Казахстан', naming: [['kk', 5], ['ru', 5]] },
  { country: 'Грузия', region: 'Имеретия', naming: [['ka', 9], ['hy', 1]] },
  { country: 'Грузия', region: 'Кахетия', naming: [['ka', 8], ['hy', 1], ['ru', 1]] },
  { country: 'Грузия', region: 'Аджария', naming: [['ka', 9], ['ru', 1]] },
  { country: 'Армения', region: 'Лорийская область', naming: [['hy', 8], ['ka', 2]] },
  { country: 'Армения', region: 'Ширак', naming: [['hy', 9], ['ru', 1]] },
  { country: 'Армения', region: 'Араратская долина', naming: [['hy', 9], ['ru', 1]] },
  { country: 'Беларусь', region: 'Витебская область', naming: [['be', 6], ['ru', 4]] },
  { country: 'Беларусь', region: 'Полесье', naming: [['be', 7], ['ru', 3]] },
  { country: 'Беларусь', region: 'Гродненская область', naming: [['be', 6], ['pl', 3], ['ru', 1]] },
];
const pick = <T,>(items: readonly T[], random: () => number): T => items[Math.floor(random() * items.length)];
function contextFor(region: BirthRegion, random: () => number): NamingContext {
  let value = random() * region.naming.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [context, weight] of region.naming) {
    value -= weight;
    if (value < 0) return context;
  }
  return region.naming[region.naming.length - 1][0];
}
function person(context: NamingContext, gender: Gender, surname: Surname, random: () => number) {
  const pool: NamePool = namePools[context];
  const given = pick(gender === 'Девочка' ? pool.female : pool.male, random);
  const family = gender === 'Девочка' ? surname.female : surname.male;
  const name = `${given.name} ${family.name}`;
  const personalName: PersonalName = {
    givenName: given.name, familyName: family.name, language: pool.language, namingContext: context,
    ...(given.cases && family.cases ? { cases: {
      accusative: `${given.cases.accusative} ${family.cases.accusative}`,
      dative: `${given.cases.dative} ${family.cases.dative}`,
    } } : {}),
  };
  return { name, personalName };
}
export function generateFamilyNames(region: BirthRegion, gender: Gender, random: () => number = Math.random) {
  const fatherContext = contextFor(region, random);
  const motherContext = contextFor(region, random);
  const fatherSurname = pick(namePools[fatherContext].surnames, random);
  const motherSurname = pick(namePools[motherContext].surnames, random);
  // Parents may keep different surnames; siblings share the chosen family line.
  const childSurname = random() < .5 ? fatherSurname : motherSurname;
  const childContext = random() < .5 ? fatherContext : motherContext;
  return {
    character: person(childContext, gender, childSurname, random),
    mother: person(motherContext, 'Девочка', motherSurname, random),
    father: person(fatherContext, 'Мальчик', fatherSurname, random),
    sister: person(childContext, 'Девочка', childSurname, random),
  };
}

// The saved display string remains authoritative, including legacy/custom names.
export function nameInCase(person: { name: string; personalName?: PersonalName }, grammaticalCase: keyof NameCases): string | null {
  const details = person.personalName;
  if (!details || person.name !== `${details.givenName} ${details.familyName}`) return null;
  const form = details.cases?.[grammaticalCase];
  return typeof form === 'string' && form.length > 0 ? form : null;
}
