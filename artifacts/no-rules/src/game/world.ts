import countries from '../../data/world.json';

export type Settlement = {
  geonameId: number; name: string; asciiName: string;
  region: { code: string; name: string; geonameId: number } | null;
  featureCode: string; population: number; latitude: number; longitude: number;
};
export type WorldCountry = {
  code: string; name: string; unMember: boolean; population: number;
  nameLocales: string[]; settlements: Settlement[];
};
export type Birthplace = {
  countryCode: string; settlementId: number; settlement: string;
  regionId?: number; regionCode?: string;
  population: number; latitude: number; longitude: number; featureCode: string;
};
export const worldCountries: readonly WorldCountry[] = countries;
export type BirthOptions = {
  countryCode?: string;
  weighting?: 'uniform' | 'population';
  includeTerritories?: boolean;
  random?: () => number;
};
export function chooseBirthplace(options: BirthOptions = {}) {
  const random = options.random ?? Math.random;
  const eligible = worldCountries.filter((country) => country.settlements.length &&
    (options.countryCode ? country.code === options.countryCode : country.unMember || options.includeTerritories));
  if (!eligible.length) throw new Error(`No sourced settlements for country: ${options.countryCode ?? 'selection'}`);
  let country: WorldCountry;
  if (options.weighting === 'population' && !options.countryCode) {
    const total = eligible.reduce((sum, item) => sum + Math.max(0, item.population), 0);
    if (!total) throw new Error('Population weights unavailable');
    let target = random() * total;
    country = eligible[eligible.length - 1];
    for (const item of eligible) {
      target -= Math.max(0, item.population);
      if (target < 0) { country = item; break; }
    }
  } else country = eligible[Math.floor(random() * eligible.length)];
  const settlement = country.settlements[Math.floor(random() * country.settlements.length)];
  const birthplace: Birthplace = {
    countryCode: country.code, settlementId: settlement.geonameId, settlement: settlement.name,
    ...(settlement.region ? { regionId: settlement.region.geonameId, regionCode: settlement.region.code } : {}),
    population: settlement.population, latitude: settlement.latitude, longitude: settlement.longitude, featureCode: settlement.featureCode,
  };
  return { country, settlement, birthplace };
}
export function settlementSize(population: number): string {
  if (population >= 10_000_000) return 'мегаполис';
  if (population >= 100_000) return 'крупный город';
  if (population >= 10_000) return 'небольшой город';
  return population > 0 ? 'малый населённый пункт' : 'населённый пункт';
}
