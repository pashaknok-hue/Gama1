import type { Life, Gender } from './domain';
import { worldCountries } from './world';
import { generateFamilyNames } from './names';
const absent = (name: string) => !name?.trim() || name === 'Имя не указано';
// Only explicit missing fields. Historical text, IDs and all existing actual names stay authoritative.
export function repairMissingNames(life: Life, random: () => number): number {
  const missingHero = absent(life.character.name),
    missingFamily = life.family.some((p) => absent(p.name));
  const missingNpcs = Object.values(life.simulation?.npcs ?? {}).some((p) => absent(p.name));
  if (!missingHero && !missingFamily && !missingNpcs) return 0;
  const country = worldCountries.find((c) => c.code === life.location.birthplace?.countryCode) ||
    worldCountries.find((c) => c.name === life.location.country) || {
      code: '',
      name: life.location.country,
      unMember: false,
      population: 0,
      nameLocales: [],
      settlements: [],
    };
  const place = country.settlements.find(
    (p) => p.geonameId === life.location.birthplace?.settlementId,
  );
  const family = generateFamilyNames(country, life.character.gender, random, place);
  let count = 0;
  if (missingHero) {
    Object.assign(life.character, family.character);
    count++;
  }
  for (const person of life.family)
    if (absent(person.name)) {
      const named =
        person.relationship === 'Мама'
          ? family.mother
          : person.relationship === 'Папа'
            ? family.father
            : family.sister;
      Object.assign(person, named);
      const npc = life.simulation?.npcs[person.id];
      if (npc) Object.assign(npc, named);
      count++;
    }
  for (const npc of Object.values(life.simulation?.npcs ?? {}))
    if (absent(npc.name)) {
      const gender: Gender = npc.gender ?? (random() < 0.5 ? 'Девочка' : 'Мальчик');
      Object.assign(npc, generateFamilyNames(country, gender, random, place).character);
      npc.gender = gender;
      count++;
    }
  return count;
}
