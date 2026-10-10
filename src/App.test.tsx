import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { keyOf } from './lib/dates';

// jsdom hat kein Layout: feste Breite 300 für die Tab-Leiste
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 300 });
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 300, height: 64, right: 300, bottom: 64, x: 0, y: 0, toJSON() {} }) as DOMRect;
});

const tab = (name: string) => screen.getByRole('tab', { name });
/** Einstellungen öffnen und optional direkt in "Habits" oder "Data" springen */
const bar = () => document.querySelector('.tabbar-inner')!;
const sheet = () => document.querySelector('[role="dialog"]') as HTMLElement;
/** Settings per langem Drücken auf die Leiste und Tipp auf das Menü öffnen, optional direkt in "Habits" oder "Data" springen */
const openSettings = (page?: 'Habits' | 'Money' | 'Data') => {
  vi.useFakeTimers();
  fireEvent.pointerDown(bar(), { clientX: 150, pointerId: 1 });
  act(() => { vi.advanceTimersByTime(600); });
  fireEvent.pointerUp(bar(), { clientX: 150, pointerId: 1 });
  vi.useRealTimers();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
  const row = page && screen.queryByRole('button', { name: page });
  if (row) fireEvent.click(row); // schon auf der Unterseite: nichts zu tun
};
/** Settings über das X schließen (nach der Animation verschwindet das Blatt) */
const closeSettings = () => {
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
  act(() => { vi.advanceTimersByTime(400); });
  vi.useRealTimers();
};
const weekNumber = () => parseInt(document.querySelector('.nav .label')!.textContent!.replace('Week ', ''), 10);

function addHabit(name: string) {
  openSettings('Habits');
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  fireEvent.change(screen.getByLabelText('New habit'), { target: { value: name } });
  fireEvent.submit(screen.getByLabelText('New habit').closest('form')!);
}

describe('Start und Tabs', () => {
  it('zeigt fünf Tabs in fester Reihenfolge, Home mittig und aktiv, Habits zeigt den Kalender, Notes ist noch leer', () => {
    render(<App />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual(['To-do', 'Money', 'Home', 'Habits', 'Notes']);
    expect(tab('Home').getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('[data-view="home"] .widgets')).toBeTruthy();
    fireEvent.click(tab('Notes'));
    expect(tab('Notes').getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('[data-view="notes"]')!.children).toHaveLength(0);
    fireEvent.click(tab('Habits'));
    expect(screen.getByLabelText('Back to current week')).toBeTruthy();
  });

  it('Home zeigt Networth, Ausgaben, heutige To-dos, Habit-Ringe und die Notiz als Widgets; Tipp öffnet den Bereich', () => {
    const t = keyOf(new Date());
    localStorage.setItem('habits-v1', JSON.stringify([
      { id: 'a', name: 'Run', done: { [t]: true } },
      { id: 'b', name: 'Read', done: {} },
    ]));
    localStorage.setItem('todos-v1', JSON.stringify([
      { id: 't1', title: 'Call mom', date: t }, { id: 't2', title: 'Buy milk', date: t },
    ]));
    localStorage.setItem('money-v1', JSON.stringify({
      groups: [{ id: 'g', name: 'Cash' }],
      accounts: [{ id: 'k', groupId: 'g', name: 'Wallet', start: 100000 }],
      entries: [{ id: 'e', type: 'expense', date: t, accountId: 'k', amount: 2550 }],
      categories: { income: [], expense: [] }, budgets: [],
    }));
    render(<App />);
    const w = (name: string) => screen.getByRole('button', { name }) as HTMLElement;
    expect(w('Networth').textContent).toContain('€ 974,50');
    expect(w('Spent').textContent).toContain('€ 25,50');
    expect(w('To-dos today').textContent).toMatch(/Call mom.*Buy milk.*2 open/);
    expect(w('Habits today').textContent).toContain('1/2');
    expect(w('Habits this week').textContent).toMatch(/\d+%$/); // Wert hängt vom Wochentag ab (lib/home.test.ts prüft die Rechnung)
    expect(w('Last note').textContent).toContain('No notes yet.');
    fireEvent.click(w('To-dos today'));
    expect(tab('To-do').getAttribute('aria-selected')).toBe('true');
  });

  it('Kopf, Datum und Wochenzeile liegen im festen Bereich, die Karten außerhalb', () => {
    localStorage.setItem('habits-v1', JSON.stringify([{ id: 'a', name: 'Run', done: {} }]));
    render(<App />);
    fireEvent.click(tab('Habits'));
    const top = document.querySelector('.sticky-top')!;
    expect(top.querySelector('.head')).toBeTruthy();
    expect(top.querySelector('.nav')).toBeTruthy();
    expect(top.querySelector('.week')).toBeTruthy();
    expect(top.querySelector('.list')).toBeNull();
    expect(document.querySelector('.list')!.closest('.sticky-top')).toBeNull();
  });

  it('zeigt ohne Gewohnheit sofort die Wochenzeile und keinen Leertext', () => {
    render(<App />);
    fireEvent.click(tab('Habits'));
    expect(document.body.textContent).not.toMatch(/Noch keine|No habits yet/);
    const cells = [...document.querySelectorAll('.week span')];
    expect(cells.map((c) => c.querySelector('i')!.textContent).join('')).toBe('MTWTFSS');
    expect(cells.every((c) => /^\d{2}$/.test(c.querySelector('b')!.textContent!))).toBe(true);
    expect(document.querySelector('.nav .label')!.textContent).toMatch(/^Week \d{1,2}$/);
    expect(screen.queryByLabelText('New habit')).toBeNull(); // Formular nur in den Einstellungen
  });

  it('Ansichtswechsel blendet animiert ein', () => {
    render(<App />);
    fireEvent.click(tab('Money'));
    expect(document.querySelector('[data-view="money"]')!.classList.contains('view-in')).toBe(true);
  });
});

describe('Einstellungen', () => {
  it('zeigt Konto-Karte und drei Zeilen, keine Überschrift', () => {
    render(<App />);
    openSettings();
    expect(sheet().querySelector('h1')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect([...sheet().querySelectorAll('.row')].map((r) => r.textContent)).toEqual(['Habits', 'Money', 'Data']);
    expect(sheet().querySelector('.avatar')).toBeTruthy();
  });

  it('erscheint nur nach langem Drücken: erst Menü, dann Blatt; X schließt', () => {
    render(<App />);
    expect(screen.queryByRole('menuitem')).toBeNull();
    vi.useFakeTimers();
    fireEvent.pointerDown(bar(), { clientX: 280, pointerId: 1 });
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.queryByRole('menuitem')).toBeNull(); // noch zu kurz
    act(() => { vi.advanceTimersByTime(300); });
    expect(bar().classList.contains('squish')).toBe(true); // Leiste gibt kurz nach
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeTruthy();
    fireEvent.pointerUp(bar(), { clientX: 280, pointerId: 1 });
    vi.useRealTimers();
    expect(tab('Home').getAttribute('aria-selected')).toBe('true'); // langes Drücken wählt keinen Tab
    expect(sheet()).toBeNull();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(screen.queryByRole('menuitem')).toBeNull();
    expect(sheet()).toBeTruthy();
    closeSettings();
    expect(sheet()).toBeNull();
  });

  it('kurzer Tipp oder Ziehen öffnet das Menü nicht, Tipp daneben schließt es', () => {
    render(<App />);
    vi.useFakeTimers();
    fireEvent.pointerDown(bar(), { clientX: 150, pointerId: 1 });
    fireEvent.pointerUp(bar(), { clientX: 150, pointerId: 1 });
    fireEvent.pointerDown(bar(), { clientX: 150, pointerId: 1 });
    fireEvent.pointerMove(bar(), { clientX: 200, pointerId: 1 });
    act(() => { vi.advanceTimersByTime(700); });
    fireEvent.pointerUp(bar(), { clientX: 200, pointerId: 1 });
    expect(screen.queryByRole('menuitem')).toBeNull();
    fireEvent.pointerDown(bar(), { clientX: 150, pointerId: 1 });
    act(() => { vi.advanceTimersByTime(600); });
    fireEvent.pointerUp(bar(), { clientX: 150, pointerId: 1 });
    vi.useRealTimers();
    fireEvent.pointerDown(document.querySelector('.tabmenu-backdrop')!);
    expect(screen.queryByRole('menuitem')).toBeNull();
  });

  it('Zeilen öffnen Unterseiten, Zurück führt zur Übersicht, Schließen und Öffnen setzt zurück', () => {
    render(<App />);
    openSettings('Habits');
    expect(sheet().querySelector('h1')!.textContent).toBe('Habits');
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Back to settings'));
    expect(sheet().querySelectorAll('.row')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Data' }));
    expect(sheet().querySelector('h1')!.textContent).toBe('Data');
    expect(screen.getByText('Back up')).toBeTruthy();
    closeSettings();
    openSettings();
    expect(sheet().querySelectorAll('.row')).toHaveLength(3); // wieder die Übersicht
  });
});

describe('Habits-Einstellungen', () => {
  it('ist zuerst leer: nur der graue Add-Button', () => {
    render(<App />);
    openSettings('Habits');
    expect(sheet().querySelector('.addbtn')!.textContent).toBe('Add');
    expect(screen.queryByLabelText('New habit')).toBeNull();
    expect(sheet().querySelectorAll('li')).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/No habits|New habit/);
  });

  it('Add steht immer unter der letzten Gewohnheit, Zurück-Leiste ist fest', () => {
    render(<App />);
    addHabit('One');
    addHabit('Two');
    const list = sheet().querySelector('.list')!;
    expect(list.children).toHaveLength(2);
    expect(list.nextElementSibling!.classList.contains('addbtn')).toBe(true);
    const head = sheet().querySelector('.subhead')!;
    expect(head.querySelector('[aria-label="Back to settings"]')).toBeTruthy();
    expect(head.querySelector('h1')!.textContent).toBe('Habits');
    expect(head.nextElementSibling!.contains(list)).toBe(true); // Inhalt liegt außerhalb der festen Leiste
  });

  it('Add öffnet das Eingabefeld, ein leeres Feld schließt es wieder', () => {
    render(<App />);
    openSettings('Habits');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    const input = screen.getByLabelText('New habit');
    fireEvent.submit(input.closest('form')!); // leer: nichts passiert
    expect(sheet().querySelectorAll('.list li')).toHaveLength(0);
    fireEvent.blur(input);
    expect(screen.queryByLabelText('New habit')).toBeNull();
    expect(sheet().querySelector('.addbtn')).toBeTruthy();
  });

  it('jede Gewohnheit ist eine Karte mit Farbwahl, die Farbe färbt die abgehakten Kreise', () => {
    render(<App />);
    fireEvent.click(tab('Habits'));
    addHabit('Water');
    const card = sheet().querySelector('.list li') as HTMLElement;
    const group = within(card).getByRole('radiogroup', { name: 'Color for Water' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(7);
    expect(within(group).getByRole('radio', { name: 'Blue' }).getAttribute('aria-checked')).toBe('true'); // Standard
    fireEvent.click(within(group).getByRole('radio', { name: 'Green' }));
    expect(within(group).getByRole('radio', { name: 'Green' }).getAttribute('aria-checked')).toBe('true');
    expect(JSON.parse(localStorage.getItem('habits-v1')!)[0].color).toBe('#4CC38A');

    closeSettings();
    const dot = document.querySelector('.list .dot.today') as HTMLButtonElement;
    expect(dot.style.getPropertyValue('--c')).toBe('#4CC38A');
  });

  it('Farbe bleibt in Sicherung erhalten, ungültige Farben fallen weg', async () => {
    const { parseBackup, exportText } = await import('./lib/backup');
    const h = [{ id: 'a', name: 'X', done: {}, color: '#F472B6' }];
    expect(parseBackup(exportText(h))!.habits[0].color).toBe('#F472B6');
    expect(parseBackup(JSON.stringify([{ name: 'Y', color: 'red' }]))!.habits[0].color).toBeUndefined();
  });
});

describe('To-do-Tab', () => {
  const openTodo = () => fireEvent.click(tab('To-do'));
  const closeDialog = (name: string) => {
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name }));
    act(() => { vi.advanceTimersByTime(400); });
    vi.useRealTimers();
  };
  /** Plus tippen, Titel (und Notiz) eingeben, speichern */
  const addTodo = (title: string, note?: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'Add to-do' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } });
    if (note) fireEvent.change(screen.getByLabelText('Note'), { target: { value: note } });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    act(() => { vi.advanceTimersByTime(400); });
    vi.useRealTimers();
  };
  const titles = (sel: string) => [...document.querySelectorAll(`${sel} .todotitle`)].map((e) => e.textContent);
  const dayKey = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return keyOf(d); };
  const stored = () => JSON.parse(localStorage.getItem('todos-v1')!);

  it('zeigt Wochentag mit Datum und nur ein Plus, sonst nichts', () => {
    render(<App />);
    openTodo();
    expect(document.querySelector('.sticky-top h1')!.textContent).toMatch(/^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day$/);
    expect(document.querySelector('.todate')!.textContent).toMatch(/^\d{1,2}\. [A-Z][a-z]{2}$/);
    expect(screen.getByRole('button', { name: 'Add to-do' })).toBeTruthy();
    expect(document.querySelectorAll('.todorow')).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/completed/i);
  });

  it('Plus öffnet das Fenster mit Titel, Notiz und Tag; Speichern legt die Aufgabe für den Tag an', () => {
    render(<App />);
    openTodo();
    fireEvent.click(screen.getByRole('button', { name: 'Add to-do' }));
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true); // ohne Titel
    expect(screen.getByLabelText('Note')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Date' }).textContent).toMatch(/Today/);
    closeDialog('Close');
    expect(localStorage.getItem('todos-v1')).toBeNull(); // nichts gespeichert

    addTodo('Buy milk', 'Oat, 2 liters');
    addTodo('Call mom');
    expect(titles('.todos')).toEqual(['Buy milk', 'Call mom']);
    expect(document.querySelector('.todonote')!.textContent).toBe('Oat, 2 liters');
    expect(stored()[0]).toMatchObject({ title: 'Buy milk', note: 'Oat, 2 liters', date: dayKey(0), created: dayKey(0) });
    expect(stored()[1].note).toBeUndefined();
  });

  it('Abhaken verschiebt in "Hide completed" mit Zeitstempel, Rückgängig stellt die Reihenfolge her', () => {
    localStorage.setItem('todos-v1', JSON.stringify([{ id: 'a', title: 'First' }, { id: 'b', title: 'Second' }, { id: 'c', title: 'Third' }]));
    render(<App />);
    openTodo();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Complete: Second' }));
    expect(titles('.todos:not(.completed)')).toEqual(['First', 'Third']);
    expect(titles('.todos.completed')).toEqual(['Second']);
    expect(document.querySelector('.stamp')!.textContent).toMatch(/^\d{1,2}\. [A-Z][a-z]{2} \d{2}:\d{2}$/);
    expect(JSON.parse(localStorage.getItem('todos-v1')!)[1].completedAt).toBeTruthy();

    fireEvent.click(screen.getByText('Hide completed'));
    expect(document.querySelector('.todos.completed')).toBeNull();
    fireEvent.click(screen.getByText('Show completed'));
    expect(titles('.todos.completed')).toEqual(['Second']);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark as open: Second' }));
    expect(titles('.todos:not(.completed)')).toEqual(['First', 'Second', 'Third']); // ursprüngliche Position
    expect(screen.queryByText('Hide completed')).toBeNull();
  });

  it('Tipp auf den Titel öffnet das Fenster: ändern, Tag verschieben, löschen (Erstellungstag bleibt)', () => {
    localStorage.setItem('todos-v1', JSON.stringify([
      { id: 'a', title: 'Old', date: dayKey(0), created: '2026-10-03' },
      { id: 'b', title: 'Keep' },
    ]));
    render(<App />);
    openTodo();
    fireEvent.click(screen.getByText('Old'));
    expect(document.querySelector('.created')!.textContent).toBe('Created Sat, 3. Oct');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New name' } });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'details' } });
    fireEvent.click(screen.getByRole('button', { name: 'Date' }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp('^' + new Date().getDate() + ' ') })); // heute wählen: Tag bleibt
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    act(() => { vi.advanceTimersByTime(400); });
    vi.useRealTimers();
    expect(titles('.todos')).toEqual(['New name', 'Keep']);
    expect(stored()[0]).toMatchObject({ title: 'New name', note: 'details', created: '2026-10-03' });

    fireEvent.click(screen.getByText('New name'));
    const del = screen.getByRole('button', { name: 'Delete to-do' });
    fireEvent.click(del); // erster Tipp fragt nach
    expect(titles('.todos')).toEqual(['New name', 'Keep']);
    vi.useFakeTimers();
    fireEvent.click(screen.getByText('Sure?'));
    act(() => { vi.advanceTimersByTime(400); });
    vi.useRealTimers();
    expect(titles('.todos')).toEqual(['Keep']);
    expect(stored()).toHaveLength(1);
  });

  it('offene Aufgaben wandern automatisch auf den nächsten Tag, der Erstellungstag bleibt', () => {
    localStorage.setItem('todos-v1', JSON.stringify([
      { id: 'a', title: 'Left over', date: dayKey(-2), created: dayKey(-2) },
      { id: 'b', title: 'Tomorrow', date: dayKey(1), created: dayKey(0) },
    ]));
    render(<App />);
    openTodo();
    expect(titles('.todos')).toEqual(['Left over']); // gestern/vorgestern offen: heute sichtbar
    fireEvent.click(screen.getByText('Left over'));
    expect(document.querySelector('.created')!.textContent).toMatch(/^Created /);
    expect(stored()[0].created).toBe(dayKey(-2));
  });

  it('Tipp auf Wochentag/Datum öffnet die Tagesauswahl; vergangene Tage zeigen, was da war, und sind gesperrt', () => {
    const yesterdayIso = new Date(Date.now() - 86400000).toISOString();
    localStorage.setItem('todos-v1', JSON.stringify([
      { id: 'a', title: 'Done yesterday', date: dayKey(-1), created: dayKey(-1), completedAt: yesterdayIso },
      { id: 'b', title: 'Open since two days', date: dayKey(-2), created: dayKey(-2) },
      { id: 'c', title: 'Planned tomorrow', date: dayKey(1), created: dayKey(0) },
    ]));
    render(<App />);
    openTodo();
    expect(titles('.todos')).toEqual(['Open since two days']);

    const pick = (offset: number) => {
      fireEvent.click(screen.getByRole('button', { name: 'Choose day' }));
      const d = new Date(); d.setDate(d.getDate() + offset);
      if (d.getMonth() !== new Date().getMonth()) fireEvent.click(screen.getByRole('button', { name: offset < 0 ? 'Previous month' : 'Next month' }));
      const label = d.getDate() + ' ' + ['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()] + ' ' + d.getFullYear();
      vi.useFakeTimers();
      fireEvent.click(screen.getByRole('button', { name: label }));
      act(() => { vi.advanceTimersByTime(400); });
      vi.useRealTimers();
    };

    pick(-1);
    expect(titles('.todos:not(.completed)')).toEqual(['Open since two days']); // war an dem Tag noch offen
    expect(titles('.todos.completed')).toEqual(['Done yesterday']);
    expect(screen.queryByRole('button', { name: 'Add to-do' })).toBeNull(); // Vergangenheit nur ansehen
    fireEvent.click(screen.getByRole('checkbox', { name: 'Complete: Open since two days' }));
    expect(stored()[1].completedAt).toBeUndefined(); // gesperrt

    pick(-3);
    expect(document.querySelectorAll('.todorow')).toHaveLength(0);
    expect(screen.getByText('No to-dos on this day.')).toBeTruthy();

    pick(1);
    expect(titles('.todos')).toEqual(['Planned tomorrow']);
    expect(screen.getByRole('button', { name: 'Add to-do' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add to-do' }));
    expect(screen.getByRole('button', { name: 'Date' }).textContent).not.toMatch(/Today/); // neue Aufgabe für den gewählten Tag
    closeDialog('Close');

    fireEvent.click(screen.getByText('Today'));
    expect(titles('.todos')).toEqual(['Open since two days']);
  });

  /** Zeile um dx nach rechts (+) oder links (-) wischen */
  const swipe = (title: string, dx: number) => {
    const front = screen.getByText(title).closest('.swipe-front')!;
    fireEvent.pointerDown(front, { clientX: 150, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(front, { clientX: 150 + dx, clientY: 12, pointerId: 1 });
    fireEvent.pointerUp(front, { clientX: 150 + dx, clientY: 12, pointerId: 1 });
  };
  const tabTap = (x: number) => {
    fireEvent.pointerDown(bar(), { clientX: x, pointerId: 1 });
    fireEvent.pointerUp(bar(), { clientX: x, pointerId: 1 });
  };

  it('Wischen nach rechts hakt ab, nach links fragt vor dem Löschen nach', () => {
    localStorage.setItem('todos-v1', JSON.stringify([{ id: 'a', title: 'First' }, { id: 'b', title: 'Second' }]));
    render(<App />);
    openTodo();
    swipe('First', 20); // zu kurz: nichts passiert
    expect(titles('.todos:not(.completed)')).toEqual(['First', 'Second']);
    swipe('First', 120);
    expect(titles('.todos:not(.completed)')).toEqual(['Second']);
    expect(titles('.todos.completed')).toEqual(['First']);
    swipe('First', 120); // nochmal nach rechts: wieder offen
    expect(titles('.todos:not(.completed)')).toEqual(['First', 'Second']);

    swipe('Second', -100);
    expect(titles('.todos')).toEqual(['First', 'Second']); // noch nicht gelöscht
    fireEvent.click(screen.getByRole('button', { name: 'Delete: Second' }));
    expect(titles('.todos')).toEqual(['First', 'Second']); // erster Tipp fragt nach
    fireEvent.click(screen.getByText('Sure?'));
    expect(titles('.todos')).toEqual(['First']);
    expect(stored()).toHaveLength(1);
  });

  it('Doppeltipp aufs To-do-Icon öffnet die Auswahl To-dos / Lists; Listen anlegen, Aufgabe einer Liste zuordnen', () => {
    render(<App />);
    tabTap(30); tabTap(30);
    const menu = screen.getByRole('menu', { name: 'To-do' });
    expect([...menu.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['To-dos', 'Lists', 'Upcoming']);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Lists' }));
    expect(document.querySelector('.sticky-top h1')!.textContent).toBe('Lists');
    expect(document.querySelectorAll('.listname')).toHaveLength(0); // keine Liste vorgegeben
    expect(screen.getByText(/No lists yet/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '+ New list' }));
    fireEvent.change(screen.getByLabelText('New list'), { target: { value: 'Groceries' } });
    fireEvent.submit(screen.getByLabelText('New list').closest('form')!);
    expect([...document.querySelectorAll('.listname')].map((e) => e.textContent)).toEqual(['Groceries']);
    expect(JSON.parse(localStorage.getItem('todo-lists-v1')!)).toMatchObject([{ name: 'Groceries' }]);

    // leere Liste ist erlaubt; in der Liste anlegen: Liste ist vorgewählt
    fireEvent.click(screen.getByText('Groceries'));
    expect(screen.getByText(/No to-dos in this list/)).toBeTruthy();
    addTodo('Milk');
    expect(titles('.todos')).toEqual(['Milk']);
    expect(stored()[0].listId).toBe(JSON.parse(localStorage.getItem('todo-lists-v1')!)[0].id);

    // Tab To-dos: die Aufgabe erscheint mit Listen-Name, im Fenster lässt sich die Liste ändern
    fireEvent.click(screen.getByRole('button', { name: '‹ Lists' }));
    expect(document.querySelector('.listcount')!.textContent).toBe('1');
    tabTap(30); tabTap(30);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'To-dos' }));
    expect(document.querySelector('.listtag')!.textContent).toBe('Groceries');
    fireEvent.click(screen.getByText('Milk'));
    expect(screen.getByRole('button', { name: 'List' }).textContent).toMatch(/Groceries/);
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    fireEvent.click(screen.getByRole('radio', { name: 'None' }));
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    act(() => { vi.advanceTimersByTime(400); });
    vi.useRealTimers();
    expect(stored()[0].listId).toBeUndefined();
    expect(document.querySelector('.listtag')).toBeNull();
  });

  it('Liste löschen fragt nach, die Aufgaben bleiben ohne Liste auf ihrem Tag', () => {
    localStorage.setItem('todo-lists-v1', JSON.stringify([{ id: 'l1', name: 'Work' }]));
    localStorage.setItem('todos-v1', JSON.stringify([{ id: 'a', title: 'Report', listId: 'l1' }]));
    render(<App />);
    tabTap(30); tabTap(30);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Lists' }));
    fireEvent.click(screen.getByText('Work'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete list' }));
    expect(JSON.parse(localStorage.getItem('todo-lists-v1')!)).toHaveLength(1); // noch da
    fireEvent.click(screen.getByRole('button', { name: 'Sure?' }));
    expect(JSON.parse(localStorage.getItem('todo-lists-v1')!)).toHaveLength(0);
    expect(stored()[0].listId).toBeUndefined();
    expect(document.querySelectorAll('.listname')).toHaveLength(0);
    tabTap(30); tabTap(30);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'To-dos' }));
    expect(titles('.todos')).toEqual(['Report']); // bleibt auf dem Today-Tab
  });

  it('Upcoming zeigt offene Aufgaben späterer Tage nach Tagen gruppiert', () => {
    localStorage.setItem('todos-v1', JSON.stringify([
      { id: 'a', title: 'Later', date: dayKey(5) },
      { id: 'b', title: 'Tomorrow task', date: dayKey(1) },
      { id: 'c', title: 'Today task', date: dayKey(0) },
      { id: 'd', title: 'Done future', date: dayKey(2), completedAt: new Date().toISOString() },
    ]));
    render(<App />);
    tabTap(30); tabTap(30);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Upcoming' }));
    expect(document.querySelector('.sticky-top h1')!.textContent).toBe('Upcoming');
    expect([...document.querySelectorAll('.updayhead')].map((e) => e.textContent)).toEqual([
      expect.stringMatching(/^Tomorrow · /),
      expect.stringMatching(/^[A-Z][a-z]+day · \d{1,2}\. [A-Z][a-z]{2}$/),
    ]);
    expect(titles('.todos')).toEqual(['Tomorrow task', 'Later']);
    fireEvent.click(screen.getByRole('button', { name: 'Add to-do' })); // neue Aufgabe: Vorschlag morgen
    expect(screen.getByRole('button', { name: 'Date' }).textContent).not.toMatch(/Today/);
  });

  it('Sicherung enthält To-dos und stellt sie wieder her', async () => {
    localStorage.setItem('todos-v1', JSON.stringify([{ id: 'a', title: 'Mine' }]));
    render(<App />);
    openSettings('Data');
    let shared: { files: File[] } | null = null;
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: (o: { files: File[] }) => { shared = o; return Promise.resolve(); } });
    await act(async () => { fireEvent.click(screen.getByText('Back up')); });
    expect(JSON.parse(await shared!.files[0].text()).todos).toEqual([{ id: 'a', title: 'Mine' }]);

    const file = new File([JSON.stringify({ habits: [], todos: [{ id: 'z', title: 'Restored', completedAt: '2026-10-03T12:00:00.000Z' }] })], 'b.json');
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } });
    await vi.waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Replace 0 habits and 1 to-do with 0 and 1\? Tap Confirm/));
    fireEvent.click(screen.getByText('Confirm'));
    expect(screen.getByRole('status').textContent).toMatch(/Restored: 0 habits and 1 to-do\./);
    expect(JSON.parse(localStorage.getItem('todos-v1')!)).toEqual([{ id: 'z', title: 'Restored', completedAt: '2026-10-03T12:00:00.000Z' }]);
  });

  it('ältere Sicherung ohne To-dos lässt die To-dos unverändert', async () => {
    localStorage.setItem('todos-v1', JSON.stringify([{ id: 'a', title: 'Mine' }]));
    render(<App />);
    openSettings('Data');
    const file = new File([JSON.stringify([{ id: 'h', name: 'Old habit', done: {} }])], 'b.json');
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } });
    await vi.waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Replace 0 habits with 1\?/));
    fireEvent.click(screen.getByText('Confirm'));
    expect(JSON.parse(localStorage.getItem('todos-v1')!)).toEqual([{ id: 'a', title: 'Mine' }]);
  });
});

describe('Wochen', () => {
  it('blättert vor und zurück, auch in die Zukunft, und springt per Datum zurück', () => {
    render(<App />);
    fireEvent.click(tab('Habits'));
    const base = weekNumber();
    const next = screen.getByLabelText('Next week');
    expect((next as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(next);
    fireEvent.click(next);
    expect(weekNumber() === base + 2 || weekNumber() <= 2).toBe(true);
    expect((next as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByLabelText('Previous week'));
    fireEvent.click(screen.getByLabelText('Previous week'));
    fireEvent.click(screen.getByLabelText('Previous week'));
    expect(weekNumber()).not.toBe(base);
    fireEvent.click(screen.getByLabelText('Back to current week'));
    expect(weekNumber()).toBe(base);
    expect(document.querySelectorAll('.week-in').length).toBeGreaterThan(0); // Hereingleiten der Woche
  });

  it('Wischen im Wochenbereich wechselt die Woche', () => {
    render(<App />);
    fireEvent.click(tab('Habits'));
    const area = document.querySelector('.weekarea')!;
    const base = weekNumber();
    const swipe = (x1: number, y1: number, x2: number, y2: number) => {
      fireEvent.pointerDown(area, { clientX: x1, clientY: y1, pointerId: 2 });
      fireEvent.pointerUp(area, { clientX: x2, clientY: y2, pointerId: 2 });
    };
    swipe(250, 100, 120, 105);
    expect(weekNumber()).not.toBe(base);
    swipe(100, 100, 230, 98);
    expect(weekNumber()).toBe(base);
    swipe(100, 100, 130, 100); // zu kurz
    swipe(100, 100, 190, 220); // zu diagonal
    expect(weekNumber()).toBe(base);
  });
});

describe('Gewohnheiten', () => {
  it('legt in den Einstellungen an, hakt heute ab und entfernt per Doppeltipp', () => {
    render(<App />);
    fireEvent.click(tab('Habits'));
    addHabit('Water');
    addHabit('Read');
    expect(sheet().querySelectorAll('.list li')).toHaveLength(2);
    expect(screen.queryByLabelText('New habit')).toBeNull(); // Eingabe schließt sich nach dem Hinzufügen
    expect(JSON.parse(localStorage.getItem('habits-v1')!).map((h: { name: string }) => h.name)).toEqual(['Water', 'Read']);

    closeSettings();
    expect(document.querySelectorAll('.list li')).toHaveLength(2);
    const todayDot = document.querySelector('.list li .dot.today') as HTMLButtonElement;
    fireEvent.click(todayDot);
    expect(todayDot.getAttribute('aria-pressed')).toBe('true');
    expect(within(document.querySelector('.list li') as HTMLElement).getByText('1 day')).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem('habits-v1')!);
    expect(stored[0].done[keyOf(new Date())]).toBe(true);

    openSettings('Habits');
    fireEvent.click(screen.getByLabelText('Remove Water'));
    expect(sheet().querySelectorAll('.list li')).toHaveLength(2); // erster Tipp löscht nicht
    fireEvent.click(screen.getByLabelText('Remove Water'));
    expect(sheet().querySelectorAll('.list li')).toHaveLength(1);
  });

  it('zukünftige Tage sind gesperrt, vergangene nachtragbar', () => {
    localStorage.setItem('habits-v1', JSON.stringify([{ id: 'a', name: 'Run', done: {} }]));
    render(<App />);
    const dots = [...document.querySelectorAll('.list .dot')] as HTMLButtonElement[];
    const idx = dots.findIndex((d) => d.classList.contains('today'));
    expect(dots.slice(idx + 1).every((d) => d.disabled)).toBe(true);
    expect(dots.slice(0, idx + 1).every((d) => !d.disabled)).toBe(true);
  });

  it('ein Wisch hakt keinen Kreis aus Versehen ab', () => {
    localStorage.setItem('habits-v1', JSON.stringify([{ id: 'a', name: 'Run', done: {} }]));
    render(<App />);
    fireEvent.click(tab('Habits'));
    const area = document.querySelector('.weekarea')!;
    const dot = document.querySelector('.list .dot.today') as HTMLButtonElement;
    fireEvent.pointerDown(area, { clientX: 250, clientY: 100, pointerId: 3 });
    fireEvent.pointerUp(area, { clientX: 100, clientY: 100, pointerId: 3 });
    fireEvent.click(dot); // der Klick direkt nach dem Wischen wird geschluckt
    expect(dot.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('Tab-Leiste', () => {
  it('Tipp wählt direkt den Tab mit schneller Animation', () => {
    render(<App />);
    fireEvent.pointerDown(bar(), { clientX: 280, pointerId: 1 });
    fireEvent.pointerUp(bar(), { clientX: 280, pointerId: 1 });
    expect(tab('Notes').getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('.pill')!.classList.contains('fast')).toBe(true);
    fireEvent.pointerDown(bar(), { clientX: 20, pointerId: 1 });
    fireEvent.pointerUp(bar(), { clientX: 20, pointerId: 1 });
    expect(tab('To-do').getAttribute('aria-selected')).toBe('true');
    fireEvent.pointerDown(bar(), { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(bar(), { clientX: 100, pointerId: 1 });
    expect(tab('Money').getAttribute('aria-selected')).toBe('true');
    fireEvent.pointerDown(bar(), { clientX: 215, pointerId: 1 });
    fireEvent.pointerUp(bar(), { clientX: 215, pointerId: 1 });
    expect(tab('Habits').getAttribute('aria-selected')).toBe('true');
  });

  it('Ziehen: Hover folgt dem Finger, Loslassen wählt den Tab', () => {
    render(<App />);
    fireEvent.pointerDown(bar(), { clientX: 150, pointerId: 1 });
    expect(bar().classList.contains('dragging')).toBe(false); // erst ab 6 px
    fireEvent.pointerMove(bar(), { clientX: 160, pointerId: 1 });
    expect(bar().classList.contains('dragging')).toBe(true);
    expect(tab('Home').classList.contains('hover')).toBe(true);
    fireEvent.pointerMove(bar(), { clientX: 290, pointerId: 1 });
    expect(tab('Notes').classList.contains('hover')).toBe(true);
    expect(tab('Home').classList.contains('hover')).toBe(false);
    fireEvent.pointerUp(bar(), { clientX: 290, pointerId: 1 });
    expect(tab('Notes').getAttribute('aria-selected')).toBe('true');
    expect(bar().classList.contains('dragging')).toBe(false);
  });

  it('Abbruch ändert den Tab nicht', () => {
    render(<App />);
    fireEvent.pointerDown(bar(), { clientX: 150, pointerId: 1 });
    fireEvent.pointerMove(bar(), { clientX: 20, pointerId: 1 });
    fireEvent.pointerCancel(bar(), { pointerId: 1 });
    expect(tab('Home').getAttribute('aria-selected')).toBe('true');
    expect(bar().classList.contains('dragging')).toBe(false);
  });
});

describe('Sichern und Wiederherstellen', () => {
  const msg = () => screen.getByRole('status').textContent!;
  const chooseFile = (content: string) => {
    const file = new File([content], 'backup.json', { type: 'application/json' });
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } });
  };

  it('zeigt zwei Buttons nebeneinander, kein Code-Feld mehr', () => {
    render(<App />);
    openSettings('Data');
    const btns = document.querySelector('.btns')!;
    expect([...btns.querySelectorAll('button')].map((b) => b.textContent!.trim())).toEqual(['Back up', 'Restore']);
    expect(btns.querySelectorAll('svg')).toHaveLength(2);
    expect(document.querySelector('textarea')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Copy code|Paste code/);
  });

  it('Back up nutzt das Teilen-Menü mit englischem Dateinamen', async () => {
    render(<App />);
    openSettings('Data');
    let shared: { files: File[] } | null = null;
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: (o: { files: File[] }) => { shared = o; return Promise.resolve(); } });
    await act(async () => { fireEvent.click(screen.getByText('Back up')); });
    expect(shared!.files[0].name.startsWith('habits-backup-')).toBe(true);
    expect(JSON.parse(await shared!.files[0].text()).habits).toEqual([]);
    expect(msg()).toBe('File saved.');
  });

  it('Restore ersetzt erst nach Bestätigung', async () => {
    localStorage.setItem('habits-v1', JSON.stringify([{ id: 'a', name: 'Run', done: {} }, { id: 'b', name: 'Read', done: {} }]));
    render(<App />);
    openSettings('Data');
    chooseFile(JSON.stringify({ app: 'habits', version: 1, habits: [{ id: 'z', name: 'Other', done: { '2026-01-02': true, bad: true } }] }));
    await vi.waitFor(() => expect(msg()).toMatch(/Replace 2 habits with 1\? Tap Confirm/));
    expect(JSON.parse(localStorage.getItem('habits-v1')!)).toHaveLength(2); // noch nichts passiert
    fireEvent.click(screen.getByText('Confirm'));
    expect(msg()).toMatch(/Restored: 1 habit/);
    expect(JSON.parse(localStorage.getItem('habits-v1')!)).toEqual([{ id: 'z', name: 'Other', done: { '2026-01-02': true } }]);
    expect(screen.getByText('Restore')).toBeTruthy();
  });

  it('akzeptiert das ältere Array-Format', async () => {
    render(<App />);
    openSettings('Data');
    chooseFile(JSON.stringify([{ id: 'a', name: 'Old', done: {} }]));
    await vi.waitFor(() => expect(msg()).toMatch(/with 1\? Tap Confirm/));
    fireEvent.click(screen.getByText('Confirm'));
    expect(JSON.parse(localStorage.getItem('habits-v1')!)[0].name).toBe('Old');
  });

  it('meldet ungültige Datei und lässt Daten unverändert', async () => {
    localStorage.setItem('habits-v1', JSON.stringify([{ id: 'a', name: 'Run', done: {} }]));
    render(<App />);
    openSettings('Data');
    chooseFile('nonsense');
    await vi.waitFor(() => expect(msg()).toMatch(/not a valid backup/));
    expect(screen.getByText('Restore')).toBeTruthy(); // kein Bestätigen-Zustand
    expect(JSON.parse(localStorage.getItem('habits-v1')!)).toHaveLength(1);
  });
});

describe('Money', () => {
  /** Settings → Money: Abschnitt und Konto anlegen */
  const setupAccounts = () => {
    openSettings('Money');
    fireEvent.click(screen.getByRole('button', { name: 'Section' }));
    fireEvent.change(screen.getByLabelText('New section'), { target: { value: 'Cash' } });
    fireEvent.submit(screen.getByLabelText('New section').closest('form')!);
    fireEvent.click(screen.getByRole('button', { name: 'Add account to Cash' }));
    fireEvent.change(screen.getByLabelText('New account'), { target: { value: 'Wallet' } });
    fireEvent.change(screen.getByLabelText('Starting balance'), { target: { value: '100,50' } });
    fireEvent.submit(screen.getByLabelText('New account').closest('form')!);
  };

  it('Settings: Abschnitt und Konto anlegen, Startguthaben, Entfernen per Doppeltipp', () => {
    render(<App />);
    setupAccounts();
    const stored = JSON.parse(localStorage.getItem('money-v1')!);
    expect(stored.groups.map((g: { name: string }) => g.name)).toEqual(['Cash']);
    expect(stored.accounts[0]).toMatchObject({ name: 'Wallet', start: 10050 });
    expect(sheet().textContent).toMatch(/€ 100,50/);
    fireEvent.click(screen.getByLabelText('Remove Wallet'));
    expect(screen.getByLabelText('Remove Wallet').textContent).toBe('Sure?'); // erster Tipp löscht nicht
    fireEvent.click(screen.getByLabelText('Remove Wallet'));
    expect(JSON.parse(localStorage.getItem('money-v1')!).accounts).toHaveLength(0);
  });

  it('Money-Tab zeigt Summen und Konten, Tipp aufs Konto öffnet die Einträge, Plus fügt hinzu', () => {
    render(<App />);
    setupAccounts();
    closeSettings();
    fireEvent.click(tab('Money'));
    expect(document.querySelector('.totals')!.textContent).toMatch(/Networth100,50.*\+ Month0,00.*- Month0,00/);
    expect(document.querySelector('.grouphead')!.textContent).toMatch(/Cash.*€ 100,50/);
    fireEvent.click(screen.getByRole('button', { name: /Wallet/ }));
    expect(document.querySelector('.subhead h1')!.textContent).toBe('Wallet');
    expect(document.querySelector('.fab')).toBeTruthy();

    // Ausgabe
    fireEvent.click(screen.getByLabelText('Add entry'));
    fireEvent.click(screen.getByLabelText('Category'));
    fireEvent.click(screen.getByRole('button', { name: 'food' }));
    const save = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true); // ohne Betrag
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12,5' } });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Lunch' } });
    fireEvent.click(save);
    expect(document.querySelector('.subhead h1')!.textContent).toBe('Wallet');
    expect(document.querySelector('.entry')!.textContent).toMatch(/food.*Lunch.*€ 12,50/);
    expect(document.querySelector('.sum')!.textContent).toMatch(/Expense12,50/);
    expect(document.querySelector('.sum')!.textContent).toMatch(/Balance88,00/);

    // Einnahme mit "Continue" bleibt im Formular
    fireEvent.click(screen.getByLabelText('Add entry'));
    fireEvent.click(screen.getByRole('button', { name: 'Income' }));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1.000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('status').textContent).toBe('Saved.');
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('');
    fireEvent.click(screen.getByLabelText('Back to Wallet'));
    expect(document.querySelector('.sum')!.textContent).toMatch(/Balance1.088,00/);
    expect(JSON.parse(localStorage.getItem('money-v1')!).entries).toHaveLength(2);
  });

  it('Überweisung bucht von einem Konto aufs andere, Eintrag lässt sich ändern und löschen', () => {
    render(<App />);
    setupAccounts();
    fireEvent.click(screen.getByRole('button', { name: 'Add account to Cash' }));
    fireEvent.change(screen.getByLabelText('New account'), { target: { value: 'Bank' } });
    fireEvent.submit(screen.getByLabelText('New account').closest('form')!);
    closeSettings();
    fireEvent.click(tab('Money'));
    fireEvent.click(screen.getByRole('button', { name: /Wallet/ }));
    fireEvent.click(screen.getByLabelText('Add entry'));
    fireEvent.click(screen.getByRole('button', { name: 'Transfer' }));
    expect(screen.queryByLabelText('Category')).toBeNull();
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(document.querySelector('.entry')!.textContent).toMatch(/Transfer.*Wallet → Bank.*€ 40,00/);
    fireEvent.click(screen.getByLabelText('Back to accounts'));
    const rows = [...document.querySelectorAll('.acc-row')].map((r) => r.textContent);
    expect(rows).toEqual(['Wallet€ 60,50', 'Bank€ 40,00']);

    // ändern und löschen
    fireEvent.click(screen.getByRole('button', { name: /Wallet/ }));
    fireEvent.click(document.querySelector('.entry')!);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(document.querySelector('.sum')!.textContent).toMatch(/Balance50,50/);
    fireEvent.click(document.querySelector('.entry')!);
    fireEvent.click(screen.getByRole('button', { name: 'Delete entry' }));
    expect(JSON.parse(localStorage.getItem('money-v1')!).entries).toHaveLength(1); // erster Tipp löscht nicht
    fireEvent.click(screen.getByRole('button', { name: 'Sure?' }));
    expect(JSON.parse(localStorage.getItem('money-v1')!).entries).toHaveLength(0);
  });

  it('eigene Kategorie hinzufügen, Sicherung enthält Money und stellt es wieder her', async () => {
    render(<App />);
    setupAccounts();
    closeSettings();
    fireEvent.click(tab('Money'));
    fireEvent.click(screen.getByRole('button', { name: /Wallet/ }));
    fireEvent.click(screen.getByLabelText('Add entry'));
    fireEvent.click(screen.getByLabelText('Category'));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.change(screen.getByLabelText('New category'), { target: { value: 'coffee' } });
    fireEvent.keyDown(screen.getByLabelText('New category'), { key: 'Enter' });
    expect(screen.getByLabelText('Category').textContent).toMatch(/coffee/);
    expect(JSON.parse(localStorage.getItem('money-v1')!).categories.expense).toContain('coffee');

    const { exportText, parseBackup } = await import('./lib/backup');
    const money = JSON.parse(localStorage.getItem('money-v1')!);
    expect(parseBackup(exportText([], [], money))!.money!.accounts[0].start).toBe(10050);
    expect(parseBackup(JSON.stringify({ habits: [], money: 'kaputt' }))).toBeNull();
    expect(parseBackup(JSON.stringify({ habits: [] }))!.money).toBeNull(); // ältere Sicherung: Money bleibt
  });

  it('Doppeltipp aufs Money-Icon öffnet die Auswahl Accounts / Stats / Calendar, Stats und Calendar zeigen nur die Überschrift', () => {
    render(<App />);
    const tap = (x: number) => {
      fireEvent.pointerDown(bar(), { clientX: x, pointerId: 1 });
      fireEvent.pointerUp(bar(), { clientX: x, pointerId: 1 });
    };
    tap(100); // Money
    expect(tab('Money').getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('menu')).toBeNull();
    tap(100); // zweiter Tipp
    const menu = screen.getByRole('menu', { name: 'Money' });
    expect([...menu.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Accounts', 'Stats', 'Calendar']);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Stats' }));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.querySelector('[data-money="stats"] h1')!.textContent).toBe('Stats');
    tap(100); tap(100);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Calendar' }));
    expect(document.querySelector('[data-money="calendar"] h1')!.textContent).toBe('Calendar');
    tap(100); tap(100);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Accounts' }));
    expect(document.querySelector('.totals')).toBeTruthy();
  });

  it('Wischen auf der Kontoseite wechselt den Monat, Einnahmen heißen Income und Expense', () => {
    render(<App />);
    setupAccounts();
    closeSettings();
    fireEvent.click(tab('Money'));
    fireEvent.click(screen.getByRole('button', { name: /Wallet/ }));
    expect(document.querySelector('.sum')!.textContent).toMatch(/^Income.*Expense.*Total.*Balance/);
    const label = () => document.querySelector('.monthnav span')!.textContent;
    const start = label();
    const area = document.querySelector('.swipearea')!;
    fireEvent.pointerDown(area, { clientX: 250, clientY: 100, pointerId: 2 });
    fireEvent.pointerUp(area, { clientX: 100, clientY: 105, pointerId: 2 });
    expect(label()).not.toBe(start);
    fireEvent.pointerDown(area, { clientX: 100, clientY: 100, pointerId: 2 });
    fireEvent.pointerUp(area, { clientX: 250, clientY: 98, pointerId: 2 });
    expect(label()).toBe(start);
  });

  /** Konto "Wallet" mit zwei Einträgen anlegen und Money öffnen */
  const seedEntries = () => {
    setupAccounts();
    closeSettings();
    fireEvent.click(tab('Money'));
    fireEvent.click(screen.getByRole('button', { name: /Wallet/ }));
    const add = (type: 'Income' | 'Expense', amount: string, note: string, cat?: string) => {
      fireEvent.click(screen.getByLabelText('Add entry'));
      fireEvent.click(screen.getByRole('button', { name: type }));
      if (cat) {
        fireEvent.click(screen.getByLabelText('Category'));
        fireEvent.click(screen.getByRole('button', { name: cat }));
      }
      fireEvent.change(screen.getByLabelText('Amount'), { target: { value: amount } });
      fireEvent.change(screen.getByLabelText('Note'), { target: { value: note } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    };
    add('Income', '2000', 'Paycheck', 'salary');
    add('Expense', '50', 'Pizza night', 'food');
    fireEvent.click(screen.getByLabelText('Back to accounts'));
  };
  const openMoneySection = (name: 'Stats' | 'Calendar' | 'Accounts') => {
    const tap = () => {
      fireEvent.pointerDown(bar(), { clientX: 100, pointerId: 1 });
      fireEvent.pointerUp(bar(), { clientX: 100, pointerId: 1 });
    };
    tap(); tap();
    fireEvent.click(screen.getByRole('menuitemradio', { name }));
  };

  it('Calendar: alle Einträge untereinander, neueste zuerst, Suche nach Begriff und Tag', () => {
    render(<App />);
    seedEntries();
    openMoneySection('Calendar');
    const titles = () => [...document.querySelectorAll('[data-money="calendar"] .entry b')].map((b) => b.textContent);
    expect(titles()).toEqual(['Pizza night', 'Paycheck']); // zuletzt angelegt zuerst
    expect(document.querySelector('.sum')!.textContent).toMatch(/Income2.000,00.*Expense50,00.*Total1.950,00/);

    fireEvent.change(screen.getByLabelText('Search entries'), { target: { value: 'pizza' } });
    expect(titles()).toEqual(['Pizza night']);
    fireEvent.change(screen.getByLabelText('Search entries'), { target: { value: 'salary wallet' } });
    expect(titles()).toEqual(['Paycheck']);
    fireEvent.change(screen.getByLabelText('Search entries'), { target: { value: 'nothing here' } });
    expect(document.querySelector('.hint')!.textContent).toBe('No matching entries.');
    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(titles()).toHaveLength(2);

    // Tag filtern
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '2001-01-01' } });
    expect(titles()).toEqual([]);
    fireEvent.click(screen.getByLabelText('Clear day filter'));
    expect(titles()).toHaveLength(2);

    // Eintrag antippen: ändern, Zurück führt in die Liste (mit erhaltener Suche)
    fireEvent.change(screen.getByLabelText('Search entries'), { target: { value: 'night' } });
    fireEvent.click(document.querySelector('.entry')!);
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Pasta night' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(titles()).toEqual(['Pasta night']);
    expect((screen.getByLabelText('Search entries') as HTMLInputElement).value).toBe('night'); // Suche bleibt erhalten
  });

  it('Stats: Bilanz, Budgets mit Fortschritt, Ausgaben nach Kategorie, letzte Monate', () => {
    render(<App />);
    seedEntries();
    openMoneySection('Stats');
    const stats = () => document.querySelector('[data-money="stats"]')!;
    expect(stats().querySelector('.net b')!.textContent).toBe('€ 1.950,00');
    expect(stats().querySelector('.net em')!.textContent).toMatch(/Saved 98% of income/);
    expect(stats().querySelectorAll('.bars .barcol')).toHaveLength(6);
    expect(stats().querySelector('.legend')!.textContent).toMatch(/food.*100%.*€ 50,00/);

    // Budget anlegen: 100 € für food, davon 50 € ausgegeben
    fireEvent.click(screen.getByRole('button', { name: 'Budget' }));
    fireEvent.change(screen.getByLabelText('Budget category'), { target: { value: 'food' } });
    fireEvent.change(screen.getByLabelText('Monthly limit'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    const bar50 = screen.getByRole('progressbar', { name: 'Budget food' });
    expect(bar50.getAttribute('aria-valuenow')).toBe('50');
    expect(stats().querySelector('.budget')!.textContent).toMatch(/€ 50,00 of € 100,00.*50%.*€ 50,00 left/);
    expect(JSON.parse(localStorage.getItem('money-v1')!).budgets).toEqual([{ category: 'food', limit: 10000 }]);

    // Limit senken: Budget überschritten
    fireEvent.click(screen.getByLabelText('Edit budget food'));
    fireEvent.change(screen.getByLabelText('Limit for food'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(stats().querySelector('.budget')!.classList.contains('over')).toBe(true);
    expect(stats().querySelector('.budgetfoot')!.textContent).toMatch(/€ 10,00 over/);

    // Entfernen per Doppeltipp
    fireEvent.click(screen.getByLabelText('Edit budget food'));
    fireEvent.click(screen.getByLabelText('Remove budget food'));
    expect(JSON.parse(localStorage.getItem('money-v1')!).budgets).toHaveLength(1);
    fireEvent.click(screen.getByLabelText('Remove budget food'));
    expect(JSON.parse(localStorage.getItem('money-v1')!).budgets).toEqual([]);
  });

  it('Kontenübersicht: Networth, + Month und - Month, alle drei schalten Income und Expense gemeinsam um', () => {
    const d = (n: number) => { const x = new Date(); x.setDate(x.getDate() - n); return keyOf(x); };
    localStorage.setItem('money-v1', JSON.stringify({
      groups: [{ id: 'g', name: 'G' }],
      accounts: [{ id: 'a', groupId: 'g', name: 'Wallet', start: 0 }],
      entries: [
        { id: '1', type: 'income', date: d(0), accountId: 'a', amount: 10000 },
        { id: '2', type: 'expense', date: d(0), accountId: 'a', amount: 2500 },
        { id: '3', type: 'expense', date: d(3), accountId: 'a', amount: 1000 },
        { id: '4', type: 'income', date: d(20), accountId: 'a', amount: 50000 },
        { id: '5', type: 'expense', date: d(200), accountId: 'a', amount: 4000 },
      ],
    }));
    render(<App />);
    fireEvent.click(tab('Money'));
    expect(document.querySelector('h1')).toBeNull(); // keine Überschrift "Accounts" mehr
    const cells = () => [...document.querySelectorAll('.totals .tot')].map((c) => c.textContent);
    const press = (i: number) => fireEvent.click(document.querySelectorAll('.totals .tot')[i]);
    expect(cells()).toEqual(['Networth525,00', '+ Month600,00', '- Month35,00']); // Ausgangslage: Month
    press(1); // Income: weiter zu YTD
    expect(cells()[1]).toMatch(/^\+ YTD/);
    expect(cells()[2]).toMatch(/^- YTD/);
    press(2); // Expense: weiter zu Year
    expect(cells()[1]).toMatch(/^\+ Year/);
    press(0); // Networth schaltet ebenfalls weiter und bleibt selbst gleich
    expect(cells()).toEqual(['Networth525,00', '+ Day100,00', '- Day25,00']);
    press(0);
    expect(cells()).toEqual(['Networth525,00', '+ Week100,00', '- Week35,00']);
    expect(document.querySelector('.totals')!.textContent).not.toMatch(/Assets|Liabilities|Saved/);
  });
});
