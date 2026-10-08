import type { Money, MoneyEntry } from '../types';
import { MONTHS_EN, WEEKDAYS_EN, WEEKDAYS_SHORT, addDays, keyOf, pad, parseKey } from './dates';
import { formatNumber, typeLabel } from './money';

export const NO_CATEGORY = 'no category';

export function monthPrefix(y: number, m0: number): string {
  return y + '-' + pad(m0 + 1);
}

export function entriesOfMonth(m: Money, y: number, m0: number): MoneyEntry[] {
  const prefix = monthPrefix(y, m0);
  return m.entries.filter((e) => e.date.startsWith(prefix));
}

/** Einnahmen und Ausgaben (Überweisungen zählen nicht) */
export function incomeExpense(entries: MoneyEntry[]): { income: number; expense: number } {
  let income = 0;
  let expense = 0;
  for (const e of entries) {
    if (e.type === 'income') income += e.amount;
    else if (e.type === 'expense') expense += e.amount;
  }
  return { income, expense };
}

/** Ausgaben je Kategorie, größte zuerst */
export function spendingByCategory(entries: MoneyEntry[]): { category: string; amount: number }[] {
  const sums = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== 'expense') continue;
    const c = e.category || NO_CATEGORY;
    sums.set(c, (sums.get(c) ?? 0) + e.amount);
  }
  return [...sums.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

/** Die letzten n Monate bis einschließlich y/m0 (älteste zuerst) */
export function lastMonths(m: Money, y: number, m0: number, n = 6): { y: number; m: number; income: number; expense: number }[] {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m0 - i, 1);
    out.push({ y: d.getFullYear(), m: d.getMonth(), ...incomeExpense(entriesOfMonth(m, d.getFullYear(), d.getMonth())) });
  }
  return out;
}

/** Text, in dem die Suche (nach Begriffen und Tagen) nachschaut, alles klein geschrieben */
export function haystack(e: MoneyEntry, m: Money): string {
  const name = (id?: string) => m.accounts.find((a) => a.id === id)?.name ?? '';
  const d = parseKey(e.date);
  const day = d.getDate();
  const mon = d.getMonth() + 1;
  const dayStr = [
    e.date,
    day + '.' + mon + '.' + d.getFullYear(),
    pad(day) + '.' + pad(mon) + '.' + d.getFullYear(),
    day + '.' + mon + '.',
    pad(day) + '.' + pad(mon) + '.',
    WEEKDAYS_SHORT[d.getDay()],
    WEEKDAYS_EN[d.getDay()],
    MONTHS_EN[d.getMonth()],
    MONTHS_EN[d.getMonth()].slice(0, 3),
  ];
  return [
    e.note ?? '',
    e.category ?? '',
    name(e.accountId),
    name(e.toAccountId),
    typeLabel(e.type),
    formatNumber(e.amount),
    (e.amount / 100).toFixed(2),
    ...dayStr,
  ].join(' | ').toLowerCase();
}

/** Alle Suchwörter müssen vorkommen (Groß-/Kleinschreibung egal) */
export function matchesQuery(e: MoneyEntry, m: Money, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const hay = haystack(e, m);
  return tokens.every((t) => hay.includes(t));
}

export type Period = 'day' | 'week' | 'month' | 'ytd' | 'year';

/** Reihenfolge beim Antippen in der Kontenübersicht */
export const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Last day' },
  { id: 'week', label: 'Last week' },
  { id: 'month', label: 'Last month' },
  { id: 'ytd', label: 'Year to date' },
  { id: 'year', label: 'Last year' },
];

/** Erster Tag des Zeitraums (inklusive); gerechnet wird rückwärts ab heute: 1, 7, 30 oder 365 Tage, bzw. seit 1. Januar */
export function periodStart(period: Period, today: Date): string {
  if (period === 'ytd') return today.getFullYear() + '-01-01';
  const days = { day: 1, week: 7, month: 30, year: 365 }[period];
  return keyOf(addDays(today, -(days - 1)));
}

/** Summe aller Einnahmen (+) und Ausgaben (−) im Zeitraum; Überweisungen zählen nicht */
export function netSince(m: Money, period: Period, today: Date): number {
  const from = periodStart(period, today);
  const to = keyOf(today);
  const { income, expense } = incomeExpense(m.entries.filter((e) => e.date >= from && e.date <= to));
  return income - expense;
}
