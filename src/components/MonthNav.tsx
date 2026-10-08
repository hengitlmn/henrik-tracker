import { MONTHS_EN } from '../lib/dates';
import type { Month } from '../hooks';

/** Monatsleiste mit Pfeilen (Kontoseite und Stats) */
export function MonthNav({ month, shift }: { month: Month; shift: (delta: number) => void }) {
  return (
    <div className="monthnav" data-slide>
      <button type="button" aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
      <span>{MONTHS_EN[month.m].slice(0, 3)} {month.y}</span>
      <button type="button" aria-label="Next month" onClick={() => shift(1)}>›</button>
    </div>
  );
}
