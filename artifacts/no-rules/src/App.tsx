import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Heart, Sparkles, Brain, Battery, RotateCcw, Save, FolderOpen, ArrowRight, RefreshCw, X, BookOpen, Sun, Footprints, House, Leaf } from 'lucide-react';
import type { BirthProfile, Life } from './game/domain';
import { generateBirthProfile } from './game/generation';
import { advance, availableActions, makeLife, resolveChoice, type ActionId } from './game/simulation';
import { clearLife, loadLife, saveLife } from './game/storage';

function PixelScene() {
  return <div className="pixel-scene" aria-label="Пиксельный пейзаж тихой улицы">
    <div className="scene-sky" /><div className="scene-sun" /><div className="scene-cloud" />
    <div className="hill back" /><div className="hill" />
    <div className="house"><div className="house-window" /><div className="house-door" /></div>
    <div className="ground" /><span className="pixel-flower flower-a" /><span className="pixel-flower flower-b" /><span className="pixel-flower flower-c" />
  </div>;
}
function StatMeter({ label, value, kind, testId }: { label: string; value: number; kind: string; testId: string }) {
  const Icon = kind === 'health' ? Heart : kind === 'happiness' ? Sun : kind === 'curiosity' ? Brain : Battery;
  return <div className="stat-card" data-testid={testId}>
    <div className="stat-top"><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={17} />{label}</span><strong className="stat-num">{value}</strong></div>
    <div className="meter"><div className={`meter-fill ${kind}`} style={{ width: `${value}%` }} /></div>
  </div>;
}
function StatLabel({ label, value }: { label: string; value: number }) {
  return <div className="record-line"><span>{label}</span><strong>{value}</strong></div>;
}

export default function App() {
  const [profile, setProfile] = useState<BirthProfile>(() => generateBirthProfile());
  const [life, setLife] = useState<Life | null>(null);
  const [showRestart, setShowRestart] = useState(false);
  const [toast, setToast] = useState('');
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => { setHasSave(Boolean(loadLife())); }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2300);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (life) setHasSave(saveLife(life));
  }, [life]);

  const actions = useMemo(() => life ? availableActions(life.age) : [], [life?.age]);
  const reroll = () => setProfile(generateBirthProfile());
  const startLife = () => {
    const next = makeLife(profile);
    setLife(next);
    setToast('История началась. Сохранение включено.');
  };
  const applyAction = (actionId: ActionId, months = 1) => {
    if (!life) return;
    const next = structuredClone(life);
    setLife(advance(next, actionId, months));
  };
  const choose = (eventId: string, choiceIndex: number) => {
    if (!life) return;
    const next = structuredClone(life);
    setLife(resolveChoice(next, eventId, choiceIndex));
  };
  const resume = () => {
    const loaded = loadLife();
    if (loaded) { setLife(loaded); setToast('Сохранённая история открыта.'); }
    else { setHasSave(false); setToast('Сохранение не найдено или повреждено.'); }
  };
  const newLife = () => {
    clearLife(); setHasSave(false); setLife(null); setProfile(generateBirthProfile()); setShowRestart(false);
  };
  const monthAdvanceAction = actions.find((action) => action.id === 'sleep')?.id ?? actions[0]?.id ?? 'cuddle';
  const formattedDate = life ? new Date(`${life.currentDate}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const ageText = life ? life.age === 0 ? 'Первый год жизни' : `${life.age} ${life.age === 1 ? 'год' : life.age < 5 ? 'года' : 'лет'}` : '';

  if (!life) return <main className="game-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">НР</div><div className="brand-word">NO RULES<br />ЖИЗНЬ БЕЗ СЦЕНАРИЯ</div></div>
      <div className="top-meta">одна жизнь · бесконечно разных историй</div>
      {hasSave && <button className="pixel-button small" onClick={resume} data-testid="button-load-life"><FolderOpen size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Продолжить</button>}
    </header>
    <div className="intro-wrap">
      <section className="intro-banner">
        <div className="intro-copy">
          <span className="eyebrow">ТВОЯ ИСТОРИЯ НАЧИНАЕТСЯ СЕЙЧАС</span>
          <h1 className="pixel-title">НИКАКОГО<br />СЦЕНАРИЯ.</h1>
          <p>Обычная жизнь. Случайное начало. Посмотрим, куда приведёт каждый день.</p>
          <button className="pixel-button gold" onClick={startLife} data-testid="button-start-life">Начать эту жизнь <ArrowRight size={17} style={{ verticalAlign: 'middle', marginLeft: 8 }} /></button>
        </div>
        <PixelScene />
      </section>
      <div className="setup-grid">
        <section className="panel" aria-label="Случайная запись о рождении">
          <div className="panel-head"><h2>ЗАПИСЬ О РОЖДЕНИИ</h2>
            <button className="pixel-button secondary small" onClick={reroll} data-testid="button-reroll"><RefreshCw size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Другая судьба</button>
          </div>
          <div className="panel-body">
            <div className="record-line" data-testid="display-character"><span>Имя ребёнка</span><strong>{profile.character.name}</strong></div>
            <div className="record-line"><span>Пол</span><strong>{profile.character.gender}</strong></div>
            <div className="record-line" data-testid="display-birthplace"><span>Место рождения</span><strong>{profile.region}, {profile.country}</strong></div>
            <div className="record-line"><span>Семейный достаток</span><strong>{profile.className}</strong></div>
            <div className="record-line"><span>Дом</span><strong>{profile.home}</strong></div>
            <div className="family-mini">{profile.family.map((person) => <span className="family-chip" key={person.id}>{person.relationship}: {person.name}</span>)}</div>
            <div className="conditions" style={{ marginTop: 12 }}>{profile.resources.map((item) => <span className="condition-tag" key={item}>{item}</span>)}</div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>ПЕРВЫЕ ШТРИХИ</h2><Sparkles size={17} /></div>
          <div className="panel-body">
            <div className="record-line"><span>Характер</span><strong>{profile.character.traits.join(' · ')}</strong></div>
            <p style={{ fontSize: 21, color: '#66705e', lineHeight: 1.15, margin: '18px 0 0' }}>Начальные условия — не приговор. Каждое действие меняет настроение, силы и любопытство. Время движется вместе с тобой.</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 18, color: '#65745b' }}><BookOpen size={18} /> История сохраняется на этом устройстве.</div>
          </div>
        </section>
      </div>
      <div className="intro-footer"><span>Случайное рождение. Настоящие последствия. Только твой выбор.</span><span>16-битная жизнь · версия 01</span></div>
    </div>
    {toast && <div className="toast-note" role="status">{toast}</div>}
  </main>;

  return <main className="game-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">НР</div><div className="brand-word">NO RULES<br />ЖИЗНЬ БЕЗ СЦЕНАРИЯ</div></div>
      <div className="top-meta"><Save size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />{hasSave ? 'Сохранено на этом устройстве' : 'Идёт сохранение'}</div>
      <button className="pixel-button secondary small" onClick={() => setShowRestart(true)} data-testid="button-new-life"><RotateCcw size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />Новая жизнь</button>
    </header>
    <div className="game-layout">
      <div className="game-head">
        <div><h1 className="life-title">{life.character.name.toUpperCase()}</h1><p className="life-sub">{life.character.traits.join(' · ')} <span aria-hidden="true">/</span> {life.location.region}</p></div>
        <div className="header-actions">
          <button className="pixel-button secondary small" onClick={() => { if (saveLife(life)) { setHasSave(true); setToast('История сохранена.'); } else setToast('Не удалось сохранить историю.'); }} data-testid="button-save"><Save size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />Сохранить</button>
          <button className="pixel-button secondary small" onClick={resume} data-testid="button-load"><FolderOpen size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />Загрузить</button>
        </div>
      </div>
      <div className="game-grid">
        <section className="main-column">
          <div className="date-card" data-testid="display-calendar">
            <div className="date-display"><div className="date-icon"><CalendarDays size={24} /></div><div><div className="date-main">{formattedDate}</div><div className="date-age">{ageText} · {life.age === 0 ? 'малыш' : 'возраст'}</div></div></div>
            <div className="calendar-controls">
              <button className="pixel-button secondary small" onClick={() => applyAction(monthAdvanceAction, 1)} data-testid="button-next-month">+ месяц</button>
              <button className="pixel-button small" onClick={() => applyAction(monthAdvanceAction, 12)} data-testid="button-next-year">+ год</button>
            </div>
          </div>
          <div className="life-scene"><PixelScene /><div className="scene-caption">{life.age < 3 ? 'Мир начинается с дома' : life.age < 7 ? 'Всё вокруг — открытие' : life.age < 18 ? 'Время искать свой путь' : 'Каждый день — новая глава'}</div></div>
          <div className="stats-grid" data-testid="display-stats">
            <StatMeter label="Здоровье" value={life.stats.health} kind="health" testId="stat-health" />
            <StatMeter label="Счастье" value={life.stats.happiness} kind="happiness" testId="stat-happiness" />
            <StatMeter label="Интерес" value={life.stats.curiosity} kind="curiosity" testId="stat-curiosity" />
            <StatMeter label="Энергия" value={life.stats.energy} kind="energy" testId="stat-energy" />
          </div>
          <section className="panel">
            <div className="panel-head"><h2>ЧЕМ ЗАНЯТЬСЯ СЕГОДНЯ</h2><span className="save-note"><Footprints size={15} /> каждое действие двигает время</span></div>
            <div className="panel-body"><div className="action-list">
              {actions.map((action) => <button className="action-card" key={action.id} onClick={() => applyAction(action.id)} data-testid={`action-${action.id}`}>
                <span className="action-title">{action.title}</span><span className="action-note">{action.description}</span>
              </button>)}
            </div></div>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>ДНЕВНИК СОБЫТИЙ</h2><span className="save-note">{life.events.length} записей</span></div>
            <div className="panel-body"><div className="events-list" data-testid="display-events">
              {life.events.length ? life.events.map((event) => <article className="event-row" key={event.id} data-testid={`event-${event.id}`}>
                <div className="event-age">{event.age === 0 ? 'рождение' : `${event.age} лет`}</div>
                <div><h3>{event.title}</h3><p>{event.outcome || event.description}</p>
                  {event.choices && !event.outcome && <div className="choice-box">{event.choices.map((choice, index) =>
                    <button className="choice-btn" key={choice.label} onClick={() => choose(event.id, index)} data-testid={`choice-${event.id}-${index}`}>{choice.label}</button>)}</div>}
                </div>
              </article>) : <div className="empty-events">Пока здесь тихо. Первые события появятся совсем скоро.</div>}
            </div></div>
          </section>
        </section>
        <aside className="side-column">
          <section className="panel">
            <div className="panel-head"><h2>ТВОЯ СЕМЬЯ</h2><Heart size={16} /></div>
            <div className="panel-body"><div className="family-list">
              {life.family.map((person) => <div className="family-person" key={person.id} data-testid={`family-${person.id}`}>
                <div className="portrait">{person.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                <div><div className="person-name">{person.name}</div><div className="person-meta">{person.relationship} · {person.age} лет</div><div className="person-meta">{person.occupation}, {person.personality}</div></div>
              </div>)}
            </div></div>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>УСЛОВИЯ ЖИЗНИ</h2><House size={17} /></div>
            <div className="panel-body">
              <div className="record-line"><span>Дом</span><strong>{life.conditions.home}</strong></div>
              <div className="record-line"><span>Достаток</span><strong>{life.conditions.className}</strong></div>
              <div className="record-line"><span>Регион</span><strong>{life.location.region}, {life.location.country}</strong></div>
              <div className="conditions" style={{ marginTop: 12 }}>{life.conditions.resources.map((resource) => <span className="condition-tag" key={resource}><Leaf size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{resource}</span>)}</div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>СОСТОЯНИЕ</h2><Sparkles size={16} /></div>
            <div className="panel-body">
              <StatLabel label="Возраст" value={life.age} />
              <StatLabel label="Дней в истории" value={Math.floor((new Date(`${life.currentDate}T12:00:00`).getTime() - new Date(`${life.birthDate}T12:00:00`).getTime()) / 86400000)} />
              <div className="save-note" style={{ marginTop: 12 }}><Save size={14} />Автосохранение включено</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
    {showRestart && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowRestart(false); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="restart-title">
        <h2 id="restart-title">НАЧАТЬ НОВУЮ ЖИЗНЬ?</h2>
        <p>Текущая история будет заменена. Ты сможешь создать новое случайное рождение.</p>
        <div className="modal-actions">
          <button className="pixel-button secondary" onClick={() => setShowRestart(false)} data-testid="button-cancel-new-life"><X size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />Остаться</button>
          <button className="pixel-button gold" onClick={newLife} data-testid="button-confirm-new-life">Начать заново</button>
        </div>
      </section>
    </div>}
    {toast && <div className="toast-note" role="status">{toast}</div>}
  </main>;
}
