import { formatMoney } from '../../game/finance';
import { yearWord } from '../../game/event-text';
import type { Life } from '../../game/domain';

export default function LifeOverview({ life }: { life: Life }) {
  const state = life.simulation;
  if (!state)
    return <p>Подробности жизни появятся после следующего месяца. Старая история сохранена.</p>;
  const p = state.person;
  return (
    <details className="nr-life-overview" data-testid="life-overview">
      <summary>Жизнь, планы и связи</summary>
      <div className="nr-life-facts">
        {life.character.personalName?.selection &&
          life.character.personalName.selection !== 'regional-or-country' && (
            <p>
              Имя выбрано из{' '}
              {life.character.personalName.selection === 'reserve' ? 'резервного' : 'языкового'}{' '}
              набора ({life.character.personalName.language}); местное происхождение не
              подтверждено.
            </p>
          )}
        <p>
          Образование:{' '}
          {p.education === 'vocational'
            ? 'профессиональное обучение'
            : p.education === 'school'
              ? 'регулярные занятия'
              : 'пока не началось'}
          . Обучение: {p.skills.learning.toFixed(1)}, творчество: {p.skills.craft.toFixed(1)},
          общение: {p.skills.social.toFixed(1)}.
        </p>
        <p>
          Работа: {p.job.title} {p.job.employer}. График: {p.job.schedule ?? 'не задан'}. Доход:{' '}
          {formatMoney(life, p.money.lastIncome)}, расходы:{' '}
          {formatMoney(life, p.money.lastExpenses)} за месяц.
        </p>
        <p>
          Деньги: {formatMoney(life, p.money.cash)}, накопления:{' '}
          {formatMoney(life, p.money.savings)}, долг: {formatMoney(life, p.money.debt)}.
        </p>
        <p className="nr-life-muted">
          Суммы показаны в валюте страны. Цены и зарплаты — согласованные параметры игры, не
          реальные котировки. {life.age < 18 ? 'Бытовые расходы ребёнка обеспечивает семья.' : ''}{' '}
          Для стран без экономических данных используется нейтральный профиль.
        </p>
      </div>
      <p>
        Репутация: {p.reputation ?? 0}. Привычки:{' '}
        {Object.keys(p.habits ?? {}).length
          ? `регулярное движение ${p.habits?.movement ?? 0}`
          : 'ещё формируются'}
        .
      </p>
      <h3>Незавершённые линии</h3>
      {state.queue
        .filter((item) => item.status === 'pending')
        .map((item) => (
          <p key={item.id}>
            Незавершённая линия:{' '}
            {life.events.find((event) => event.id === item.sourceEventId)?.title ??
              'Ранее принятое решение'}
          </p>
        ))}
      {!state.queue.some((item) => item.status === 'pending') && <p>Пока нет отложенных планов.</p>}
      {state.school && (
        <section data-testid="school-overview">
          <h3>{state.school.name}</h3>
          <p>
            {state.school.status === 'completed'
              ? 'Школа окончена'
              : state.school.status === 'enrolled'
                ? `${state.school.grade} класс`
                : state.school.status === 'unrecorded'
                  ? 'Прежнее обучение не восстановлено'
                  : state.school.status === 'blocked'
                    ? 'Нет доступа к школе'
                    : 'Ожидание поступления'}
          </p>
          <p>
            Возраст поступления: {state.school.entryAge}; начальная ступень{' '}
            {state.school.primaryYears} {yearWord(state.school.primaryYears)}, средняя{' '}
            {state.school.secondaryYears} {yearWord(state.school.secondaryYears)}.{' '}
            {state.school.source}.
          </p>
          {Object.entries(state.school.subjects).map(([name, grade]) => (
            <p key={name}>
              {name}: {Math.round(grade)}/100
            </p>
          ))}
        </section>
      )}
      {state.development?.course && (
        <p>
          Обучение: {state.development.course.title}. {state.development.course.provider};{' '}
          {state.development.course.duration} мес.;{' '}
          {state.development.course.status === 'completed'
            ? 'завершено'
            : state.development.course.status === 'cancelled'
              ? 'прервано'
              : 'продолжается'}
          .
        </p>
      )}
      {state.development?.project && (
        <p>
          Проект «{state.development.project.title}»: {state.development.project.progress}%.
        </p>
      )}
      {state.finance && (
        <details data-testid="financial-history">
          <summary>Финансовая история · {state.finance.entries.length} операций</summary>
          <p>
            Семейные средства: {formatMoney(life, state.finance.family)}. Личные деньги и семейные
            переводы учитываются отдельно. Пересчёт масштаба модели — не валютный курс.
          </p>
          {state.finance.entries
            .slice(-40)
            .reverse()
            .map((entry) => (
              <p key={entry.id}>
                {entry.date}: {entry.reason} ·{' '}
                {entry.account === 'family'
                  ? 'семья'
                  : entry.account === 'debt'
                    ? 'долг'
                    : entry.account === 'savings'
                      ? 'накопления'
                      : 'личные деньги'}{' '}
                {entry.amount > 0 ? '+' : ''}
                {formatMoney(life, entry.amount)}
              </p>
            ))}
        </details>
      )}
      <h3>Знакомые люди</h3>
      {Object.values(state.npcs).map((npc) => (
        <div className="nr-person-memory" key={npc.id}>
          <bdi>{npc.name}</bdi>
          <span>
            {' '}
            · {npc.age} {yearWord(npc.age)} · близость{' '}
            {Math.round(state.relationships[npc.id].bond)}, доверие{' '}
            {Math.round(state.relationships[npc.id].trust)}
          </span>
          <p className="nr-life-muted">
            Самочувствие {Math.round(npc.stats.health)}, настроение{' '}
            {Math.round(npc.stats.happiness)} · {npc.traits.join(' · ')}
          </p>
          {npc.personalName?.selection && npc.personalName.selection !== 'regional-or-country' && (
            <p className="nr-life-muted">
              Источник имени: {npc.personalName.language},{' '}
              {npc.personalName.selection === 'reserve' ? 'резервный набор' : 'языковая группа'}, не
              подтверждение местного происхождения.
            </p>
          )}
          <p>{npc.memory.at(-1)?.summary ?? 'Впереди первые общие воспоминания.'}</p>
        </div>
      ))}
    </details>
  );
}
