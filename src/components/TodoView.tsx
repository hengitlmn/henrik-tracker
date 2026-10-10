import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Todo, TodoList, TodoSection } from '../types';
import { newId } from '../lib/id';
import { MONTHS_SHORT, WEEKDAYS_EN, keyOf, parseKey } from '../lib/dates';
import { applyFields, markedDays, plannedDay, todosForDay } from '../lib/todos';
import type { TodoFields } from '../lib/todos';
import { SettingsSheet } from './SettingsSheet';
import { DayPicker } from './DayPicker';
import { TodoSheet } from './TodoSheet';
import { TodoRows } from './TodoRow';
import { TodoLists } from './TodoLists';
import { TodoUpcoming } from './TodoUpcoming';

interface Props {
  todos: Todo[];
  lists: TodoList[];
  today: Date;
  update: (fn: (current: Todo[]) => Todo[]) => void;
  updateLists: (fn: (current: TodoList[]) => TodoList[]) => void;
  section: TodoSection;
}

/** null: kein Fenster, 'day': Tagesauswahl, 'new': neue Aufgabe, sonst die Id der Aufgabe */
type Sheet = null | 'day' | 'new' | { id: string };

export function TodoView({ todos, lists, today, update, updateLists, section }: Props) {
  return (
    <div key={section} className="view-in" style={{ '--dx': (section === 'todos' ? -28 : 28) + 'px' } as CSSProperties} data-todo={section}>
      {section === 'lists' && <TodoLists todos={todos} lists={lists} today={today} update={update} updateLists={updateLists} />}
      {section === 'upcoming' && <TodoUpcoming todos={todos} lists={lists} today={today} update={update} />}
      {section === 'todos' && <TodoDay todos={todos} lists={lists} today={today} update={update} />}
    </div>
  );
}

function TodoDay({ todos, lists, today, update }: Pick<Props, 'todos' | 'lists' | 'today' | 'update'>) {
  const todayKey = keyOf(today);
  const [dayKey, setDayKey] = useState<string | null>(null); // null: folgt dem heutigen Tag
  const [sheet, setSheet] = useState<Sheet>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  const selected = dayKey ?? todayKey;
  const past = selected < todayKey; // vergangene Tage nur ansehen
  const day = parseKey(selected);
  const { open, done } = useMemo(() => todosForDay(todos, selected, todayKey), [todos, selected, todayKey]);
  const marks = useMemo(() => markedDays(todos, todayKey), [todos, todayKey]);
  const listName = (t: Todo) => lists.find((l) => l.id === t.listId)?.name;

  const pickDay = (key: string) => setDayKey(key === todayKey ? null : key);

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

  const editing = sheet && typeof sheet === 'object' ? todos.find((t) => t.id === sheet.id) : undefined;
  const rows = (items: Todo[], className = '') => (
    <TodoRows
      todos={items}
      locked={past}
      className={className}
      listName={listName}
      onOpen={(id) => setSheet({ id })}
      onToggle={toggle}
      onDelete={(id) => update((ts) => ts.filter((t) => t.id !== id))}
    />
  );

  return (
    <div>
      {/* Wochentag und Datum bleiben beim Scrollen oben stehen; Tipp öffnet die Tagesauswahl */}
      <div className="sticky-top">
        <header className="todohead">
          <button type="button" className="todaypick" aria-label="Choose day" onClick={() => setSheet('day')}>
            <h1>{WEEKDAYS_EN[day.getDay()]}</h1>
            <span className="todate">{day.getDate() + '. ' + MONTHS_SHORT[day.getMonth()]}</span>
          </button>
          {selected !== todayKey && (
            <button type="button" className="todaylink" onClick={() => setDayKey(null)}>Today</button>
          )}
        </header>
      </div>

      {rows(open)}

      {!past && (
        <button type="button" className="plusrow" aria-label="Add to-do" onClick={() => setSheet('new')}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {done.length > 0 && (
        <>
          <button type="button" className="completed-toggle" onClick={() => setShowCompleted((v) => !v)}>
            {showCompleted ? 'Hide completed' : 'Show completed'}
          </button>
          {showCompleted && rows(done, 'completed')}
        </>
      )}

      {past && open.length === 0 && done.length === 0 && <p className="todoempty">No to-dos on this day.</p>}

      {sheet === 'day' && (
        <SettingsSheet compact label="Choose day" closeLabel="Close" onClose={() => setSheet(null)}>
          {(close) => (
            <>
              <DayPicker value={selected} todayKey={todayKey} marks={marks} onPick={(k) => { pickDay(k); close(); }} />
              {selected !== todayKey && (
                <div className="formbtns">
                  <button type="button" className="btn" onClick={() => { setDayKey(null); close(); }}>Today</button>
                </div>
              )}
            </>
          )}
        </SettingsSheet>
      )}

      {(sheet === 'new' || editing) && (
        <TodoSheet
          key={editing?.id ?? 'new'}
          todo={editing}
          date={editing ? plannedDay(editing, todayKey) : selected}
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
