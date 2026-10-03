export interface Habit {
  id: string;
  name: string;
  /** Erledigte Tage als Schlüssel "YYYY-MM-DD" */
  done: Record<string, true>;
}

export type Tab = 'write' | 'cal' | 'settings';
