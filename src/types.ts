export interface Habit {
  id: string;
  name: string;
  /** Erledigte Tage als Schlüssel "YYYY-MM-DD" */
  done: Record<string, true>;
  /** Farbe der abgehakten Kreise als "#RRGGBB"; ohne Angabe gilt der Akzent */
  color?: string;
}

export interface Todo {
  id: string;
  title: string;
  /** ISO-Zeitpunkt des Abhakens; ohne Angabe ist die Aufgabe offen */
  completedAt?: string;
}

export type Tab = 'todo' | 'money' | 'cal' | 'gym' | 'notes';
