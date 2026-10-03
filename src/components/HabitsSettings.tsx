import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Habit } from '../types';
import { newId } from '../lib/id';

interface Props {
  habits: Habit[];
  update: (fn: (current: Habit[]) => Habit[]) => void;
}

export function HabitsSettings({ habits, update }: Props) {
  const [name, setName] = useState('');

  const addHabit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    update((hs) => [...hs, { id: newId(), name: trimmed, done: {} }]);
    setName('');
  };

  return (
    <div>
      <div className="section first">
        <h2>New habit</h2>
        <form autoComplete="off" onSubmit={addHabit}>
          <input
            type="text"
            maxLength={60}
            placeholder="Habit name"
            aria-label="New habit"
            enterKeyHint="done"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="add" type="submit">Add</button>
        </form>
      </div>

      <div className="section">
        <h2>Habits</h2>
        <ul className="manage">
          {habits.length === 0 && <li><span className="none">No habits.</span></li>}
          {habits.map((h) => (
            <li key={h.id}>
              <span className="name">{h.name}</span>
              <RemoveButton name={h.name} onRemove={() => update((hs) => hs.filter((x) => x.id !== h.id))} />
            </li>
          ))}
        </ul>
      </div>
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
