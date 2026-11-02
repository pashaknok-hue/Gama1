import { russianCount } from '../../game/event-text';
import { BookOpen } from 'lucide-react';
import { journalPresentation } from '../../game/event-rules';
import type { LifeEvent } from '../../game/domain';

function eventDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function LifeJournal({ events }: { events: LifeEvent[] }) {
  // Sort a copy: keep saved progress and the simulator's event array untouched.
  // Stable sorting retains the existing newest-first order within a date.
  const entries = [...events].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="nr-feed" aria-labelledby="nr-feed-title">
      <div className="nr-feed-heading">
        <div>
          <div className="nr-eyebrow">ХРОНОЛОГИЯ · ЛИЧНЫЙ ДНЕВНИК</div>
          <h2 id="nr-feed-title">
            <BookOpen size={19} /> Дневник жизни
          </h2>
        </div>
        <span className="nr-entry-count">{events.length} {russianCount(events.length, 'ЗАПИСЬ', 'ЗАПИСИ', 'ЗАПИСЕЙ')}</span>
      </div>

      <div className="nr-timeline" data-testid="display-events" tabIndex={0} role="region" aria-label="События: сначала новые" aria-live="polite">
        {entries.length ? entries.map((event, index) => (
          <article className="nr-entry" key={event.id} id={`journal-${event.id}`} data-testid={`event-${event.id}`}>
            <div className="nr-entry-rail">
              <span className={`nr-timeline-dot ${index === 0 ? 'is-current' : ''}`} />
              {index !== entries.length - 1 && <span className="nr-timeline-line" />}
            </div>
            <div className="nr-entry-content">
              <div className="nr-entry-meta">
                <time dateTime={event.date}>
                  {eventDate(event.date)} <span>·</span> {event.age === 0 ? event.templateId === 'birth' || event.title === 'Первый день' ? 'рождение' : 'до года' : `${event.age} ${event.age % 10 === 1 && event.age % 100 !== 11 ? 'год' : [2,3,4].includes(event.age % 10) && ![12,13,14].includes(event.age % 100) ? 'года' : 'лет'}`}
                </time>
                <span className="nr-entry-tag">
                  {journalPresentation(event).archived ? 'архивная запись' : event.choices ? event.outcome ? 'выбор сделан' : 'решение игрока' : event.kind === 'action' ? 'занятие персонажа' : event.kind === 'milestone' ? 'веха жизни' : 'жизненное событие'}
                </span>
              </div>
              <h3>{journalPresentation(event).title}</h3>
              <p>{journalPresentation(event).description}</p>
              {event.cause && <details className="nr-event-cause"><summary>Почему это произошло?</summary>
                <p>{event.cause.facts.join(' ')}</p>
                {event.cause.sourceEventIds.map(id=>{const source=events.find(item=>item.id===id);return source ? <button key={id} type="button" onClick={()=>document.getElementById(`journal-${id}`)?.scrollIntoView({block:'nearest'})}>Ранее: {source.title}</button> : null;})}
              </details>}
            </div>
          </article>
        )) : (
          <div className="nr-empty-journal">История только начинается. Время оставит здесь первые записи.</div>
        )}
      </div>
    </section>
  );
}
