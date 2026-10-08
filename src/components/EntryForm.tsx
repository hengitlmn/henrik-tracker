import { useEffect, useRef, useState } from 'react';
import type { EntryType, Money, MoneyEntry } from '../types';
import { WEEKDAYS_SHORT, keyOf, parseKey } from '../lib/dates';
import { newId } from '../lib/id';
import { parseAmount, typeLabel } from '../lib/money';

interface Props {
  money: Money;
  update: (fn: (current: Money) => Money) => void;
  today: Date;
  accountId: string;
  editing?: MoneyEntry;
  onSaved: (date: string) => void;
  onBack: () => void;
}

const SVG = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
} as const;

/** "2026-10-08" -> "Thu 8.10.2026" */
function dateLabel(key: string): string {
  if (!key) return 'Choose';
  const d = parseKey(key);
  return WEEKDAYS_SHORT[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
}

const TYPES: EntryType[] = ['income', 'expense', 'transfer'];

/** Cent -> "12,50" für das Eingabefeld */
const amountText = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

export function EntryForm({ money, update, today, accountId, editing, onSaved, onBack }: Props) {
  const accountName = money.accounts.find((a) => a.id === accountId)?.name ?? '';
  const [type, setType] = useState<EntryType>(editing?.type ?? 'expense');
  const [date, setDate] = useState(editing?.date ?? keyOf(today));
  const [from, setFrom] = useState(editing?.accountId ?? accountId);
  const [to, setTo] = useState(
    editing?.toAccountId ?? money.accounts.find((a) => a.id !== (editing?.accountId ?? accountId))?.id ?? '',
  );
  const [category, setCategory] = useState(editing?.category ?? '');
  const [amount, setAmount] = useState(editing ? amountText(editing.amount) : '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [panel, setPanel] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [msg, setMsg] = useState('');
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(armTimer.current), []);

  const cents = parseAmount(amount);
  const valid = cents !== null && !!date && (type !== 'transfer' || (!!to && to !== from));
  const cats = type === 'income' ? money.categories.income : money.categories.expense;

  const pickType = (t: EntryType) => {
    setType(t);
    setCategory('');
    setPanel(false);
    setAddingCat(false);
  };

  const build = (): MoneyEntry => {
    const entry: MoneyEntry = { id: editing?.id ?? newId(), type, date, accountId: from, amount: cents! };
    if (type === 'transfer') entry.toAccountId = to;
    else if (category) entry.category = category;
    if (note.trim()) entry.note = note.trim().slice(0, 100);
    return entry;
  };

  const save = (keepOpen: boolean) => {
    if (!valid) return;
    const entry = build();
    update((m) => ({ ...m, entries: editing ? m.entries.map((e) => (e.id === entry.id ? entry : e)) : [...m.entries, entry] }));
    onSaved(date);
    if (keepOpen) {
      setAmount('');
      setNote('');
      setCategory('');
      setMsg('Saved.');
    } else {
      onBack();
    }
  };

  const remove = () => {
    if (!editing) return;
    if (!armed) {
      setArmed(true);
      armTimer.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    update((m) => ({ ...m, entries: m.entries.filter((e) => e.id !== editing.id) }));
    onBack();
  };

  const addCategory = () => {
    const name = newCat.trim().slice(0, 30);
    if (!name) { setAddingCat(false); return; }
    const key = type === 'income' ? 'income' : 'expense';
    update((m) => (m.categories[key].includes(name) ? m : { ...m, categories: { ...m.categories, [key]: [...m.categories[key], name] } }));
    setCategory(name);
    setNewCat('');
    setAddingCat(false);
    setPanel(false);
  };

  const accountOptions = money.accounts.map((a) => (
    <option key={a.id} value={a.id}>{a.name}</option>
  ));

  return (
    <>
      <div className="subhead">
        <button type="button" className="back" aria-label={'Back to ' + accountName} onClick={onBack}>
          <svg {...SVG} width="18" height="18"><path d="M15 5.5L8.5 12l6.5 6.5" /></svg>
          <span>{accountName}</span>
        </button>
        <h1 className="page-title">{editing ? 'Edit' : typeLabel(type)}</h1>
        <span />
      </div>

      <div className="seg" role="group" aria-label="Entry type">
        {TYPES.map((t) => (
          <button key={t} type="button" className={'seg-' + t} aria-pressed={type === t} onClick={() => pickType(t)}>
            {typeLabel(t)}
          </button>
        ))}
      </div>

      <div className="formcard">
        <label className="field datefield">
          <span>Date</span>
          <em>{dateLabel(date)}</em>
          {/* unsichtbares Datumsfeld über dem Text: öffnet die Datumsauswahl, der Text steht links wie bei den anderen Feldern */}
          <input type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>{type === 'transfer' ? 'From' : 'Account'}</span>
          <select aria-label={type === 'transfer' ? 'From' : 'Account'} value={from} onChange={(e) => setFrom(e.target.value)}>
            {accountOptions}
          </select>
        </label>
        {type === 'transfer' && (
          <label className="field">
            <span>To</span>
            <select aria-label="To" value={to} onChange={(e) => setTo(e.target.value)}>
              {accountOptions}
            </select>
          </label>
        )}
        {type !== 'transfer' && (
          <button type="button" className="field" aria-label="Category" onClick={() => setPanel((p) => !p)}>
            <span>Category</span>
            <em className={category ? '' : 'ph'}>{category || 'Choose'}</em>
          </button>
        )}
        <label className="field">
          <span>Amount</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            aria-label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Note</span>
          <input type="text" autoComplete="off" maxLength={100} aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>

      <div className="formbtns">
        <button type="button" className={'btn save save-' + type} disabled={!valid} onClick={() => save(false)}>Save</button>
        {!editing && <button type="button" className="btn" disabled={!valid} onClick={() => save(true)}>Continue</button>}
        {editing && (
          <button type="button" className={'btn delete-entry' + (armed ? ' armed' : '')} aria-label={armed ? undefined : 'Delete entry'} onClick={remove}>
            {armed ? 'Sure?' : 'Delete'}
          </button>
        )}
      </div>
      <p className="msg" role="status">{msg}</p>

      {panel && type !== 'transfer' && (
        <div className="catpanel" role="dialog" aria-label="Category">
          <div className="cathead">
            <span>Category</span>
            <button type="button" aria-label="Close categories" onClick={() => { setPanel(false); setAddingCat(false); }}>
              <svg {...SVG} width="18" height="18"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          {addingCat && (
            <div className="catadd">
              <input
                type="text"
                autoFocus
                maxLength={30}
                placeholder="New category"
                aria-label="New category"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
              />
              <button type="button" className="add" onClick={addCategory}>Add</button>
            </div>
          )}
          <div className="catgrid">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                className={c === category ? 'on' : ''}
                onClick={() => { setCategory(c); setPanel(false); }}
              >
                {c}
              </button>
            ))}
            <button type="button" className="catnew" onClick={() => setAddingCat(true)}>Add</button>
          </div>
        </div>
      )}
    </>
  );
}
