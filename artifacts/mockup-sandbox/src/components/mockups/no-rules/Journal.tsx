import { useState } from 'react';
import {
  Battery,
  BookOpen,
  Clock3,
  Coins,
  FastForward,
  Heart,
  MapPin,
  Pause,
  Play,
  Sun,
} from 'lucide-react';
import './Journal.css';

const olderEntries = [
  {
    date: '10 октября',
    time: '19:16',
    title: 'На кухне снова спорили о счетах',
    text: 'Мама говорила тихо, но я всё равно услышала каждое слово из коридора. Положила рядом с её кружкой половину своей зарплаты — она ничего не сказала, только подвинула сахарницу.',
    note: 'дом · деньги',
  },
  {
    date: '11 октября',
    time: '22:37',
    title: 'Вечер получился тихим',
    text: 'Разогрела суп, посмотрела в окно на мокрый двор и так и не открыла книгу. Иногда ничего не случается — и это тоже часть истории.',
    note: 'вчера',
  },
];

const journalEntries = [
  {
    date: '12 октября',
    time: '07:18',
    title: 'Утро началось раньше будильника',
    text: 'В подъезде хлопнула дверь — сосед опять спешил на первую электричку. Я лежала ещё минуту, считая трещины на потолке, а потом всё-таки встала. На кухне пахло остывшим чаем.',
    note: 'сон прерван',
  },
  {
    date: '12 октября',
    time: '08:06',
    title: 'Мама оставила записку',
    text: '«Позвони бабушке вечером, она спрашивала про тебя». Перечитала дважды и убрала в карман пальто. На остановке напишу ей — так проще, чем обещать звонок и снова забыть.',
    note: 'дом · близкие',
  },
  {
    date: '12 октября',
    time: '08:42',
    title: 'Автобус стоял в пробке у рынка',
    text: 'За стеклом продавец раскладывал яблоки ящиками. В кошельке осталось 8 420 ₽ до аванса. Если не брать кофе по дороге, на выходных можно съездить к бабушке.',
    note: 'деньги · дорога',
  },
  {
    date: '12 октября',
    time: '09:11',
    title: 'В мастерской не включился свет',
    text: 'Лена уже была там. Мы зажгли настольную лампу и десять минут молчали, пока грелся чайник. Она сказала, что в соседнем ателье ищут человека на вечернюю смену.',
    note: 'работа · разговор',
  },
  {
    date: '12 октября',
    time: '09:24',
    title: 'Предложение, от которого не отмахнуться',
    text: 'Смена даст лишние деньги, но вечерами я помогаю маме, а сил и так почти не осталось. Лена ждёт ответа до конца дня. Время будто остановилось на этой фразе.',
    note: 'важное решение',
  },
];

const choices = [
  {
    title: 'Согласиться на смену',
    detail: 'Больше денег к концу месяца; меньше вечеров для отдыха и семьи.',
    marker: '₽  +',
  },
  {
    title: 'Попросить пробную неделю',
    detail: 'Оставить себе путь назад; расписание пока останется неопределённым.',
    marker: '?',
  },
  {
    title: 'Отказаться и остаться в мастерской',
    detail: 'Сохранить привычный ритм; бюджет до аванса останется тесным.',
    marker: 'дом',
  },
  {
    title: 'Сначала поговорить с мамой',
    detail: 'Не решать в одиночку; ответ Лене придётся отложить.',
    marker: '♡',
  },
];

function PixelScene() {
  return (
    <div className="nr-scene" aria-label="Вероника ждёт автобус у спального района Пскова">
      <svg
        className="nr-scene-art"
        viewBox="0 0 760 224"
        role="img"
        aria-label="Пиксельная сцена: остановка, панельные дома и вечерний двор"
        shapeRendering="crispEdges"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="760" height="224" fill="#343c49" />
        <rect width="760" height="104" fill="#495362" />
        <rect y="16" width="760" height="2" fill="#64717b" opacity=".48" />
        <rect x="568" y="25" width="38" height="38" fill="#e7ba72" />
        <rect x="575" y="32" width="24" height="24" fill="#f3d894" />
        <rect x="579" y="36" width="16" height="16" fill="#c78b59" />
        <rect x="28" y="31" width="4" height="4" fill="#e1d9c4" />
        <rect x="212" y="24" width="3" height="3" fill="#e1d9c4" />
        <rect x="488" y="44" width="4" height="4" fill="#e1d9c4" />
        <rect x="668" y="78" width="3" height="3" fill="#e1d9c4" />
        <rect x="0" y="88" width="238" height="92" fill="#59606a" />
        <rect x="0" y="82" width="238" height="8" fill="#77808a" />
        <rect x="14" y="103" width="26" height="20" fill="#d7ae72" />
        <rect x="53" y="103" width="26" height="20" fill="#d8bd8c" />
        <rect x="93" y="103" width="26" height="20" fill="#d7ae72" />
        <rect x="133" y="103" width="26" height="20" fill="#343b47" />
        <rect x="173" y="103" width="26" height="20" fill="#d7ae72" />
        <rect x="14" y="140" width="26" height="20" fill="#d7ae72" />
        <rect x="53" y="140" width="26" height="20" fill="#39414c" />
        <rect x="93" y="140" width="26" height="20" fill="#d8bd8c" />
        <rect x="133" y="140" width="26" height="20" fill="#d7ae72" />
        <rect x="173" y="140" width="26" height="20" fill="#36404b" />
        <rect x="253" y="111" width="153" height="69" fill="#69717b" />
        <rect x="253" y="104" width="153" height="8" fill="#8b9295" />
        <rect x="274" y="126" width="23" height="18" fill="#e8c57f" />
        <rect x="313" y="126" width="23" height="18" fill="#45505e" />
        <rect x="351" y="126" width="23" height="18" fill="#e8c57f" />
        <rect x="418" y="146" width="142" height="34" fill="#58626a" />
        <rect x="443" y="125" width="87" height="45" fill="#c3b08c" />
        <rect x="450" y="132" width="72" height="29" fill="#e4d0a2" />
        <rect x="466" y="137" width="41" height="19" fill="#6b8190" />
        <rect x="485" y="137" width="3" height="19" fill="#c4b793" />
        <rect x="447" y="171" width="6" height="26" fill="#b7a47f" />
        <rect x="521" y="171" width="6" height="26" fill="#b7a47f" />
        <rect x="0" y="179" width="760" height="45" fill="#252d35" />
        <rect x="0" y="180" width="760" height="4" fill="#7a776e" />
        <rect x="34" y="197" width="52" height="3" fill="#c4a875" opacity=".7" />
        <rect x="156" y="211" width="74" height="3" fill="#c4a875" opacity=".55" />
        <rect x="633" y="194" width="65" height="3" fill="#c4a875" opacity=".55" />
        <rect x="690" y="93" width="5" height="86" fill="#29333c" />
        <rect x="680" y="87" width="26" height="8" fill="#d3c49e" />
        <rect x="684" y="91" width="18" height="2" fill="#f4dfac" />
        <rect x="720" y="108" width="5" height="72" fill="#515b61" />
        <rect x="706" y="107" width="34" height="4" fill="#7e8989" />
        <rect x="708" y="111" width="3" height="35" fill="#80918f" />
        <rect x="735" y="111" width="3" height="35" fill="#80918f" />
        <rect x="710" y="124" width="23" height="15" fill="#3c4a4f" />
        <rect x="710" y="150" width="20" height="22" fill="#3e704f" />
        <rect x="708" y="151" width="4" height="18" fill="#63845e" />
        <rect x="722" y="146" width="4" height="24" fill="#7a9261" />
        <rect x="727" y="153" width="4" height="16" fill="#55794f" />
        <rect x="0" y="174" width="760" height="6" fill="#606b67" />
        <rect x="366" y="127" width="17" height="49" fill="#313b46" />
        <rect x="369" y="130" width="12" height="14" fill="#bd8d6a" />
        <rect x="367" y="145" width="17" height="24" fill="#798d83" />
        <rect x="369" y="169" width="5" height="12" fill="#262f36" />
        <rect x="378" y="169" width="5" height="12" fill="#262f36" />
        <rect x="362" y="149" width="6" height="17" fill="#bd8d6a" />
        <rect x="383" y="149" width="6" height="15" fill="#bd8d6a" />
        <rect x="390" y="153" width="13" height="12" fill="#b77e58" />
        <rect x="352" y="179" width="41" height="2" fill="#111921" opacity=".55" />
        <rect x="308" y="185" width="50" height="2" fill="#e0ca9a" opacity=".32" />
        <rect x="402" y="190" width="40" height="2" fill="#e0ca9a" opacity=".2" />
        <rect x="631" y="57" width="2" height="18" fill="#a7b2b0" opacity=".58" />
        <rect x="178" y="53" width="2" height="21" fill="#a7b2b0" opacity=".48" />
        <rect x="532" y="68" width="2" height="16" fill="#a7b2b0" opacity=".45" />
        <rect x="281" y="72" width="2" height="18" fill="#a7b2b0" opacity=".48" />
      </svg>
      <div className="nr-scene-label">
        <span className="nr-scene-pin"><MapPin size={12} /></span>
        <span>Псков · спальный район</span>
        <span className="nr-scene-time">пасмурное утро</span>
      </div>
      <div className="nr-scene-caption">Обычное утро. Необычный выбор.</div>
    </div>
  );
}

function StatusItem({
  icon,
  label,
  value,
  amount,
  tone,
}: {
  icon: 'health' | 'mood' | 'energy' | 'money';
  label: string;
  value: string;
  amount: number;
  tone: string;
}) {
  const Icon = icon === 'health' ? Heart : icon === 'mood' ? Sun : icon === 'energy' ? Battery : Coins;
  return (
    <div className={`nr-status-item ${tone}`}>
      <div className="nr-status-title">
        <Icon size={14} strokeWidth={1.8} />
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      {icon !== 'money' && (
        <div className="nr-status-track" aria-label={`${label}: ${value}`}>
          <span style={{ width: `${amount}%` }} />
        </div>
      )}
      {icon === 'money' && <div className="nr-money-sub">до аванса · 18 дней</div>}
    </div>
  );
}

export function Journal() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showOlder, setShowOlder] = useState(false);
  const speedOptions = [1, 2, 4];
  const advanceSpeed = () => {
    setSpeed((current) => speedOptions[(speedOptions.indexOf(current) + 1) % speedOptions.length]);
  };
  const entriesToShow = showOlder ? [...olderEntries, ...journalEntries] : journalEntries;

  return (
    <main className="nr-journal">
      <div className="nr-grain" aria-hidden="true" />
      <header className="nr-topbar">
        <div className="nr-brand">
          <div className="nr-mark" aria-hidden="true">НР</div>
          <div>
            <div className="nr-brand-name">NO RULES</div>
            <div className="nr-brand-caption">ЖИЗНЬ БЕЗ СЦЕНАРИЯ</div>
          </div>
        </div>
        <div className="nr-save-state"><span className="nr-save-dot" /> ИСТОРИЯ СОХРАНЕНА</div>
      </header>

      <div className="nr-shell">
        <div className="nr-character-row">
          <div>
            <div className="nr-eyebrow">ТВОЯ ИСТОРИЯ · ГЛАВА 24</div>
            <h1>ВЕРОНИКА ОРЛОВА</h1>
            <div className="nr-character-sub">наблюдательная · упрямая <i /> Псковская область</div>
          </div>
          <div className="nr-age-stamp">
            <span>ВОЗРАСТ</span>
            <strong>24</strong>
            <small>лет</small>
          </div>
        </div>

        <PixelScene />

        <section className="nr-status" aria-label="Состояние Вероники">
          <StatusItem icon="health" label="здоровье" value="78" amount={78} tone="health" />
          <StatusItem icon="mood" label="настроение" value="54" amount={54} tone="mood" />
          <StatusItem icon="energy" label="энергия" value="39" amount={39} tone="energy" />
          <StatusItem icon="money" label="деньги" value="8 420 ₽" amount={0} tone="money" />
        </section>

        <section className="nr-timebar" aria-label="Управление временем">
          <div className="nr-date"><Clock3 size={15} /><span>12 октября 2021</span><i /> <span>вторник</span></div>
          <div className="nr-time-controls">
            <span className={`nr-time-state ${isPlaying ? 'is-playing' : ''}`}>
              <i />{isPlaying ? 'ВРЕМЯ ИДЁТ' : 'ПАУЗА'}
            </span>
            <button
              type="button"
              className="nr-control nr-main-control"
              aria-label={isPlaying ? 'Приостановить время' : 'Продолжить время'}
              onClick={() => setIsPlaying((value) => !value)}
            >
              {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
              <span>{isPlaying ? 'Пауза' : 'Продолжить'}</span>
            </button>
            <button
              type="button"
              className="nr-control nr-speed-control"
              aria-label={`Скорость симуляции: ${speed}×. Нажмите, чтобы изменить`}
              onClick={advanceSpeed}
            >
              <FastForward size={15} fill="currentColor" />
              <span>{speed}×</span>
            </button>
          </div>
        </section>

        <div className="nr-content-grid">
          <section className="nr-feed" aria-labelledby="nr-feed-title">
            <div className="nr-feed-heading">
              <div>
                <div className="nr-eyebrow">ЛИЧНЫЕ ЗАПИСИ</div>
                <h2 id="nr-feed-title"><BookOpen size={19} /> Дневник жизни</h2>
              </div>
              <span className="nr-entry-count">6 ЗАПИСЕЙ</span>
            </div>

            <div className="nr-timeline">
              {entriesToShow.map((entry, index) => (
                <article className="nr-entry" key={`${entry.date}-${entry.time}`}>
                  <div className="nr-entry-rail">
                    <span className={`nr-timeline-dot ${index === entriesToShow.length - 1 ? 'is-current' : ''}`} />
                    {index !== entriesToShow.length - 1 && <span className="nr-timeline-line" />}
                  </div>
                  <div className="nr-entry-content">
                    <div className="nr-entry-meta">
                      <time>{entry.date} <span>·</span> {entry.time}</time>
                      <span className="nr-entry-tag">{entry.note}</span>
                    </div>
                    <h3>{entry.title}</h3>
                    <p>{entry.text}</p>
                  </div>
                </article>
              ))}
            </div>
            <button className="nr-older-button" type="button" onClick={() => setShowOlder((value) => !value)}>
              <span>{showOlder ? 'Свернуть предыдущие дни' : 'Показать предыдущие дни'}</span><span aria-hidden="true">{showOlder ? '↑' : '↓'}</span>
            </button>
          </section>

          <aside className="nr-context">
            <div className="nr-context-block">
              <div className="nr-eyebrow">СЕЙЧАС РЯДОМ</div>
              <div className="nr-person">
                <div className="nr-avatar">МО</div>
                <div><strong>Марина Орлова</strong><span>мама · ждёт звонка</span></div>
              </div>
              <div className="nr-person">
                <div className="nr-avatar avatar-alt">ЛС</div>
                <div><strong>Лена Соколова</strong><span>коллега · мастерская</span></div>
              </div>
            </div>
            <div className="nr-context-block nr-chapter-block">
              <div className="nr-eyebrow">ЭТА ГЛАВА</div>
              <p>Между привычным ритмом и возможностью что-то изменить.</p>
              <div className="nr-context-rule"><span>дом</span><i /><span>работа</span><i /><span>планы</span></div>
            </div>
            <div className="nr-scene-slot">
              <div className="nr-scene-slot-top"><span className="nr-slot-mark">▧</span> ОСОБЫЙ ЭПИЗОД</div>
              <strong>Момент, который останется</strong>
              <span>Редкие сцены и мини-игры появятся в важных главах.</span>
            </div>
          </aside>
        </div>
      </div>

      <aside className="nr-event" role="dialog" aria-labelledby="nr-event-title" aria-describedby="nr-event-copy">
        <div className="nr-event-topline">
          <span className="nr-event-icon"><span /></span>
          <span>{isPlaying ? 'СОБЫТИЕ · ИСТОРИЯ ПРОДОЛЖАЕТСЯ' : 'СОБЫТИЕ · ВРЕМЯ ОСТАНОВЛЕНО'}</span>
          <span className="nr-event-pause">{isPlaying ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}</span>
        </div>
        <div className="nr-event-body">
          <div className="nr-event-kicker">РАЗВИЛКА ДНЯ <span>№ 04</span></div>
          <h2 id="nr-event-title">Лишняя смена</h2>
          <p id="nr-event-copy">Лена предложила вечернюю работу в соседнем ателье. Деньги сейчас пригодились бы, но после мастерской ты и так почти не оставляешь времени себе. Она ждёт ответа до конца дня.</p>
          <div className="nr-choice-heading"><span>ЧТО ТЫ ОТВЕТИШЬ?</span><i /> <span>ВЫБЕРИ НАПРАВЛЕНИЕ</span></div>
          <div className="nr-choices">
            {choices.map((choice, index) => (
              <button
                type="button"
                key={choice.title}
                className={`nr-choice ${selectedChoice === index ? 'is-selected' : ''}`}
                aria-pressed={selectedChoice === index}
                onClick={() => setSelectedChoice(index)}
              >
                <span className="nr-choice-index">0{index + 1}</span>
                <span className="nr-choice-copy">
                  <strong>{choice.title}</strong>
                  <small>{choice.detail}</small>
                </span>
                <span className="nr-choice-marker">{choice.marker}</span>
              </button>
            ))}
          </div>
          <div className="nr-event-foot">
            <span>{selectedChoice === null ? 'РЕШЕНИЕ МОЖЕТ ПОДОЖДАТЬ' : 'ВАРИАНТ ОТМЕЧЕН · ИСТОРИЯ ПОКА НА ПАУЗЕ'}</span>
            <span className="nr-key-hint">01—04 <i>·</i> выбор</span>
          </div>
        </div>
      </aside>
      <footer className="nr-footer">
        <span>NO RULES <i /> Одна жизнь. Без готового сценария.</span>
        <span>ПАУЗА — ТВОЁ ВРЕМЯ ПОДУМАТЬ</span>
      </footer>
    </main>
  );
}
