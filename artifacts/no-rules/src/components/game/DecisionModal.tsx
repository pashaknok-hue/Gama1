import { Pause } from 'lucide-react';
import { canChoose } from '../../game/event-rules';
import type { Life, LifeEvent, Stats } from '../../game/domain';

const statLabels: Record<keyof Stats, string> = {
  health: 'здоровье',
  happiness: 'настроение',
  curiosity: 'интерес',
  energy: 'энергия',
};

function effectSummary(effects: Partial<Stats>) {
  const parts = (Object.entries(effects) as [keyof Stats, number | undefined][])
    .filter((entry): entry is [keyof Stats, number] => typeof entry[1] === 'number')
    .map(([stat, value]) => `${statLabels[stat]} ${value > 0 ? '+' : ''}${value}`);
  return parts.join(' · ') || 'свой путь';
}

function planSummary(choice: NonNullable<LifeEvent['choices']>[number]) {
  if (!choice.plan) return effectSummary(choice.effects);
  const labels = { cash: 'деньги', savings: 'накопления', debt: 'долг' };
  const parts = choice.plan.effects
    .flatMap((effect) => [
      ...(['cash', 'savings', 'debt'] as const)
        .filter((key) => effect[key])
        .map((key) => `${labels[key]} ${effect[key]! > 0 ? '+' : ''}${effect[key]}`),
      effect.stats ? effectSummary(effect.stats) : '',
      effect.relationship
        ? `близость ${effect.relationship.bond > 0 ? '+' : ''}${effect.relationship.bond}`
        : '',
      effect.skills ? 'развитие навыков' : '',
      effect.job ? effect.job.title : '',
    ])
    .filter(Boolean);
  if (choice.plan.delayed) parts.push(`план через ${choice.plan.delayed.afterMonths} мес.`);
  return parts.join(' · ') || 'дальнейшие события зависят от решения';
}

export default function DecisionModal({
  event,
  life,
  onChoose,
}: {
  event: LifeEvent | null;
  life: Life;
  onChoose: (eventId: string, choiceIndex: number) => void;
}) {
  if (!event?.choices?.length || event.outcome) return null;
  const choices = event.choices.slice(0, 4);

  return (
    <div className="nr-event-backdrop">
      <section
        className="nr-event"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nr-event-title"
        aria-describedby="nr-event-copy"
      >
        <div className="nr-event-topline">
          <span className="nr-event-icon">
            <span />
          </span>
          <span>СОБЫТИЕ · ВРЕМЯ ОСТАНОВЛЕНО</span>
          <span className="nr-event-pause">
            <Pause size={12} fill="currentColor" />
          </span>
        </div>
        <div className="nr-event-body">
          <div className="nr-event-kicker">
            ВАЖНЫЙ МОМЕНТ <span>· {event.age === 0 ? 'РОЖДЕНИЕ' : `${event.age} ЛЕТ`}</span>
          </div>
          <h2 id="nr-event-title">{event.title}</h2>
          <p id="nr-event-copy">{event.description}</p>
          <p className="nr-life-muted">
            {life.simulation
              ? `Доступно ${Math.round(life.simulation.person.money.cash)} усл. ед.`
              : 'Выберите подходящий вариант.'}
          </p>
          <div className="nr-choice-heading">
            <span>ЧТО ТЫ ВЫБЕРЕШЬ?</span>
            <i />
            <span>{choices.length} ВАРИАНТА</span>
          </div>
          <div className="nr-choices">
            {choices.map((choice, index) => (
              <button
                className="nr-choice"
                key={`${event.id}-${choice.label}`}
                type="button"
                onClick={() => onChoose(event.id, index)}
                disabled={!canChoose(life, event, index)}
                data-testid={`choice-${event.id}-${index}`}
              >
                <span className="nr-choice-index">0{index + 1}</span>
                <span className="nr-choice-copy">
                  <strong>{choice.label}</strong>
                  <small className="nr-choice-effect">{planSummary(choice)}</small>
                </span>
                <span className="nr-choice-marker">→</span>
              </button>
            ))}
          </div>
          <div className="nr-event-foot">
            <span>ПОСЛЕ ВЫБОРА МОЖНО ПРОДОЛЖИТЬ ВРЕМЯ</span>
            <span className="nr-key-hint">NO RULES</span>
          </div>
        </div>
      </section>
    </div>
  );
}
