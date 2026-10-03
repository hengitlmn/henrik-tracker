import { describe, expect, it } from 'vitest';
import { addDays, isoWeek, keyOf, parseKey, streak, weekDates } from './dates';
import type { Habit } from '../types';

describe('dates', () => {
  it('keyOf und parseKey sind zueinander passend', () => {
    expect(keyOf(new Date(2026, 9, 3))).toBe('2026-10-03');
    expect(keyOf(parseKey('2026-01-09'))).toBe('2026-01-09');
  });

  it('weekDates liefert Montag bis Sonntag', () => {
    const w = weekDates(new Date(2026, 9, 3)); // Samstag
    expect(w.map((d) => keyOf(d))).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ]);
    expect(weekDates(new Date(2026, 9, 4))[0]).toEqual(new Date(2026, 8, 28)); // Sonntag gehört zur Woche davor
  });

  it('isoWeek zählt nach ISO 8601', () => {
    expect(isoWeek(new Date(2026, 9, 3))).toBe(40);
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1);   // Do, 1.1.2026
    expect(isoWeek(new Date(2027, 0, 1))).toBe(53);  // Fr, 1.1.2027 gehört zu KW 53 von 2026
    expect(isoWeek(new Date(2024, 11, 30))).toBe(1); // Mo, 30.12.2024 gehört zu KW 1 von 2025
  });

  it('streak zählt bis heute oder bis gestern', () => {
    const today = new Date(2026, 9, 3);
    const h = (days: string[]): Habit => ({ id: 'a', name: 'x', done: Object.fromEntries(days.map((d) => [d, true])) });
    expect(streak(h([]), today)).toBe(0);
    expect(streak(h(['2026-10-03', '2026-10-02']), today)).toBe(2);
    expect(streak(h(['2026-10-02', '2026-10-01']), today)).toBe(2); // heute noch offen
    expect(streak(h(['2026-10-01']), today)).toBe(0);               // gestern fehlt
    expect(streak(h([keyOf(addDays(today, -1))]), today)).toBe(1);
  });
});
