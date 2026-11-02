export type RandomState = { algorithm: 'lcg32-v1'; seed: number; state: number; sequence: number };
export const randomState = (seed: number): RandomState => ({
  algorithm: 'lcg32-v1',
  seed: seed >>> 0,
  state: seed >>> 0,
  sequence: 0,
});
export function nextRandom(state: RandomState): number {
  state.state = (Math.imul(state.state, 1664525) + 1013904223) >>> 0;
  return state.state / 4294967296;
}
export function validRandom(v: unknown): v is RandomState {
  const r = v as RandomState | null;
  return (
    !!r &&
    r.algorithm === 'lcg32-v1' &&
    [r.seed, r.state, r.sequence].every((n) => Number.isInteger(n) && n >= 0 && n <= 4294967295)
  );
}
