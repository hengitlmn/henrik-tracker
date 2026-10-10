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
  /** Notiz, optional */
  note?: string;
  /** Geplanter Tag "YYYY-MM-DD"; ohne Angabe (ältere Daten) gilt: offen = heute, erledigt = Tag des Abhakens */
  date?: string;
  /** Erstellungstag "YYYY-MM-DD", bleibt beim Verschieben unverändert */
  created?: string;
  /** Liste, zu der die Aufgabe gehört; ohne Angabe gehört sie zu keiner Liste */
  listId?: string;
}

export interface TodoList {
  id: string;
  name: string;
}

export type TodoSection = 'todos' | 'lists' | 'upcoming';

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

/** Monatsbudget für eine Ausgaben-Kategorie (Cent) */
export interface MoneyBudget {
  category: string;
  limit: number;
}

export interface Money {
  groups: MoneyGroup[];
  accounts: MoneyAccount[];
  entries: MoneyEntry[];
  categories: { income: string[]; expense: string[] };
  budgets: MoneyBudget[];
}
