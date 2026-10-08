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
  it('zeigt fünf Tabs in fester Reihenfolge, Kalender mittig und aktiv, Gym und Notes sind noch leer', () => {
    render(<App />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual(['To-do', 'Money', 'Calendar', 'Gym', 'Notes']);
    expect(tab('Calendar').getAttribute('aria-selected')).toBe('true');
    for (const [name, view] of [['Gym', 'gym'], ['Notes', 'notes']]) {
      fireEvent.click(tab(name));
      expect(tab(name).getAttribute('aria-selected')).toBe('true');
      expect(document.querySelector(`[data-view="${view}"]`)!.children).toHaveLength(0);
    }
    fireEvent.click(tab('Calendar'));
    expect(screen.getByLabelText('Back to current week')).toBeTruthy();
  });

  it('Kopf, Datum und Wochenzeile liegen im festen Bereich, die Karten außerhalb', () => {
    localStorage.setItem('habits-v1', JSON.stringify([{ id: 'a', name: 'Run', done: {} }]));
    render(<App />);
    const top = document.querySelector('.sticky-top')!;
    expect(top.querySelector('.head')).toBeTruthy();
    expect(top.querySelector('.nav')).toBeTruthy();
    expect(top.querySelector('.week')).toBeTruthy();
    expect(top.querySelector('.list')).toBeNull();
    expect(document.querySelector('.list')!.closest('.sticky-top')).toBeNull();
  });

  it('zeigt ohne Gewohnheit sofort die Wochenzeile und keinen Leertext', () => {
    render(<App />);
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
    expect(tab('Calendar').getAttribute('aria-selected')).toBe('true'); // langes Drücken wählt keinen Tab
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
  const addTodo = (title: string) => {
    fireEvent.change(screen.getByLabelText('New to-do'), { target: { value: title } });
    fireEvent.submit(screen.getByLabelText('New to-do').closest('form')!);
  };
  const titles = (sel: string) => [...document.querySelectorAll(`${sel} .todotitle`)].map((e) => e.textContent);

  it('zeigt "Today" mit Datum und nur ein Plus, sonst nichts', () => {
    render(<App />);
    openTodo();
    expect(document.querySelector('.sticky-top h1')!.textContent).toBe('Today');
    expect(document.querySelector('.todate')!.textContent).toMatch(/^[A-Z][a-z]{2} \d{1,2}\. [A-Z][a-z]{2}$/);
    expect(screen.getByRole('button', { name: 'Add to-do' })).toBeTruthy();
    expect(document.querySelectorAll('.todorow')).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/completed/i);
  });

  it('Plus öffnet eine Zeile, Enter fügt hinzu und bleibt offen, leer + Blur schließt', () => {
    render(<App />);
    openTodo();
    fireEvent.click(screen.getByRole('button', { name: 'Add to-do' }));
    addTodo('Buy milk');
    addTodo('Call mom');
    expect(titles('.todos')).toEqual(['Buy milk', 'Call mom']);
    const input = screen.getByLabelText('New to-do') as HTMLInputElement;
    expect(input.value).toBe(''); // bereit für die nächste Aufgabe
    fireEvent.submit(input.closest('form')!); // leer: nichts passiert
    expect(titles('.todos')).toHaveLength(2);
    fireEvent.blur(input);
    expect(screen.queryByLabelText('New to-do')).toBeNull();
    expect(JSON.parse(localStorage.getItem('todos-v1')!).map((t: { title: string }) => t.title)).toEqual(['Buy milk', 'Call mom']);
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

  it('Tipp auf den Titel bearbeitet, Papierkorb löscht', () => {
    localStorage.setItem('todos-v1', JSON.stringify([{ id: 'a', title: 'Old' }, { id: 'b', title: 'Keep' }]));
    render(<App />);
    openTodo();
    fireEvent.click(screen.getByText('Old'));
    const edit = screen.getByLabelText('Edit to-do') as HTMLInputElement;
    fireEvent.change(edit, { target: { value: 'New name' } });
    fireEvent.keyDown(edit, { key: 'Enter' });
    expect(titles('.todos')).toEqual(['New name', 'Keep']);

    fireEvent.click(screen.getByText('Keep'));
    fireEvent.change(screen.getByLabelText('Edit to-do'), { target: { value: '   ' } }); // leer: Titel bleibt
    fireEvent.blur(screen.getByLabelText('Edit to-do'));
    expect(titles('.todos')).toEqual(['New name', 'Keep']);

    fireEvent.click(screen.getByText('New name'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete: New name' }));
    expect(titles('.todos')).toEqual(['Keep']);
    expect(JSON.parse(localStorage.getItem('todos-v1')!)).toHaveLength(1);
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
    expect(tab('Gym').getAttribute('aria-selected')).toBe('true');
  });

  it('Ziehen: Hover folgt dem Finger, Loslassen wählt den Tab', () => {
    render(<App />);
    fireEvent.pointerDown(bar(), { clientX: 150, pointerId: 1 });
    expect(bar().classList.contains('dragging')).toBe(false); // erst ab 6 px
    fireEvent.pointerMove(bar(), { clientX: 160, pointerId: 1 });
    expect(bar().classList.contains('dragging')).toBe(true);
    expect(tab('Calendar').classList.contains('hover')).toBe(true);
    fireEvent.pointerMove(bar(), { clientX: 290, pointerId: 1 });
    expect(tab('Notes').classList.contains('hover')).toBe(true);
    expect(tab('Calendar').classList.contains('hover')).toBe(false);
    fireEvent.pointerUp(bar(), { clientX: 290, pointerId: 1 });
    expect(tab('Notes').getAttribute('aria-selected')).toBe('true');
    expect(bar().classList.contains('dragging')).toBe(false);
  });

  it('Abbruch ändert den Tab nicht', () => {
    render(<App />);
    fireEvent.pointerDown(bar(), { clientX: 150, pointerId: 1 });
    fireEvent.pointerMove(bar(), { clientX: 20, pointerId: 1 });
    fireEvent.pointerCancel(bar(), { pointerId: 1 });
    expect(tab('Calendar').getAttribute('aria-selected')).toBe('true');
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
    expect(document.querySelector('.totals')!.textContent).toMatch(/100,50.*0,00.*100,50/);
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
    expect(document.querySelector('.sum')!.textContent).toMatch(/Withdrawal12,50/);
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
});
