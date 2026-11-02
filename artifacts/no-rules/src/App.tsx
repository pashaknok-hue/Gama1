import { monthDurationMs } from './game/pacing';
import { yearWord } from './game/event-text';
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
  advanceTime,
  availableActions,
  makeLife,
  advanceToNextDecision,
  resolveChoice,
  type ActionId,
} from './game/simulation';
import { pendingDecision as getPendingDecision } from './game/event-rules';
import { clearLife, loadLife, saveLife } from './game/storage';
import { useGameClock } from './hooks/use-game-clock';
import worldCoverage from '../data/COVERAGE.md?url';
import worldDataNotice from '../data/NOTICE.md?url';
import './game-ui.css';

type BirthDistribution = { weighting: 'uniform' | 'population'; includeTerritories: boolean };

function chapterName(age: number) {
  if (age < 3) return 'ПЕРВЫЕ ГОДЫ';
  if (age < 7) return 'РАННЕЕ ДЕТСТВО';
  if (age < 13) return 'ДЕТСТВО';
  if (age < 18) return 'ПОДРОСТКОВЫЕ ГОДЫ';
  if (age >= 65) return 'СТАРШИЙ ВОЗРАСТ';
  return 'ВЗРОСЛАЯ ЖИЗНЬ';
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
  distribution,
  onDistributionChange,
}: {
  profile: BirthProfile;
  hasSave: boolean;
  onStart: () => void;
  onReroll: () => void;
  onResume: () => void;
  distribution: BirthDistribution;
  onDistributionChange: (distribution: BirthDistribution) => void;
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
            <div className="nr-birth-settings" aria-label="Выбор рождения">
              <label>
                Выбор страны
                <select aria-label="Распределение стран" value={distribution.weighting}
                  onChange={(event) => onDistributionChange({ ...distribution, weighting: event.target.value as BirthDistribution['weighting'] })}>
                  <option value="uniform">Равные шансы стран</option>
                  <option value="population">С учётом населения</option>
                </select>
              </label>
              <label className="nr-territories-toggle">
                <input type="checkbox" checked={distribution.includeTerritories}
                  onChange={(event) => onDistributionChange({ ...distribution, includeTerritories: event.target.checked })} />
                Включать дополнительные территории
              </label>
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
                <span>Имя ребёнка</span><strong><bdi>{profile.character.name}</bdi></strong>
              </div>
              <div className="nr-setup-line">
                <span>Пол</span><strong>{profile.character.gender}</strong>
              </div>
              <div className="nr-setup-line" data-testid="display-birthplace">
                <span>Место рождения</span><strong>{[profile.birthplace?.settlement, profile.region === 'Регион не указан' ? null : profile.region, profile.country].filter(Boolean).join(', ')}</strong>
              </div>
              <div className="nr-setup-line">
                <span>Семейный достаток</span><strong>{profile.className}</strong>
              </div>
              <div className="nr-setup-line">
                <span>Дом</span><strong>{profile.home}</strong>
              </div>
            </div>
            {profile.character.personalName?.status === 'missing' && (
              <p className="nr-naming-note" role="status">Для этого места пока нет проверенного набора имён. Имена семьи не указаны.</p>
            )}
            {profile.character.personalName?.status === 'sourced' && profile.character.personalName.russianSpelling !== 'complete' && (
              <p className="nr-naming-note">Там, где русское написание неизвестно, сохранено исходное имя.</p>
            )}
            <div className="nr-setup-family">
              {profile.family.map((person) => (
                <span className="nr-setup-chip" key={person.id}>
                  {person.relationship}: <bdi>{person.name}</bdi>
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

        {profile.character.personalName?.selection && profile.character.personalName.selection !== 'regional-or-country' && <p className="nr-name-coverage" role="status">Имя выбрано из {profile.character.personalName.selection==='language-group'?'родственного языкового':'резервного'} набора ({profile.character.personalName.language}); местное происхождение не подтверждено.</p>}
        <footer className="nr-setup-footer">
          <span>Случайное рождение. Настоящие последствия. Только твой выбор.</span>
          <span><BookOpen size={14} /> История хранится на этом устройстве.</span>
          <span><a href={worldCoverage} target="_blank" rel="noreferrer">Страны и данные имён</a> · <a href={worldDataNotice} target="_blank" rel="noreferrer">Источники</a></span>
        </footer>
      </div>
    </main>
  );
}

export default function App() {
  const [birthDistribution, setBirthDistribution] = useState<BirthDistribution>({ weighting: 'uniform', includeTerritories: false });
  const [profile, setProfile] = useState<BirthProfile>(() => generateBirthProfile());
  const [life, setLife] = useState<Life | null>(null);
  const [showRestart, setShowRestart] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [toast, setToast] = useState('');
  const [hasSave, setHasSave] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [skipMode, setSkipMode] = useState(false);
  const [speed, setSpeed] = useState<TimeSpeed>(1);

  const pendingDecision = getPendingDecision(life);
  const actions = useMemo(() => life ? availableActions(life.age, life.stats) : [], [life?.age, life?.stats.energy]);

  useEffect(() => {
    setHasSave(Boolean(loadLife()));
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (life) setHasSave(saveLife({...life, playback:{mode:skipMode?'choices':playing?'auto':'paused'}}));
  }, [life, playing, skipMode]);

  useGameClock({
    lifeId: life?.id,
    running: playing && !pendingDecision,
    speed: life && life.age < 18 ? 1 : speed,
    monthDurationMs: monthDurationMs(life?.age ?? 0),
    onTick: () => {
      setLife((current) => {
        if (!current || getPendingDecision(current)) return current;
        return advanceTime(structuredClone(current), 1);
      });
    },
  });

  const startLife = () => {
    setSpeed(1);
    setSkipMode(false);
    setPlaying(true);
    setLife(makeLife(profile));
    setToast('История началась. Автосохранение включено.');
  };

  const reroll = () => setProfile(generateBirthProfile(birthDistribution));

  const applyAction = (actionId: ActionId, months = 1) => {
    if (!life || pendingDecision) return;
    const next = structuredClone(life);
    setLife(advance(next, actionId, months));
  };

  const passTime = (months: number) => {
    if (!life || pendingDecision) return;
    setLife(advanceTime(structuredClone(life), months));
  };

  const skipToChoice = () => {
    if (!life || pendingDecision) return;
    const next = structuredClone(life);
    const months = advanceToNextDecision(next);
    setSkipMode(true);
    setLife(next);
    setPlaying(false);
    if (!getPendingDecision(next)) setToast(`За ${months} месяцев новых решений не возникло. Время остановлено.`);
  };

  const choose = (eventId: string, choiceIndex: number) => {
    if (!life) return;
    const next = structuredClone(life);
    const event=next.events.find(event=>event.id===eventId);
    if(!event || event.outcome)return;
    resolveChoice(next,eventId,choiceIndex);
    if(!event.outcome)return;
    if(skipMode)advanceToNextDecision(next);
    setLife(next);
  };

  const resume = () => {
    const savedLife = loadLife();
    if (savedLife) {
      setSkipMode(savedLife.playback?.mode==='choices');
      setPlaying((savedLife.playback?.mode??'auto')==='auto');
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
    setSkipMode(false);
    setLife(null);
    setProfile(generateBirthProfile(birthDistribution));
    setShowRestart(false);
  };

  const cycleSpeed = () => {
    setSpeed((current) => current === 1 ? 2 : current === 2 ? 4 : 1);
  };

  if (!life) {
    return (
      <>
        <NewLifeScreen profile={profile} hasSave={hasSave} onStart={startLife} onReroll={reroll} onResume={resume}
          distribution={birthDistribution} onDistributionChange={(distribution) => {
            setBirthDistribution(distribution);
            setProfile(generateBirthProfile(distribution));
          }} />
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
            <h1><bdi>{life.character.name}</bdi></h1>
            <div className="nr-character-sub">
              {life.character.traits.join(' · ')} <i /> {[life.location.birthplace?.settlement, life.location.region === 'Регион не указан' ? null : life.location.region, life.location.country].filter(Boolean).join(', ')}
            </div>
            <div className="nr-character-family" data-testid="display-family">
              <span>рядом:</span>{' '}
              {life.family.map((person, index) => <span key={person.id}>{index > 0 && ' · '}{person.relationship.toLowerCase()} <bdi>{person.name}</bdi></span>)}
            </div>
          </div>
          <div className="nr-age-stamp" data-testid="display-age">
            <span>ВОЗРАСТ</span>
            <strong>{life.age}</strong>
            <small>{yearWord(life.age)}</small>
          </div>
        </section>

        <EnvironmentScene life={life} />
        <CharacterStatus life={life} />

        <TimeControls
          age={life.age}
          onNextDecision={skipToChoice}
          currentDate={life.currentDate}
          playing={playing}
          speed={speed}
          locked={Boolean(pendingDecision)}
          onToggle={() => {setSkipMode(false);setPlaying((value) => !value);}}
          onSpeedChange={cycleSpeed}
          onOpenActions={() => setShowActions(true)}
          actionsAvailable={actions.length > 0}
          onAdvanceMonth={() => passTime(1)}
          onAdvanceYear={() => passTime(12)}
        />

        <div className="nr-content-grid">
          <LifeJournal events={life.events} life={life} />
        </div>
      </div>

      <DecisionModal life={life} event={pendingDecision} onChoose={choose} skipMode={skipMode} onSkipMode={setSkipMode} />
      {showActions && (
        <ActionsModal
          life={life}
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
