import { useEffect, useState } from 'react';
const modes = { idle: 2, walk: 4, sit: 2, sleep: 2 } as const;
type Mode = keyof typeof modes;
export default function PixelPrototype() {
  const [mode, setMode] = useState<Mode>('idle'),
    [frame, setFrame] = useState(0),
    [scale, setScale] = useState(6),
    [playing, setPlaying] = useState(true);
  useEffect(() => {
    setFrame(0);
    if (!playing) return;
    const timer = window.setInterval(
      () => setFrame((f) => (f + 1) % modes[mode]),
      mode === 'walk' ? 140 : mode === 'sleep' ? 700 : 400,
    );
    return () => window.clearInterval(timer);
  }, [mode, playing]);
  const base = import.meta.env.BASE_URL;
  return (
    <main className="nr-prototype">
      <header>
        <h1>NO RULES · мастерская движения</h1>
        <p>Изолированный Pixelbolt-прототип. Сохранение игры не используется.</p>
        <a href={base}>Вернуться к игре</a>
      </header>
      <section className="nr-proto-stage" aria-label="Проверка опоры на поверхность">
        <div className="nr-proto-floor" data-testid="prototype-floor" />
        <img
          data-testid="prototype-avatar"
          data-mode={mode}
          data-frame={frame}
          src={`${base}prototype/observer/frames/${mode}-${frame}.png`}
          width={24 * scale}
          height={32 * scale}
          style={{ width: 24 * scale, height: 32 * scale, bottom: 32 - 2 * scale }}
          alt={`Оригинальный наблюдатель NO RULES: ${mode}`}
        />
      </section>
      <nav aria-label="Анимации">
        {(Object.keys(modes) as Mode[]).map((value) => (
          <button key={value} onClick={() => setMode(value)} aria-pressed={mode === value}>
            {value}
          </button>
        ))}
      </nav>
      <label>
        Масштаб пикселя
        <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
          {[2, 4, 6, 8].map((n) => (
            <option key={n} value={n}>
              {n}×
            </option>
          ))}
        </select>
      </label>
      <button onClick={() => setPlaying((p) => !p)}>{playing ? 'Пауза' : 'Продолжить'}</button>
      <p>
        Рецепт и кадры созданы для NO RULES. Экспорт: Pixelbolt 0.10.0, локально, без платных API.
        PNG 24×32, опора y=30, целочисленный масштаб.
      </p>
    </main>
  );
}
