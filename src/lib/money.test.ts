import { describe, expect, it } from 'vitest';
import { accountBalance, emptyMoney, formatMoney, parseAmount, parseMoney, totals } from './money';

describe('money', () => {
  it('formatiert Cent deutsch', () => {
    expect(formatMoney(105760)).toBe('€ 1.057,60');
    expect(formatMoney(5)).toBe('€ 0,05');
    expect(formatMoney(-250000)).toBe('€ -2.500,00');
  });

  it('liest Beträge in deutscher und englischer Schreibweise', () => {
    expect(parseAmount('12,5')).toBe(1250);
    expect(parseAmount('12.50')).toBe(1250);
    expect(parseAmount('1.234,56')).toBe(123456);
    expect(parseAmount('1.000')).toBe(100000);
    expect(parseAmount(' € 7 ')).toBe(700);
    for (const bad of ['', 'abc', '0', '-5', '1,234', '1,2,3']) expect(parseAmount(bad)).toBeNull();
  });

  it('rechnet Kontostände mit Start, Einnahmen, Ausgaben und Überweisungen', () => {
    const m = parseMoney({
      groups: [{ id: 'g', name: 'G' }],
      accounts: [
        { id: 'a', groupId: 'g', name: 'A', start: 1000 },
        { id: 'b', groupId: 'g', name: 'B', start: 0 },
      ],
      entries: [
        { id: '1', type: 'income', date: '2026-10-01', accountId: 'a', amount: 500 },
        { id: '2', type: 'expense', date: '2026-10-02', accountId: 'a', amount: 2000 },
        { id: '3', type: 'transfer', date: '2026-10-03', accountId: 'a', toAccountId: 'b', amount: 300 },
      ],
    })!;
    expect(accountBalance(m, 'a')).toBe(1000 + 500 - 2000 - 300);
    expect(accountBalance(m, 'b')).toBe(300);
    expect(totals(m)).toEqual({ assets: 300, liabilities: -800, total: -500 });
  });

  it('verwirft ungültige Teile statt abzustürzen', () => {
    const m = parseMoney({
      groups: [{ id: 'g', name: 'G' }, { name: '' }],
      accounts: [{ id: 'a', groupId: 'x', name: 'Orphan' }, { id: 'b', groupId: 'g', name: 'B', start: 1.5 }],
      entries: [
        { type: 'income', date: 'kaputt', accountId: 'b', amount: 1 },
        { type: 'transfer', date: '2026-01-01', accountId: 'b', toAccountId: 'b', amount: 1 },
        { type: 'expense', date: '2026-01-01', accountId: 'b', amount: -3 },
        { type: 'expense', date: '2026-01-01', accountId: 'b', amount: 3, category: 'food' },
      ],
    })!;
    expect(m.groups).toHaveLength(1);
    expect(m.accounts.map((a) => [a.name, a.start])).toEqual([['B', 0]]);
    expect(m.entries).toHaveLength(1);
    expect(parseMoney('x')).toBeNull();
    expect(parseMoney({})!.categories.expense).toContain('groceries');
    expect(emptyMoney().entries).toEqual([]);
  });
});
