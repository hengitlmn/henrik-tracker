import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Tab } from './types';
import { useHabits, useToday, useTodos, useWeekNav } from './hooks';
import { CalendarView } from './components/CalendarView';
import { SettingsView } from './components/SettingsView';
import { TodoView } from './components/TodoView';
import { TAB_ORDER, TabBar } from './components/TabBar';

export default function App() {
  const { habits, update } = useHabits();
  const { todos, update: updateTodos } = useTodos();
  const today = useToday();
  const week = useWeekNav();

  const [tab, setTab] = useState<Tab>('cal');
  const [anim, setAnim] = useState({ n: 0, dx: 0 });
  const tabRef = useRef(tab);

  const selectTab = (next: Tab) => {
    if (next === tabRef.current) return;
    const dx = TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tabRef.current) ? 28 : -28;
    tabRef.current = next;
    setTab(next);
    setAnim((a) => ({ n: a.n + 1, dx }));
    window.scrollTo(0, 0);
  };

  const toggle = (habitId: string, dayKey: string) => {
    update((hs) =>
      hs.map((h) => {
        if (h.id !== habitId) return h;
        const done = { ...h.done };
        if (done[dayKey]) delete done[dayKey];
        else done[dayKey] = true;
        return { ...h, done };
      }),
    );
  };

  return (
    <>
      <main>
        <div
          key={tab}
          className={anim.n ? 'view-in' : undefined}
          style={{ '--dx': anim.dx + 'px' } as CSSProperties}
          data-view={tab}
        >
          {/* profile und stats: bewusst noch leer, Platz für spätere Features */}
          {tab === 'todo' && <TodoView todos={todos} today={today} update={updateTodos} />}
          {tab === 'cal' && (
            <CalendarView
              habits={habits}
              today={today}
              weekOffset={week.offset}
              slide={week.slide}
              onChangeWeek={week.change}
              onToday={week.goToday}
              onToggle={toggle}
            />
          )}
          {tab === 'settings' && <SettingsView habits={habits} update={update} todos={todos} updateTodos={updateTodos} />}
        </div>
      </main>
      <TabBar current={tab} onSelect={selectTab} />
    </>
  );
}

