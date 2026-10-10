import { useState } from 'react';
import type { Money, MoneyEntry } from '../types';
import { WEEKDAYS_SHORT, parseKey } from '../lib/dates';
import { formatNumber, newestFirst } from '../lib/money';
import { incomeExpense, matchesQuery } from '../lib/stats';
import { EntryDays } from './EntryDays';
import { EntryForm } from './EntryForm';

interface Props {
  money: Money;
  update: (fn: (current: Money) => Money) => void;
  today: Date;
  /** Eintrag, der gerade geändert wird (vom Elternteil gehalten, damit dort das Plus ausgeblendet werden kann) */
  editId: string | null;
  setEditId: (id: string | null) => void;
}

const SVG = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
} as const;

/** "2026-10-08" -> "Thu 8.10.2026" */
function dayLabel(key: string): string {
  const d = parseKey(key);
  return WEEKDAYS_SHORT[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
}

/** Alle Einnahmen und Ausgaben untereinander, neueste zuerst, mit Suche nach Begriffen und Tagen */
export function MoneyCalendar({ money, update, today, editId, setEditId }: Props) {
  const [query, setQuery] = useState('');
  const [day, setDay] = useState('');

  const editing = editId ? money.entries.find((e) => e.id === editId) : undefined;
  if (editing) {
    return (
      <EntryForm
        key={editing.id}
        money={money}
        update={update}
        today={today}
        accountId={editing.accountId}
        editing={editing}
        onSaved={() => {}}
        onBack={() => setEditId(null)}
      />
    );
  }

  const shown = newestFirst(money.entries.filter((e) => (!day || e.date === day) && matchesQuery(e, money, query)));
  const { income, expense } = incomeExpense(shown);
  const filtering = !!query.trim() || !!day;

  return (
    <>
      <div className="sticky-top">
        <h1 className="page-title">Calendar</h1>
        <div className="searchrow">
          <label className="searchbar">
            <svg {...SVG} width="18" height="18"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
            <input
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Search note, category, day"
              aria-label="Search entries"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>
                <svg {...SVG} width="16" height="16"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            )}
          </label>
          <label className={'daypick' + (day ? ' on' : '')} aria-label="Filter by day">
            <svg {...SVG} width="20" height="20">
              <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
              <path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" />
            </svg>
            <input type="date" aria-label="Day" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
        </div>
        {day && (
          <button type="button" className="daychip" aria-label="Clear day filter" onClick={() => setDay('')}>
            {dayLabel(day)}
            <svg {...SVG} width="14" height="14"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
        <div className="sum three" aria-label="Totals of shown entries">
          <span>Income<b className="pos">{formatNumber(income)}</b></span>
          <span>Expense<b className="neg">{formatNumber(expense)}</b></span>
          <span>Total<b>{formatNumber(income - expense)}</b></span>
        </div>
      </div>

      <EntryDays entries={shown} money={money} onEdit={(e: MoneyEntry) => setEditId(e.id)} />
      {shown.length === 0 && (
        <p className="hint">{filtering ? 'No matching entries.' : 'No entries yet.'}</p>
      )}
    </>
  );
}
