import assert from 'node:assert/strict';
import test from 'node:test';
import { worldCountries, chooseBirthplace, settlementSize } from '../src/game/world';
import { generateBirthProfile } from '../src/game/generation';
import { generateFamilyNames, namePools, nameInCase } from '../src/game/names';
import { russianSpelling } from '../src/game/name-transcription';
import { makeLife, advanceTime } from '../src/game/simulation';
import { birthDescription, embraceDescription, birthdayDescription, isolateName } from '../src/game/event-text';
import { loadLife, saveLife } from '../src/game/storage';
import type { BirthProfile, Character } from '../src/game/domain';

function randomSequence(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
} });

function validateBirth(profile: BirthProfile) {
  const country = worldCountries.find((item) => item.code === profile.birthplace?.countryCode)!;
  assert.ok(country);
  const place = country.settlements.find((item) => item.geonameId === profile.birthplace?.settlementId)!;
  assert.ok(place, 'Settlement must belong to the selected country');
  assert.equal(profile.region, place.region?.name ?? 'Регион не указан');
  assert.equal(profile.birthplace?.regionId, place.region?.geonameId);
  assert.equal(profile.birthplace?.settlement, place.name);
  assert.equal(profile.country, country.name);
  assert.ok(Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180);
  for (const [role, person] of [['character', profile.character], ...profile.family.map((member) => [member.relationship, member] as const)] as const) {
    const details = person.personalName!;
    if (!country.nameLocales.length) assert.ok(['language-group','reserve'].includes(details.selection!));
    assert.equal(details.status, 'sourced');
    const pool = namePools[details.namingContext];
    assert.ok(pool, 'Explicit source locale, never implicit English/Russian fallback');
    const female = role === 'Мама' || role === 'Старшая сестра' || (role === 'character' && profile.character.gender === 'Девочка');
    assert.ok((female ? pool.female : pool.male).includes(details.nativeGivenName!));
    assert.equal(person.name, details.displayName);
    const doubleFamily = ['es','es_MX','pt_BR','pt_PT'].includes(details.namingContext) && (role === 'character' || role === 'Старшая сестра');
    if (!doubleFamily) assert.ok((female ? pool.surnameFemale : pool.surnameMale).includes(details.nativeFamilyName!), 'Surname must be in the correct gender column of its source');
  }
}

for (const country of worldCountries.filter((item) => item.unMember)) {
  test(`${country.code}: sourced country-region-settlement and consistent family`, () => {
    for (let seed = 0; seed < 6; seed++) validateBirth(generateBirthProfile({ countryCode: country.code, random: randomSequence(seed + 20) }));
  });
}

test('All 193 UN members; observers are separate; unsupported geography never silently rerolls', () => {
  assert.equal(worldCountries.filter((country) => country.unMember).length, 193);
  for (const code of ['PS','VA','TW']) assert.equal(worldCountries.find((country) => country.code === code)?.unMember, false);
  assert.throws(() => chooseBirthplace({ countryCode: 'ZZ' }), /No sourced settlements/);
  assert.throws(() => chooseBirthplace({ countryCode: 'AQ' }), /No sourced settlements/);
  assert.ok(chooseBirthplace({ countryCode: 'PS' }).birthplace.settlementId);
});

test('10,000 actual random births: geographic/name/gender diversity, persistence and source integrity', () => {
  const random = randomSequence(742567);
  const countries = new Set<string>(), settlements = new Set<number>(), names = new Set<string>();
  const genders = new Set<string>(), families = new Set<string>(), sizes = new Set<string>();
  let named = 0, missing = 0;
  for (let i = 0; i < 10_000; i++) {
    const profile = generateBirthProfile({ random });
    validateBirth(profile);
    countries.add(profile.birthplace!.countryCode);
    settlements.add(profile.birthplace!.settlementId);
    genders.add(profile.character.gender);
    sizes.add(settlementSize(profile.birthplace!.population));
    if (profile.character.personalName?.status === 'missing') missing++;
    else { named++; names.add(profile.character.name); families.add(profile.character.personalName!.nativeFamilyName!); }
    const life = makeLife(profile);
    assert.ok(saveLife(life));
    assert.deepEqual(loadLife(), life, 'Birthplace and every family name must survive reload unchanged');
  }
  assert.equal(countries.size, 193);
  assert.equal(genders.size, 2);
  assert.ok(names.size > 1000 && families.size > 500 && settlements.size > 1000);
  assert.ok(sizes.has('мегаполис') && sizes.has('малый населённый пункт'));
  assert.equal(named,10000);assert.equal(missing,0);
  console.log(JSON.stringify({randomBirths:10_000,countries:countries.size,settlements:settlements.size,names:names.size,familyNames:families.size,named,missing}));
});

test('Population weighting is meaningful; uniform mode and additional territories remain available', () => {
  const uniform = randomSequence(34), population = randomSequence(34);
  let indiaUniform = 0, indiaPopulation = 0;
  for (let i = 0; i < 5000; i++) {
    if (chooseBirthplace({random:uniform}).country.code === 'IN') indiaUniform++;
    if (chooseBirthplace({random:population,weighting:'population'}).country.code === 'IN') indiaPopulation++;
  }
  assert.ok(indiaPopulation > indiaUniform * 10);
  const random = randomSequence(3145);
  assert.ok(Array.from({length:1000},() => chooseBirthplace({random,includeTerritories:true})).some((birth) => !birth.country.unMember));
});

test('Gendered surname pairs are sourced; a Russian girl never receives the male family variant', () => {
  const country = worldCountries.find((item) => item.code === 'RU')!;
  const random = randomSequence(67);
  for (let i = 0; i < 1000; i++) {
    const names = generateFamilyNames(country, 'Девочка', random);
    assert.ok(namePools.ru.surnameFemale.includes(names.character.personalName.nativeFamilyName!));
    assert.ok(namePools.ru.surnameMale.includes(names.father.personalName.nativeFamilyName!));
    assert.equal(names.character.personalName.nativeFamilyName, names.sister.personalName.nativeFamilyName);
  }
});

test('Local traditions: double surnames, family-first order and Icelandic patronymics', () => {
  for (const code of ['ES','BR','CN','JP','IS']) {
    const profile = generateBirthProfile({countryCode:code,random:randomSequence(987)});
    const details = profile.character.personalName!;
    if (['ES','BR'].includes(code)) {
      const father = profile.family[1].personalName!.nativeFamilyName!;
      const mother = profile.family[0].personalName!.nativeFamilyName!;
      assert.equal(details.nativeFamilyName, code === 'ES' ? `${father} ${mother}` : `${mother} ${father}`);
    }
    if (['CN','JP'].includes(code)) assert.ok(profile.character.name.startsWith(details.familyName));
    if (code === 'IS') {
      const fatherGiven = profile.family[1].personalName!.nativeGivenName!;
      const stem = namePools.py_is_IS.patronymics![fatherGiven];
      assert.equal(details.nativeFamilyName, stem + (profile.character.gender === 'Девочка' ? 'dóttir' : 'son'));
    }
  }
});

test('Regional corpora and multilingual families are selected explicitly', () => {
  const ca = worldCountries.find((country) => country.code === 'CA')!;
  const quebec = ca.settlements.find((place) => /Quebec|Québec/.test(place.region?.name ?? ''))!;
  assert.ok(quebec);
  const family = generateFamilyNames(ca,'Девочка',randomSequence(55),quebec);
  assert.equal(family.character.personalName.namingContext,'py_fr_CA');
  const india = worldCountries.find((country) => country.code === 'IN')!;
  assert.ok(india.nameLocales.includes('py_ta_IN') && india.nameLocales.includes('py_gu_IN'));
  const nigeria = worldCountries.find((country) => country.code === 'NG')!;
  assert.ok(nigeria.nameLocales.includes('yo_NG') && nigeria.nameLocales.includes('py_ha_NG') && nigeria.nameLocales.includes('py_ig_NG'));
});

test('Missing names and Russian spellings are explicit; no guessed transliteration or declension', () => {
  const missing = worldCountries.find((country) => country.unMember && !country.nameLocales.length)!;
  const profile = generateBirthProfile({countryCode:missing.code,random:randomSequence(77)});
  assert.equal(profile.character.personalName?.status, 'sourced');
  assert.ok(['language-group','reserve'].includes(profile.character.personalName!.selection!));
  assert.ok(!birthDescription(profile).includes('Родилась Имя не указано'));
  assert.ok(!birthDescription(profile).includes('Родился Имя не указано'));
  assert.equal(russianSpelling('Not-a-known-name-123','xx').name, 'Not-a-known-name-123');
  assert.equal(russianSpelling('Not-a-known-name-123','xx').verified, false);
  assert.equal(nameInCase(profile.character,'accusative'),null);
  assert.ok(!embraceDescription(profile.character).includes('Имя не указано'));
});

test('Old names, multiword relatives, explicit lexical cases and historical journal survive reload', () => {
  const life = makeLife(generateBirthProfile({countryCode:'RU'}));
  delete life.location.birthplace;
  delete life.character.personalName;
  life.character.name = 'Зоя Волков';
  for (const relative of life.family) delete relative.personalName;
  life.family[0].name = 'Любое старое многословное имя';
  assert.ok(saveLife(life));
  assert.deepEqual(loadLife(),life);
  assert.equal(nameInCase(life.character,'dative'),null);
  const legacy: Character = { name:'Александр Соколов',gender:'Мальчик',traits:[],personalName:{givenName:'Александр',familyName:'Соколов',language:'ru',namingContext:'ru',cases:{accusative:'Александра Соколова',dative:'Александру Соколову'}} };
  assert.match(embraceDescription(legacy), /Мама обняла Александра Соколова/);
  assert.equal(birthdayDescription(legacy,5),'Александру Соколову исполнилось пять лет.');
  legacy.name='Изменённое имя';
  assert.equal(nameInCase(legacy,'dative'),null);
});

test('Birth and automatic life events use Russian grammar without mutating names', () => {
  for (const countryCode of ['RU','FR','CN','JP','NG','BD','GE','KZ']) {
    const profile = generateBirthProfile({countryCode,random:randomSequence(89)});
    const life = makeLife(profile);
    const before = JSON.stringify(life.character);
    assert.equal(life.events[0].description,birthDescription(profile));
    life.birthDate = life.currentDate = '2001-01-01';
    advanceTime(life,1,()=>.99);
    assert.ok(life.events[0].actor && life.events[0].target && life.events[0].context);
    advanceTime(life,11,()=>.99);
    assert.equal(life.age,1);
    assert.ok(life.events.some((event) => event.title === 'Первые шаги'));
    assert.equal(JSON.stringify(life.character),before);
  }
});


test('RTL names are isolated in Russian event text without modifying saved identity', () => {
  const native = 'أحمد علي';
  const character: Character = { name:native,gender:'Мальчик',traits:[] };
  assert.equal(isolateName(native), `\u2068${native}\u2069`);
  assert.equal(isolateName('Анна Соколова'), 'Анна Соколова');
  assert.ok(embraceDescription(character).startsWith(`\u2068${native}\u2069 чувствует`));
  assert.equal(character.name,native);
});
