import { BookOpen } from 'lucide-react';
import type { LifeEvent } from '../../game/domain';

function eventDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function LifeJournal({ events }: { events: LifeEvent[] }) {
  const entries = events;

  return (
    <section className="nr-feed" aria-labelledby="nr-feed-title">
      <div className="nr-feed-heading">
        <div>
          <div className="nr-eyebrow">ХРОНОЛОГИЯ · ЛИЧНЫЙ ДНЕВНИК</div>
          <h2 id="nr-feed-title">
            <BookOpen size={19} /> Дневник жизни
          </h2>
        </div>
        <span className="nr-entry-count">{events.length} {events.length === 1 ? 'ЗАПИСЬ' : 'ЗАПИСЕЙ'}</span>
      </div>

      <div className="nr-timeline" data-testid="display-events" aria-live="polite">
        {entries.length ? entries.map((event, index) => (
          <article className="nr-entry" key={event.id} data-testid={`event-${event.id}`}>
            <div className="nr-entry-rail">
              <span className={`nr-timeline-dot ${index === 0 ? 'is-current' : ''}`} />
              {index !== entries.length - 1 && <span className="nr-timeline-line" />}
            </div>
            <div className="nr-entry-content">
              <div className="nr-entry-meta">
                <time dateTime={event.date}>
                  {eventDate(event.date)} <span>·</span> {event.age === 0 ? 'рождение' : `${event.age} лет`}
                </time>
                <span className="nr-entry-tag">
                  {event.choices ? event.outcome ? 'сделан выбор' : 'важное решение' : 'событие жизни'}
                </span>
              </div>
              <h3>{event.title}</h3>
              <p>{event.outcome || event.description}</p>
            </div>
          </article>
        )) : (
          <div className="nr-empty-journal">История только начинается. Время оставит здесь первые записи.</div>
        )}
      </div>
    </section>
  );
}
