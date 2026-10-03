import type { Habit } from '../types';

export const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

/** "YYYY-MM-DD" in lokaler Zeit */
export function keyOf(d: Date): string {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** Montag bis Sonntag der Woche, in der `base` liegt */
export function weekDates(base: Date): Date[] {
  const offset = (base.getDay() + 6) % 7; // Montag = 0
  const monday = addDays(base, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** ISO-8601-Kalenderwoche der Woche, in der `d` liegt */
export function isoWeek(d: Date): number {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7)); // Donnerstag dieser Woche
  const w1 = new Date(t.getFullYear(), 0, 4);
  return 1 + Math.round(((t.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

/** Tage in Folge bis heute (oder bis gestern, falls heute noch offen ist) */
export function streak(h: Habit, today: Date): number {
  let d = new Date(today);
  if (!h.done[keyOf(d)]) d = addDays(d, -1);
  let n = 0;
  while (h.done[keyOf(d)]) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** "Sat 3. Oct" */
export function shortDate(d: Date): string {
  return WEEKDAYS_SHORT[d.getDay()] + ' ' + d.getDate() + '. ' + MONTHS_SHORT[d.getMonth()];
}

/** "3. Oct 14:55" aus einem ISO-Zeitpunkt */
export function stamp(iso: string): string {
  const d = new Date(iso);
  return d.getDate() + '. ' + MONTHS_SHORT[d.getMonth()] + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
