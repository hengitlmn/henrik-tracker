import type { Habit, Money, Note, Todo, TodoList } from '../types';
import { keyOf } from './dates';
import { newId } from './id';
import { validColor } from './colors';
import { parseMoney } from './money';
import { copyTodoExtras, parseNotes, parseTodoLists } from './storage';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function exportText(habits: Habit[], todos: Todo[] = [], money?: Money, todoLists?: TodoList[], notes?: Note[]): string {
  return JSON.stringify({
    app: 'habits', version: 1, exported: new Date().toISOString(), habits, todos,
    ...(todoLists ? { todoLists } : {}), ...(notes ? { notes } : {}), ...(money ? { money } : {}),
  });
}

export interface ParsedBackup {
  habits: Habit[];
  /** null: die Sicherung enthält keine To-dos (ältere Datei), dann bleiben die aktuellen erhalten */
  todos: Todo[] | null;
  /** null: die Sicherung enthält kein Money (ältere Datei), dann bleibt Money unverändert */
  money: Money | null;
  /** null: die Sicherung enthält keine Listen (ältere Datei), dann bleiben die aktuellen erhalten */
  todoLists: TodoList[] | null;
  /** null: die Sicherung enthält keine Notizen (ältere Datei), dann bleiben die aktuellen erhalten */
  notes: Note[] | null;
}

function parseTodos(raw: unknown): Todo[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Todo[] = [];
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i] as { id?: unknown; title?: unknown; completedAt?: unknown; note?: unknown; date?: unknown; created?: unknown; listId?: unknown } | null;
    if (!t || typeof t.title !== 'string' || !t.title.trim()) return null;
    const todo: Todo = {
      id: typeof t.id === 'string' && t.id ? t.id : newId() + i,
      title: t.title.trim().slice(0, 200),
    };
    if (typeof t.completedAt === 'string' && !Number.isNaN(Date.parse(t.completedAt))) todo.completedAt = t.completedAt;
    copyTodoExtras(t, todo);
    out.push(todo);
  }
  return out;
}

export function backupFileName(now = new Date()): string {
  return 'habits-backup-' + keyOf(now) + '.json';
}

/** Akzeptiert das Format { habits: [...] } und ältere Sicherungen (reines Array). */
export function parseBackup(text: string): ParsedBackup | null {
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
    const h = arr[i] as { id?: unknown; name?: unknown; done?: unknown; color?: unknown } | null;
    if (!h || typeof h.name !== 'string' || !h.name.trim()) return null;
    const done: Record<string, true> = {};
    const src = h.done && typeof h.done === 'object' ? (h.done as Record<string, unknown>) : {};
    for (const k of Object.keys(src)) {
      if (DATE_RE.test(k) && src[k]) done[k] = true;
    }
    const habit: Habit = {
      id: typeof h.id === 'string' && h.id ? h.id : newId() + i,
      name: h.name.trim().slice(0, 60),
      done,
    };
    const color = validColor(h.color);
    if (color) habit.color = color;
    out.push(habit);
  }
  // To-dos sind optional (ältere Sicherungen und das reine Array-Format haben keine)
  let todos: Todo[] | null = null;
  if (!Array.isArray(data) && data && (data as { todos?: unknown }).todos !== undefined) {
    todos = parseTodos((data as { todos?: unknown }).todos);
    if (todos === null) return null;
  }
  // Money ist optional (ältere Sicherungen haben es nicht)
  let money: Money | null = null;
  if (!Array.isArray(data) && data && (data as { money?: unknown }).money !== undefined) {
    money = parseMoney((data as { money?: unknown }).money);
    if (money === null) return null;
  }
  const rawLists = !Array.isArray(data) && data ? (data as { todoLists?: unknown }).todoLists : undefined;
  const todoLists = Array.isArray(rawLists) ? parseTodoLists(rawLists) : null;
  const rawNotes = !Array.isArray(data) && data ? (data as { notes?: unknown }).notes : undefined;
  const notes = Array.isArray(rawNotes) ? parseNotes(rawNotes) : null;
  return { habits: out, todos, money, todoLists, notes };
}
