import assert from 'node:assert/strict';
import test from 'node:test';
import { birthRegions, generateFamilyNames, nameInCase, namePools } from '../src/game/names';
import { generateBirthProfile } from '../src/game/generation';
import { birthDescription, birthdayDescription, embraceDescription } from '../src/game/event-text';
import { advance, makeLife } from '../src/game/simulation';
import { loadLife, saveLife } from '../src/game/storage';
import type { Character, Gender } from '../src/game/domain';

function randomSequence(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
function example(context: keyof typeof namePools, gender: Gender): Character {
  return { ...generateFamilyNames({ ...birthRegions[0], naming: [[context, 1]] }, gender, () => 0).character, gender, traits: [] };
}

for (const region of birthRegions) {
  for (const gender of ['Девочка', 'Мальчик'] as const) {
    test(`${region.country}, ${region.region}, ${gender}: regional variety and the entire family`, () => {
      const random = randomSequence(523);
      const contexts = new Set<string>();
      const names = new Set<string>();
      let mixed = false;
      for (let i = 0; i < 200; i++) {
        const family = generateFamilyNames(region, gender, random);
        const before = JSON.stringify(family);
        for (const [role, person] of Object.entries(family)) {
          const pool = namePools[person.personalName.namingContext as keyof typeof namePools];
          assert.ok(region.naming.some(([context]) => context === person.personalName.namingContext));
          contexts.add(person.personalName.namingContext);
          const isFemale = role === 'mother' || role === 'sister' || (role === 'character' && gender === 'Девочка');
          assert.ok((isFemale ? pool.female : pool.male).some((entry) => entry.name === person.personalName.givenName));
          assert.equal(person.personalName.language, pool.language);
          assert.equal(person.name, `${person.personalName.givenName} ${person.personalName.familyName}`);
          nameInCase(person, 'accusative');
          nameInCase(person, 'dative');
        }
        for (const role of ['mother', 'father'] as const) {
          const pool = namePools[family[role].personalName.namingContext as keyof typeof namePools];
          assert.ok(pool.surnames.some((pair) => pair[role === 'mother' ? 'female' : 'male'].name === family[role].personalName.familyName));
        }
        const surnamePairs = [family.mother, family.father].flatMap((parent) =>
          namePools[parent.personalName.namingContext as keyof typeof namePools].surnames.filter((pair) =>
            pair.male.name === parent.personalName.familyName || pair.female.name === parent.personalName.familyName));
        assert.ok(surnamePairs.some((pair) => pair[gender === 'Девочка' ? 'female' : 'male'].name === family.character.personalName.familyName && pair.female.name === family.sister.personalName.familyName));
        assert.equal(JSON.stringify(family), before, 'Case lookup must never mutate display names');
        mixed ||= family.mother.personalName.namingContext !== family.father.personalName.namingContext;
        names.add(family.character.name);
      }
      assert.deepEqual([...contexts].sort(), region.naming.map(([context]) => context).sort());
      assert.ok(mixed, 'Different family language contexts must be possible');
      assert.ok(names.size > 20, 'A region must not collapse to a few fixed names');
    });
  }
}

test('Russian lexical cases: nominative display, accusative embrace and dative birthday', () => {
  const boy = example('ru', 'Мальчик');
  const girl = example('ru', 'Девочка');
  assert.equal(boy.name, 'Александр Соколов');
  assert.equal(girl.name, 'Анна Соколова');
  assert.match(embraceDescription(boy), /^Мама обняла Александра Соколова\./);
  assert.match(embraceDescription(girl), /^Мама обняла Анну Соколову\./);
  assert.equal(birthdayDescription(boy, 5), 'Александру Соколову исполнилось пять лет.');
  assert.equal(birthdayDescription(girl, 1), 'Анне Соколовой исполнился один год.');
  for (const [age, ending] of [[2, 'два года.'], [11, '11 лет.'], [21, '21 год.'], [22, '22 года.'], [25, '25 лет.']] as const) {
    assert.ok(birthdayDescription(boy, age).endsWith(ending));
  }
});

for (const context of Object.keys(namePools) as (keyof typeof namePools)[]) {
  for (const gender of ['Девочка', 'Мальчик'] as const) {
    test(`${context}, ${gender}: birth, relatives, actions and milestones preserve nominative names`, () => {
      const character = example(context, gender);
      const profile = generateBirthProfile();
      profile.character = character;
      const description = birthDescription(profile);
      assert.ok(description.startsWith(`${gender === 'Девочка' ? 'Родилась' : 'Родился'} ${character.name}.`));
      for (const relative of profile.family) assert.ok(description.includes(`${relative.relationship.toLowerCase()} — ${relative.name}`));
      const life = makeLife(profile);
      assert.equal(life.events[0].description, description);
      life.birthDate = life.currentDate = '2001-01-01';
      advance(life, 'cuddle', 1);
      assert.equal(life.events[0].description, embraceDescription(character));
      advance(life, 'sleep', 11);
      assert.equal(life.age, 1);
      assert.ok(life.events.find((event) => event.title === 'Первые шаги')?.description.includes(`${character.name} делает первые`));
      if (context !== 'ru') {
        assert.equal(nameInCase(character, 'accusative'), null);
        assert.equal(nameInCase(character, 'dative'), null);
        assert.ok(embraceDescription(character).startsWith(`${character.name} чувствует`));
        assert.equal(birthdayDescription(character, 5), `${character.name} отмечает день рождения: пять лет.`);
      }
      assert.equal(life.character.name, character.name);
    });
  }
}

test('Legacy saves: no guessing, renaming relatives, rewriting history or requiring metadata', () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } });
  const life = makeLife(generateBirthProfile());
  delete life.character.personalName;
  life.character.name = 'Ася Соколов'; // Keep even an incorrect name from an old save.
  for (const relative of life.family) delete relative.personalName;
  const before = JSON.stringify(life);
  assert.ok(saveLife(life));
  const loaded = loadLife();
  assert.equal(JSON.stringify(loaded), before);
  assert.equal(nameInCase(loaded!.character, 'dative'), null);
  assert.match(embraceDescription(loaded!.character), /^Ася Соколов чувствует/);
  assert.ok(saveLife(loaded!));
  assert.equal(JSON.stringify(loadLife()), before);
  const stale = { ...example('ru', 'Девочка'), name: 'Любое другое имя' };
  assert.equal(nameInCase(stale, 'accusative'), null, 'Never apply stale lexical forms to a changed name');
  const modern = makeLife(generateBirthProfile());
  assert.ok(saveLife(modern));
  assert.deepEqual(loadLife(), modern, 'New name metadata must survive the same save format');
});

test('Birth profile wiring selects the region before names and includes named siblings', () => {
  const previousRandom = Math.random;
  const countries = new Set<string>();
  const genders = new Set<string>();
  let sisters = 0;
  Math.random = randomSequence(8319);
  try {
    for (let i = 0; i < 500; i++) {
      const profile = generateBirthProfile();
      countries.add(profile.country);
      genders.add(profile.character.gender);
      const region = birthRegions.find((place) => place.country === profile.country && place.region === profile.region)!;
      assert.ok(region);
      for (const person of [profile.character, ...profile.family]) {
        assert.ok(person.personalName);
        assert.ok(region.naming.some(([context]) => context === person.personalName!.namingContext));
        assert.equal(person.name, `${person.personalName!.givenName} ${person.personalName!.familyName}`);
      }
      if (profile.family.some((person) => person.relationship === 'Старшая сестра')) sisters++;
    }
  } finally {
    Math.random = previousRandom;
  }
  assert.equal(countries.size, 5);
  assert.equal(genders.size, 2);
  assert.ok(sisters > 0);
});
