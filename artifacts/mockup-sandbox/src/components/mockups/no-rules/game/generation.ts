import type { BirthProfile, FamilyMember, Gender } from './domain';

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const namesGirl = ['Ася', 'Мира', 'Лида', 'Ника', 'Соня', 'Вера', 'Зоя', 'Ира'];
const namesBoy = ['Лев', 'Миша', 'Илья', 'Тимур', 'Ян', 'Саша', 'Рома', 'Егор'];
const surnames = ['Соколов', 'Мельников', 'Орлов', 'Волков', 'Зорин', 'Лебедев', 'Крылов'];
const places = [
  { country: 'Россия', regions: ['Тверская область', 'Карелия', 'Алтайский край', 'Псковская область', 'Урал'] },
  { country: 'Казахстан', regions: ['Алматинская область', 'Караганда', 'Северный Казахстан'] },
  { country: 'Грузия', regions: ['Имеретия', 'Кахетия', 'Аджария'] },
  { country: 'Армения', regions: ['Лорийская область', 'Ширак', 'Араратская долина'] },
  { country: 'Беларусь', regions: ['Витебская область', 'Полесье', 'Гродненская область'] },
];
const parents = [
  { relationship: 'Мама', jobs: ['фельдшер', 'библиотекарь', 'повар', 'швея', 'учительница', 'почтальон'], traits: ['заботливая', 'терпеливая', 'мечтательная'] },
  { relationship: 'Папа', jobs: ['механик', 'садовник', 'водитель', 'плотник', 'электрик', 'пекарь'], traits: ['спокойный', 'весёлый', 'задумчивый'] },
];
const traitPool = ['наблюдательный', 'упорный', 'мягкий характер', 'любознательный', 'осторожный', 'общительный', 'самостоятельный'];

export function generateBirthProfile(): BirthProfile {
  const place = pick(places);
  const gender: Gender = Math.random() > .5 ? 'Девочка' : 'Мальчик';
  const surname = pick(surnames);
  const family: FamilyMember[] = parents.map((parent, index) => ({
    id: `${index}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${pick(index === 0 ? namesGirl : namesBoy)} ${surname}`,
    relationship: parent.relationship, age: 25 + Math.floor(Math.random() * 13),
    occupation: pick(parent.jobs), personality: pick(parent.traits),
  }));
  if (Math.random() > .66) family.push({
    id: `s-${Math.random().toString(36).slice(2, 7)}`, name: `${pick(namesGirl)} ${surname}`,
    relationship: 'Старшая сестра', age: 2 + Math.floor(Math.random() * 8), occupation: 'школьница', personality: 'любит задавать вопросы',
  });
  const className = pick(['Рабочая семья', 'Скромный достаток', 'Уверенный достаток']);
  const home = className === 'Рабочая семья' ? pick(['комната в старом доме', 'небольшой дом у станции', 'квартира на окраине']) :
    className === 'Скромный достаток' ? pick(['уютная квартира', 'дом с маленьким садом', 'квартира над булочной']) :
    pick(['просторная квартира', 'дом у парка', 'светлый дом на тихой улице']);
  return {
    country: place.country, region: pick(place.regions), family, className, home,
    resources: className === 'Рабочая семья' ? ['Вещи по наследству', 'Соседи рядом', 'Много забот'] :
      className === 'Скромный достаток' ? ['Книги на полке', 'Надёжный быт', 'Выходные вместе'] :
        ['Свой двор', 'Запас на будущее', 'Время для семьи'],
    character: { name: `${pick(gender === 'Девочка' ? namesGirl : namesBoy)} ${surname}`, gender, traits: [pick(traitPool), pick(traitPool)] },
  };
}

export function dateAge(date: string, birthDate: string): number {
  const current = new Date(`${date}T12:00:00`), born = new Date(`${birthDate}T12:00:00`);
  let age = current.getFullYear() - born.getFullYear();
  if (current.getMonth() < born.getMonth() || (current.getMonth() === born.getMonth() && current.getDate() < born.getDate())) age--;
  return Math.max(0, age);
}
