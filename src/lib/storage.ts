import type { Habit, Money, Todo } from '../types';
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
