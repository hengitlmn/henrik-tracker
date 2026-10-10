import type { ReactNode } from 'react';
import type { Habit, Money, Tab, Todo } from '../types';
import { MONTHS_SHORT, WEEKDAYS_EN, keyOf } from '../lib/dates';
import { formatMoney, totals } from '../lib/money';
import { flowSince } from '../lib/stats';
import { habitSummary, percent } from '../lib/home';
import { todosForDay } from '../lib/todos';

interface Props {
  habits: Habit[];
  todos: Todo[];
  money: Money;
  today: Date;
  onOpen: (tab: Tab) => void;
}

const MAX_TODOS = 4;
const tone = (cents: number) => (cents < 0 ? 'neg' : 'pos');

function Ring({ value, label }: { value: number | null; label: string }) {
  const R = 38;
  const C = 2 * Math.PI * R;
  return (
    <div className="ring">
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--bar-active)" strokeWidth="9" />
        {value !== null && value > 0 && (
          <circle
            cx="50" cy="50" r={R} fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${(Math.min(value, 100) / 100) * C} ${C}`} transform="rotate(-90 50 50)"
          />
        )}
      </svg>
      <span className="ring-label">{label}</span>
    </div>
  );
}

function Widget({ label, tab, onOpen, wide, children }: { label: string; tab: Tab; onOpen: (t: Tab) => void; wide?: boolean; children: ReactNode }) {
  return (
    <button type="button" className={'widget' + (wide ? ' wide' : '')} aria-label={label} onClick={() => onOpen(tab)}>
      <span className="w-label">{label}</span>
      {children}
    </button>
  );
}

/** Home: Übersicht über alle Bereiche als Widgets (zwei Spalten, einzelne Kästen über die ganze Breite). */
export function HomeView({ habits, todos, money, today, onOpen }: Props) {
  const todayKey = keyOf(today);
  const networth = totals(money).total;
  const { expense, income } = flowSince(money, 'month', today);
  const open = todosForDay(todos, todayKey, todayKey).open;
  const hs = habitSummary(habits, today);
  const weekPct = percent(hs.weekDone, hs.weekPossible);

  return (
    <div>
      <div className="sticky-top">
        <header className="todohead home">
          <h1>{WEEKDAYS_EN[today.getDay()]}</h1>
          <span className="todate">{today.getDate() + '. ' + MONTHS_SHORT[today.getMonth()]}</span>
        </header>
      </div>

      <div className="widgets">
        <Widget label="Networth" tab="money" onOpen={onOpen}>
          <span className={'w-value ' + tone(networth)}>{formatMoney(networth)}</span>
          <span className="w-sub">All accounts</span>
        </Widget>

        <Widget label="Spent" tab="money" onOpen={onOpen}>
          <span className="w-value neg">{formatMoney(expense)}</span>
          <span className="w-sub">Last 30 days · {formatMoney(income)} in</span>
        </Widget>

        <Widget label="To-dos today" tab="todo" onOpen={onOpen} wide>
          {open.length === 0 ? (
            <span className="w-empty">{todos.length === 0 ? 'Nothing planned yet.' : 'All done for today.'}</span>
          ) : (
            <ul className="w-todos">
              {open.slice(0, MAX_TODOS).map((t) => (
                <li key={t.id}><span className="w-dot" aria-hidden="true" />{t.title}</li>
              ))}
            </ul>
          )}
          {open.length > 0 && (
            <span className="w-sub">{open.length === 1 ? '1 open' : open.length + ' open'}{open.length > MAX_TODOS ? ' · +' + (open.length - MAX_TODOS) + ' more' : ''}</span>
          )}
        </Widget>

        <Widget label="Habits today" tab="habits" onOpen={onOpen}>
          <Ring value={percent(hs.todayDone, hs.total)} label={hs.total ? hs.todayDone + '/' + hs.total : '–'} />
        </Widget>

        <Widget label="Habits this week" tab="habits" onOpen={onOpen}>
          <Ring value={weekPct} label={weekPct === null ? '–' : weekPct + '%'} />
        </Widget>

        <Widget label="Last note" tab="notes" onOpen={onOpen} wide>
          <span className="w-empty">No notes yet.</span>
        </Widget>
      </div>
    </div>
  );
}
