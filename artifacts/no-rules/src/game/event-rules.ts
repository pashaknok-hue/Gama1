import { canApplyPlan } from './causal-state';
import type { Life, LifeEvent } from './domain';

const retiredMinorRules = new Set([
  'early-evening',
  'early-outing',
  'child-afternoon',
  'child-hobby',
  'teen-weekend',
  'teen-learning',
  'adult-personal-time',
  'adult-idea',
]);

export function canDecide(life: Life, event: LifeEvent): boolean {
  if (
    !event.choices?.length ||
    retiredMinorRules.has(event.templateId ?? '') ||
    event.outcome ||
    (event.kind && event.kind !== 'decision') ||
    event.date > life.currentDate
  )
    return false;
  // Old saves did not record eligibility. Keep history, but never make an
  // infant or an adult answer an old school decision.
  const minAge = event.eligibility?.minAge ?? (event.title === 'После уроков' ? 6 : 3);
  const maxAge = event.eligibility?.maxAge ?? (event.title === 'После уроков' ? 17 : Infinity);
  return event.age >= minAge && event.age <= maxAge && life.age >= minAge && life.age <= maxAge;
}
export function pendingDecision(life: Life | null): LifeEvent | null {
  return life?.events.find((event) => canDecide(life, event)) ?? null;
}

// Some old saves contain imperative infant records without any actor/context.
// Do not invent what happened or rewrite the saved history: clarify it in the view.
export function journalPresentation(event: LifeEvent) {
  if (retiredMinorRules.has(event.templateId ?? ''))
    return {
      title: event.title,
      description:
        (event.outcome || event.description) +
        ' Эта старая необязательная запись не требует ответа.',
      archived: true,
    };
  if (
    !event.kind &&
    ((event.age < 3 &&
      /^(?:(Обнять|Отнять) (реб[её]нка|малыша)|Прогуляться|Хорошо выспаться)$/i.test(
        event.title,
      )) ||
      (event.choices &&
        (event.age < 3 || (event.title === 'После уроков' && (event.age < 6 || event.age > 17)))))
  ) {
    return {
      title: 'Запись из старого дневника',
      description:
        'В этой старой записи не указан подходящий возрасту участник и контекст. Она не считается решением персонажа.',
      archived: true,
    };
  }
  return { title: event.title, description: event.outcome || event.description, archived: false };
}

export function canChoose(life: Life, event: LifeEvent, index: number): boolean {
  return (
    canDecide(life, event) &&
    Number.isInteger(index) &&
    !!event.choices?.[index] &&
    canApplyPlan(life, event.choices[index].plan)
  );
}
