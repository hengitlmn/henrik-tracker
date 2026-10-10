import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { Todo } from '../types';
import { stamp } from '../lib/dates';

const REVEAL_X = 88;   // so weit bleibt die Zeile nach links stehen (roter Löschen-Button)
const DONE_AT = 72;    // ab hier hakt Loslassen nach rechts ab
const REVEAL_AT = 48;  // ab hier bleibt die Zeile nach links offen

interface RowsProps {
  todos: Todo[];
  /** Vergangene Tage: nur ansehen */
  locked?: boolean;
  className?: string;
  listName: (t: Todo) => string | undefined;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Liste von Aufgaben; höchstens eine Zeile zeigt gleichzeitig den Löschen-Button. */
export function TodoRows({ todos, locked, className = '', listName, onOpen, onToggle, onDelete }: RowsProps) {
  const [revealed, setRevealed] = useState<string | null>(null);
  return (
    <ul className={'todos ' + className}>
      {todos.map((t) => (
        <TodoRow
          key={t.id}
          todo={t}
          locked={!!locked}
          list={listName(t)}
          revealed={revealed === t.id}
          onReveal={setRevealed}
          onOpen={onOpen}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

interface RowProps {
  todo: Todo;
  locked: boolean;
  list?: string;
  revealed: boolean;
  onReveal: (id: string | null) => void;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Eine Aufgabe: Tipp auf den Titel öffnet das Fenster, Wischen nach rechts hakt ab, nach links fragt nach dem Löschen. */
function TodoRow({ todo, locked, list, revealed, onReveal, onOpen, onToggle, onDelete }: RowProps) {
  const done = !!todo.completedAt;
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [armed, setArmed] = useState(false);
  const g = useRef({ down: false, horizontal: false, sx: 0, sy: 0, base: 0, moved: false });

  // Eine andere Zeile wurde geöffnet: diese wieder zuschieben
  useEffect(() => {
    if (!revealed) {
      setX((v) => (v < 0 ? 0 : v));
      setArmed(false);
    }
  }, [revealed]);

  const onDown = (e: PointerEvent) => {
    if (locked) return;
    g.current = { down: true, horizontal: false, sx: e.clientX, sy: e.clientY, base: x, moved: false };
  };
  const onMove = (e: PointerEvent) => {
    const s = g.current;
    if (!s.down) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    if (!s.horizontal) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { s.down = false; return; } // senkrecht: normal scrollen
      if (Math.abs(dx) <= 8) return;
      s.horizontal = true;
      s.moved = true;
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    setX(Math.max(-REVEAL_X - 24, Math.min(140, s.base + dx)));
  };
  const onUp = () => {
    const s = g.current;
    if (!s.down) return;
    s.down = false;
    if (!s.horizontal) return;
    setDragging(false);
    if (x > DONE_AT) {
      setX(0);
      onReveal(null);
      onToggle(todo.id);
    } else if (x < -REVEAL_AT) {
      setX(-REVEAL_X);
      onReveal(todo.id);
    } else {
      setX(0);
      onReveal(null);
    }
  };
  const onCancel = () => {
    if (!g.current.down) return;
    g.current.down = false;
    setDragging(false);
    setX(0);
    onReveal(null);
  };

  /** Nach einem Wischen kommt noch ein Klick: ignorieren. Offene Zeile: Tipp schließt sie. */
  const tap = (action: () => void) => () => {
    if (g.current.moved) { g.current.moved = false; return; }
    if (x !== 0) { setX(0); onReveal(null); return; }
    action();
  };

  const remove = () => {
    if (!armed) { setArmed(true); return; }
    onDelete(todo.id);
  };

  return (
    <li className="swipe">
      <div className="swipe-under">
        <span className={'swipe-done' + (x > 0 ? ' on' : '')} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <button
          type="button"
          className={'swipe-del' + (x < 0 ? ' on' : '') + (armed ? ' armed' : '')}
          aria-label={armed ? undefined : 'Delete: ' + todo.title}
          tabIndex={x < 0 ? 0 : -1}
          onClick={remove}
        >
          {armed ? 'Sure?' : 'Delete'}
        </button>
      </div>
      <div
        className={'todorow swipe-front' + (done ? ' done' : '') + (dragging ? ' dragging' : '')}
        style={{ transform: x ? `translateX(${x}px)` : undefined }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
      >
        <button
          type="button"
          className="check"
          role="checkbox"
          aria-checked={done}
          aria-disabled={locked || undefined}
          aria-label={(done ? 'Mark as open: ' : 'Complete: ') + todo.title}
          onClick={tap(() => { if (!locked) onToggle(todo.id); })}
        >
          {done && (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          )}
        </button>

        <div className="todobody">
          <button type="button" className="todotitle" onClick={tap(() => onOpen(todo.id))}>{todo.title}</button>
          {todo.note && <span className="todonote">{todo.note}</span>}
          {(list || done) && (
            <span className="todometa">
              {list && <span className="listtag">{list}</span>}
              {done && <span className="stamp">{stamp(todo.completedAt!)}</span>}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
