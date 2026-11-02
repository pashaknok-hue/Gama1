import { monthIndex } from './causal-state';
import type { Life } from './domain';
export type SceneKind = 'home' | 'yard' | 'school' | 'workshop' | 'studio' | 'garden';
export function sceneFor(life?: Life): { kind: SceneKind; title: string; detail: string } {
  if (!life) return { kind: 'home', title: 'Дом семьи', detail: 'Первая страница жизни' };
  const s = life.simulation;
  if (
    s?.development?.project &&
    life.events.find((e) => e.kind === 'action')?.templateId === 'action-create' &&
    monthIndex(life.currentDate) - monthIndex(life.events.find((e) => e.kind === 'action')!.date) <=
      3
  )
    return { kind: 'studio', title: 'Место для творчества', detail: s.development.project.title };
  if (s?.person.job.status === 'employed')
    return {
      kind: 'workshop',
      title: s.person.job.title,
      detail: s.person.job.employer ?? 'Рабочее место',
    };
  if (s?.school?.status === 'enrolled')
    return {
      kind: 'school',
      title: s.school.name,
      detail: `${s.school.grade} класс · занятия и общие дела`,
    };
  if (s?.development?.course?.status === 'active')
    return {
      kind: 'workshop',
      title: s.development.course.provider,
      detail: s.development.course.title,
    };
  if (s?.person.job.status === 'retired')
    return { kind: 'garden', title: 'Тихий двор', detail: 'Время для посильных дел и общения' };
  if (
    life.age >= 3 &&
    life.age <= 5 &&
    Object.values(s?.npcs ?? {}).some((n) => n.role === 'friend')
  )
    return { kind: 'yard', title: 'Общий двор', detail: 'Место встреч и игр' };
  return { kind: 'home', title: 'Дом семьи', detail: life.conditions.home };
}
export const SCENE_FLOOR = 178;
export function avatarGeometry(age: number) {
  const scale = (age < 2 ? 28 : age < 7 ? 36 : age < 18 ? 47 : 55) / 40;
  return { scale, top: SCENE_FLOOR - 40 * scale, feet: SCENE_FLOOR };
}
