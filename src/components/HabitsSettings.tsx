import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Habit } from '../types';
import { newId } from '../lib/id';
import { DEFAULT_COLOR, HABIT_COLORS } from '../lib/colors';

interface Props {
  habits: Habit[];
  update: (fn: (current: Habit[]) => Habit[]) => void;
}

export function HabitsSettings({ habits, update }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const addHabit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    update((hs) => [...hs, { id: newId(), name: trimmed, done: {} }]);
    setName('');
    setAdding(false);
  };

  const setColor = (id: string, color: string) =>
    update((hs) => hs.map((h) => (h.id === id ? { ...h, color } : h)));

  return (
    <div className="section first">
      {adding ? (
        <form className="addbox" autoComplete="off" onSubmit={addHabit}>
          <input
            ref={inputRef}
            type="text"
            maxLength={60}
            placeholder="Habit name"
            aria-label="New habit"
            enterKeyHint="done"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { if (!name.trim()) setAdding(false); }}
          />
          <button className="add" type="submit">Add</button>
        </form>
      ) : (
        <button type="button" className="addbtn" onClick={() => setAdding(true)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add
        </button>
      )}

      <ul className="list">
        {habits.map((h) => {
          const current = h.color ?? DEFAULT_COLOR;
          return (
            <li key={h.id}>
              <div className="top">
                <span className="name">{h.name}</span>
                <RemoveButton name={h.name} onRemove={() => update((hs) => hs.filter((x) => x.id !== h.id))} />
              </div>
              <div className="swatches" role="radiogroup" aria-label={'Color for ' + h.name}>
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={current.toLowerCase() === c.value.toLowerCase()}
                    aria-label={c.name}
                    className="swatch"
                    style={{ background: c.value }}
                    onClick={() => setColor(h.id, c.value)}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Entfernen mit Doppeltipp: erster Tipp fragt nach, zweiter innerhalb von 3 s löscht. */
function RemoveButton({ name, onRemove }: { name: string; onRemove: () => void }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = () => {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    clearTimeout(timer.current);
    onRemove();
  };

  return (
    <button type="button" className={'remove' + (armed ? ' armed' : '')} aria-label={'Remove ' + name} onClick={onClick}>
      {armed ? 'Sure?' : 'Remove'}
    </button>
  );
}
