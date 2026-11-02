import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodePNG } from 'pixelbolt';
import { avatarGeometry, SCENE_FLOOR, sceneFor } from '../src/game/scene-state';
import { seededLife } from '../src/game/seeded-life';
import recipe from '../art/observer.json';
test('All rendered Pixelbolt frames are 24x32 and their actual opaque pixels touch y=30', () => {
  for (const frame of recipe.frames) {
    const png = decodePNG(
      readFileSync(
        new URL(`../public/prototype/observer/frames/${frame.name}.png`, import.meta.url),
      ),
    );
    assert.equal(png.width, 24);
    assert.equal(png.height, 32);
    let last = -1;
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 24; x++) if (png.data[(y * 24 + x) * 4 + 3]) last = y;
    assert.equal(last, 29, frame.name);
  }
});
test('Each prototype animation has at least two distinct rendered pixel frames',()=>{
 for(const mode of ['idle','walk','sit','sleep']){
  const hashes=new Set(recipe.frames.filter(f=>f.name.startsWith(mode+'-')).map(f=>createHash('sha256').update(decodePNG(readFileSync(new URL(`../public/prototype/observer/frames/${f.name}.png`,import.meta.url))).data).digest('hex')));
  assert.ok(hashes.size>=2,`${mode} must have actual pixel motion, not just changing frame names`);
 }
});

test('Main scene support stays on the same floor at every age', () => {
  for (const age of [0, 1, 3, 7, 14, 18, 45, 85]) {
    const a = avatarGeometry(age);
    assert.ok(Math.abs(a.top + 40 * a.scale - SCENE_FLOOR) < 0.0001);
  }
});
test('Scenes follow actual school, job and project state, not arbitrary age changes', () => {
  const life = seededLife(41);
  assert.equal(sceneFor(life).kind, 'home');
  const s = life.simulation!;
  s.person.job = { status: 'employed', title: 'Техник', employer: 'Мастерская', income: 100 };
  assert.equal(sceneFor(life).kind, 'workshop');
  s.person.job.status = 'retired';
  assert.equal(sceneFor(life).kind, 'garden');
  s.development = {
    project: {
      title: 'Рисунки двора',
      direction: 'art',
      progress: 50,
      status: 'active',
      startedMonth: 0,
    },
  };
  life.events.unshift({
    id: 'draw',
    kind: 'action',
    templateId: 'action-create',
    date: life.currentDate,
    age: 7,
    title: 'Рисование',
    description: 'Практика',
  });
  assert.equal(sceneFor(life).kind, 'studio');
});
