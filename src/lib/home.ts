import type { Habit } from '../types';
import { keyOf, weekDates } from './dates';

export interface HabitSummary {
  /** Gewohnheiten, die heute abgehakt sind, und alle Gewohnheiten */
  todayDone: number;
  total: number;
  /** Haken dieser Woche (Montag bis heute) und mögliche Haken in dem Zeitraum */
  weekDone: number;
  weekPossible: number;
}

export function habitSummary(habits: Habit[], today: Date): HabitSummary {
  const todayKey = keyOf(today);
  const days = weekDates(today).filter((d) => keyOf(d) <= todayKey).map(keyOf);
  let weekDone = 0;
  for (const h of habits) for (const k of days) if (h.done[k]) weekDone++;
  return {
    todayDone: habits.filter((h) => h.done[todayKey]).length,
    total: habits.length,
    weekDone,
    weekPossible: habits.length * days.length,
  };
}

/** Prozent (0–100) oder null, wenn es nichts zu messen gibt */
export function percent(done: number, possible: number): number | null {
  return possible > 0 ? Math.round((done / possible) * 100) : null;
}
