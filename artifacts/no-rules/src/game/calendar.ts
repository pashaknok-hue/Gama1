// Civil dates only: no timezone-dependent parsing or silent rollover of invalid dates.
export function daysInMonth(year: number, month: number): number {
  return (
    [
      31,
      year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ][month - 1] ?? 0
  );
}
export function validDate(date: unknown): date is string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}
export function civilAge(date: string, birthDate: string): number {
  if (!validDate(date) || !validDate(birthDate)) throw new RangeError('Invalid life date');
  const [year, month, day] = date.split('-').map(Number);
  const [bornYear, bornMonth, bornDay] = birthDate.split('-').map(Number);
  // A February 29 birthday is observed on February 28 in a common year.
  const anniversary = Math.min(bornDay, daysInMonth(year, bornMonth));
  return Math.max(
    0,
    year - bornYear - Number(month < bornMonth || (month === bornMonth && day < anniversary)),
  );
}
export function nextLifeMonth(date: string, birthDate: string): string {
  if (!validDate(date) || !validDate(birthDate)) throw new RangeError('Invalid life date');
  const [year, month, day] = date.split('-').map(Number);
  const nextYear = year + Number(month === 12),
    nextMonth = (month % 12) + 1;
  const anchor = Math.max(day, Number(birthDate.slice(8, 10)));
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-${String(Math.min(anchor, daysInMonth(nextYear, nextMonth))).padStart(2, '0')}`;
}
