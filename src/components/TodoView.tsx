import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { Todo } from '../types';
import { newId } from '../lib/id';
import { shortDate, stamp } from '../lib/dates';

interface Props {
  todos: Todo[];
  today: Date;
  update: (fn: (current: Todo[]) => Todo[]) => void;
}

export function TodoView({ todos, today, update }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const addRef = useRef<HTMLInputElement>(null);

  // offene Aufgaben in der Reihenfolge des Anlegens, erledigte zuletzt erledigt zuerst
  const open = todos.filter((t) => !t.completedAt);
  const completed = todos
    .filter((t) => t.completedAt)
    .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!));

  useEffect(() => {
    if (adding) {
      addRef.current?.focus();
      addRef.current?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [adding, todos.length]);

  const toggle = (id: string) =>
    update((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        if (t.completedAt) {
          const { completedAt: _removed, ...rest } = t;
          void _removed;
          return rest;
        }
        return { ...t, completedAt: new Date().toISOString() };
      }),
    );

  const add = (e: FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    update((ts) => [...ts, { id: newId(), title }]);
    setDraft(''); // Eingabe bleibt offen für die nächste Aufgabe
  };

  return (
    <div>
      {/* Titel bleibt beim Scrollen oben stehen */}
      <div className="sticky-top">
        <header className="todohead">
          <h1>Today</h1>
          <span className="todate">{shortDate(today)}</span>
        </header>
      </div>

      <ul className="todos">
        {open.map((t) => (
          <TodoRow key={t.id} todo={t} editing={editingId === t.id} onEdit={setEditingId} onToggle={toggle} update={update} />
        ))}
      </ul>

      {adding ? (
        <form className="todorow addrow" autoComplete="off" onSubmit={add}>
          <span className="check" aria-hidden="true" />
          <input
            ref={addRef}
            type="text"
            maxLength={200}
            placeholder="Add to-do"
            aria-label="New to-do"
            enterKeyHint="done"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { if (!draft.trim()) setAdding(false); }}
          />
        </form>
      ) : (
        <button type="button" className="plusrow" aria-label="Add to-do" onClick={() => setAdding(true)}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {completed.length > 0 && (
        <>
          <button type="button" className="completed-toggle" onClick={() => setShowCompleted((v) => !v)}>
            {showCompleted ? 'Hide completed' : 'Show completed'}
          </button>
          {showCompleted && (
            <ul className="todos completed">
              {completed.map((t) => (
                <TodoRow key={t.id} todo={t} editing={editingId === t.id} onEdit={setEditingId} onToggle={toggle} update={update} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function TodoRow({ todo, editing, onEdit, onToggle, update }: {
  todo: Todo;
  editing: boolean;
  onEdit: (id: string | null) => void;
  onToggle: (id: string) => void;
  update: Props['update'];
}) {
  const done = !!todo.completedAt;
  const [value, setValue] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setValue(todo.title);
      inputRef.current?.focus();
    }
  }, [editing, todo.title]);

  const save = () => {
    const title = value.trim();
    if (title && title !== todo.title) update((ts) => ts.map((t) => (t.id === todo.id ? { ...t, title } : t)));
    onEdit(null);
  };

  const remove = () => update((ts) => ts.filter((t) => t.id !== todo.id));

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') onEdit(null);
  };

  return (
    <li className={'todorow' + (done ? ' done' : '')}>
      <button
        type="button"
        className="check"
        role="checkbox"
        aria-checked={done}
        aria-label={(done ? 'Mark as open: ' : 'Complete: ') + todo.title}
        onClick={() => onToggle(todo.id)}
      >
        {done && (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
      </button>

      <div className="todobody">
        {editing ? (
          <div className="editline">
            <input
              ref={inputRef}
              type="text"
              maxLength={200}
              aria-label="Edit to-do"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={save}
              onKeyDown={onKey}
            />
            <button
              type="button"
              className="trash"
              aria-label={'Delete: ' + todo.title}
              onPointerDown={remove}   /* vor dem Blur des Eingabefelds, sonst verschwindet der Button vor dem Tipp */
              onClick={remove}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7M10 11v5M14 11v5" />
              </svg>
            </button>
          </div>
        ) : (
          <button type="button" className="todotitle" onClick={() => onEdit(todo.id)}>{todo.title}</button>
        )}
        {done && <span className="stamp">{stamp(todo.completedAt!)}</span>}
      </div>
    </li>
  );
}
