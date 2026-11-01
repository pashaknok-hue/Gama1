import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  FolderOpen,
  Leaf,
  RotateCcw,
  Save,
  Shuffle,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import CharacterStatus from './components/game/CharacterStatus';
import ActionsModal from './components/game/ActionsModal';
import DecisionModal from './components/game/DecisionModal';
import EnvironmentScene from './components/game/EnvironmentScene';
import LifeJournal from './components/game/LifeJournal';
import TimeControls, { type TimeSpeed } from './components/game/TimeControls';
import type { BirthProfile, Life } from './game/domain';
import { generateBirthProfile } from './game/generation';
import {
  advance,
  availableActions,
  makeLife,
  resolveChoice,
  type ActionId,
} from './game/simulation';
import { clearLife, loadLife, saveLife } from './game/storage';
import { useGameClock } from './hooks/use-game-clock';
import './game-ui.css';

function chapterName(age: number) {
  if (age < 3) return 'ПЕРВЫЕ ГОДЫ';
  if (age < 7) return 'РАННЕЕ ДЕТСТВО';
  if (age < 13) return 'ДЕТСТВО';
  if (age < 18) return 'ПОДРОСТКОВЫЕ ГОДЫ';
  return 'ВЗРОСЛАЯ ЖИЗНЬ';
}

function automaticAction(life: Life): ActionId {
  const actions = availableActions(life.age);
  const preferred: ActionId = life.stats.energy < 28
    ? 'sleep'
    : life.age < 3
      ? 'cuddle'
      : life.stats.curiosity < 38 && life.age >= 3
        ? 'read'
        : life.age < 7
          ? 'play'
          : life.age < 18
            ? 'learn'
            : 'create';
  return actions.find((action) => action.id === preferred)?.id ?? actions[0]?.id ?? 'sleep';
}

function Logo() {
  return (
    <div className="nr-brand" aria-label="NO RULES — жизнь без сценария">
      <div className="nr-mark" aria-hidden="true">НР</div>
      <div>
        <div className="nr-brand-name">NO RULES</div>
        <div className="nr-brand-caption">ЖИЗНЬ БЕЗ СЦЕНАРИЯ</div>
      </div>
    </div>
  );
}

function NewLifeScreen({
  profile,
  hasSave,
  onStart,
  onReroll,
  onResume,
}: {
  profile: BirthProfile;
  hasSave: boolean;
  onStart: () => void;
  onReroll: () => void;
  onResume: () => void;
}) {
  return (
    <main className="nr-journal nr-setup">
      <div className="nr-grain" aria-hidden="true" />
      <header className="nr-topbar">
        <Logo />
        <div className="nr-save-state">
          <span className="nr-save-dot" />
          {hasSave ? 'СОХРАНЁННАЯ ИСТОРИЯ ДОСТУПНА' : 'СЛУЧАЙНОЕ РОЖДЕНИЕ'}
        </div>
        {hasSave && (
          <button className="nr-topbar-icon" type="button" onClick={onResume} data-testid="button-load-life">
            <FolderOpen size={15} /> Продолжить
          </button>
        )}
      </header>

      <div className="nr-setup-shell">
        <section className="nr-setup-hero">
          <div className="nr-setup-copy">
            <div className="nr-eyebrow">ТВОЯ ИСТОРИЯ НАЧИНАЕТСЯ СЕЙЧАС</div>
            <h1>НИКАКОГО СЦЕНАРИЯ.</h1>
            <p>Обычная жизнь. Случайное начало. Посмотрим, куда приведёт каждый день.</p>
            <div className="nr-setup-buttons">
              <button className="nr-control nr-main-control" type="button" onClick={onStart} data-testid="button-start-life">
                Начать эту жизнь <ArrowRight size={16} />
              </button>
              <button className="nr-control" type="button" onClick={onReroll} data-testid="button-reroll">
                <Shuffle size={15} /> Другая судьба
              </button>
            </div>
          </div>
          <div className="nr-setup-scene">
            <EnvironmentScene profile={profile} />
          </div>
        </section>

        <div className="nr-setup-grid">
          <section className="nr-setup-section" aria-label="Запись о рождении">
            <div className="nr-setup-heading">
              <h2>ЗАПИСЬ О РОЖДЕНИИ</h2>
              <span className="nr-entry-count">№ 001</span>
            </div>
            <div className="nr-setup-data">
              <div className="nr-setup-line" data-testid="display-character">
                <span>Имя ребёнка</span><strong>{profile.character.name}</strong>
              </div>
              <div className="nr-setup-line">
                <span>Пол</span><strong>{profile.character.gender}</strong>
              </div>
              <div className="nr-setup-line" data-testid="display-birthplace">
                <span>Место рождения</span><strong>{profile.region}, {profile.country}</strong>
              </div>
              <div className="nr-setup-line">
                <span>Семейный достаток</span><strong>{profile.className}</strong>
              </div>
              <div className="nr-setup-line">
                <span>Дом</span><strong>{profile.home}</strong>
              </div>
            </div>
            <div className="nr-setup-family">
              {profile.family.map((person) => (
                <span className="nr-setup-chip" key={person.id}>
                  {person.relationship}: {person.name}
                </span>
              ))}
            </div>
          </section>

          <section className="nr-setup-section" aria-label="Семья и первые черты">
            <div className="nr-setup-heading">
              <h2><Users size={15} /> СЕМЬЯ И ПЕРВЫЕ ШТРИХИ</h2>
              <Sparkles size={15} />
            </div>
            <div className="nr-setup-data">
              <div className="nr-setup-line">
                <span>Характер</span><strong>{profile.character.traits.join(' · ')}</strong>
              </div>
              {profile.family.map((person) => (
                <div className="nr-setup-line" key={person.id}>
                  <span>{person.relationship}</span><strong>{person.occupation}</strong>
                </div>
              ))}
            </div>
            <div className="nr-setup-family">
              {profile.resources.map((resource) => (
                <span className="nr-setup-chip" key={resource}><Leaf size={12} /> {resource}</span>
              ))}
            </div>
          </section>
        </div>

        <footer className="nr-setup-footer">
          <span>Случайное рождение. Настоящие последствия. Только твой выбор.</span>
          <span><BookOpen size={14} /> История хранится на этом устройстве.</span>
        </footer>
      </div>
    </main>
  );
}

export default function App() {
  const [profile, setProfile] = useState<BirthProfile>(() => generateBirthProfile());
  const [life, setLife] = useState<Life | null>(null);
  const [showRestart, setShowRestart] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [toast, setToast] = useState('');
  const [hasSave, setHasSave] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<TimeSpeed>(1);

  const pendingDecision = life?.events.find((event) => event.choices?.length && !event.outcome) ?? null;
  const actions = useMemo(() => life ? availableActions(life.age) : [], [life?.age]);
  const safeAdvanceAction = life
    ? actions.find((action) => action.id === 'sleep')?.id ?? actions[0]?.id ?? 'cuddle'
    : 'cuddle';

  useEffect(() => {
    setHasSave(Boolean(loadLife()));
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (life) setHasSave(saveLife(life));
  }, [life]);

  useEffect(() => {
    if (pendingDecision) setPlaying(false);
  }, [pendingDecision?.id]);

  useGameClock({
    lifeId: life?.id,
    running: playing && !pendingDecision,
    speed,
    onTick: () => {
      setLife((current) => {
        if (!current || current.events.some((event) => event.choices?.length && !event.outcome)) return current;
        return advance(structuredClone(current), automaticAction(current), 1);
      });
    },
  });

  const startLife = () => {
    setSpeed(1);
    setPlaying(true);
    setLife(makeLife(profile));
    setToast('История началась. Автосохранение включено.');
  };

  const reroll = () => setProfile(generateBirthProfile());

  const applyAction = (actionId: ActionId, months = 1) => {
    if (!life || pendingDecision) return;
    const next = structuredClone(life);
    setLife(advance(next, actionId, months));
  };

  const choose = (eventId: string, choiceIndex: number) => {
    if (!life) return;
    const next = structuredClone(life);
    setLife(resolveChoice(next, eventId, choiceIndex));
    setPlaying(false);
  };

  const resume = () => {
    const savedLife = loadLife();
    if (savedLife) {
      setPlaying(!savedLife.events.some((event) => event.choices?.length && !event.outcome));
      setLife(savedLife);
      setToast('Сохранённая история открыта.');
    } else {
      setHasSave(false);
      setToast('Сохранение не найдено или повреждено.');
    }
  };

  const saveNow = () => {
    if (!life) return;
    const success = saveLife(life);
    setHasSave(success);
    setToast(success ? 'История сохранена на этом устройстве.' : 'Не удалось сохранить историю.');
  };

  const newLife = () => {
    clearLife();
    setHasSave(false);
    setPlaying(false);
    setLife(null);
    setProfile(generateBirthProfile());
    setShowRestart(false);
  };

  const cycleSpeed = () => {
    setSpeed((current) => current === 1 ? 2 : current === 2 ? 4 : 1);
  };

  if (!life) {
    return (
      <>
        <NewLifeScreen profile={profile} hasSave={hasSave} onStart={startLife} onReroll={reroll} onResume={resume} />
        {toast && <div className="nr-toast" role="status">{toast}</div>}
      </>
    );
  }

  return (
    <main className="nr-journal nr-game-screen">
      <div className="nr-grain" aria-hidden="true" />
      <header className="nr-topbar">
        <Logo />
        <div className="nr-save-state" role="status" data-testid="status-save">
          <span className="nr-save-dot" />
          {hasSave ? 'ИСТОРИЯ СОХРАНЕНА' : 'ПРОВЕРКА СОХРАНЕНИЯ'}
        </div>
        <div className="nr-save-actions">
          <button className="nr-topbar-icon" type="button" onClick={saveNow} aria-label="Сохранить историю" data-testid="button-save">
            <Save size={15} /> <span>Сохранить</span>
          </button>
          <button className="nr-topbar-icon" type="button" onClick={resume} aria-label="Загрузить историю" data-testid="button-load">
            <FolderOpen size={15} /> <span>Загрузить</span>
          </button>
          <button className="nr-topbar-icon" type="button" onClick={() => setShowRestart(true)} aria-label="Начать новую жизнь" data-testid="button-new-life">
            <RotateCcw size={15} /> <span>Новая жизнь</span>
          </button>
        </div>
      </header>

      <div className="nr-shell">
        <section className="nr-character-row">
          <div>
            <div className="nr-eyebrow">ТВОЯ ИСТОРИЯ · {chapterName(life.age)}</div>
            <h1>{life.character.name.toUpperCase()}</h1>
            <div className="nr-character-sub">
              {life.character.traits.join(' · ')} <i /> {life.location.region}, {life.location.country}
            </div>
            <div className="nr-character-family" data-testid="display-family">
              <span>рядом:</span>{' '}
              {life.family.map((person) => `${person.relationship.toLowerCase()} ${person.name.split(' ')[0]}`).join(' · ')}
            </div>
          </div>
          <div className="nr-age-stamp" data-testid="display-age">
            <span>ВОЗРАСТ</span>
            <strong>{life.age}</strong>
            <small>{life.age === 1 ? 'год' : life.age > 1 && life.age < 5 ? 'года' : 'лет'}</small>
          </div>
        </section>

        <EnvironmentScene life={life} />
        <CharacterStatus life={life} />

        <TimeControls
          currentDate={life.currentDate}
          playing={playing}
          speed={speed}
          locked={Boolean(pendingDecision)}
          onToggle={() => setPlaying((value) => !value)}
          onSpeedChange={cycleSpeed}
          onOpenActions={() => setShowActions(true)}
          onAdvanceMonth={() => applyAction(safeAdvanceAction, 1)}
          onAdvanceYear={() => applyAction(safeAdvanceAction, 12)}
        />

        <div className="nr-content-grid">
          <LifeJournal events={life.events} />
        </div>
      </div>

      <DecisionModal event={pendingDecision} onChoose={choose} />
      {showActions && (
        <ActionsModal
          actions={actions}
          onSelect={(actionId) => {
            applyAction(actionId);
            setShowActions(false);
          }}
          onClose={() => setShowActions(false)}
        />
      )}

      {showRestart && (
        <div
          className="nr-confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowRestart(false);
          }}
        >
          <section className="nr-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="restart-title">
            <h2 id="restart-title">НАЧАТЬ НОВУЮ ЖИЗНЬ?</h2>
            <p>Текущая история и сохранение будут заменены. Можно будет сгенерировать новое случайное рождение.</p>
            <div className="nr-confirm-actions">
              <button className="nr-control" type="button" onClick={() => setShowRestart(false)} data-testid="button-cancel-new-life">
                <X size={15} /> Остаться
              </button>
              <button className="nr-control nr-main-control" type="button" onClick={newLife} data-testid="button-confirm-new-life">
                Начать заново <ArrowRight size={15} />
              </button>
            </div>
          </section>
        </div>
      )}
      {toast && <div className="nr-toast" role="status">{toast}</div>}
    </main>
  );
}
