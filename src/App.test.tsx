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
const openSettings = (page?: 'Habits' | 'Data') => {
  fireEvent.click(tab('Settings'));
  const row = page && screen.queryByRole('button', { name: page });
  if (row) fireEvent.click(row); // schon auf der Unterseite: nichts zu tun
};
const weekNumber = () => parseInt(document.querySelector('.nav .label')!.textContent!.replace('Week ', ''), 10);

function addHabit(name: string) {
  openSettings('Habits');
  fireEvent.change(screen.getByLabelText('New habit'), { target: { value: name } });
  fireEvent.submit(screen.getByLabelText('New habit').closest('form')!);
}

describe('Start und Tabs', () => {
  it('zeigt fünf Tabs in fester Reihenfolge, Kalender mittig und aktiv, neue Tabs sind leer', () => {
    render(<App />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual(['Profile', 'To-do', 'Calendar', 'Stats', 'Settings']);
    expect(tab('Calendar').getAttribute('aria-selected')).toBe('true');
    for (const [name, view] of [['Profile', 'profile'], ['To-do', 'todo'], ['Stats', 'stats']]) {
      fireEvent.click(tab(name));
      expect(tab(name).getAttribute('aria-selected')).toBe('true');
      expect(document.querySelector(`[data-view="${view}"]`)!.children).toHaveLength(0);
    }
    fireEvent.click(tab('Calendar'));
    expect(screen.getByLabelText('Back to current week')).toBeTruthy();
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
    fireEvent.click(tab('Settings'));
    expect(document.querySelector('[data-view="settings"]')!.classList.contains('view-in')).toBe(true);
  });
});

describe('Einstellungen', () => {
  it('zeigt Konto-Karte und zwei Zeilen, keine Überschrift', () => {
    render(<App />);
    openSettings();
    expect(document.querySelector('h1')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect([...document.querySelectorAll('.row')].map((r) => r.textContent)).toEqual(['Habits', 'Data']);
    expect(document.querySelector('.avatar')).toBeTruthy();
  });

  it('Zeilen öffnen Unterseiten, Zurück führt zur Übersicht, Tab-Wechsel setzt zurück', () => {
    render(<App />);
    openSettings('Habits');
    expect(document.querySelector('h1')!.textContent).toBe('Habits');
    expect(screen.getByLabelText('New habit')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Back to settings'));
    expect(document.querySelectorAll('.row')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Data' }));
    expect(document.querySelector('h1')!.textContent).toBe('Data');
    expect(screen.getByText('Back up')).toBeTruthy();
    fireEvent.click(tab('Calendar'));
    fireEvent.click(tab('Settings'));
    expect(document.querySelectorAll('.row')).toHaveLength(2); // wieder die Übersicht
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
    expect(document.querySelector('.weekarea')!.classList.contains('week-in')).toBe(true);
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
    expect(document.querySelectorAll('.manage li')).toHaveLength(2);
    expect((screen.getByLabelText('New habit') as HTMLInputElement).value).toBe('');
    expect(JSON.parse(localStorage.getItem('habits-v1')!).map((h: { name: string }) => h.name)).toEqual(['Water', 'Read']);

    fireEvent.click(tab('Calendar'));
    expect(document.querySelectorAll('.list li')).toHaveLength(2);
    const todayDot = document.querySelector('.list li .dot.today') as HTMLButtonElement;
    fireEvent.click(todayDot);
    expect(todayDot.getAttribute('aria-pressed')).toBe('true');
    expect(within(document.querySelector('.list li') as HTMLElement).getByText('1 day')).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem('habits-v1')!);
    expect(stored[0].done[keyOf(new Date())]).toBe(true);

    openSettings('Habits');
    fireEvent.click(screen.getByLabelText('Remove Water'));
    expect(document.querySelectorAll('.manage li')).toHaveLength(2); // erster Tipp löscht nicht
    fireEvent.click(screen.getByLabelText('Remove Water'));
    expect(document.querySelectorAll('.manage li')).toHaveLength(1);
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
  const bar = () => document.querySelector('.tabbar-inner')!;

  it('Tipp wählt direkt den Tab mit schneller Animation', () => {
    render(<App />);
    fireEvent.pointerDown(bar(), { clientX: 280, pointerId: 1 });
    fireEvent.pointerUp(bar(), { clientX: 280, pointerId: 1 });
    expect(tab('Settings').getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('.pill')!.classList.contains('fast')).toBe(true);
    fireEvent.pointerDown(bar(), { clientX: 20, pointerId: 1 });
    fireEvent.pointerUp(bar(), { clientX: 20, pointerId: 1 });
    expect(tab('Profile').getAttribute('aria-selected')).toBe('true');
    fireEvent.pointerDown(bar(), { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(bar(), { clientX: 100, pointerId: 1 });
    expect(tab('To-do').getAttribute('aria-selected')).toBe('true');
    fireEvent.pointerDown(bar(), { clientX: 215, pointerId: 1 });
    fireEvent.pointerUp(bar(), { clientX: 215, pointerId: 1 });
    expect(tab('Stats').getAttribute('aria-selected')).toBe('true');
  });

  it('Ziehen: Hover folgt dem Finger, Loslassen wählt den Tab', () => {
    render(<App />);
    fireEvent.pointerDown(bar(), { clientX: 150, pointerId: 1 });
    expect(bar().classList.contains('dragging')).toBe(false); // erst ab 6 px
    fireEvent.pointerMove(bar(), { clientX: 160, pointerId: 1 });
    expect(bar().classList.contains('dragging')).toBe(true);
    expect(tab('Calendar').classList.contains('hover')).toBe(true);
    fireEvent.pointerMove(bar(), { clientX: 290, pointerId: 1 });
    expect(tab('Settings').classList.contains('hover')).toBe(true);
    expect(tab('Calendar').classList.contains('hover')).toBe(false);
    fireEvent.pointerUp(bar(), { clientX: 290, pointerId: 1 });
    expect(tab('Settings').getAttribute('aria-selected')).toBe('true');
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
