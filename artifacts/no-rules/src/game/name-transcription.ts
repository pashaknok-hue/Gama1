import spellings from '../../data/russian-names.json';
const dictionary: Record<string, { name: string; entities: string[] }> = spellings;

export function russianSpelling(native: string, language: string) {
  if (language === 'ru') return { name: native, verified: true, entities: [] as string[] };
  const entry = dictionary[`${language}:${native}`];
  return entry
    ? { name: entry.name, verified: true, entities: entry.entities }
    : { name: native, verified: false, entities: [] as string[] };
}
