import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import type { Tab } from '../types';

export const TAB_ORDER: Tab[] = ['todo', 'money', 'cal', 'gym', 'notes'];

const PAD = 6;
const GAP = 4;
const COUNT = TAB_ORDER.length;
/** So lange gedrückt halten, bis das Settings-Menü erscheint */
export const LONG_PRESS_MS = 500;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ICONS: Record<Tab, { label: string; icon: ReactNode }> = {
  todo: {
    label: 'To-do',
    icon: (
      <Icon>
        <rect x="4" y="4" width="16" height="16" rx="4.5" />
        <path d="M8.5 12.3l2.4 2.4 4.6-5" />
      </Icon>
    ),
  },
  money: {
    label: 'Money',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M14.6 9.4c-.5-1-1.5-1.5-2.6-1.5-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2.1 2.6.9 2.6 2.1-1.1 2-2.6 2c-1.1 0-2.1-.5-2.6-1.5" />
        <path d="M12 6.4v1.5M12 16.1v1.5" />
      </Icon>
    ),
  },
  cal: {
    label: 'Calendar',
    icon: (
      <Icon>
        <path d="M6.4 6.9H10L9.4 10.6H14.5L14.1 6.9H17.6L20.4 17.1H15.7L15.1 13.2H9.1L8.6 17.1H3.6Z" fill="currentColor" strokeWidth="1" />
      </Icon>
    ),
  },
  gym: {
    label: 'Gym',
    icon: (
      <Icon>
        <rect x="5" y="7.5" width="2.8" height="9" rx="1.2" />
        <rect x="16.2" y="7.5" width="2.8" height="9" rx="1.2" />
        <path d="M7.8 12h8.4M2.8 10v4M21.2 10v4" />
      </Icon>
    ),
  },
  notes: {
    label: 'Notes',
    icon: (
      <Icon>
        <rect x="5" y="3.5" width="14" height="17" rx="3" />
        <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
      </Icon>
    ),
  },
};

const GEAR = 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z';

interface Props {
  current: Tab;
  onSelect: (tab: Tab) => void;
  onOpenSettings: () => void;
}

/**
 * Schwebende Tab-Leiste mit gleitender Hinterlegung.
 * Tipp: Hinterlegung gleitet schnell zum Tab. Ziehen (ab 6 px): Hinterlegung folgt dem Finger,
 * Loslassen wählt den Tab darunter. Langes Drücken: kurzes Rütteln (plus Vibration, wo möglich)
 * und ein kleines Menü "Settings" über der Leiste.
 */
export function TabBar({ current, onSelect, onOpenSettings }: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(current);
  currentRef.current = current;
  const placed = useRef(false);
  const fastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const gesture = useRef({ down: false, dragging: false, startX: 0, hover: -1 });
  const pressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const buzzTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressed = useRef(false);
  const [menu, setMenu] = useState(false);
  const [buzz, setBuzz] = useState(false);
  const [hover, setHover] = useState(-1);
  const [dragging, setDragging] = useState(false);

  const geometry = () => {
    const innerW = innerRef.current?.clientWidth ?? 0;
    const tabW = (innerW - PAD * 2 - GAP * (COUNT - 1)) / COUNT;
    return { innerW, tabW };
  };

  const placePill = useCallback((index: number, animate: boolean) => {
    const pill = pillRef.current;
    if (!pill) return;
    const { tabW } = geometry();
    if (!animate) pill.style.transition = 'none';
    pill.style.width = tabW + 'px';
    pill.style.transform = `translateX(${PAD + index * (tabW + GAP)}px)`;
    if (!animate) {
      void pill.offsetWidth;
      pill.style.transition = '';
    }
  }, []);

  // Hinterlegung zum aktiven Tab bewegen (beim ersten Mal ohne Animation)
  useLayoutEffect(() => {
    placePill(TAB_ORDER.indexOf(current), placed.current);
    placed.current = true;
  }, [current, placePill]);

  useEffect(() => {
    const onResize = () => placePill(TAB_ORDER.indexOf(currentRef.current), false);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(fastTimer.current);
      clearTimeout(pressTimer.current);
      clearTimeout(buzzTimer.current);
    };
  }, [placePill]);

  const indexAt = (x: number) => {
    const r = innerRef.current!.getBoundingClientRect();
    const { innerW } = geometry();
    const rel = (x - r.left - PAD) / (innerW - PAD * 2);
    return Math.max(0, Math.min(COUNT - 1, Math.floor(rel * COUNT)));
  };

  const follow = (x: number) => {
    const r = innerRef.current!.getBoundingClientRect();
    const { innerW, tabW } = geometry();
    const left = Math.max(PAD, Math.min(innerW - PAD - tabW, x - r.left - tabW / 2));
    pillRef.current!.style.transform = `translateX(${left}px) scale(1.06)`;
    const i = indexAt(x);
    gesture.current.hover = i;
    setHover(i);
  };

  const finish = () => {
    clearTimeout(pressTimer.current);
    gesture.current = { down: false, dragging: false, startX: 0, hover: -1 };
    setDragging(false);
    setHover(-1);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button) return;
    setMenu(false);
    longPressed.current = false;
    gesture.current.down = true;
    gesture.current.startX = e.clientX;
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      if (!gesture.current.down || gesture.current.dragging) return;
      longPressed.current = true;
      try { navigator.vibrate?.(18); } catch { /* iOS kennt keine Vibration */ }
      setBuzz(true);
      clearTimeout(buzzTimer.current);
      buzzTimer.current = setTimeout(() => setBuzz(false), 320);
      setMenu(true);
    }, LONG_PRESS_MS);
    try { innerRef.current?.setPointerCapture(e.pointerId); } catch { /* nicht überall verfügbar */ }
  };

  const onPointerMove = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g.down) return;
    if (!g.dragging && Math.abs(e.clientX - g.startX) > 6) {
      g.dragging = true;
      clearTimeout(pressTimer.current);
      setDragging(true);
      follow(e.clientX);
    } else if (g.dragging) {
      follow(e.clientX);
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g.down) return;
    if (longPressed.current) {
      finish(); // langes Drücken öffnet nur das Menü, wählt keinen Tab
      return;
    }
    if (g.dragging) {
      const i = g.hover;
      finish();
      placePill(TAB_ORDER.indexOf(currentRef.current), true); // zurückrasten; bei neuem Tab bewegt es der Effekt
      const target = i >= 0 ? TAB_ORDER[i] : currentRef.current;
      if (target !== currentRef.current) onSelect(target);
    } else {
      // einfacher Tipp: schnell hinübergleiten
      finish();
      const pill = pillRef.current;
      if (pill) {
        pill.classList.add('fast');
        clearTimeout(fastTimer.current);
        fastTimer.current = setTimeout(() => pill.classList.remove('fast'), 350);
      }
      const target = TAB_ORDER[indexAt(e.clientX)];
      if (target !== currentRef.current) onSelect(target);
    }
  };

  const onPointerCancel = () => {
    if (!gesture.current.down) return;
    finish();
    placePill(TAB_ORDER.indexOf(currentRef.current), true);
  };

  return (
    <nav className="tabbar" aria-label="Main navigation">
      <div
        ref={innerRef}
        className={'tabbar-inner' + (dragging ? ' dragging' : '') + (buzz ? ' buzz' : '')}
        role="tablist"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div ref={pillRef} className={'pill' + (dragging ? ' drag' : '')} aria-hidden="true" />
        {TAB_ORDER.map((name, i) => (
          <button
            key={name}
            type="button"
            role="tab"
            className={'tab' + (hover === i ? ' hover' : '')}
            aria-selected={current === name}
            aria-label={ICONS[name].label}
            onClick={() => onSelect(name)}
          >
            {ICONS[name].icon}
          </button>
        ))}
      </div>
      {menu && (
        <>
          <div className="tabmenu-backdrop" onPointerDown={() => setMenu(false)} />
          <div className="tabmenu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => { setMenu(false); onOpenSettings(); }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d={GEAR} />
              </svg>
              Settings
            </button>
          </div>
        </>
      )}
    </nav>
  );
}
