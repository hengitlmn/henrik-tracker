import { useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import type { Habit } from '../types';
import type { Slide } from '../hooks';
import {
  DAY_LETTERS, MONTHS_EN, WEEKDAYS_EN, addDays, isoWeek, keyOf, pad, streak, weekDates,
} from '../lib/dates';

interface Props {
  habits: Habit[];
  today: Date;
  weekOffset: number;
  slide: Slide;
  onChangeWeek: (delta: number) => void;
  onToday: () => void;
  onToggle: (habitId: string, dayKey: string) => void;
}

export function CalendarView({ habits, today, weekOffset, slide, onChangeWeek, onToday, onToggle }: Props) {
  const todayKey = keyOf(today);
  const week = weekDates(addDays(today, weekOffset * 7));

  // Kurzes Hereingleiten bei jedem Wochenwechsel (Klasse neu setzen, ohne das Element neu zu erzeugen)
  const areaRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el || !slide.n) return;
    el.style.setProperty('--wdx', slide.dir * 28 + 'px');
    el.classList.remove('week-in');
    void el.offsetWidth;
    el.classList.add('week-in');
  }, [slide.n, slide.dir]);

  // Wischen im Wochenbereich wechselt die Woche
  const swipe = useRef({ tracking: false, x: 0, y: 0, swallow: false });
  const onPointerDown = (e: PointerEvent) => {
    if (e.button) return;
    swipe.current.tracking = true;
    swipe.current.x = e.clientX;
    swipe.current.y = e.clientY;
  };
  const onPointerUp = (e: PointerEvent) => {
    const s = swipe.current;
    if (!s.tracking) return;
    s.tracking = false;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      s.swallow = true; // das Loslassen soll keinen Kreis umschalten
      setTimeout(() => { s.swallow = false; }, 60);
      onChangeWeek(dx < 0 ? 1 : -1); // nach links wischen = nächste Woche
    }
  };
  const onClickCapture = (e: MouseEvent) => {
    if (swipe.current.swallow) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const onHeadKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToday();
    }
  };

  return (
    <div>
      <div className="test-h" aria-hidden="true">H</div>
      <header className="head" role="button" tabIndex={0} aria-label="Back to current week" onClick={onToday} onKeyDown={onHeadKey}>
        <p className="day">{WEEKDAYS_EN[today.getDay()]}</p>
        <h1 className="date">{pad(today.getDate())}. {MONTHS_EN[today.getMonth()]}</h1>
      </header>

      <div
        ref={areaRef}
        className="weekarea"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { swipe.current.tracking = false; }}
        onClickCapture={onClickCapture}
      >
        <div className="nav">
          <button type="button" aria-label="Previous week" onClick={() => onChangeWeek(-1)}>‹</button>
          <span className="label">Week {isoWeek(week[0])}</span>
          <button type="button" aria-label="Next week" onClick={() => onChangeWeek(1)}>›</button>
        </div>

        <div className="week" aria-hidden="true">
          {week.map((d, i) => (
            <span key={i} className={keyOf(d) === todayKey ? 'today' : undefined}>
              <b>{pad(d.getDate())}</b>
              <i>{DAY_LETTERS[i]}</i>
            </span>
          ))}
        </div>

        <ul className="list">
          {habits.map((h) => (
            <HabitCard key={h.id} habit={h} week={week} today={today} onToggle={onToggle} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function HabitCard({ habit, week, today, onToggle }: {
  habit: Habit;
  week: Date[];
  today: Date;
  onToggle: (habitId: string, dayKey: string) => void;
}) {
  const todayKey = keyOf(today);
  const s = streak(habit, today);
  return (
    <li>
      <div className="top">
        <div className="left">
          <span className="name">{habit.name}</span>
        </div>
        {s > 0 && <span className="streak">{s + (s === 1 ? ' day' : ' days')}</span>}
      </div>
      <div className="dots">
        {week.map((d) => {
          const k = keyOf(d);
          return (
            <button
              key={k}
              type="button"
              className={'dot' + (k === todayKey ? ' today' : '')}
              aria-pressed={!!habit.done[k]}
              aria-label={habit.name + ', ' + d.getDate() + ' ' + MONTHS_EN[d.getMonth()]}
              disabled={k > todayKey}
              onClick={() => onToggle(habit.id, k)}
            />
          );
        })}
      </div>
    </li>
  );
}
