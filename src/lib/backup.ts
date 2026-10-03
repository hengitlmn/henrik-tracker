import type { Habit } from '../types';
import { keyOf } from './dates';
import { newId } from './id';

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
    const h = arr[i] as { id?: unknown; name?: unknown; done?: unknown } | null;
    if (!h || typeof h.name !== 'string' || !h.name.trim()) return null;
    const done: Record<string, true> = {};
    const src = h.done && typeof h.done === 'object' ? (h.done as Record<string, unknown>) : {};
    for (const k of Object.keys(src)) {
      if (DATE_RE.test(k) && src[k]) done[k] = true;
    }
    out.push({
      id: typeof h.id === 'string' && h.id ? h.id : newId() + i,
      name: h.name.trim().slice(0, 60),
      done,
    });
  }
  return out;
}

/** In die Zwischenablage kopieren. Gibt false zurück, wenn es nicht geklappt hat. */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* weiter mit Fallback */
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px;';
    document.body.appendChild(ta);
    ta.select();
    const ok = typeof document.execCommand === 'function' && document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch {
    return false;
  }
}
