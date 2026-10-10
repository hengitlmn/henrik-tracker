import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import type { Habit, Money, Todo, TodoList } from './types';
import { loadHabits, loadMoney, loadTodoLists, loadTodos, saveHabits, saveMoney, saveTodoLists, saveTodos } from './lib/storage';
import { keyOf, parseKey } from './lib/dates';

/** Liste aus localStorage. Gespeichert wird nur bei Änderungen (nie beim Start). */
function useStore<T>(load: () => T[], save: (items: T[]) => void) {
  const [items, setItems] = useState<T[]>(load);
  const ref = useRef(items);

  const update = useCallback((fn: (current: T[]) => T[]) => {
    const next = fn(ref.current);
    ref.current = next;
    save(next);
    setItems(next);
  }, [save]);

  return { items, update };
}

export function useHabits() {
  const { items, update } = useStore<Habit>(loadHabits, saveHabits);
  return { habits: items, update };
}

export function useTodos() {
  const { items, update } = useStore<Todo>(loadTodos, saveTodos);
  return { todos: items, update };
}

export function useTodoLists() {
  const { items, update } = useStore<TodoList>(loadTodoLists, saveTodoLists);
  return { todoLists: items, update };
}

export function useMoney() {
  const [money, setMoney] = useState<Money>(loadMoney);
  const ref = useRef(money);
  const update = useCallback((fn: (current: Money) => Money) => {
    const next = fn(ref.current);
    ref.current = next;
    saveMoney(next);
    setMoney(next);
  }, []);
  return { money, update };
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

export interface Month {
  y: number;
  m: number;
}

/** Monatswechsel per Pfeil oder Wischen; der neue Monat gleitet herein (Elemente mit data-slide). */
export function useMonthPager(month: Month, setMonth: (m: Month) => void) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState({ n: 0, dir: 0 });

  const shift = (delta: number) => {
    const d = new Date(month.y, month.m + delta, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
    setSlide((s) => ({ n: s.n + 1, dir: delta > 0 ? 1 : -1 }));
  };

  useLayoutEffect(() => {
    const root = areaRef.current;
    if (!root || !slide.n) return;
    root.querySelectorAll<HTMLElement>('[data-slide]').forEach((el) => {
      el.style.setProperty('--wdx', slide.dir * 28 + 'px');
      el.classList.remove('week-in');
      void el.offsetWidth;
      el.classList.add('week-in');
    });
  }, [slide.n, slide.dir]);

  const swipe = useRef({ tracking: false, x: 0, y: 0, swallow: false });
  const swipeProps = {
    ref: areaRef,
    className: 'swipearea',
    onPointerDown: (e: PointerEvent) => {
      if (e.button) return;
      swipe.current.tracking = true;
      swipe.current.x = e.clientX;
      swipe.current.y = e.clientY;
    },
    onPointerUp: (e: PointerEvent) => {
      const s = swipe.current;
      if (!s.tracking) return;
      s.tracking = false;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        s.swallow = true; // das Loslassen soll nichts antippen
        setTimeout(() => { s.swallow = false; }, 60);
        shift(dx < 0 ? 1 : -1); // nach links wischen = nächster Monat
      }
    },
    onPointerCancel: () => { swipe.current.tracking = false; },
    onClickCapture: (e: MouseEvent) => {
      if (swipe.current.swallow) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };

  return { shift, swipeProps };
}
