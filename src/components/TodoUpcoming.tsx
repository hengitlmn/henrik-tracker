import { useMemo, useState } from 'react';
import type { Todo, TodoList } from '../types';
import { newId } from '../lib/id';
import { MONTHS_SHORT, WEEKDAYS_EN, addDays, keyOf, parseKey } from '../lib/dates';
import { applyFields, markedDays, plannedDay } from '../lib/todos';
import type { TodoFields } from '../lib/todos';
import { TodoSheet } from './TodoSheet';
import { TodoRows } from './TodoRow';

interface Props {
  todos: Todo[];
  lists: TodoList[];
  today: Date;
  update: (fn: (current: Todo[]) => Todo[]) => void;
}

/** Seite "Upcoming": alle offenen, für spätere Tage geplanten Aufgaben, nach Tagen gruppiert. */
export function TodoUpcoming({ todos, lists, today, update }: Props) {
  const todayKey = keyOf(today);
  const tomorrowKey = keyOf(addDays(today, 1));
  const [sheet, setSheet] = useState<null | 'new' | { id: string }>(null);
  const marks = useMemo(() => markedDays(todos, todayKey), [todos, todayKey]);

  const groups = useMemo(() => {
    const byDay = new Map<string, Todo[]>();
    for (const t of todos) {
      const d = plannedDay(t, todayKey);
      if (t.completedAt || d <= todayKey) continue;
      byDay.set(d, [...(byDay.get(d) ?? []), t]);
    }
    return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  }, [todos, todayKey]);

  const listName = (t: Todo) => lists.find((l) => l.id === t.listId)?.name;
  const dayTitle = (key: string) => {
    const d = parseKey(key);
    return (key === tomorrowKey ? 'Tomorrow' : WEEKDAYS_EN[d.getDay()]) + ' · ' + d.getDate() + '. ' + MONTHS_SHORT[d.getMonth()];
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
  const editing = sheet && typeof sheet === 'object' ? todos.find((t) => t.id === sheet.id) : undefined;

  return (
    <div>
      <div className="sticky-top">
        <header className="todohead"><h1>Upcoming</h1></header>
      </div>

      {groups.length === 0 && <p className="todoempty">Nothing planned for the coming days.</p>}
      {groups.map(([day, items]) => (
        <section key={day} className="updaygroup">
          <h2 className="updayhead">{dayTitle(day)}</h2>
          <TodoRows
            todos={items}
            listName={listName}
            onOpen={(id) => setSheet({ id })}
            onToggle={toggle}
            onDelete={(id) => update((ts) => ts.filter((t) => t.id !== id))}
          />
        </section>
      ))}

      <button type="button" className="plusrow" aria-label="Add to-do" onClick={() => setSheet('new')}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {(sheet === 'new' || editing) && (
        <TodoSheet
          key={editing?.id ?? 'new'}
          todo={editing}
          date={editing ? plannedDay(editing, todayKey) : tomorrowKey}
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
