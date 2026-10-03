import { describe, expect, it } from 'vitest';
import { exportText, parseBackup } from './backup';
import { loadHabits, saveHabits, STORAGE_KEY } from './storage';

describe('backup', () => {
  it('Export und Import ergeben dieselben Daten', () => {
    const habits = [{ id: 'a1', name: 'Read', done: { '2026-10-01': true as const } }];
    expect(JSON.parse(exportText(habits))).toMatchObject({ app: 'habits', version: 1, habits });
    expect(parseBackup(exportText(habits))).toEqual(habits);
  });

  it('akzeptiert das ältere reine Array-Format', () => {
    const r = parseBackup(JSON.stringify([{ id: 'x', name: 'Old', done: { '2026-01-02': true } }]));
    expect(r).toEqual([{ id: 'x', name: 'Old', done: { '2026-01-02': true } }]);
  });

  it('verwirft ungültige Datumsschlüssel und vergibt fehlende IDs', () => {
    const r = parseBackup(JSON.stringify({ habits: [{ name: ' Run ', done: { '2026-01-02': true, nope: true, '2026-01-03': false } }] }))!;
    expect(r[0].name).toBe('Run');
    expect(Object.keys(r[0].done)).toEqual(['2026-01-02']);
    expect(r[0].id).toBeTruthy();
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
