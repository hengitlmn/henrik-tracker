import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { MoneySection, Tab, TodoSection } from './types';
import { useHabits, useMoney, useNotes, useToday, useTodoLists, useTodos, useWeekNav } from './hooks';
import { CalendarView } from './components/CalendarView';
import { SettingsSheet } from './components/SettingsSheet';
import { SettingsView } from './components/SettingsView';
import { MoneyView } from './components/MoneyView';
import { HomeView } from './components/HomeView';
import { NotesView } from './components/NotesView';
import { TodoView } from './components/TodoView';
import { TAB_ORDER, TabBar } from './components/TabBar';

export default function App() {
  const { habits, update } = useHabits();
  const { todos, update: updateTodos } = useTodos();
  const { todoLists, update: updateTodoLists } = useTodoLists();
  const { notes, update: updateNotes } = useNotes();
  const { money, update: updateMoney } = useMoney();
  const today = useToday();
  const week = useWeekNav();

  const [tab, setTab] = useState<Tab>('home');
  const [moneySection, setMoneySection] = useState<MoneySection>('accounts');
  const [todoSection, setTodoSection] = useState<TodoSection>('todos');
  const [sectionAnim, setSectionAnim] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const selectMoneySection = (next: MoneySection) => {
    if (next === moneySection) return;
    setMoneySection(next);
    setSectionAnim((n) => n + 1);
    window.scrollTo(0, 0);
  };

  const selectTodoSection = (next: TodoSection) => {
    if (next === todoSection) return;
    setTodoSection(next);
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
          {tab === 'money' && <MoneyView money={money} update={updateMoney} today={today} section={moneySection} sectionAnim={sectionAnim} />}
          {tab === 'notes' && <NotesView notes={notes} today={today} update={updateNotes} />}
          {tab === 'todo' && <TodoView todos={todos} lists={todoLists} today={today} update={updateTodos} updateLists={updateTodoLists} section={todoSection} />}
          {tab === 'home' && <HomeView habits={habits} todos={todos} money={money} notes={notes} today={today} onOpen={selectTab} />}
          {tab === 'habits' && (
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
        </div>
      </main>
      <TabBar current={tab} onSelect={selectTab} onOpenSettings={() => setSettingsOpen(true)} moneySection={moneySection} onMoneySection={selectMoneySection} todoSection={todoSection} onTodoSection={selectTodoSection} />
      {settingsOpen && (
        <SettingsSheet onClose={() => setSettingsOpen(false)}>
          <SettingsView habits={habits} update={update} todos={todos} updateTodos={updateTodos} todoLists={todoLists} updateTodoLists={updateTodoLists} notes={notes} updateNotes={updateNotes} money={money} updateMoney={updateMoney} />
        </SettingsSheet>
      )}
    </>
  );
}

