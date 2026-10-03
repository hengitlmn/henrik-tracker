import type { Habit } from '../types';
import { keyOf } from './dates';
import { newId } from './id';
import { validColor } from './colors';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function exportText(habits: Habit[]): string {
  return JSON.stringify({ app: 'habits', version: 1, exported: new Date().toISOString(), habits });
}

export function backupFileName(now = new Date()): string {
  return 'habits-backup-' + keyOf(now) + '.json';
}

/** Akzeptiert das Format { habits: [...] } und ältere Sicherungen (reines Array). */
export function parseBackup(text: string): Habit[] | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const arr = Array.isArray(data)
    ? data
    : data && Array.isArray((data as { habits?: unknown }).habits)
      ? (data as { habits: unknown[] }).habits
      : null;
  if (!arr) return null;

  const out: Habit[] = [];
  for (let i = 0; i < arr.length; i++) {
    const h = arr[i] as { id?: unknown; name?: unknown; done?: unknown; color?: unknown } | null;
    if (!h || typeof h.name !== 'string' || !h.name.trim()) return null;
    const done: Record<string, true> = {};
    const src = h.done && typeof h.done === 'object' ? (h.done as Record<string, unknown>) : {};
    for (const k of Object.keys(src)) {
      if (DATE_RE.test(k) && src[k]) done[k] = true;
    }
    const habit: Habit = {
      id: typeof h.id === 'string' && h.id ? h.id : newId() + i,
      name: h.name.trim().slice(0, 60),
      done,
    };
    const color = validColor(h.color);
    if (color) habit.color = color;
    out.push(habit);
  }
  return out;
}
