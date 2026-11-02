import { yearWord } from '../../game/event-text';
import type { Life } from '../../game/domain';
import { monthIndex } from '../../game/causal-state';

export default function LifeOverview({ life }: { life: Life }) {
  const state = life.simulation;
  if (!state)
    return <p>Подробности жизни появятся после следующего месяца. Старая история сохранена.</p>;
  const p = state.person;
  return (
    <details className="nr-life-overview" data-testid="life-overview">
      <summary>Жизнь, планы и связи</summary>
      <div className="nr-life-facts">
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
          Работа: {p.job.title}. Доход: {p.money.lastIncome.toFixed(0)}, расходы:{' '}
          {p.money.lastExpenses.toFixed(0)} за месяц.
        </p>
        <p>
          Деньги: {p.money.cash.toFixed(0)}, накопления: {p.money.savings.toFixed(0)}, долг:{' '}
          {p.money.debt.toFixed(0)} усл. ед.
        </p>
        <p className="nr-life-muted">
          Это игровая модель в условных единицах.{' '}
          {life.age < 18 ? 'Бытовые расходы ребёнка обеспечивает семья.' : ''} Для стран без
          экономических данных используется нейтральный профиль.
        </p>
      </div>
      <h3>Отложенные планы</h3>
      {state.queue
        .filter((item) => item.status === 'pending')
        .map((item) => (
          <p key={item.id}>
            {item.title} — через {Math.max(0, item.dueMonth - monthIndex(life.currentDate))} мес.
          </p>
        ))}
      {!state.queue.some((item) => item.status === 'pending') && <p>Пока нет отложенных планов.</p>}
      <h3>Знакомые люди</h3>
      {Object.values(state.npcs).map((npc) => (
        <div className="nr-person-memory" key={npc.id}>
          <bdi>{npc.name}</bdi>
          <span>
            {' '}
            · {npc.age} {yearWord(npc.age)} · близость {Math.round(state.relationships[npc.id].bond)}, доверие{' '}
            {Math.round(state.relationships[npc.id].trust)}
          </span>
          <p className="nr-life-muted">
            Самочувствие {Math.round(npc.stats.health)}, настроение{' '}
            {Math.round(npc.stats.happiness)} · {npc.traits.join(' · ')}
          </p>
          <p>{npc.memory.at(-1)?.summary ?? 'Впереди первые общие воспоминания.'}</p>
        </div>
      ))}
    </details>
  );
}
