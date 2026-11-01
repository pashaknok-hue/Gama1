import { useEffect, useRef } from 'react';
import type { TimeSpeed } from '../components/game/TimeControls';

// One simulated month takes ten real seconds at 1×; no offline catch-up.
const MONTH_DURATION_MS = 10_000;

export function useGameClock({
  lifeId,
  running,
  speed,
  onTick,
}: {
  lifeId: string | undefined;
  running: boolean;
  speed: TimeSpeed;
  onTick: () => void;
}) {
  const remaining = useRef(MONTH_DURATION_MS);
  const tick = useRef(onTick);

  useEffect(() => {
    tick.current = onTick;
  }, [onTick]);

  useEffect(() => {
    remaining.current = MONTH_DURATION_MS;
  }, [lifeId]);

  useEffect(() => {
    if (!lifeId || !running) return;

    let started = performance.now();
    let timeout: number;
    const advanceMonth = () => {
      remaining.current = MONTH_DURATION_MS;
      started = performance.now();
      tick.current();
      timeout = window.setTimeout(advanceMonth, MONTH_DURATION_MS / speed);
    };
    timeout = window.setTimeout(advanceMonth, remaining.current / speed);

    return () => {
      window.clearTimeout(timeout);
      // Freeze the unfinished month on pause; convert elapsed time at the old
      // speed before a speed change. Ordinary renders never restart this timer.
      remaining.current = Math.max(0, remaining.current - (performance.now() - started) * speed);
    };
  }, [lifeId, running, speed]);
}
