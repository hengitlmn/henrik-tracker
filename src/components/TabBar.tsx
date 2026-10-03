import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import type { Tab } from '../types';

export const TAB_ORDER: Tab[] = ['profile', 'todo', 'cal', 'stats', 'settings'];

const PAD = 6;
const GAP = 4;
const COUNT = TAB_ORDER.length;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ICONS: Record<Tab, { label: string; icon: ReactNode }> = {
  profile: {
    label: 'Profile',
    icon: (
      <Icon>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
      </Icon>
    ),
  },
  todo: {
    label: 'To-do',
    icon: (
      <Icon>
        <rect x="4" y="4" width="16" height="16" rx="4.5" />
        <path d="M8.5 12.3l2.4 2.4 4.6-5" />
      </Icon>
    ),
  },
  cal: {
    label: 'Calendar',
    icon: (
      <Icon>
        <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
        <line x1="4" y1="10.5" x2="20" y2="10.5" />
        <line x1="8.5" y1="3.5" x2="8.5" y2="7.5" />
        <line x1="15.5" y1="3.5" x2="15.5" y2="7.5" />
      </Icon>
    ),
  },
  stats: {
    label: 'Stats',
    icon: (
      <Icon>
        <path d="M3.5 16.5l5.5-5.5 4 4 7-8" />
        <path d="M15.5 7h5v5" />
      </Icon>
    ),
  },
  settings: {
    label: 'Settings',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </Icon>
    ),
  },
};

interface Props {
  current: Tab;
  onSelect: (tab: Tab) => void;
}

/**
 * Schwebende Tab-Leiste mit gleitender Hinterlegung.
 * Tipp: Hinterlegung gleitet schnell zum Tab. Ziehen (ab 6 px): Hinterlegung folgt dem Finger,
 * Loslassen wählt den Tab darunter.
 */
export function TabBar({ current, onSelect }: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(current);
  currentRef.current = current;
  const placed = useRef(false);
  const fastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const gesture = useRef({ down: false, dragging: false, startX: 0, hover: -1 });
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
    gesture.current = { down: false, dragging: false, startX: 0, hover: -1 };
    setDragging(false);
    setHover(-1);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button) return;
    gesture.current.down = true;
    gesture.current.startX = e.clientX;
    try { innerRef.current?.setPointerCapture(e.pointerId); } catch { /* nicht überall verfügbar */ }
  };

  const onPointerMove = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g.down) return;
    if (!g.dragging && Math.abs(e.clientX - g.startX) > 6) {
      g.dragging = true;
      setDragging(true);
      follow(e.clientX);
    } else if (g.dragging) {
      follow(e.clientX);
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g.down) return;
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
        className={'tabbar-inner' + (dragging ? ' dragging' : '')}
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
    </nav>
  );
}
