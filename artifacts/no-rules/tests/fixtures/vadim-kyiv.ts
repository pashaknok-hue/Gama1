import { generateBirthProfile } from '../../src/game/generation';
import { makeLife } from '../../src/game/simulation';
import { worldCountries } from '../../src/game/world';
import { randomState } from '../../src/game/random';

// User-reported save, not an alternate birth generator. Geographic IDs come from our dataset.
export function vadimKyiv() {
  const country = worldCountries.find((c) => c.code === 'UA')!;
  const place = country.settlements.find((s) => s.name === 'Kyiv' || s.name === 'Kiev');
  if (!place) throw new Error('Sourced Kyiv settlement is missing');
  const profile = generateBirthProfile({ countryCode: 'UA', random: () => 0.4 });
  profile.region = place.region?.name ?? 'Регион не указан';
  profile.birthplace = {
    countryCode: 'UA',
    settlementId: place.geonameId,
    settlement: place.name,
    ...(place.region ? { regionId: place.region.geonameId, regionCode: place.region.code } : {}),
    population: place.population,
    latitude: place.latitude,
    longitude: place.longitude,
    featureCode: place.featureCode,
  };
  profile.character.name = 'Вадим Янюк';
  profile.character.gender = 'Мальчик';
  delete profile.character.personalName;
  const life = makeLife(profile, {
    id: 'regression-vadim-kyiv-20001203',
    now: '2000-12-03T12:00:00.000Z',
    random: () => 0.4,
  });
  life.birthDate = life.currentDate = '2000-12-03';
  life.age = 0;
  life.events[0].date = life.birthDate;
  life.events[0].id = 'birth-vadim-kyiv';
  delete life.simulation; // The reported published save predates the new simulation layer.
  return life;
}
export function deterministicVadimKyiv() {
  const life = vadimKyiv();
  life.rng = randomState(0);
  return life;
}
