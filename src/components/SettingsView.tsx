import { useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Habit, Todo } from '../types';
import { DataSettings } from './DataSettings';
import { HabitsSettings } from './HabitsSettings';

interface Props {
  habits: Habit[];
  update: (fn: (current: Habit[]) => Habit[]) => void;
  todos: Todo[];
  updateTodos: (fn: (current: Todo[]) => Todo[]) => void;
}

type Page = 'root' | 'habits' | 'data';

const SVG = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
} as const;

function Chevron() {
  return (
    <svg className="chev" {...SVG} width="18" height="18"><path d="M9 5.5l6.5 6.5L9 18.5" /></svg>
  );
}

function Row({ label, color, icon, onClick }: { label: string; color: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="row" onClick={onClick}>
      <span className="tile" style={{ background: color }}>{icon}</span>
      <span className="label">{label}</span>
      <Chevron />
    </button>
  );
}

export function SettingsView({ habits, update, todos, updateTodos }: Props) {
  const [page, setPage] = useState<Page>('root');
  const [dx, setDx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const go = (next: Page) => {
    setDx(next === 'root' ? -28 : 28);
    setPage(next);
    const body = ref.current?.closest('.sheet-body');
    if (body) body.scrollTop = 0;
  };

  return (
    <div ref={ref} key={page} className={dx ? 'view-in' : undefined} style={{ '--dx': dx + 'px' } as CSSProperties}>
      {page === 'root' && (
        <>
          {/* Konto: Anmelden kommt später, noch ohne Funktion */}
          <button type="button" className="account" aria-label="Sign in">
            <span className="avatar" aria-hidden="true">
              <svg {...SVG} width="30" height="30">
                <circle cx="12" cy="8.5" r="3.6" />
                <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
              </svg>
            </span>
            <span className="title">Sign in</span>
            <Chevron />
          </button>

          <div className="rows">
            <Row
              label="Habits"
              color="#5B72F2"
              onClick={() => go('habits')}
              icon={<svg {...SVG} width="20" height="20"><rect x="4" y="4" width="16" height="16" rx="4.5" /><path d="M8.5 12.3l2.4 2.4 4.6-5" /></svg>}
            />
            <Row
              label="Data"
              color="#2FA866"
              onClick={() => go('data')}
              icon={<svg {...SVG} width="20" height="20"><path d="M12 4v10" /><path d="M8 10.5l4 4 4-4" /><path d="M5 19.5h14" /></svg>}
            />
          </div>
        </>
      )}

      {page !== 'root' && (
        <>
          <div className="subhead">
            <button type="button" className="back" aria-label="Back to settings" onClick={() => go('root')}>
              <svg {...SVG} width="18" height="18"><path d="M15 5.5L8.5 12l6.5 6.5" /></svg>
              <span>Settings</span>
            </button>
            <h1 className="page-title">{page === 'habits' ? 'Habits' : 'Data'}</h1>
            <span />
          </div>
          {page === 'habits' && <HabitsSettings habits={habits} update={update} />}
          {page === 'data' && <DataSettings habits={habits} update={update} todos={todos} updateTodos={updateTodos} />}
        </>
      )}
    </div>
  );
}
