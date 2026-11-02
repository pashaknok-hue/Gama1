import { generateBirthProfile } from './generation';
import { makeLife } from './simulation';
import { randomState, nextRandom } from './random';
import type { BirthOptions } from './world';
// Independent of clock, UUID generator and timezone; use the same decisions to replay.
export function seededLife(seed: number, options: Omit<BirthOptions, 'random'> = {}) {
  const state = randomState(seed),
    random = () => nextRandom(state);
  const life = makeLife(generateBirthProfile({ ...options, random }), {
    random,
    id: `seed-${state.seed}`,
    now: '2000-01-01T00:00:00.000Z',
  });
  life.rng = state;
  life.events[0].id = `birth-${life.id}`;
  return life;
}
