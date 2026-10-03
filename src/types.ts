export interface Habit {
  id: string;
  name: string;
  /** Erledigte Tage als Schlüssel "YYYY-MM-DD" */
  done: Record<string, true>;
  /** Farbe der abgehakten Kreise als "#RRGGBB"; ohne Angabe gilt der Akzent */
  color?: string;
}

export type Tab = 'profile' | 'todo' | 'cal' | 'stats' | 'settings';
