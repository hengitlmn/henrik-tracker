import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Note } from '../types';
import { newId } from '../lib/id';
import { noteDate, noteMatches, notePreview, noteTitle, sortNotes } from '../lib/notes';

interface Props {
  notes: Note[];
  today: Date;
  update: (fn: (current: Note[]) => Note[]) => void;
}

const SVG = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
} as const;

/** Notes: minimalistisch wie Apple Notes. Liste (zuletzt geändert zuerst) und Editor mit einem einzigen Textfeld. */
export function NotesView({ notes, today, update }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [armed, setArmed] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const current = openId ? notes.find((n) => n.id === openId) : undefined;

  const grow = () => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, window.innerHeight * 0.5) + 'px';
  };
  useEffect(grow, [current?.id, current?.text]);

  const create = () => {
    const id = newId();
    update((ns) => [{ id, text: '', updated: new Date().toISOString() }, ...ns]);
    setOpenId(id);
    setArmed(false);
  };

  const edit = (text: string) => {
    if (!current) return;
    update((ns) => ns.map((n) => (n.id === current.id ? { ...n, text, updated: new Date().toISOString() } : n)));
  };

  /** Zurück zur Liste; eine leer gelassene Notiz verschwindet wieder */
  const close = () => {
    if (current && !current.text.trim()) update((ns) => ns.filter((n) => n.id !== current.id));
    setOpenId(null);
    setArmed(false);
    window.scrollTo(0, 0);
  };

  const remove = () => {
    if (!current) return;
    if (!armed) { setArmed(true); return; }
    update((ns) => ns.filter((n) => n.id !== current.id));
    setOpenId(null);
    setArmed(false);
  };

  if (current) {
    return (
      <div>
        <div className="sticky-top">
          <div className="listbar">
            <button type="button" className="back" aria-label="Back to notes" onClick={close}>
              <svg {...SVG} width="18" height="18"><path d="M15 5.5L8.5 12l6.5 6.5" /></svg>
              <span>Notes</span>
            </button>
            <button type="button" className={'listdelete' + (armed ? ' armed' : '')} onClick={remove}>
              {armed ? 'Sure?' : 'Delete'}
            </button>
          </div>
        </div>
        <textarea
          ref={area}
          className="noteedit"
          aria-label="Note"
          placeholder="Start writing"
          autoFocus={!current.text}
          value={current.text}
          onChange={(e) => edit(e.target.value)}
        />
      </div>
    );
  }

  const shown = sortNotes(notes).filter((n) => noteMatches(n.text, query));

  return (
    <div>
      <div className="sticky-top">
        <header className="todohead"><h1>Notes</h1></header>
        {notes.length > 0 && (
          <label className="searchbar">
            <svg {...SVG} width="18" height="18"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
            <input type="text" aria-label="Search notes" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        )}
      </div>

      {notes.length === 0 && <p className="todoempty">No notes yet. Tap + to write one.</p>}
      {notes.length > 0 && shown.length === 0 && <p className="todoempty">No matching notes.</p>}
      {shown.length > 0 && (
        <ul className="notelist">
          {shown.map((n) => (
            <li key={n.id}>
              <button type="button" className="noterow" onClick={() => { setOpenId(n.id); setArmed(false); window.scrollTo(0, 0); }}>
                <b>{noteTitle(n.text)}</b>
                <span><i>{noteDate(n.updated, today)}</i> {notePreview(n.text)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* über document.body, damit "fixed" nicht an der Einblend-Animation der Ansicht hängt */}
      {createPortal(
        <button type="button" className="fab" aria-label="New note" onClick={create}>
          <svg {...SVG} width="26" height="26" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
        </button>,
        document.body,
      )}
    </div>
  );
}
