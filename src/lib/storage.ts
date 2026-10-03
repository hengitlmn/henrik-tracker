import type { Habit } from '../types';
import { newId } from './id';
import { validColor } from './colors';

/** Schlüssel und Format dürfen nie ohne Migration geändert werden (siehe CLAUDE.md). */
export const STORAGE_KEY = 'habits-v1';

export function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    const out: Habit[] = [];
    for (const item of data) {
      if (!item || typeof item.name !== 'string') continue;
      const habit: Habit = {
        id: typeof item.id === 'string' && item.id ? item.id : newId(),
        name: item.name,
        done: item.done && typeof item.done === 'object' ? item.done : {},
      };
      const color = validColor(item.color);
      if (color) habit.color = color;
      out.push(habit);
    }
    return out;
  } catch {
    return [];
  }
}

export function saveHabits(habits: Habit[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch {
    /* Speicher voll oder gesperrt: still ignorieren */
  }
}
