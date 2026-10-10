import type { Habit, Money, Note, Todo, TodoList } from '../types';
import { newId } from './id';
import { validColor } from './colors';
import { emptyMoney, parseMoney } from './money';

/** Schlüssel und Format dürfen nie ohne Migration geändert werden (siehe CLAUDE.md). */
export const STORAGE_KEY = 'habits-v1';

export function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    const out: Habit[] = [];
    for (const item of data) {
      if (!item || typeof item.name !== 'string') continue;
      const habit: Habit = {
        id: typeof item.id === 'string' && item.id ? item.id : newId(),
        name: item.name,
        done: item.done && typeof item.done === 'object' ? item.done : {},
      };
      const color = validColor(item.color);
      if (color) habit.color = color;
      out.push(habit);
    }
    return out;
  } catch {
    return [];
  }
}

export function saveHabits(habits: Habit[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch {
    /* Speicher voll oder gesperrt: still ignorieren */
  }
}

/** Eigener Schlüssel für die To-do-Liste (neues Feature, daher keine Migration nötig). */
export const TODO_KEY = 'todos-v1';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Übernimmt Notiz, geplanten Tag und Erstellungstag aus unbekannten Daten, falls gültig */
export function copyTodoExtras(src: { note?: unknown; date?: unknown; created?: unknown; listId?: unknown }, todo: Todo): void {
  if (typeof src.listId === 'string' && src.listId) todo.listId = src.listId;
  if (typeof src.note === 'string' && src.note.trim()) todo.note = src.note.trim().slice(0, 2000);
  if (typeof src.date === 'string' && DAY_RE.test(src.date)) todo.date = src.date;
  if (typeof src.created === 'string' && DAY_RE.test(src.created)) todo.created = src.created;
}

export function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(TODO_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    const out: Todo[] = [];
    for (const item of data) {
      if (!item || typeof item.title !== 'string') continue;
      const todo: Todo = { id: typeof item.id === 'string' && item.id ? item.id : newId(), title: item.title };
      if (typeof item.completedAt === 'string' && !Number.isNaN(Date.parse(item.completedAt))) todo.completedAt = item.completedAt;
      copyTodoExtras(item, todo);
      out.push(todo);
    }
    return out;
  } catch {
    return [];
  }
}

export function saveTodos(todos: Todo[]): void {
  try {
    localStorage.setItem(TODO_KEY, JSON.stringify(todos));
  } catch {
    /* Speicher voll oder gesperrt: still ignorieren */
  }
}

/** Eigener Schlüssel für die To-do-Listen (neues Feature, daher keine Migration nötig). */
export const TODO_LISTS_KEY = 'todo-lists-v1';

/** Gültige Listen aus unbekannten Daten; ungültige und doppelte Einträge fallen weg */
export function parseTodoLists(data: unknown): TodoList[] {
  if (!Array.isArray(data)) return [];
  const out: TodoList[] = [];
  const seen = new Set<string>();
  for (const item of data) {
    if (!item || typeof item.name !== 'string' || !item.name.trim()) continue;
    const id = typeof item.id === 'string' && item.id ? item.id : newId();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: item.name.trim().slice(0, 60) });
  }
  return out;
}

export function loadTodoLists(): TodoList[] {
  try {
    const raw = localStorage.getItem(TODO_LISTS_KEY);
    return parseTodoLists(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

export function saveTodoLists(lists: TodoList[]): void {
  try {
    localStorage.setItem(TODO_LISTS_KEY, JSON.stringify(lists));
  } catch {
    /* Speicher voll oder gesperrt: still ignorieren */
  }
}

/** Eigener Schlüssel für Notizen (neues Feature, daher keine Migration nötig). */
export const NOTES_KEY = 'notes-v1';

/** Gültige Notizen aus unbekannten Daten; ungültige und doppelte Einträge fallen weg */
export function parseNotes(data: unknown): Note[] {
  if (!Array.isArray(data)) return [];
  const out: Note[] = [];
  const seen = new Set<string>();
  for (const item of data) {
    if (!item || typeof item.text !== 'string') continue;
    const id = typeof item.id === 'string' && item.id ? item.id : newId();
    if (seen.has(id)) continue;
    seen.add(id);
    const updated = typeof item.updated === 'string' && !Number.isNaN(Date.parse(item.updated)) ? item.updated : new Date(0).toISOString();
    out.push({ id, text: item.text.slice(0, 50000), updated });
  }
  return out;
}

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return parseNotes(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

export function saveNotes(notes: Note[]): void {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    /* Speicher voll oder gesperrt: still ignorieren */
  }
}

/** Eigener Schlüssel für Money (neues Feature, daher keine Migration nötig). */
export const MONEY_KEY = 'money-v1';

export function loadMoney(): Money {
  try {
    const raw = localStorage.getItem(MONEY_KEY);
    return (raw ? parseMoney(JSON.parse(raw)) : null) ?? emptyMoney();
  } catch {
    return emptyMoney();
  }
}

export function saveMoney(money: Money): void {
  try {
    localStorage.setItem(MONEY_KEY, JSON.stringify(money));
  } catch {
    /* Speicher voll oder gesperrt: still ignorieren */
  }
}
