import lifeProfiles from '../../data/life-profiles.json';
import { russianSpelling } from './name-transcription';
import sourcePools from '../../data/name-pools.json';
import type { Gender } from './domain';
import type { WorldCountry, Settlement } from './world';

export type NameCases = { accusative: string; dative: string };
export type PersonalName = {
  givenName: string;
  familyName: string;
  language: string;
  namingContext: string;
  cases?: NameCases;
  displayName?: string;
  nativeGivenName?: string;
  nativeFamilyName?: string;
  status?: 'sourced' | 'missing';
  russianSpelling?: 'complete' | 'partial' | 'unavailable';
  transcriptionSources?: string[];
  familyRule?: string;
  source?: string;
  selection?: 'regional-or-country' | 'language-group' | 'reserve';
};
export type NamePool = {
  language: string;
  male: string[];
  female: string[];
  surnameMale: string[];
  surnameFemale: string[];
  patronymics?: Record<string, string>;
  familyPairs: string[][];
  surnameMode: string;
  order: string;
  source: string;
};
export const namePools: Record<string, NamePool> = sourcePools;
const pick = <T>(items: readonly T[], random: () => number): T =>
  items[Math.floor(random() * items.length)];

export function localesFor(country: WorldCountry, settlement?: Settlement): string[] {
  const region = settlement?.region?.name ?? '';
  // Regional refinements only where the language region is known. These select
  // available corpora, not ethnic identities or inferred demographic percentages.
  if (country.code === 'CH') {
    if (/Vaud|Genève|Neuchâtel|Jura/.test(region)) return ['fr_CH'];
    if (/Ticino/.test(region)) return ['it'];
  }
  if (country.code === 'BE') {
    if (/Walloon|Wallonie/.test(region)) return ['fr_BE'];
    if (/Flemish|Vlaanderen/.test(region)) return ['nl_BE'];
  }
  if (country.code === 'KZ' && /Almaty|Zhambyl|Turkistan|Shymkent|Kyzylorda/.test(region))
    return ['mm_kk'];
  if (country.code === 'CA' && /Quebec|Québec/.test(region)) return ['py_fr_CA'];
  if (country.code === 'IN') {
    if (/Gujarat/.test(region)) return ['py_gu_IN', 'en_IN'];
    if (/Tamil Nadu/.test(region)) return ['py_ta_IN', 'en_IN'];
    if (/Odisha|Orissa/.test(region)) return ['py_or_IN', 'en_IN'];
  }
  return country.nameLocales;
}
function person(
  locale: string,
  gender: Gender,
  surname: string,
  random: () => number,
  givenOverride?: string,
  surnameParts = [surname],
) {
  const pool = namePools[locale];
  const nativeGivenName =
    givenOverride ?? pick(gender === 'Девочка' ? pool.female : pool.male, random);
  const given = russianSpelling(nativeGivenName, pool.language);
  const family = surnameParts.map((part) => russianSpelling(part, pool.language));
  const parts = [given, ...family];
  const complete = parts.every((part) => part.verified);
  // Never mix half-transcribed and native name components in the display.
  const givenName = complete ? given.name : nativeGivenName;
  const familyName = complete ? family.map((part) => part.name).join(' ') : surname;
  const name =
    pool.order === 'family-first' ? `${familyName} ${givenName}` : `${givenName} ${familyName}`;
  const russianStatus = parts.every((part) => part.verified)
    ? 'complete'
    : parts.some((part) => part.verified)
      ? 'partial'
      : 'unavailable';
  return {
    name,
    personalName: {
      givenName,
      familyName,
      nativeGivenName,
      nativeFamilyName: surname,
      language: pool.language,
      namingContext: locale,
      source: pool.source,
      status: 'sourced' as const,
      russianSpelling: russianStatus as 'complete' | 'partial' | 'unavailable',
      transcriptionSources: [...new Set(parts.flatMap((part) => part.entities))],
      displayName: name,
    },
  };
}
export function generateFamilyNames(
  country: WorldCountry,
  gender: Gender,
  random: () => number = Math.random,
  settlement?: Settlement,
) {
  let locales = localesFor(country, settlement).filter((locale) => namePools[locale]);
  let selection: NonNullable<PersonalName['selection']> = 'regional-or-country';
  if (!locales.length) locales=country.nameLocales.filter(locale=>namePools[locale]);
  if (!locales.length) {
    const languages =
      (lifeProfiles.countries as Record<string, { languages: string[] }>)[country.code]
        ?.languages ?? [];
    for (const language of languages) {
      locales = Object.keys(namePools).filter((locale) => namePools[locale].language === language);
      if (locales.length) break;
    }
    selection = 'language-group';
  }
  if (!locales.length) {
    locales = ['en'];
    selection = 'reserve';
  }

  const fatherLocale = pick(locales, random),
    motherLocale = pick(locales, random);
  const fatherPool = namePools[fatherLocale],
    motherPool = namePools[motherLocale];
  const fatherLine = fatherPool.familyPairs.length ? pick(fatherPool.familyPairs, random) : null;
  const motherLine = motherPool.familyPairs.length ? pick(motherPool.familyPairs, random) : null;
  const fatherSurname = fatherLine?.[0] ?? pick(fatherPool.surnameMale, random);
  const motherSurname = motherLine?.[1] ?? pick(motherPool.surnameFemale, random);
  const inheritFather = random() < 0.5;
  const childLine = inheritFather ? fatherLine : motherLine;
  const childLocale = inheritFather ? fatherLocale : motherLocale;
  let boySurname = childLine?.[0] ?? pick(namePools[childLocale].surnameMale, random);
  let girlSurname = childLine?.[1] ?? pick(namePools[childLocale].surnameFemale, random);
  // If hereditary pairing isn't in the source (e.g. Indonesian second name
  // components), keep independently sourced components rather than invent kinship.
  const spanish = ['es', 'es_MX'].includes(fatherLocale) && ['es', 'es_MX'].includes(motherLocale);
  const portuguese =
    ['pt_BR', 'pt_PT'].includes(fatherLocale) && ['pt_BR', 'pt_PT'].includes(motherLocale);
  const fatherGiven =
    fatherPool.patronymics && Object.keys(fatherPool.patronymics).length
      ? pick(Object.keys(fatherPool.patronymics), random)
      : undefined;
  if (fatherGiven && fatherPool.patronymics) {
    boySurname = fatherPool.patronymics[fatherGiven] + 'son';
    girlSurname = fatherPool.patronymics[fatherGiven] + 'dóttir';
  }
  if (spanish) boySurname = girlSurname = `${fatherSurname} ${motherSurname}`;
  if (portuguese) boySurname = girlSurname = `${motherSurname} ${fatherSurname}`;
  const surnameParts = spanish
    ? [fatherSurname, motherSurname]
    : portuguese
      ? [motherSurname, fatherSurname]
      : undefined;
  const family = {
    character: person(
      childLocale,
      gender,
      gender === 'Девочка' ? girlSurname : boySurname,
      random,
      undefined,
      surnameParts,
    ),
    mother: person(motherLocale, 'Девочка', motherSurname, random),
    father: person(fatherLocale, 'Мальчик', fatherSurname, random, fatherGiven),
    sister: person(childLocale, 'Девочка', girlSurname, random, undefined, surnameParts),
  };
  for (const member of Object.values(family))
    (member.personalName as PersonalName).selection = selection;
  return family;
}

// Legacy display strings are authoritative. No regeneration, guessed declension
// or normalization on load; old explicitly saved case forms remain usable.
export function nameInCase(
  person: { name: string; personalName?: PersonalName },
  grammaticalCase: keyof NameCases,
): string | null {
  const details = person.personalName;
  if (
    !details ||
    person.name !== (details.displayName ?? `${details.givenName} ${details.familyName}`)
  )
    return null;
  const form = details.cases?.[grammaticalCase];
  return typeof form === 'string' && form.length > 0 ? form : null;
}
