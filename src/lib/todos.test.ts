import { describe, expect, it } from 'vitest';
import { markedDays, plannedDay, todosForDay } from './todos';
import type { Todo } from '../types';

const T = '2026-10-10';
const at = (day: string) => day + 'T12:00:00';

describe('todosForDay', () => {
  const todos: Todo[] = [
    { id: 'a', title: 'carried', date: '2026-10-08' },
    { id: 'b', title: 'done on 9th', date: '2026-10-08', completedAt: new Date(at('2026-10-09')).toISOString() },
    { id: 'c', title: 'tomorrow', date: '2026-10-11' },
    { id: 'd', title: 'legacy open' },
  ];
  const ids = (l: Todo[]) => l.map((t) => t.id);

  it('heute: offene Aufgaben mit früherem Tag wandern mit, früher Erledigtes nicht', () => {
    const r = todosForDay(todos, T, T);
    expect(ids(r.open)).toEqual(['a', 'd']);
    expect(ids(r.done)).toEqual([]);
  });

  it('vergangener Tag: zeigt, was offen war und was erledigt wurde', () => {
    const r = todosForDay(todos, '2026-10-09', T);
    expect(ids(r.open)).toEqual(['a']);
    expect(ids(r.done)).toEqual(['b']);
    const r8 = todosForDay(todos, '2026-10-08', T);
    expect(ids(r8.open)).toEqual(['a', 'b']); // b war am 8. noch offen
    expect(todosForDay(todos, '2026-10-07', T).open).toEqual([]);
  });

  it('Zukunft: nur was genau für den Tag geplant ist', () => {
    expect(ids(todosForDay(todos, '2026-10-11', T).open)).toEqual(['c']);
    expect(todosForDay(todos, '2026-10-12', T).open).toEqual([]);
  });
});

describe('plannedDay / markedDays', () => {
  it('ältere Aufgaben ohne Datum: offen = heute, erledigt = Tag des Abhakens', () => {
    expect(plannedDay({ id: 'x', title: 'x' }, T)).toBe(T);
    expect(plannedDay({ id: 'x', title: 'x', completedAt: new Date(at('2026-10-05')).toISOString() }, T)).toBe('2026-10-05');
  });
  it('markiert geplante und erledigte Tage', () => {
    const m = markedDays([{ id: 'x', title: 'x', date: '2026-10-12', completedAt: new Date(at('2026-10-09')).toISOString() }], T);
    expect([...m].sort()).toEqual(['2026-10-09', '2026-10-12']);
  });
});
