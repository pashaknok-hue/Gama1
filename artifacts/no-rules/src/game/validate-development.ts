import type { SimulationState } from './causal-state';
import { reconcile } from './finance';
const obj = (v: any) => v && typeof v === 'object' && !Array.isArray(v);
const finite = (n: any) => typeof n === 'number' && Number.isFinite(n);
export function validDevelopment(s: SimulationState): boolean {
  const f = s.finance;
  if (f) {
    if (
      typeof f.currency !== 'string' ||
      !finite(f.unitScale) ||
      f.unitScale <= 0 ||
      !finite(f.family) ||
      !Number.isInteger(f.sequence) ||
      !Array.isArray(f.entries) ||
      !reconcile(s)
    )
      return false;
    const ids = new Set();
    for (const t of f.entries) {
      if (
        !obj(t) ||
        typeof t.id !== 'string' ||
        ids.has(t.id) ||
        typeof t.date !== 'string' ||
        !['cash', 'savings', 'debt', 'family'].includes(t.account) ||
        !finite(t.amount) ||
        typeof t.reason !== 'string' ||
        !['opening', 'salary', 'living', 'transfer', 'decision', 'gift'].includes(t.kind)
      )
        return false;
      ids.add(t.id);
    }
  }
  const sc = s.school;
  if (sc) {
    if (
      !['waiting', 'enrolled', 'blocked', 'completed', 'unrecorded'].includes(sc.status) ||
      typeof sc.name !== 'string' ||
      ![
        sc.entryAge,
        sc.primaryYears,
        sc.secondaryYears,
        sc.grade,
        sc.attended,
        sc.missed,
        sc.lastYear,
      ].every((n) => Number.isInteger(n) && n >= 0) ||
      !obj(sc.subjects) ||
      !Object.values(sc.subjects).every(finite) ||
      !Array.isArray(sc.classmates) ||
      sc.classmates.some((id) => !s.npcs[id]) ||
      (sc.teacherId && !s.npcs[sc.teacherId])
    )
      return false;
  }
  const d = s.development;
  if (d) {
    if (!obj(d)) return false;
    const p = d.project;
    if (
      p &&
      (!['active', 'ready', 'shown'].includes(p.status) ||
        typeof p.title !== 'string' ||
        !finite(p.progress) ||
        p.progress < 0 ||
        p.progress > 100 ||
        !Number.isInteger(p.startedMonth))
    )
      return false;
    if (
      d.course &&
      (!['active', 'completed', 'cancelled'].includes(d.course.status) ||
        typeof d.course.title !== 'string' ||
        typeof d.course.provider !== 'string' ||
        !Number.isInteger(d.course.startedMonth) ||
        !Number.isInteger(d.course.duration))
    )
      return false;
  }
  return true;
}
