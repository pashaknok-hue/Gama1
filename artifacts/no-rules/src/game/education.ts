import profiles from '../../data/life-profiles.json';
import type { Life } from './domain';
import { ensureSimulation, monthIndex, addNpc, npcParticipant, clamp } from './causal-state';
import { protagonist } from './life-events';
import type { CoreDraft } from './causal-engine';
import type { PathRule } from './life-paths';
import { isolateName } from './event-text';
export type SchoolState = {
  status: 'waiting' | 'enrolled' | 'blocked' | 'completed' | 'unrecorded';
  name: string;
  entryAge: number;
  primaryYears: number;
  secondaryYears: number;
  source: string;
  grade: number;
  enrolledMonth?: number;
  teacherId?: string;
  classmates: string[];
  subjects: Record<string, number>;
  attended: number;
  missed: number;
  lastYear: number;
  entryEventId?: string;
};
export function schoolProfile(code: string) {
  const p = (
    profiles.countries as Record<
      string,
      {
        school: {
          entryAge?: { value: number; year: string } | null;
          primaryYears?: { value: number; year?: string } | null;
          secondaryYears?: { value: number; year?: string } | null;
        };
      }
    >
  )[code]?.school;
  return {
    entryAge: p?.entryAge?.value ?? 6,
    primaryYears: p?.primaryYears?.value ?? 6,
    secondaryYears: p?.secondaryYears?.value ?? 6,
    source: `Возраст поступления: ${p?.entryAge ? 'UIS ' + p.entryAge.year : 'игровое допущение'}; начальная ступень: ${p?.primaryYears ? 'UIS' : 'игровое допущение'}; средняя: ${p?.secondaryYears ? 'UIS' : 'игровое допущение'}. Учебный год и предметы — модель игры`,
  };
}
function schoolEvent(life: Life, id: string, title: string, text: string): CoreDraft {
  const sc = ensureSimulation(life).school!;
  return {
    id: `${id}-${life.id}-${monthIndex(life.currentDate)}`,
    kind: 'life',
    category: 'education',
    templateId: id,
    title,
    description: text,
    actor: sc.teacherId
      ? npcParticipant(ensureSimulation(life).npcs[sc.teacherId])
      : { kind: 'world', name: sc.name },
    target: protagonist(life),
    context: sc.source,
    cause: {
      ruleId: id,
      facts: [sc.source, `Учебный класс: ${sc.grade}.`],
      sourceEventIds: sc.entryEventId ? [sc.entryEventId] : [],
    },
  };
}
export function schoolMonth(life: Life, random: () => number): CoreDraft[] {
  const s = ensureSimulation(life),
    now = monthIndex(life.currentDate),
    events: CoreDraft[] = [];
  if (!s.school) {
    const p = schoolProfile(s.world.countryCode);
    s.school = {
      ...p,
      status: life.age >= p.entryAge + p.primaryYears + p.secondaryYears ? 'unrecorded' : 'waiting',
      name: `Школа района ${life.location.birthplace?.settlement ?? life.location.region}`,
      grade: 0,
      classmates: [],
      subjects: { 'Чтение и язык': 55, Математика: 50, 'Окружающий мир': 55, Творчество: 60 },
      attended: 0,
      missed: 0,
      lastYear: 0,
    };
  }
  const sc = s.school;
  if (sc.status === 'unrecorded' || sc.status === 'completed' || life.age < sc.entryAge)
    return events;
  const blocked =
    s.person.flags['school-access-blocked'] ||
    (life.conditions.resources.includes('Нет доступа к школе') &&
      !s.person.flags['school-access-restored']);
  if (blocked) {
    if (sc.status !== 'blocked') {
      sc.status = 'blocked';
      events.push(
        schoolEvent(
          life,
          'school-no-access',
          'Пока нет доступа к школе',
          'Семья не смогла организовать регулярное посещение. Нужен поиск доступного способа обучения.',
        ),
      );
    }
    return events;
  }
  if (sc.status === 'waiting' || sc.status === 'blocked') {
    sc.status = 'enrolled';
    sc.grade = 1;
    sc.enrolledMonth = now;
    sc.teacherId = addNpc(life, 'teacher', random).id;
    sc.classmates = [addNpc(life, 'classmate', random).id, addNpc(life, 'classmate', random).id];
    s.person.education = 'school';
    const e = schoolEvent(
      life,
      'school-enrollment',
      'Зачисление в школу',
      `${isolateName(life.character.name)} зачислен${life.character.gender === 'Девочка' ? 'а' : ''} в первый класс: ${sc.name}. Учитель — ${isolateName(s.npcs[sc.teacherId].name)}. Среди одноклассников — ${sc.classmates.map((id) => isolateName(s.npcs[id].name)).join(', ')}.`,
    );
    sc.entryEventId = e.id;
    e.cause!.sourceEventIds = [];
    events.push(e);
  }
  if (life.stats.health < 35 || s.person.flags['skip-school']) sc.missed++;
  else {
    sc.attended++;
    s.person.skills.learning = clamp(s.person.skills.learning + 0.02);
  }
  for (const subject of Object.keys(sc.subjects))
    sc.subjects[subject] = clamp(
      sc.subjects[subject] +
        (life.stats.health < 35 ? -0.4 : s.person.flags['study-support'] ? 0.25 : 0.04),
      0,
      100,
    );
  const year = Math.floor((now - sc.enrolledMonth!) / 12);
  if (year > sc.lastYear) {
    sc.lastYear = year;
    const average = Object.values(sc.subjects).reduce((a, b) => a + b) / 4;
    if (sc.grade >= sc.primaryYears + sc.secondaryYears) {
      sc.status = 'completed';
      s.person.flags['school-completed'] = true;
      events.push(
        schoolEvent(
          life,
          'school-graduation',
          'Окончание школы',
          `${isolateName(life.character.name)} завершает ${sc.grade} учебных лет. Учебное заведение: «${sc.name}». Средняя успеваемость: ${Math.round(average)} из 100. Школьный путь теперь учитывается при трудоустройстве.`,
        ),
      );
    } else {
      sc.grade++;
      events.push(
        schoolEvent(
          life,
          'school-year',
          sc.grade === sc.primaryYears + 1
            ? 'Переход в среднюю школу'
            : `Новый учебный год: ${sc.grade} класс`,
          `${sc.name}: завершён предыдущий класс. Успеваемость ${Math.round(average)} из 100; посещено ${sc.attended}, пропущено ${sc.missed} месяцев занятий. Учитель обсудил результаты и следующие задачи.`,
        ),
      );
    }
  }
  return events;
}
export function schoolRules(life: Life): PathRule[] {
  const s = ensureSimulation(life),
    sc = s.school;
  if (!sc) return [];
  const rules: PathRule[] = [];
  const peer = s.npcs[sc.classmates[0]],
    teacher = sc.teacherId ? s.npcs[sc.teacherId] : null;
  if (sc.status === 'enrolled' && sc.grade >= 2 && peer && teacher)
    rules.push({
      id: 'school-pair',
      priority: 55,
      minAge: sc.entryAge + 1,
      maxAge: sc.entryAge + sc.primaryYears + sc.secondaryYears,
      cooldown: 1200,
      conditions: [{ type: 'flag', key: 'school-pair-chosen', value: false }],
      build: () => ({
        ...schoolEvent(
          life,
          'school-pair',
          'Как разделить работу в паре?',
          `${isolateName(peer.name)} хочет самостоятельно выбрать всю тему общего задания. Не получается договориться о ролях. Учитель ${isolateName(teacher.name)} предлагает обсудить общий план.`,
        ),
        kind: 'decision',
        actor: npcParticipant(peer),
        choices: [
          {
            label: 'Договориться о равных частях работы',
            result: `${isolateName(peer.name)} и ${isolateName(life.character.name)} разделили задачи без спора.`,
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'school-pair-chosen': true },
                  relationship: { npcId: peer.id, bond: 8, trust: 5 },
                },
              ],
              delayed: {
                afterMonths: 12,
                title: 'Знакомая команда на занятиях',
                description: `${isolateName(peer.name)} предлагает снова работать вместе: прежняя договорённость оказалась полезной.`,
                actor: npcParticipant(peer),
                target: protagonist(life),
                effects: [
                  {
                    skills: { learning: 0.5 },
                    relationship: { npcId: peer.id, bond: 4, trust: 2 },
                  },
                ],
                requires: { relationship: { npcId: peer.id, minBond: 20, minTrust: 25 } },
              },
            },
          },
          {
            label: 'Попросить учителя помочь распределить роли',
            result: `Учитель ${isolateName(teacher.name)} помогает составить общий план и выслушивает обоих.`,
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'school-pair-chosen': true },
                  relationship: { npcId: teacher.id, bond: 2, trust: 3 },
                },
                { relationship: { npcId: peer.id, bond: 1, trust: 2 } },
              ],
            },
          },
          {
            label: 'Подготовить свою часть отдельно',
            result: 'Своя часть подготовлена самостоятельно. Общего плана пока не получилось.',
            effects: {},
            plan: {
              effects: [
                {
                  flags: { 'school-pair-chosen': true },
                  skills: { learning: 0.3 },
                  relationship: { npcId: peer.id, bond: -2 },
                },
              ],
            },
          },
        ],
      }),
    });
  const problem = sc.status === 'blocked' || sc.missed > sc.attended / 3;
  if (problem)
    rules.push({
      id: 'school-support',
      priority: 85,
      minAge: sc.entryAge,
      maxAge: 21,
      cooldown: 12,
      conditions: [],
      build: () => ({
        ...schoolEvent(
          life,
          'school-support',
          'Как продолжить обучение?',
          'Семья и учитель обсуждают доступный путь: помощь с посещением или занятия дома до восстановления доступа.',
        ),
        kind: 'decision',
        choices: [
          {
            label: 'Организовать посещение с помощью семьи',
            result: 'Семья договорилась о поддержке посещения школы.',
            effects: {},
            plan: {
              effects: [
                {
                  flags: {
                    'school-access-blocked': false,
                    'school-access-restored': true,
                    'skip-school': false,
                    'study-support': true,
                  },
                },
              ],
            },
          },
          {
            label: 'Начать занятия дома с поддержкой',
            result:
              'Начались занятия дома. Для школьного окончания потребуется вернуться к регулярному обучению.',
            effects: {},
            plan: { effects: [{ skills: { learning: 0.5 }, flags: { 'study-support': true } }] },
          },
        ],
      }),
    });
  return rules;
}
