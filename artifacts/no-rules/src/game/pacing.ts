// Calendar months still run individually; this only changes their wall-clock duration.
export function monthDurationMs(age: number): number {
  if (age < 3) return 5000 / 12;
  if (age < 6) return 10000 / 12;
  if (age < 12) return 25000 / 12;
  if (age < 18) return 40000 / 12;
  return 10000;
}
export const childhoodYearSeconds = (age: number) =>
  age < 18 ? (monthDurationMs(age) * 12) / 1000 : null;
