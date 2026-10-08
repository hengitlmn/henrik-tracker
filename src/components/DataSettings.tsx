import { useRef, useState } from 'react';
import type { Habit, Money, Todo } from '../types';
import { backupFileName, exportText, parseBackup } from '../lib/backup';
import type { ParsedBackup } from '../lib/backup';

interface Props {
  habits: Habit[];
  update: (fn: (current: Habit[]) => Habit[]) => void;
  todos: Todo[];
  updateTodos: (fn: (current: Todo[]) => Todo[]) => void;
  money: Money;
  updateMoney: (fn: (current: Money) => Money) => void;
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

export function DataSettings({ habits, update, todos, updateTodos, money, updateMoney }: Props) {
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState<ParsedBackup | null>(null); // gesetzt = Ersetzen wartet auf Bestätigung
  const fileInput = useRef<HTMLInputElement>(null);

  const backup = () => {
    const text = exportText(habits, todos, money);
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
      const n = (c: number, one: string, many: string) => c + (c === 1 ? one : many);
      setMsg(
        data.todos
          ? 'Replace ' + n(habits.length, ' habit', ' habits') + ' and ' + n(todos.length, ' to-do', ' to-dos') +
            ' with ' + data.habits.length + ' and ' + data.todos.length + '? Tap Confirm.'
          : 'Replace ' + n(habits.length, ' habit', ' habits') + ' with ' + data.habits.length + '? Tap Confirm.',
      );
      if (data.money) setMsg((m) => m.replace('? Tap Confirm.', ' (money included)? Tap Confirm.'));
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
    update(() => pending.habits);
    if (pending.todos) updateTodos(() => pending.todos!);
    if (pending.money) updateMoney(() => pending.money!);
    const h = pending.habits.length;
    setMsg(
      'Restored: ' + h + (h === 1 ? ' habit' : ' habits') +
      (pending.todos ? ' and ' + pending.todos.length + (pending.todos.length === 1 ? ' to-do.' : ' to-dos.') : '.'),
    );
    setPending(null);
  };

  return (
    <div>
      <div className="section first">
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
