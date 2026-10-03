import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Habit } from '../types';
import { newId } from '../lib/id';
import { backupFileName, copyText, exportText, parseBackup } from '../lib/backup';

interface Props {
  habits: Habit[];
  update: (fn: (current: Habit[]) => Habit[]) => void;
}

export function SettingsView({ habits, update }: Props) {
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [exportBox, setExportBox] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [pending, setPending] = useState<Habit[] | null>(null); // gesetzt = Ersetzen wartet auf Bestätigung
  const fileInput = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLTextAreaElement>(null);

  // Fallback-Box markieren, damit man manuell kopieren kann
  useEffect(() => {
    if (exportBox !== null) {
      exportRef.current?.focus();
      exportRef.current?.select();
    }
  }, [exportBox]);

  const addHabit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    update((hs) => [...hs, { id: newId(), name: trimmed, done: {} }]);
    setName('');
  };

  const copyCode = async () => {
    const text = exportText(habits);
    if (await copyText(text)) {
      setExportBox(null);
      setMsg('Code copied. Paste it into the new version under "Restore data".');
    } else {
      setExportBox(text);
      setMsg('Copying failed. The code is selected, please copy it manually.');
    }
  };

  const saveFile = () => {
    const text = exportText(habits);
    const fileName = backupFileName();
    let file: File | null = null;
    try { file = new File([text], fileName, { type: 'application/json' }); } catch { /* ältere Browser */ }
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      navigator.share({ files: [file], title: 'Habits backup' }).then(
        () => setMsg('File saved.'),
        (err: unknown) => {
          if (!err || (err as { name?: string }).name !== 'AbortError') setMsg('Saving failed. Use "Copy code".');
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
      setMsg('Downloading file. If nothing happens, use "Copy code".');
    } catch {
      setMsg('Saving failed. Use "Copy code".');
    }
  };

  const onImportChange = (value: string) => {
    setImportText(value);
    setPending(null);
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onImportChange(String(reader.result || ''));
      setMsg('File loaded. Tap "Restore".');
    };
    reader.onerror = () => setMsg('The file could not be read.');
    reader.readAsText(file);
    if (fileInput.current) fileInput.current.value = '';
  };

  const restore = () => {
    const text = importText.trim();
    if (!text) { setMsg('Paste a code or load a file first.'); return; }
    const data = parseBackup(text);
    if (!data) { setMsg('This is not a valid backup.'); setPending(null); return; }
    if (!pending) {
      setPending(data);
      setMsg(
        'This replaces your ' + habits.length + ' current habit' + (habits.length === 1 ? '' : 's') +
        ' with ' + data.length + ' from the backup. Tap again to confirm.',
      );
      return;
    }
    update(() => pending);
    setPending(null);
    setImportText('');
    setMsg('Restored: ' + pending.length + (pending.length === 1 ? ' habit.' : ' habits.'));
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
        <h2>Back up data</h2>
        <p>Your data lives only on this device. Copy the code or save a file to paste it back into a new version of the app.</p>
        <div className="btns">
          <button className="btn primary" type="button" onClick={copyCode}>Copy code</button>
          <button className="btn" type="button" onClick={saveFile}>Save as file</button>
        </div>
        {exportBox !== null && (
          <textarea ref={exportRef} aria-label="Code to copy manually" readOnly value={exportBox} style={{ marginTop: 12 }} />
        )}
      </div>

      <div className="section">
        <h2>Restore data</h2>
        <p>Paste the code from the old version or load the saved file.</p>
        <textarea
          aria-label="Paste code"
          placeholder="Paste code here"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          value={importText}
          onChange={(e) => onImportChange(e.target.value)}
        />
        <div className="btns">
          <button className="btn" type="button" onClick={() => fileInput.current?.click()}>Load file</button>
          <button className="btn primary" type="button" onClick={restore}>{pending ? 'Confirm replace' : 'Restore'}</button>
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
