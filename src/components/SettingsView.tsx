import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Habit } from '../types';
import { newId } from '../lib/id';
import { backupFileName, exportText, parseBackup } from '../lib/backup';

interface Props {
  habits: Habit[];
  update: (fn: (current: Habit[]) => Habit[]) => void;
}

const ICON_PROPS = {
  viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
} as const;

function DownloadIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 4v11" />
      <path d="M7.5 11l4.5 4.5 4.5-4.5" />
      <path d="M5 19.5h14" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 16V5" />
      <path d="M7.5 9L12 4.5 16.5 9" />
      <path d="M5 19.5h14" />
    </svg>
  );
}

export function SettingsView({ habits, update }: Props) {
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState<Habit[] | null>(null); // gesetzt = Ersetzen wartet auf Bestätigung
  const fileInput = useRef<HTMLInputElement>(null);

  const addHabit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    update((hs) => [...hs, { id: newId(), name: trimmed, done: {} }]);
    setName('');
  };

  const backup = () => {
    const text = exportText(habits);
    const fileName = backupFileName();
    let file: File | null = null;
    try { file = new File([text], fileName, { type: 'application/json' }); } catch { /* ältere Browser */ }
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      navigator.share({ files: [file], title: 'Habits backup' }).then(
        () => setMsg('File saved.'),
        (err: unknown) => {
          if (!err || (err as { name?: string }).name !== 'AbortError') setMsg('Saving failed.');
        },
      );
      return;
    }
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMsg('Downloading file.');
    } catch {
      setMsg('Saving failed.');
    }
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = parseBackup(String(reader.result || '').trim());
      if (!data) {
        setPending(null);
        setMsg('This is not a valid backup.');
        return;
      }
      setPending(data);
      setMsg('Replace ' + habits.length + (habits.length === 1 ? ' habit' : ' habits') + ' with ' + data.length + '? Tap Confirm.');
    };
    reader.onerror = () => setMsg('The file could not be read.');
    reader.readAsText(file);
    if (fileInput.current) fileInput.current.value = '';
  };

  const restore = () => {
    if (!pending) {
      fileInput.current?.click();
      return;
    }
    update(() => pending);
    setMsg('Restored: ' + pending.length + (pending.length === 1 ? ' habit.' : ' habits.'));
    setPending(null);
  };

  return (
    <div>
      <h1 className="page-title">Settings</h1>

      <div className="section">
        <h2>New habit</h2>
        <form autoComplete="off" onSubmit={addHabit}>
          <input
            type="text"
            maxLength={60}
            placeholder="Habit name"
            aria-label="New habit"
            enterKeyHint="done"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="add" type="submit">Add</button>
        </form>
      </div>

      <div className="section">
        <h2>Habits</h2>
        <ul className="manage">
          {habits.length === 0 && <li><span className="none">No habits.</span></li>}
          {habits.map((h) => (
            <li key={h.id}>
              <span className="name">{h.name}</span>
              <RemoveButton name={h.name} onRemove={() => update((hs) => hs.filter((x) => x.id !== h.id))} />
            </li>
          ))}
        </ul>
      </div>

      <div className="section">
        <h2>Data</h2>
        <div className="btns">
          <button className="btn" type="button" onClick={backup}>
            <DownloadIcon /> Back up
          </button>
          <button className={'btn' + (pending ? ' primary' : '')} type="button" onClick={restore}>
            <UploadIcon /> {pending ? 'Confirm' : 'Restore'}
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json,text/plain"
          hidden
          data-testid="file-input"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      <p className="msg" role="status">{msg}</p>
    </div>
  );
}

/** Entfernen mit Doppeltipp: erster Tipp fragt nach, zweiter innerhalb von 3 s löscht. */
function RemoveButton({ name, onRemove }: { name: string; onRemove: () => void }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = () => {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    clearTimeout(timer.current);
    onRemove();
  };

  return (
    <button type="button" className={'remove' + (armed ? ' armed' : '')} aria-label={'Remove ' + name} onClick={onClick}>
      {armed ? 'Sure?' : 'Remove'}
    </button>
  );
}
