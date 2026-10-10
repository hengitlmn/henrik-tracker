import type { Note } from '../types';
import { MONTHS_SHORT, keyOf, pad } from './dates';

const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

/** Erste nicht leere Zeile; leere Notiz: "New note" */
export function noteTitle(text: string): string {
  return lines(text)[0] ?? 'New note';
}

/** Zweite nicht leere Zeile als Vorschau (oder "No additional text") */
export function notePreview(text: string): string {
  return lines(text)[1] ?? 'No additional text';
}

/** Zuletzt geänderte zuerst */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => Date.parse(b.updated) - Date.parse(a.updated));
}

/** Heute: "14:55", sonst "3. Oct" (anderes Jahr: "3. Oct 2025") */
export function noteDate(iso: string, now: Date): string {
  const d = new Date(iso);
  if (keyOf(d) === keyOf(now)) return pad(d.getHours()) + ':' + pad(d.getMinutes());
  const base = d.getDate() + '. ' + MONTHS_SHORT[d.getMonth()];
  return d.getFullYear() === now.getFullYear() ? base : base + ' ' + d.getFullYear();
}

/** Alle Wörter müssen im Text vorkommen */
export function noteMatches(text: string, query: string): boolean {
  const hay = text.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
