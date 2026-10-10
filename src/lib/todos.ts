import type { Todo } from '../types';
import { keyOf } from './dates';

export const dayOfIso = (iso: string): string => keyOf(new Date(iso));

/** Tag, für den die Aufgabe geplant ist (ältere Daten ohne `date`: offen = heute, erledigt = Tag des Abhakens) */
export function plannedDay(t: Todo, todayKey: string): string {
  if (t.date) return t.date;
  return t.completedAt ? dayOfIso(t.completedAt) : todayKey;
}

/**
 * Aufgaben, die an `dayKey` sichtbar sind.
 * Heute und früher: geplant an oder vor dem Tag und nicht schon vorher erledigt (offene Aufgaben wandern so
 * automatisch auf den nächsten Tag). Zukunft: nur was genau für den Tag geplant ist.
 */
export function todosForDay(todos: Todo[], dayKey: string, todayKey: string): { open: Todo[]; done: Todo[] } {
  const future = dayKey > todayKey;
  const open: Todo[] = [];
  const done: Todo[] = [];
  for (const t of todos) {
    const planned = plannedDay(t, todayKey);
    const completedDay = t.completedAt ? dayOfIso(t.completedAt) : null;
    const visible = future ? planned === dayKey : planned <= dayKey && (completedDay === null || completedDay >= dayKey);
    if (!visible) continue;
    const isDone = completedDay !== null && (future || completedDay <= dayKey);
    (isDone ? done : open).push(t);
  }
  done.sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!));
  return { open, done };
}

/** Tage mit Aufgaben (geplant oder erledigt), für die Punkte im Kalender */
export function markedDays(todos: Todo[], todayKey: string): Set<string> {
  const out = new Set<string>();
  for (const t of todos) {
    out.add(plannedDay(t, todayKey));
    if (t.completedAt) out.add(dayOfIso(t.completedAt));
  }
  return out;
}

export interface TodoFields {
  title: string;
  note: string;
  date: string;
  /** undefined: Inbox */
  listId?: string;
}

/** Legt eine Aufgabe an (`id` null) oder ändert sie; der Erstellungstag bleibt beim Ändern erhalten. */
export function applyFields(ts: Todo[], id: string | null, f: TodoFields, todayKey: string, newId: () => string): Todo[] {
  const note = f.note || undefined;
  if (id === null) return [...ts, { id: newId(), title: f.title, note, date: f.date, created: todayKey, listId: f.listId }];
  return ts.map((t) => (t.id === id ? { ...t, title: f.title, note, date: f.date, listId: f.listId } : t));
}
