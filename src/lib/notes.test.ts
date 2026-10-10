import { describe, expect, it } from 'vitest';
import { noteDate, noteMatches, notePreview, noteTitle, sortNotes } from './notes';

describe('Notizen', () => {
  it('Titel ist die erste, Vorschau die zweite nicht leere Zeile', () => {
    expect(noteTitle('\n  Hello \n\nWorld\nmore')).toBe('Hello');
    expect(notePreview('\n  Hello \n\nWorld\nmore')).toBe('World');
    expect(noteTitle('  ')).toBe('New note');
    expect(notePreview('Only title')).toBe('No additional text');
  });
  it('sortiert zuletzt geändert zuerst', () => {
    const ns = [{ id: 'a', text: '', updated: '2026-01-01T00:00:00Z' }, { id: 'b', text: '', updated: '2026-02-01T00:00:00Z' }];
    expect(sortNotes(ns).map((n) => n.id)).toEqual(['b', 'a']);
  });
  it('Datum: heute als Uhrzeit, sonst Tag und Monat, anderes Jahr mit Jahr', () => {
    const now = new Date(2026, 9, 10, 18, 0);
    expect(noteDate(new Date(2026, 9, 10, 9, 5).toISOString(), now)).toBe('09:05');
    expect(noteDate(new Date(2026, 8, 3, 9, 5).toISOString(), now)).toBe('3. Sep');
    expect(noteDate(new Date(2025, 8, 3, 9, 5).toISOString(), now)).toBe('3. Sep 2025');
  });
  it('Suche: alle Wörter müssen vorkommen', () => {
    expect(noteMatches('Milk and eggs', 'EGGS milk')).toBe(true);
    expect(noteMatches('Milk', 'milk bread')).toBe(false);
    expect(noteMatches('x', '')).toBe(true);
  });
});
