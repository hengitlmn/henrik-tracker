import { describe, expect, it } from 'vitest';
import type { Money } from '../types';
import { emptyMoney, newestFirst, parseMoney } from './money';
import { entriesOfMonth, incomeExpense, lastMonths, matchesQuery, spendingByCategory } from './stats';

const money: Money = {
  ...emptyMoney(),
  groups: [{ id: 'g', name: 'G' }],
  accounts: [
    { id: 'a', groupId: 'g', name: 'Cash', start: 0 },
    { id: 'b', groupId: 'g', name: 'Bank', start: 0 },
  ],
  entries: [
    { id: '1', type: 'expense', date: '2026-10-08', accountId: 'a', amount: 1250, category: 'food', note: 'Lunch with Anna' },
    { id: '2', type: 'income', date: '2026-10-01', accountId: 'b', amount: 200000, category: 'salary' },
    { id: '3', type: 'expense', date: '2026-09-15', accountId: 'a', amount: 5000, category: 'health' },
    { id: '4', type: 'transfer', date: '2026-10-08', accountId: 'a', toAccountId: 'b', amount: 3000 },
    { id: '5', type: 'expense', date: '2026-10-08', accountId: 'a', amount: 750 },
  ],
};

describe('stats', () => {
  it('rechnet Einnahmen und Ausgaben eines Monats ohne Überweisungen', () => {
    expect(incomeExpense(entriesOfMonth(money, 2026, 9))).toEqual({ income: 200000, expense: 2000 });
    expect(incomeExpense(entriesOfMonth(money, 2026, 8))).toEqual({ income: 0, expense: 5000 });
  });

  it('gruppiert Ausgaben nach Kategorie, größte zuerst, ohne Kategorie extra', () => {
    expect(spendingByCategory(entriesOfMonth(money, 2026, 9))).toEqual([
      { category: 'food', amount: 1250 },
      { category: 'no category', amount: 750 },
    ]);
  });

  it('liefert die letzten Monate, älteste zuerst', () => {
    const h = lastMonths(money, 2026, 9, 3);
    expect(h.map((x) => [x.m, x.income, x.expense])).toEqual([[7, 0, 0], [8, 0, 5000], [9, 200000, 2000]]);
  });

  it('sortiert neueste zuerst, bei gleichem Tag der später angelegte zuerst', () => {
    expect(newestFirst(money.entries).map((e) => e.id)).toEqual(['5', '4', '1', '2', '3']);
  });

  it('sucht nach Begriffen und Tagen, alle Wörter müssen passen', () => {
    const hit = (q: string) => money.entries.filter((e) => matchesQuery(e, money, q)).map((e) => e.id);
    expect(hit('')).toHaveLength(5);
    expect(hit('anna')).toEqual(['1']);
    expect(hit('SALARY')).toEqual(['2']);
    expect(hit('bank')).toEqual(['2', '4']); // Konto (auch Ziel einer Überweisung)
    expect(hit('08.10.')).toEqual(['1', '4', '5']);
    expect(hit('8.10.2026')).toEqual(['1', '4', '5']);
    expect(hit('2026-09')).toEqual(['3']);
    expect(hit('thu')).toEqual(['1', '2', '4', '5']); // Wochentag
    expect(hit('september')).toEqual(['3']);
    expect(hit('12,50')).toEqual(['1']);
    expect(hit('food anna')).toEqual(['1']);
    expect(hit('food salary')).toEqual([]);
    expect(hit('transfer')).toEqual(['4']);
  });

  it('Budgets: gültig, einmalig je Kategorie, ungültige fallen weg', () => {
    const m = parseMoney({ budgets: [{ category: 'food', limit: 20000 }, { category: 'food', limit: 5 }, { category: '', limit: 1 }, { category: 'x', limit: -1 }] })!;
    expect(m.budgets).toEqual([{ category: 'food', limit: 20000 }]);
    expect(parseMoney({})!.budgets).toEqual([]);
  });
});
