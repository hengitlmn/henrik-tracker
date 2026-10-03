import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Habit } from './types';
import { loadHabits, saveHabits } from './lib/storage';
import { keyOf, parseKey } from './lib/dates';

/** Gewohnheiten aus localStorage. Gespeichert wird nur bei Änderungen (nie beim Start). */
export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>(loadHabits);
  const ref = useRef(habits);

  const update = useCallback((fn: (current: Habit[]) => Habit[]) => {
    const next = fn(ref.current);
    ref.current = next;
    saveHabits(next);
    setHabits(next);
  }, []);

  return { habits, update };
}

/** Heutiges Datum; aktualisiert sich, wenn die App nach Mitternacht wieder sichtbar wird. */
export function useToday(): Date {
  const [key, setKey] = useState(() => keyOf(new Date()));
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) setKey(keyOf(new Date()));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  return useMemo(() => parseKey(key), [key]);
}

export interface Slide {
  /** zählt hoch, damit die Animation bei jedem Wechsel neu startet */
  n: number;
  /** +1: neue Woche kommt von rechts, -1: von links */
  dir: number;
}

/** Wochen-Navigation: 0 = diese Woche, -1 = letzte Woche, +1 = nächste Woche, ... */
export function useWeekNav() {
  const [offset, setOffset] = useState(0);
  const [slide, setSlide] = useState<Slide>({ n: 0, dir: 0 });

  const change = useCallback((delta: number) => {
    setOffset((o) => o + delta);
    setSlide((s) => ({ n: s.n + 1, dir: delta > 0 ? 1 : -1 }));
  }, []);

  const goToday = useCallback(() => {
    if (offset === 0) return;
    const dir = offset < 0 ? 1 : -1;
    setOffset(0);
    setSlide((s) => ({ n: s.n + 1, dir }));
  }, [offset]);

  return { offset, slide, change, goToday };
}
