import type { Life } from './domain';
import { ensureSimulation, monthIndex, clamp } from './causal-state';
import { protagonist } from './life-events';
import type { CoreDraft } from './causal-engine';
import type { PathRule } from './life-paths';
export type Project = {
  title: string;
  direction: 'art' | 'craft';
  progress: number;
  status: 'active' | 'ready' | 'shown';
  startedMonth: number;
  sourceEventId?: string;
};
export type Development = {
  project?: Project;
  course?: {
    title: string;
    provider: string;
    duration: number;
    status: 'active' | 'completed' | 'cancelled';
    sourceEventId?: string;
    startedMonth: number;
  };
  jobStarted?: number;
  workMissed?: number;
};
export function developmentMonth(life: Life): CoreDraft[] {
  const s = ensureSimulation(life);
  s.development ??= {};
  const d = s.development,
    now = monthIndex(life.currentDate),
    events: CoreDraft[] = [];
  if (d.course?.status === 'active') {
    const outcome = s.queue.find((q) => q.sourceEventId === d.course?.sourceEventId);
    if (outcome?.status === 'applied') d.course.status = 'completed';
    if (outcome?.status === 'cancelled') d.course.status = 'cancelled';
  }
  if (s.person.job.status === 'employed') {
    d.workMissed = life.stats.health < 25 ? (d.workMissed ?? 0) + 1 : 0;
    if (d.workMissed >= 3) {
      const employer = s.person.job.employer ?? s.person.job.title;
      s.person.job = { status: 'unemployed', title: 'Поиск работы после увольнения', income: 0 };
      events.push({
        id: `dismissal-${life.id}-${now}`,
        kind: 'life',
        category: 'career',
        templateId: 'dismissal',
        title: 'Прекращение работы после пропусков',
        description: `${employer}: после трёх месяцев отсутствия договор прекращён. Зарплата больше не поступает. Понадобятся восстановление и новый поиск работы.`,
        actor: { kind: 'world', name: employer },
        target: protagonist(life),
        context:
          'Три месяца пропусков по состоянию здоровья; это игровое условие, не трудовое право страны.',
        cause: {
          ruleId: 'dismissal',
          facts: ['Три месяца пропусков подряд.'],
          sourceEventIds: life.events
            .filter((e) => e.templateId === 'job-offer' && e.outcome)
            .slice(0, 1)
            .map((e) => e.id),
        },
      });
    }
  }
  if (d.project?.status === 'active') {
    d.project.progress = clamp(d.project.progress + 2 + (s.person.flags['interest-art'] ? 1 : 0));
    if (d.project.progress >= 100) {
      d.project.status = 'ready';
      events.push({
        id: `project-ready-${life.id}-${now}`,
        kind: 'life',
        category: 'creativity',
        templateId: 'project-ready',
        title: 'Проект готов к показу',
        description: `Завершён проект «${d.project.title}». Теперь есть конкретная работа, которой можно поделиться.`,
        actor: protagonist(life),
        target: { kind: 'object', name: d.project.title },
        context: 'Практика и накопленный прогресс.',
        cause: {
          ruleId: 'project-ready',
          facts: ['Прогресс проекта достиг 100%.'],
          sourceEventIds: d.project.sourceEventId ? [d.project.sourceEventId] : [],
        },
      });
    }
  }
  if (s.person.flags['training-planned'] && !d.course) {
    const choice = life.events.find((e) => e.templateId === 'training-path' && e.outcome);
    if (choice) {
      d.course = {
        title:
          choice.resolution?.choiceIndex === 0
            ? 'Основы технической поддержки и ремонта'
            : choice.resolution?.choiceIndex === 3
              ? 'Прикладная графика и макетирование'
              : 'Самостоятельная практика ремонта',
        provider:
          choice.resolution?.choiceIndex === 0
            ? 'Вечерняя учебная мастерская'
            : choice.resolution?.choiceIndex === 3
              ? 'Учебная студия района'
              : 'Домашняя практика по учебным материалам',
        duration: choice.resolution?.choiceIndex === 3 ? 18 : 24,
        status: s.person.education === 'vocational' ? 'completed' : 'active',
        startedMonth: monthIndex(choice.date),
        sourceEventId: choice.id,
      };
    }
  }
  return events;
}
export function startProject(life: Life, sourceEventId: string) {
  const s = ensureSimulation(life);
  s.development ??= {};
  if (s.development.project) return;
  const art = !!s.person.flags['interest-art'];
  s.development.project = {
    title: art ? 'Зарисовки моего двора' : 'Макет знакомой улицы',
    direction: art ? 'art' : 'craft',
    progress: 0,
    status: 'active',
    startedMonth: monthIndex(life.currentDate),
    sourceEventId,
  };
}
function draft(life: Life, id: string, title: string, description: string): CoreDraft {
  return {
    kind: 'decision',
    templateId: id,
    title,
    description,
    actor: protagonist(life),
    target: { kind: 'object', name: title },
    context: 'Навыки, возраст и образование.',
    cause: {
      ruleId: id,
      facts: ['Доступность определяется текущими навыками и подготовкой.'],
      sourceEventIds: [],
    },
  };
}
export function careerRules(life: Life): PathRule[] {
  const s = ensureSimulation(life),
    p = s.person;
  const city = life.location.birthplace?.settlement ?? life.location.region;
  return [
    {
      id: 'training-path',
      priority: 40,
      minAge: 16,
      maxAge: 50,
      cooldown: 24,
      conditions: [
        { type: 'flag', key: 'training-planned', value: false },
        { type: 'job', value: 'unemployed' },
      ],
      build: () => {
        const e = draft(
          life,
          'training-path',
          'Обучение ремонту и технической поддержке',
          'Вечерняя учебная мастерская предлагает 24 месяца практики: диагностика простых неисправностей, безопасный ремонт и общение с клиентами. Доступно с 16 лет; школьные занятия продолжаются отдельно. Можно заниматься самостоятельно или выбрать студию прикладной графики: 18 месяцев рисунка и макетирования.',
        );
        const delayed = (vocational: boolean) => ({
          afterMonths: 24,
          title: 'Завершена подготовка по технической поддержке',
          description:
            'Практическое обучение ремонту завершено. Появилась подготовка для вакансии техника службы поддержки.',
          actor: protagonist(life),
          target: { kind: 'object' as const, name: 'Ремонт и техническая поддержка' },
          effects: [
            {
              skills: { learning: vocational ? 4 : 2 },
              education: vocational ? ('vocational' as const) : ('school' as const),
              flags: { qualified: vocational },
            },
          ],
          requires: { flag: 'training-planned' },
        });
        e.choices = [
          {
            label: 'Записаться в мастерскую — 40 усл. ед.',
            result: 'Началось вечернее обучение ремонту и технической поддержке.',
            effects: {},
            plan: {
              effects: [{ cash: -40, flags: { 'training-planned': true } }],
              delayed: delayed(true),
            },
          },
          {
            label: 'Учиться самостоятельно по материалам',
            result: 'Выбран самостоятельный план изучения ремонта.',
            effects: {},
            plan: { effects: [{ flags: { 'training-planned': true } }], delayed: delayed(false) },
          },
          {
            label: 'Отложить и сохранить время',
            result: 'Обучение пока отложено.',
            effects: {},
            plan: { effects: [] },
          },
        ];
        e.choices.push({
          label: 'Студия прикладной графики — 40 усл. ед.',
          result: 'Началось обучение прикладной графике и макетированию.',
          effects: {},
          plan: {
            effects: [{ cash: -40, flags: { 'training-planned': true, 'interest-art': true } }],
            delayed: {
              afterMonths: 18,
              title: 'Завершена подготовка по прикладной графике',
              description:
                'Учебные работы и практические задания завершены. Появилась подготовка для работы помощником дизайнера.',
              actor: protagonist(life),
              target: { kind: 'object', name: 'Прикладная графика' },
              effects: [
                {
                  skills: { learning: 2, craft: 4 },
                  education: 'vocational',
                  flags: { 'qualified-art': true },
                },
              ],
              requires: { flag: 'training-planned' },
            },
          },
        });
        return e;
      },
    },
    {
      id: 'job-offer',
      priority: 30,
      minAge: 18,
      maxAge: 64,
      cooldown: 6,
      conditions: [
        { type: 'job', value: 'unemployed' },
        { type: 'skill', key: 'learning', min: 2 },
      ],
      build: () => {
        const qualified = p.education === 'vocational',
          title = p.flags['qualified-art']
            ? 'Помощник дизайнера'
            : qualified
              ? 'Техник службы поддержки'
              : 'Помощник мастерской',
          employer = p.flags['qualified-art']
            ? `Студия макетирования · ${city}`
            : `Сервисная мастерская · ${city}`;
        const income = Math.round(
          s.world.wage *
            (1 +
              Math.min(p.skills.learning, 10) * 0.05 +
              (qualified ? 0.3 : 0) +
              (p.flags['school-completed'] ? 0.1 : 0)) *
            (s.school?.status === 'enrolled' ? 0.5 : 1),
        );
        const schedule =
          s.school?.status === 'enrolled'
            ? '20 часов в неделю, с учётом школы'
            : '40 часов в неделю';
        const e = draft(
          life,
          'job-offer',
          `Вакансия: ${title}`,
          `${employer}. Задачи: ${p.flags['qualified-art'] ? 'эскизы и макеты для заказчиков' : qualified ? 'проверка и ремонт оборудования, помощь клиентам' : 'подготовка инструментов и помощь мастеру'}. Требования: совершеннолетие, базовые навыки${qualified ? ' и завершённое профессиональное обучение' : ''}. График: ${schedule}. Зарплата: ${income} усл. ед. в месяц.`,
        );
        e.actor = { kind: 'world', name: employer };
        e.target = protagonist(life);
        e.cause!.sourceEventIds = life.events
          .filter((e) =>
            e.appliedConsequences?.some((eff) => (eff.skills?.learning ?? 0) > 0 || eff.education),
          )
          .slice(0, 1)
          .map((e) => e.id);
        e.choices = [
          {
            label: 'Устроиться в мастерскую',
            result: `Началась работа: ${title}, ${employer}. График ${schedule}.`,
            effects: {},
            plan: {
              effects: [
                {
                  job: {
                    status: 'employed',
                    title,
                    employer,
                    schedule,
                    qualification: p.flags['qualified-art']
                      ? 'graphics'
                      : qualified
                        ? 'technical'
                        : 'basic',
                    income,
                  },
                },
              ],
            },
          },
          {
            label: 'Продолжить поиск',
            result: 'Предложение отклонено; поиск продолжается без гарантированного дохода.',
            effects: {},
            plan: { effects: [{ stats: { energy: -2 } }] },
          },
        ];
        return e;
      },
    },
    {
      id: 'leave-job',
      priority: 35,
      minAge: 18,
      maxAge: 64,
      cooldown: 24,
      conditions: [
        { type: 'job', value: 'employed' },
        { type: 'stat', key: 'health', max: 40 },
      ],
      build: () => {
        const e = draft(
          life,
          'leave-job',
          'Рабочая нагрузка мешает восстановлению',
          `${p.job.employer ?? p.job.title}: нужно обсудить посильный график или прекратить работу. Доход изменится.`,
        );
        e.choices = [
          {
            label: 'Перейти на половину нагрузки',
            result: 'Рабочий график сокращён вместе с доходом.',
            effects: {},
            plan: {
              effects: [
                {
                  job: {
                    ...p.job,
                    schedule: '20 часов в неделю',
                    income: Math.round(p.job.income * 0.5),
                  },
                  stats: { health: 3 },
                },
              ],
            },
          },
          {
            label: 'Уволиться и восстановиться',
            result: 'Работа прекращена. Зарплата больше не поступает; расходы остаются.',
            effects: {},
            plan: {
              effects: [
                {
                  job: { status: 'unemployed', title: 'Поиск работы', income: 0 },
                  stats: { health: 5 },
                },
              ],
            },
          },
        ];
        return e;
      },
    },
  ];
}
