import type { Life } from './domain';
const KEY = 'no-rules-life-v1';
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
export function isValidLife(value: unknown): value is Life {
  if (!isObject(value) || !isObject(value.character) || !isObject(value.location) || !isObject(value.conditions) || !isObject(value.stats)) return false;
  const stats = value.stats as Record<string, unknown>;
  return typeof value.id === 'string' && typeof value.currentDate === 'string' &&
    typeof value.birthDate === 'string' && typeof value.age === 'number' &&
    typeof value.character.name === 'string' && ['health', 'happiness', 'curiosity', 'energy'].every((key) => typeof stats[key] === 'number') &&
    Array.isArray(value.family) && Array.isArray(value.events) && Array.isArray(value.conditions.resources);
}
export function saveLife(life: Life): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(life)); return true; } catch { return false; }
}
export function loadLife(): Life | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isValidLife(value) ? value : null;
  } catch { return null; }
}
export function clearLife() { try { localStorage.removeItem(KEY); } catch { /* storage may be unavailable */ } }
