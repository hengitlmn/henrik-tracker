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

export type MoneySection = 'accounts' | 'stats' | 'calendar';

export type Tab = 'todo' | 'money' | 'cal' | 'gym' | 'notes';

/** Money: alle Beträge in Cent (ganze Zahlen) */
export type EntryType = 'income' | 'expense' | 'transfer';

export interface MoneyGroup {
  id: string;
  name: string;
}

export interface MoneyAccount {
  id: string;
  groupId: string;
  name: string;
  /** Startguthaben in Cent (kann negativ sein) */
  start: number;
}

export interface MoneyEntry {
  id: string;
  type: EntryType;
  /** "YYYY-MM-DD" */
  date: string;
  /** Konto, bei Überweisungen das Quellkonto */
  accountId: string;
  /** nur bei Überweisungen: Zielkonto */
  toAccountId?: string;
  category?: string;
  /** immer positiv, in Cent */
  amount: number;
  note?: string;
}

export interface Money {
  groups: MoneyGroup[];
  accounts: MoneyAccount[];
  entries: MoneyEntry[];
  categories: { income: string[]; expense: string[] };
}
