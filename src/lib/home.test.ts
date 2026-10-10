import { describe, expect, it } from 'vitest';
import { habitSummary, percent } from './home';
import type { Habit } from '../types';

describe('habitSummary', () => {
  // Mittwoch, 7. Oktober 2026: Woche Mo 5. bis Mi 7. = 3 Tage
  const today = new Date(2026, 9, 7);
  const habits: Habit[] = [
    { id: 'a', name: 'A', done: { '2026-10-05': true, '2026-10-07': true, '2026-10-04': true } },
    { id: 'b', name: 'B', done: { '2026-10-06': true } },
  ];
  it('zählt heute und die Woche bis heute', () => {
    expect(habitSummary(habits, today)).toEqual({ todayDone: 1, total: 2, weekDone: 3, weekPossible: 6 });
  });
  it('ohne Gewohnheiten gibt es nichts zu messen', () => {
    expect(percent(0, 0)).toBeNull();
    expect(percent(3, 6)).toBe(50);
  });
});
