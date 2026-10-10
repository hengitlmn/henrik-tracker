import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Todo, TodoList } from '../types';
import { MONTHS_SHORT, WEEKDAYS_SHORT, parseKey } from '../lib/dates';
import { SettingsSheet } from './SettingsSheet';
import { DayPicker } from './DayPicker';
import type { TodoFields } from '../lib/todos';

interface Props {
  /** undefined: neue Aufgabe */
  todo?: Todo;
  /** geplanter Tag (bei neuen: der angezeigte Tag) */
  date: string;
  /** vorgewählte Liste einer neuen Aufgabe */
  listId?: string;
  lists: TodoList[];
  todayKey: string;
  marks: Set<string>;
  onSave: (fields: TodoFields) => void;
  onDelete: () => void;
  onClose: () => void;
}

const dayText = (key: string) => {
  const d = parseKey(key);
  return WEEKDAYS_SHORT[d.getDay()] + ', ' + d.getDate() + '. ' + MONTHS_SHORT[d.getMonth()];
};

/** Kleines Fenster zum Anlegen und Bearbeiten einer Aufgabe: Titel, Notiz, Tag. */
export function TodoSheet({ todo, date: initialDate, listId: initialList, lists, todayKey, marks, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(todo?.title ?? '');
  const [note, setNote] = useState(todo?.note ?? '');
  const [date, setDate] = useState(initialDate);
  const [listId, setListId] = useState<string | undefined>(todo ? todo.listId : initialList);
  const [picking, setPicking] = useState(false);
  const [choosingList, setChoosingList] = useState(false);
  const [armed, setArmed] = useState(false);
  const valid = title.trim().length > 0;

  return (
    <SettingsSheet compact label={todo ? 'Edit to-do' : 'New to-do'} closeLabel="Close" onClose={onClose}>
      {(close) => {
        const submit = (e?: FormEvent) => {
          e?.preventDefault();
          if (!valid) return;
          onSave({ title: title.trim(), note: note.trim(), date, listId });
          close();
        };
        const remove = () => {
          if (!armed) { setArmed(true); return; }
          onDelete();
          close();
        };
        return (
          <form className="todosheet" autoComplete="off" onSubmit={submit}>
            <input
              type="text"
              className="sheet-title"
              maxLength={200}
              placeholder="Title"
              aria-label="Title"
              enterKeyHint="done"
              autoFocus={!todo}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="sheet-note"
              rows={3}
              maxLength={2000}
              placeholder="Note"
              aria-label="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button type="button" className="field" aria-label="List" aria-expanded={choosingList} onClick={() => { setChoosingList((v) => !v); setPicking(false); }}>
              <span>List</span>
              <em>{lists.find((l) => l.id === listId)?.name ?? 'Inbox'}</em>
            </button>
            {choosingList && (
              <div className="listchips" role="radiogroup" aria-label="Choose list">
                {[{ id: undefined, name: 'Inbox' }, ...lists].map((l) => (
                  <button
                    key={l.id ?? 'inbox'}
                    type="button"
                    role="radio"
                    aria-checked={listId === l.id}
                    className="chip"
                    onClick={() => { setListId(l.id); setChoosingList(false); }}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="field" aria-label="Date" aria-expanded={picking} onClick={() => { setPicking((v) => !v); setChoosingList(false); }}>
              <span>Date</span>
              <em>{dayText(date)}{date === todayKey ? ' · Today' : ''}</em>
            </button>
            {picking && (
              <DayPicker value={date} todayKey={todayKey} marks={marks} onPick={(k) => { setDate(k); setPicking(false); }} />
            )}
            {todo?.created && <p className="created">Created {dayText(todo.created)}</p>}
            <div className="formbtns">
              <button type="submit" className="btn primary" disabled={!valid}>Save</button>
              {todo && (
                <button type="button" className={'btn delete-entry' + (armed ? ' armed' : '')} aria-label={armed ? undefined : 'Delete to-do'} onClick={remove}>
                  {armed ? 'Sure?' : 'Delete'}
                </button>
              )}
            </div>
          </form>
        );
      }}
    </SettingsSheet>
  );
}
