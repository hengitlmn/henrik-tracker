import { describe, expect, it } from 'vitest';
import { exportText, parseBackup } from './backup';
import { loadHabits, loadTodos, saveHabits, saveTodos, STORAGE_KEY, TODO_KEY } from './storage';

describe('backup', () => {
  it('Export und Import ergeben dieselben Daten', () => {
    const habits = [{ id: 'a1', name: 'Read', done: { '2026-10-01': true as const } }];
    expect(JSON.parse(exportText(habits))).toMatchObject({ app: 'habits', version: 1, habits });
    expect(parseBackup(exportText(habits))!.habits).toEqual(habits);
  });

  it('akzeptiert das ältere reine Array-Format', () => {
    const r = parseBackup(JSON.stringify([{ id: 'x', name: 'Old', done: { '2026-01-02': true } }]));
    expect(r!.habits).toEqual([{ id: 'x', name: 'Old', done: { '2026-01-02': true } }]);
    expect(r!.todos).toBeNull(); // ältere Dateien haben keine To-dos
  });

  it('verwirft ungültige Datumsschlüssel und vergibt fehlende IDs', () => {
    const r = parseBackup(JSON.stringify({ habits: [{ name: ' Run ', done: { '2026-01-02': true, nope: true, '2026-01-03': false } }] }))!;
    expect(r.habits[0].name).toBe('Run');
    expect(Object.keys(r.habits[0].done)).toEqual(['2026-01-02']);
    expect(r.habits[0].id).toBeTruthy();
  });

  it('sichert und lädt To-dos mit Erledigt-Zeitpunkt', () => {
    const todos = [{ id: 't1', title: 'Buy milk' }, { id: 't2', title: 'Call', completedAt: '2026-10-03T12:55:00.000Z' }];
    const r = parseBackup(exportText([], todos))!;
    expect(r.todos).toEqual(todos);
  });

  it('lehnt kaputte To-dos ab und verwirft ungültige Zeitpunkte', () => {
    expect(parseBackup(JSON.stringify({ habits: [], todos: [{ title: ' ' }] }))).toBeNull();
    expect(parseBackup(JSON.stringify({ habits: [], todos: 'x' }))).toBeNull();
    const r = parseBackup(JSON.stringify({ habits: [], todos: [{ title: 'A', completedAt: 'nope' }] }))!;
    expect(r.todos![0].completedAt).toBeUndefined();
  });

  it('lehnt Unsinn ab', () => {
    expect(parseBackup('kein json')).toBeNull();
    expect(parseBackup('{"foo":1}')).toBeNull();
    expect(parseBackup('[{"name":"  "}]')).toBeNull();
    expect(parseBackup('[{"id":"a"}]')).toBeNull();
  });
});

describe('storage', () => {
  it('nutzt den unveränderten Schlüssel habits-v1', () => {
    expect(STORAGE_KEY).toBe('habits-v1');
    saveHabits([{ id: 'a', name: 'X', done: {} }]);
    expect(JSON.parse(localStorage.getItem('habits-v1')!)).toEqual([{ id: 'a', name: 'X', done: {} }]);
  });

  it('lädt auch Daten der alten Version', () => {
    localStorage.setItem('habits-v1', JSON.stringify([{ id: 'q', name: 'Legacy', done: { '2026-09-01': true } }]));
    expect(loadHabits()).toEqual([{ id: 'q', name: 'Legacy', done: { '2026-09-01': true } }]);
  });

  it('kaputte Daten ergeben eine leere Liste, ohne zu überschreiben', () => {
    localStorage.setItem('habits-v1', '{kaputt');
    expect(loadHabits()).toEqual([]);
    expect(localStorage.getItem('habits-v1')).toBe('{kaputt');
  });
});

describe('todo storage', () => {
  it('nutzt den eigenen Schlüssel todos-v1 und verwirft Unbrauchbares', () => {
    expect(TODO_KEY).toBe('todos-v1');
    saveTodos([{ id: 'a', title: 'X' }]);
    expect(loadTodos()).toEqual([{ id: 'a', title: 'X' }]);
    localStorage.setItem('todos-v1', JSON.stringify([{ title: 5 }, { id: 'b', title: 'Ok', completedAt: 'bad' }]));
    expect(loadTodos()).toEqual([{ id: 'b', title: 'Ok' }]);
    localStorage.setItem('todos-v1', '{kaputt');
    expect(loadTodos()).toEqual([]);
  });
});
