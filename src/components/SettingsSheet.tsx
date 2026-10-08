import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const CLOSE_MS = 280;

/** Settings als Blatt, das von unten hochfährt; oben rechts schließt ein X. */
export function SettingsSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const close = () => {
    if (closing) return;
    setClosing(true);
    timer.current = setTimeout(onClose, CLOSE_MS);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // Seite dahinter scrollt nicht mit
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <>
      <div className={'sheet-backdrop' + (closing ? ' closing' : '')} onClick={close} />
      <div className={'sheet' + (closing ? ' closing' : '')} role="dialog" aria-modal="true" aria-label="Settings">
        <div className="sheet-bar">
          <button type="button" className="sheet-close" aria-label="Close settings" onClick={close}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}
