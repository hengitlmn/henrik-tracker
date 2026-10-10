import { useState } from 'react';
import { DAY_LETTERS, MONTHS_EN, keyOf, parseKey } from '../lib/dates';

interface Props {
  value: string;
  todayKey: string;
  /** Tage mit Aufgaben bekommen einen Punkt */
  marks?: Set<string>;
  onPick: (key: string) => void;
}

/** Monatsraster zum Auswählen eines Tages (Montag zuerst). */
export function DayPicker({ value, todayKey, marks, onPick }: Props) {
  const [month, setMonth] = useState(() => {
    const d = parseKey(value);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const y = month.getFullYear();
  const m = month.getMonth();
  const offset = (month.getDay() + 6) % 7;
  const count = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: count }, (_, i) => new Date(y, m, i + 1)),
  ];

  return (
    <div className="daypicker">
      <div className="dp-head">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(y, m - 1, 1))}>‹</button>
        <span>{MONTHS_EN[m]} {y}</span>
        <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(y, m + 1, 1))}>›</button>
      </div>
      <div className="dp-grid">
        {DAY_LETTERS.map((l, i) => <span key={i} className="dp-letter" aria-hidden="true">{l}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={'e' + i} />;
          const key = keyOf(d);
          return (
            <button
              key={key}
              type="button"
              className={'dp-day' + (key === todayKey ? ' today' : '') + (key === value ? ' sel' : '') + (marks?.has(key) ? ' mark' : '')}
              aria-label={d.getDate() + ' ' + MONTHS_EN[m] + ' ' + y}
              aria-pressed={key === value}
              onClick={() => onPick(key)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
