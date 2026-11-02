import { useEffect, useRef } from 'react';
import type { TimeSpeed } from '../components/game/TimeControls';

export function useGameClock({
  lifeId,
  running,
  speed,
  monthDurationMs = 10000,
  onTick,
}: {
  lifeId: string | undefined;
  running: boolean;
  speed: TimeSpeed;
  monthDurationMs?: number;
  onTick: () => void;
}) {
  // A fraction survives pause and changes of age/rate; never restart a partial month.
  const remaining = useRef(1),
    tick = useRef(onTick);
  useEffect(() => {
    tick.current = onTick;
  }, [onTick]);
  useEffect(() => {
    remaining.current = 1;
  }, [lifeId]);
  useEffect(() => {
    if (!lifeId || !running) return;
    const duration = monthDurationMs / speed;
    let started = performance.now(),
      timeout: number;
    const advanceMonth = () => {
      const elapsed = (performance.now() - started) / duration;
      // Carry small scheduling delays so twelve fractional intervals total one year.
      remaining.current = Math.max(0.5, 1 + Math.min(0, remaining.current - elapsed));
      started = performance.now();
      tick.current();
      timeout = window.setTimeout(advanceMonth, Math.ceil(remaining.current * duration));
    };
    timeout = window.setTimeout(advanceMonth, Math.ceil(remaining.current * duration));
    return () => {
      window.clearTimeout(timeout);
      remaining.current = Math.max(0, remaining.current - (performance.now() - started) / duration);
    };
  }, [lifeId, running, speed, monthDurationMs]);
}
