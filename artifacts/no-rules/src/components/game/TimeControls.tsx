import { CalendarDays, FastForward, ListChecks, Pause, Play } from 'lucide-react';

export type TimeSpeed = 1 | 2 | 4;

type TimeControlsProps = {
  currentDate: string;
  playing: boolean;
  speed: TimeSpeed;
  locked: boolean;
  onToggle: () => void;
  onSpeedChange: () => void;
  onOpenActions: () => void;
  onAdvanceMonth: () => void;
  onAdvanceYear: () => void;
};

export default function TimeControls({
  currentDate,
  playing,
  speed,
  locked,
  onToggle,
  onSpeedChange,
  onOpenActions,
  onAdvanceMonth,
  onAdvanceYear,
}: TimeControlsProps) {
  const dateLabel = new Date(`${currentDate}T12:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="nr-timebar" aria-label="Управление временем">
      <div className="nr-date" data-testid="display-calendar">
        <CalendarDays size={15} />
        <span>{dateLabel}</span>
      </div>
      <div className="nr-time-controls">
        <span className={`nr-time-state ${playing ? 'is-playing' : ''}`} data-testid="status-time">
          <i />
          {locked ? 'ВЫБОР' : playing ? 'ВРЕМЯ ИДЁТ' : 'ПАУЗА'}
        </span>
        <button
          className="nr-control nr-main-control"
          type="button"
          aria-label={playing ? 'Приостановить время' : 'Продолжить время'}
          data-testid={playing ? 'button-pause-time' : 'button-play-time'}
          onClick={onToggle}
          disabled={locked}
        >
          {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
          <span>{playing ? 'Пауза' : 'Продолжить'}</span>
        </button>
        <button
          className="nr-control nr-speed-control"
          type="button"
          aria-label={`Скорость симуляции: ${speed}×. Нажмите, чтобы изменить`}
          data-testid="button-speed"
          onClick={onSpeedChange}
          disabled={locked}
        >
          <FastForward size={15} fill="currentColor" />
          <span>{speed}×</span>
        </button>
        <button
          className="nr-control nr-action-menu-control"
          type="button"
          onClick={onOpenActions}
          disabled={locked}
          aria-label="Выбрать действие"
          data-testid="button-open-actions"
        >
          <ListChecks size={15} />
          <span>Действия</span>
        </button>
        <div className="nr-manual-time">
          <button className="nr-control" type="button" onClick={onAdvanceMonth} disabled={locked} aria-label="Прожить следующий месяц" data-testid="button-next-month">
            + мес.
          </button>
          <button className="nr-control" type="button" onClick={onAdvanceYear} disabled={locked} aria-label="Прожить следующий год" data-testid="button-next-year">
            + год
          </button>
        </div>
      </div>
    </section>
  );
}
