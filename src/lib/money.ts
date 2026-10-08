import type { EntryType, Money, MoneyEntry } from '../types';
import { newId } from './id';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const DEFAULT_CATEGORIES = {
  expense: ['groceries', 'food', 'social', 'health', 'mobility', 'clothing', 'insurance', 'culture', 'education', 'stocks', 'gambling', 'relationship', 'to review', 'other'],
  income: ['salary', 'return', 'gift', 'family', 'sale', 'stocks', 'gambling', 'other'],
};

export function emptyMoney(): Money {
  return {
    groups: [],
    accounts: [],
    entries: [],
    categories: { income: [...DEFAULT_CATEGORIES.income], expense: [...DEFAULT_CATEGORIES.expense] },
  };
}

function strList(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return [...fallback];
  const out = raw.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim().slice(0, 30));
  return [...new Set(out)];
}

const isCents = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n);

/** Prüft und bereinigt Money-Daten (aus localStorage oder Sicherung). Ungültige Teile fallen weg. */
export function parseMoney(raw: unknown): Money | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const money = emptyMoney();
  const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

  for (const g of arr(r.groups) as { id?: unknown; name?: unknown }[]) {
    if (!g || typeof g.name !== 'string' || !g.name.trim()) continue;
    money.groups.push({ id: typeof g.id === 'string' && g.id ? g.id : newId(), name: g.name.trim().slice(0, 40) });
  }
  const groupIds = new Set(money.groups.map((g) => g.id));
  for (const a of arr(r.accounts) as { id?: unknown; groupId?: unknown; name?: unknown; start?: unknown }[]) {
    if (!a || typeof a.name !== 'string' || !a.name.trim() || typeof a.groupId !== 'string' || !groupIds.has(a.groupId)) continue;
    money.accounts.push({
      id: typeof a.id === 'string' && a.id ? a.id : newId(),
      groupId: a.groupId,
      name: a.name.trim().slice(0, 40),
      start: isCents(a.start) ? a.start : 0,
    });
  }
  const accountIds = new Set(money.accounts.map((a) => a.id));
  for (const e of arr(r.entries) as Record<string, unknown>[]) {
    if (!e || typeof e !== 'object') continue;
    const type = e.type;
    if (type !== 'income' && type !== 'expense' && type !== 'transfer') continue;
    if (typeof e.date !== 'string' || !DATE_RE.test(e.date)) continue;
    if (typeof e.accountId !== 'string' || !accountIds.has(e.accountId)) continue;
    if (!isCents(e.amount) || e.amount <= 0) continue;
    const entry: MoneyEntry = {
      id: typeof e.id === 'string' && e.id ? e.id : newId(),
      type,
      date: e.date,
      accountId: e.accountId,
      amount: e.amount,
    };
    if (type === 'transfer') {
      if (typeof e.toAccountId !== 'string' || !accountIds.has(e.toAccountId) || e.toAccountId === e.accountId) continue;
      entry.toAccountId = e.toAccountId;
    } else if (typeof e.category === 'string' && e.category.trim()) {
      entry.category = e.category.trim().slice(0, 30);
    }
    if (typeof e.note === 'string' && e.note.trim()) entry.note = e.note.trim().slice(0, 100);
    money.entries.push(entry);
  }
  const cats = r.categories && typeof r.categories === 'object' ? (r.categories as Record<string, unknown>) : {};
  money.categories = {
    income: strList(cats.income, DEFAULT_CATEGORIES.income),
    expense: strList(cats.expense, DEFAULT_CATEGORIES.expense),
  };
  return money;
}

/** Änderung eines Kontos durch einen Eintrag (in Cent) */
function effect(e: MoneyEntry, accountId: string): number {
  if (e.type === 'income') return e.accountId === accountId ? e.amount : 0;
  if (e.type === 'expense') return e.accountId === accountId ? -e.amount : 0;
  return (e.toAccountId === accountId ? e.amount : 0) - (e.accountId === accountId ? e.amount : 0);
}

export function accountBalance(m: Money, accountId: string): number {
  const acc = m.accounts.find((a) => a.id === accountId);
  return m.entries.reduce((sum, e) => sum + effect(e, accountId), acc ? acc.start : 0);
}

export function groupTotal(m: Money, groupId: string): number {
  return m.accounts.filter((a) => a.groupId === groupId).reduce((s, a) => s + accountBalance(m, a.id), 0);
}

/** Assets: Summe der positiven Kontostände, Liabilities: Summe der negativen */
export function totals(m: Money): { assets: number; liabilities: number; total: number } {
  let assets = 0;
  let liabilities = 0;
  for (const a of m.accounts) {
    const b = accountBalance(m, a.id);
    if (b >= 0) assets += b;
    else liabilities += b;
  }
  return { assets, liabilities, total: assets + liabilities };
}

/** Wirkung eines Eintrags auf ein bestimmtes Konto (für die Kontoansicht) */
export function entryEffect(e: MoneyEntry, accountId: string): number {
  return effect(e, accountId);
}

/** 105760 -> "1.057,60" */
export function formatNumber(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const frac = String(abs % 100).padStart(2, '0');
  return (cents < 0 ? '-' : '') + whole + ',' + frac;
}

/** 105760 -> "€ 1.057,60" */
export function formatMoney(cents: number): string {
  return '€ ' + formatNumber(cents);
}

/** "12,5" / "12.50" / "1.234,56" -> Cent; ungültig oder 0 -> null */
export function parseAmount(text: string): number | null {
  let t = text.trim().replace(/\s|€/g, '');
  if (!t) return null;
  if (t.includes(',') || /^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); // deutsches Format (1.234,56 oder 1.000)
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const cents = Math.round(parseFloat(t) * 100);
  return cents > 0 && cents <= 1e11 ? cents : null;
}

export function typeLabel(t: EntryType): string {
  return t === 'income' ? 'Income' : t === 'expense' ? 'Expense' : 'Transfer';
}
