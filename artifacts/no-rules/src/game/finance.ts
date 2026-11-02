import { isolateName } from './event-text';
import profiles from '../../data/life-profiles.json';
import type { Life } from './domain';
import type { SimulationState } from './causal-state';
export type Account = 'cash' | 'savings' | 'debt' | 'family';
export type Transaction = {
  id: string;
  date: string;
  account: Account;
  amount: number;
  reason: string;
  kind: 'opening' | 'salary' | 'living' | 'transfer' | 'decision' | 'gift';
  sourceEventId?: string;
};
export type FinanceState = {
  currency: string;
  unitScale: number;
  family: number;
  sequence: number;
  entries: Transaction[];
};
export function ensureFinance(life: Life, s: SimulationState): FinanceState {
  if (s.finance) return s.finance;
  const code =
    (profiles.countries as Record<string, { currency: string }>)[s.world.countryCode]?.currency ??
    'XTS';
  const scale = ['JPY', 'KRW', 'VND', 'XOF', 'XAF', 'RWF', 'CLP'].includes(code) ? 100 : 10;
  s.finance = {
    currency: code,
    unitScale: scale,
    family: life.age < 18 ? s.world.costOfLiving * 3 : 0,
    sequence: 0,
    entries: [],
  };
  for (const account of ['cash', 'savings', 'debt', 'family'] as const) {
    const amount = account === 'family' ? s.finance.family : s.person.money[account];
    s.finance.entries.push({
      id: `opening-${account}`,
      date: life.currentDate,
      account,
      amount,
      kind: 'opening',
      reason:
        'Начальный остаток при подключении финансовой истории; прежние доходы не восстанавливаются.',
    });
  }
  return s.finance;
}
export function transact(
  life: Life,
  s: SimulationState,
  account: Account,
  amount: number,
  reason: string,
  kind: Transaction['kind'],
  sourceEventId?: string,
) {
  if (!Number.isFinite(amount)) throw Error('Invalid transaction');
  const f = ensureFinance(life, s);
  const before = account === 'family' ? f.family : s.person.money[account];
  const after = Math.max(0, Math.round((before + amount) * 100) / 100);
  const actual = Math.round((after - before) * 100) / 100;
  if (account === 'family') f.family = after;
  else s.person.money[account] = after;
  if (actual)
    f.entries.push({
      id: `tx-${++f.sequence}`,
      date: life.currentDate,
      account,
      amount: actual,
      reason,
      kind,
      ...(sourceEventId ? { sourceEventId } : {}),
    });
}
export function monthlyBudget(life: Life, s: SimulationState) {
  const f = ensureFinance(life, s),
    p = s.person;
  if (life.age < 18) {
    transact(
      life,
      s,
      'family',
      s.world.wage * 1.5,
      'Семейные поступления по модели достатка',
      'salary',
    );
    transact(life, s, 'family', -s.world.costOfLiving * 1.3, 'Семейные бытовые расходы', 'living');
    if (life.age >= 12) {
      const amount = Math.min(
        f.family,
        s.world.wage *
          0.03 *
          (life.conditions.className === 'Рабочая семья'
            ? 0.5
            : life.conditions.className === 'Уверенный достаток'
              ? 1.7
              : 1),
      );
      transact(life, s, 'family', -amount, 'Карманные деньги: перевод ребёнку', 'transfer');
      transact(life, s, 'cash', amount, 'Карманные деньги от семьи', 'transfer');
    }
    return;
  }
  p.money.lastIncome = p.job.income;
  p.money.lastExpenses = p.money.expenses;
  transact(
    life,
    s,
    'cash',
    p.job.income,
    `Доход: ${p.job.title}${p.job.employer ? ' · ' + p.job.employer : ''}`,
    'salary',
  );
  const paid = Math.min(p.money.cash, p.money.expenses);
  transact(life, s, 'cash', -paid, 'Бытовой бюджет: жильё, питание и транспорт', 'living');
  if (paid < p.money.expenses)
    transact(
      life,
      s,
      'debt',
      p.money.expenses - paid,
      'Неоплаченная часть бытового бюджета',
      'living',
    );
}
export function formatMoney(life: Life, units: number): string {
  const f = life.simulation?.finance;
  const code =
    f?.currency ??
    (profiles.countries as Record<string, { currency: string }>)[
      life.location.birthplace?.countryCode ?? ''
    ]?.currency ??
    'XTS';
  const scale =
    f?.unitScale ?? (['JPY', 'KRW', 'VND', 'XOF', 'XAF', 'RWF', 'CLP'].includes(code) ? 100 : 10);
  if (code === 'XTS') return `${Math.round(units)} игровых ед.`;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(units * scale);
}
export function moneyText(life: Life, text: string) {
  return text.replace(/(\d+(?:\.\d+)?)\s*(?:усл\. ед\.|у\.е\.)/g, (_, value) =>
    formatMoney(life, Number(value)),
  );
}
export function reconcile(s: SimulationState): boolean {
  if (!s.finance) return true;
  return (['cash', 'savings', 'debt', 'family'] as const).every(
    (account) =>
      Math.abs(
        s
          .finance!.entries.filter((t) => t.account === account)
          .reduce((sum, t) => sum + t.amount, 0) -
          (account === 'family' ? s.finance!.family : s.person.money[account]),
      ) < 0.02,
  );
}

export function birthdayGift(life: Life, s: SimulationState, eventId: string): string {
  if (life.age < 3 || life.age >= 18) return '';
  const donor =
    life.family.find((p) => p.relationship === 'Мама') ??
    life.family.find((p) => p.relationship === 'Папа');
  if (!donor) return '';
  const f = ensureFinance(life, s),
    amount = Math.min(f.family, Math.round(s.world.wage * 0.04 * 100) / 100);
  if (amount <= 0) return '';
  const reason = `Подарок ко дню рождения: ${donor.relationship} — ${isolateName(donor.name)}`;
  transact(life, s, 'family', -amount, reason, 'gift', eventId);
  transact(life, s, 'cash', amount, reason, 'gift', eventId);
  return ` ${donor.relationship} — ${isolateName(donor.name)}: подарок ${amount} усл. ед. из семейных средств.`;
}
