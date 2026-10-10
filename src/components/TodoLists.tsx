import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Todo, TodoList } from '../types';
import { newId } from '../lib/id';
import { keyOf } from '../lib/dates';
import { applyFields, markedDays, plannedDay } from '../lib/todos';
import type { TodoFields } from '../lib/todos';
import { TodoSheet } from './TodoSheet';
import { TodoRows } from './TodoRow';

interface Props {
  todos: Todo[];
  lists: TodoList[];
  today: Date;
  update: (fn: (current: Todo[]) => Todo[]) => void;
  updateLists: (fn: (current: TodoList[]) => TodoList[]) => void;
}

/** Seite "Lists": Übersicht aller Listen (Inbox + eigene), Tipp öffnet eine Liste mit ihren Aufgaben. */
export function TodoLists({ todos, lists, today, update, updateLists }: Props) {
  const todayKey = keyOf(today);
  /** null: Übersicht, 'inbox' oder Listen-Id: geöffnete Liste */
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [sheet, setSheet] = useState<null | 'new' | { id: string }>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [armed, setArmed] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);

  const marks = useMemo(() => markedDays(todos, todayKey), [todos, todayKey]);
  const inList = (id: string) => (t: Todo) => (id === 'inbox' ? !t.listId : t.listId === id);
  const listObj = openId && openId !== 'inbox' ? lists.find((l) => l.id === openId) : undefined;
  const entries = [{ id: 'inbox', name: 'Inbox' }, ...lists];
  const current = openId ? entries.find((l) => l.id === openId) : undefined;

  const addList = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    updateLists((ls) => [...ls, { id: newId(), name: name.slice(0, 60) }]);
    setDraft('');
    setAdding(false);
  };

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

  const save = (fields: TodoFields) => {
    const id = sheet && typeof sheet === 'object' ? sheet.id : null;
    update((ts) => applyFields(ts, id, fields, todayKey, newId));
  };

  const removeList = () => {
    if (!listObj) return;
    if (!armed) { setArmed(true); return; }
    update((ts) => ts.map((t) => { if (t.listId !== listObj.id) return t; const { listId: _l, ...rest } = t; void _l; return rest; })); // Aufgaben wandern in den Inbox
    updateLists((ls) => ls.filter((l) => l.id !== listObj.id));
    setArmed(false);
    setOpenId(null);
  };

  // Übersicht
  if (!current) {
    return (
      <div>
        <div className="sticky-top">
          <header className="todohead"><h1>Lists</h1></header>
        </div>
        <ul className="listrows">
          {entries.map((l) => {
            const count = todos.filter((t) => inList(l.id)(t) && !t.completedAt).length;
            return (
              <li key={l.id}>
                <button type="button" className="listrow" onClick={() => { setOpenId(l.id); setArmed(false); }}>
                  <span className="listname">{l.name}</span>
                  <span className="listcount">{count}</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
        {adding ? (
          <form className="listadd" autoComplete="off" onSubmit={addList}>
            <input
              ref={addRef}
              type="text"
              maxLength={60}
              placeholder="List name"
              aria-label="New list"
              autoFocus
              enterKeyHint="done"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => { if (!draft.trim()) setAdding(false); }}
            />
          </form>
        ) : (
          <button type="button" className="btn addlist" onClick={() => setAdding(true)}>+ New list</button>
        )}
      </div>
    );
  }

  // Eine Liste: alle ihre Aufgaben, unabhängig vom Tag
  const items = todos.filter(inList(current.id));
  const open = items.filter((t) => !t.completedAt);
  const done = items
    .filter((t) => t.completedAt)
    .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!));
  const editing = sheet && typeof sheet === 'object' ? todos.find((t) => t.id === sheet.id) : undefined;
  const rows = (ts: Todo[], className = '') => (
    <TodoRows
      todos={ts}
      className={className}
      listName={() => undefined}
      onOpen={(id) => setSheet({ id })}
      onToggle={toggle}
      onDelete={(id) => update((all) => all.filter((t) => t.id !== id))}
    />
  );

  return (
    <div>
      <div className="sticky-top">
        <button type="button" className="back" onClick={() => setOpenId(null)}>‹ Lists</button>
        <header className="todohead"><h1>{current.name}</h1></header>
      </div>

      {rows(open)}
      <button type="button" className="plusrow" aria-label="Add to-do" onClick={() => setSheet('new')}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {done.length > 0 && (
        <>
          <button type="button" className="completed-toggle" onClick={() => setShowCompleted((v) => !v)}>
            {showCompleted ? 'Hide completed' : 'Show completed'}
          </button>
          {showCompleted && rows(done, 'completed')}
        </>
      )}

      {listObj && (
        <button type="button" className={'btn deletelist' + (armed ? ' armed' : '')} onClick={removeList}>
          {armed ? 'Sure? To-dos move to Inbox' : 'Delete list'}
        </button>
      )}

      {(sheet === 'new' || editing) && (
        <TodoSheet
          key={editing?.id ?? 'new'}
          todo={editing}
          date={editing ? plannedDay(editing, todayKey) : todayKey}
          listId={listObj?.id}
          lists={lists}
          todayKey={todayKey}
          marks={marks}
          onSave={save}
          onDelete={() => editing && update((ts) => ts.filter((t) => t.id !== editing.id))}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
