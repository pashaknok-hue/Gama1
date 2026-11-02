import test from 'node:test';
import assert from 'node:assert/strict';
import { seededLife } from '../src/game/seeded-life';
import { advanceTime, advance, resolveChoice } from '../src/game/simulation';
import { canChoose, pendingDecision } from '../src/game/event-rules';
import { ensureSimulation, applyEffects } from '../src/game/causal-state';
import { reconcile, formatMoney } from '../src/game/finance';
import { schoolProfile } from '../src/game/education';
import { saveLife, loadLife } from '../src/game/storage';
import { generateBirthProfile } from '../src/game/generation';
const bytes = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => bytes.get(k) ?? null,
    setItem: (k: string, v: string) => bytes.set(k, v),
  },
});
function choose(life: ReturnType<typeof seededLife>, index = 0) {
  const e = pendingDecision(life);
  if (e) {
    const i = canChoose(life, e, index)
      ? index
      : e.choices!.findIndex((_, i) => canChoose(life, e, i));
    resolveChoice(life, e.id, i);
  }
}
test('Angola has language-group names for every family member, never falsely labelled as local', () => {
  const p = generateBirthProfile({ countryCode: 'AO', random: () => 0.9 });
  for (const person of [p.character, ...p.family]) {
    assert.ok(person.name.trim() && person.name !== 'Имя не указано');
    assert.equal(person.personalName?.selection, 'language-group');
    assert.equal(person.personalName?.language, 'pt');
  }
});
test('UK, Finland and Ukraine follow distinct sourced entrance ages and full school durations', () => {
  for (const code of ['GB', 'FI', 'UA']) {
    let life = seededLife(100, { countryCode: code }),
      profile = schoolProfile(code);
    for (
      let m = 0;
      m < (profile.entryAge + profile.primaryYears + profile.secondaryYears) * 12 + 1;
      m++
    ) {
      advanceTime(life);
      choose(life);
      if (m % 60 === 0) {
        assert.ok(saveLife(life));
        life = loadLife()!;
      }
    }
    const s = life.simulation!,
      sc = s.school!;
    assert.equal(sc.status, 'completed');
    assert.equal(sc.grade, profile.primaryYears + profile.secondaryYears);
    assert.equal(sc.classmates.length, 2);
    assert.ok(sc.teacherId);
    assert.equal(life.events.filter((e) => e.templateId === 'school-enrollment').length, 1);
    assert.equal(life.events.filter((e) => e.templateId === 'school-graduation').length, 1);
    assert.ok(s.person.flags['school-completed']);
    assert.ok(reconcile(s));
  }
  assert.equal(schoolProfile('GB').entryAge, 5);
  assert.equal(schoolProfile('FI').entryAge, 7);
  assert.equal(schoolProfile('UA').primaryYears, 4);
});
test('Blocked school access is explicit and can be restored without fabricated past attendance', () => {
  const life = seededLife(101, { countryCode: 'AO' });
  ensureSimulation(life).person.flags['school-access-blocked'] = true;
  life.conditions.resources.push('Нет доступа к школе');
  for (let m = 0; m < 72; m++) {
    advanceTime(life);
    const e = pendingDecision(life);
    if (e?.templateId !== 'school-support') choose(life);
  }
  assert.equal(life.simulation!.school?.status, 'blocked');
  assert.equal(life.simulation!.school?.grade, 0);
  const e = pendingDecision(life)!;
  assert.equal(e.templateId, 'school-support');
  resolveChoice(life, e.id, 0);
  advanceTime(life);
  assert.equal(life.simulation!.school?.status, 'enrolled');
  assert.equal(life.simulation!.school?.grade, 1);
});
test('Pocket money is an auditable family transfer; every balance reconciles across save and load', () => {
  let life = seededLife(17, { countryCode: 'AO' });
  for (let m = 0; m < 18 * 12; m++) {
    advanceTime(life);
    choose(life);
    assert.ok(reconcile(life.simulation!));
  }
  const f = life.simulation!.finance!;
  assert.equal(f.currency, 'AOA');
  assert.ok(
    f.entries.some(
      (e) => e.kind === 'transfer' && e.account === 'cash' && e.reason.includes('Карманные'),
    ),
  );
  const count = f.entries.length;
  applyEffects(life, [{ cash: 5, savings: 3, debt: 2 }], life.events[0].id, 'Проверяемая операция');
  assert.ok(reconcile(life.simulation!));
  assert.ok(f.entries.length >= count + 3);
  assert.ok(saveLife(life));
  life = loadLife()!;
  assert.ok(reconcile(life.simulation!));
  assert.ok(formatMoney(life, 20).includes('AOA') || formatMoney(life, 20).includes('Kz'));
});
test('Training is concrete, qualification enables a named job and project has actual content and progress', () => {
  const life = seededLife(33, { countryCode: 'UA' });
  for (let m = 0; m < 16 * 12; m++) {
    advanceTime(life);
    if (pendingDecision(life)?.templateId !== 'training-path') choose(life);
  }
  const course = pendingDecision(life)!;
  assert.equal(course.templateId, 'training-path');
  assert.match(course.description, /ремонт|диагностик/);
  choose(life, 0);
  for (let m = 0; m < 24; m++) {
    advanceTime(life);
    choose(life);
  }
  assert.equal(life.simulation!.development?.course?.status, 'completed');
  for (let wait = 0; wait < 6 && !life.simulation!.person.job.employer; wait++) {
    advanceTime(life);
    choose(life);
  }
  assert.ok(life.simulation!.person.job.employer);
  assert.ok(life.simulation!.person.job.schedule);
  assert.match(life.simulation!.person.job.title, /Техник/);
  choose(life);
  advance(life, 'create');
  const project = life.simulation!.development!.project!;
  assert.ok(project.title && !project.title.includes('Личный проект'));
  assert.ok(project.sourceEventId);
  for (let m = 0; m < 50; m++) {
    advanceTime(life);
    choose(life);
  }
  assert.ok(project.progress === 100);
  assert.ok(
    life.events.some(
      (e) => e.templateId === 'project-ready' && e.description.includes(project.title),
    ),
  );
  assert.ok(reconcile(life.simulation!));
});
test('Legacy migration records only opening balances; corrupted financial history is rejected', () => {
  const life = seededLife(41);
  delete life.rng;
  delete life.simulation;
  const old = JSON.stringify(life);
  assert.ok(saveLife(life));
  assert.equal(JSON.stringify(loadLife()), old);
  advanceTime(life);
  assert.ok(life.simulation!.finance!.entries.some((e) => e.kind === 'opening'));
  assert.ok(saveLife(life));
  life.simulation!.finance!.entries[0].amount += 100;
  assert.equal(saveLife(life), false);
});

test('Graphics training produces a different qualification and employer from repair training', () => {
  const life = seededLife(81, { countryCode: 'UA' });
  for (let m = 0; m < 16 * 12; m++) {
    advanceTime(life);
    if (pendingDecision(life)?.templateId !== 'training-path') choose(life);
  }
  const course = pendingDecision(life)!;
  assert.equal(course.choices!.length, 4);
  resolveChoice(life, course.id, 3);
  for (let m = 0; m < 30; m++) {
    advanceTime(life);
    choose(life);
  }
  assert.ok(life.simulation!.person.flags['qualified-art']);
  assert.match(life.simulation!.development!.course!.title, /график/);
  assert.equal(life.simulation!.development!.course!.duration, 18);
  assert.match(life.simulation!.person.job.title, /дизайнер/);
  assert.match(life.simulation!.person.job.employer!, /Студия/);
  assert.ok(reconcile(life.simulation!));
});

test('Existing Angolan placeholders are repaired once without renaming actual people or rewriting history', () => {
  const life = seededLife(393, { countryCode: 'AO' });
  life.character.name = 'Имя не указано';
  for (const p of life.family) p.name = 'Имя не указано';
  life.family[0].name = 'Сохранённое имя матери';
  delete life.simulation;
  const birth = JSON.stringify(life.events),
    ids = life.family.map((p) => p.id);
  assert.ok(saveLife(life));
  const saved = loadLife()!;
  assert.equal(saved.character.name, 'Имя не указано');
  advanceTime(saved);
  assert.notEqual(saved.character.name, 'Имя не указано');
  assert.equal(saved.family[0].name, 'Сохранённое имя матери');
  assert.ok(saved.family.every((p) => p.name !== 'Имя не указано'));
  assert.deepEqual(
    saved.family.map((p) => p.id),
    ids,
  );
  assert.equal(JSON.stringify(saved.events.filter((e) => e.templateId === 'birth')), birth);
  const identity = JSON.stringify([saved.character, saved.family]);
  assert.ok(saveLife(saved));
  const reloaded = loadLife()!;
  advanceTime(reloaded);
  assert.equal(JSON.stringify([reloaded.character, reloaded.family]), identity);
  assert.equal(reloaded.events.filter((e) => e.templateId === 'identity-repair').length, 1);
});


test('Repairing legacy names on a birthday never suppresses the birthday record',()=>{
 const life=seededLife(9,{countryCode:'AO'});life.birthDate='2000-01-01';life.currentDate='2001-12-01';life.age=1;life.character.name='Имя не указано';life.events=[];delete life.simulation;advanceTime(life);
 assert.equal(life.currentDate,'2002-01-01');assert.equal(life.age,2);assert.equal(life.events.filter(e=>e.templateId==='identity-repair').length,1);assert.equal(life.events.filter(e=>e.templateId==='birthday-2').length,1);
});

test('An old acquaintance with no recorded encounter cannot invent a memory-backed conversation',()=>{
 const life=seededLife(4);life.age=8;life.currentDate=String(Number(life.birthDate.slice(0,4))+8)+life.birthDate.slice(4);life.events=[];delete life.simulation;
 const s=ensureSimulation(life);const id='old-friend';s.npcs[id]={id,name:'Алексей',role:'friend',age:8,bornMonth:0,traits:['общительный'],stats:{health:80,happiness:30},memory:[]};s.relationships[id]={npcId:id,bond:50,trust:50,lastContactMonth:s.lastMonth-30};advanceTime(life);
 assert.ok(!life.events.some(e=>e.templateId===`npc-contact-${id}`));assert.equal(s.npcs[id].memory.length,0);
});

test('Prolonged missed work has a real dismissal and stops the next salary',()=>{
 const life=seededLife(19);life.age=30;life.currentDate=String(Number(life.birthDate.slice(0,4))+30)+life.birthDate.slice(4);life.events=[];delete life.simulation;
 const s=ensureSimulation(life);s.person.job={status:'employed',title:'Техник',employer:'Мастерская района',income:150};s.person.flags['training-planned']=true;s.person.flags['friend-request-answered']=true;life.stats.health=0;
 for(let month=0;month<3;month++){advanceTime(life);choose(life);}
 assert.equal(s.person.job.status,'unemployed');assert.ok(life.events.some(e=>e.templateId==='dismissal'));advanceTime(life);assert.equal(s.person.money.lastIncome,0);assert.ok(reconcile(s));
});
