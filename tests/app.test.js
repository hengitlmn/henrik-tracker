// Verhaltenstests fuer public/index.html (jsdom). Ausfuehren mit: npm test
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'public', 'index.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://example.test/',
  pretendToBeVisual: true,
  beforeParse(w) { w.scrollTo = function () {}; }   // jsdom kennt scrollTo nicht
});
const w = dom.window, d = w.document;
const $ = (id) => d.getElementById(id);
let fails = 0;
const ok = (c, m) => { if (!c) { console.error('FAIL', m); fails++; } else console.log('ok  ', m); };
const tick = () => new Promise(r => setTimeout(r, 20));

(async () => {
  ok(!d.getElementById('edit'), 'Bearbeiten-Button entfernt');
  ok(!d.getElementById('openSettings') && !d.getElementById('back'), 'alter Zahnrad-/Zurück-Button entfernt');
  ok(d.querySelectorAll('.tabbar .tab').length === 3, 'Tab-Leiste mit 3 Tabs');
  ok($('tabCal').getAttribute('aria-selected') === 'true' && !$('viewMain').hidden, 'Start: Kalender-Tab aktiv');
  ok($('viewWrite').hidden && $('viewWrite').children.length === 0, 'linker Tab leer');
  $('tabWrite').click();
  ok(!$('viewWrite').hidden && $('viewMain').hidden && $('tabWrite').getAttribute('aria-selected') === 'true', 'linker Tab öffnet leere Seite');
  $('tabCal').click();
  ok(!$('viewMain').hidden, 'zurück zum Kalender');

  // Ohne Gewohnheit: Kalender sofort sichtbar, kein Leertext, Formular nur in den Einstellungen
  ok(!$('empty') && !/No habits yet|Noch keine/.test(d.body.textContent), 'kein Leertext');
  ok(!$('week').hidden && !$('nav').hidden && $('week').children.length === 7 && /^Week \d{1,2}$/.test($('weeklabel').textContent), 'Wochenleiste ohne Gewohnheit sichtbar');
  ok($('viewMain').querySelector('form') === null && $('viewSettings').contains($('form')), 'Formular liegt in den Einstellungen');

  // Woche: ISO-Nummer, Datum über Buchstaben, Blättern auch in die Zukunft
  const cells = [...$('week').children];
  ok(cells.map(c => c.querySelector('i').textContent).join('') === 'MTWTFSS', 'Wochentage englisch M T W T F S S');
  ok(cells.every(c => /^\d{2}$/.test(c.querySelector('b').textContent)), 'Datum zweistellig über den Tagen');
  const wk0 = parseInt($('weeklabel').textContent.slice(5), 10);
  ok(!$('next').disabled, 'Weiter-Pfeil nie gesperrt');
  $('next').click(); $('next').click();
  const wk2 = parseInt($('weeklabel').textContent.slice(5), 10);
  ok(wk2 === wk0 + 2 || wk2 <= 2, 'zwei Wochen in die Zukunft');
  ok(!$('next').disabled, 'Weiter-Pfeil danach weiterhin aktiv');
  $('prev').click(); $('prev').click();
  ok(parseInt($('weeklabel').textContent.slice(5), 10) === wk0, 'zurück zur aktuellen Woche');

  // Tipp auf das Datum springt zur aktuellen Woche zurück
  $('next').click(); $('next').click(); $('prev').click(); $('prev').click(); $('prev').click();
  ok(parseInt($('weeklabel').textContent.slice(5), 10) !== wk0, 'andere Woche angezeigt');
  $('head').click();
  ok(parseInt($('weeklabel').textContent.slice(5), 10) === wk0 && cells.length === 7, 'Tipp aufs Datum: aktuelle Woche');

  // Tab-Leiste: Gleiten + Ziehen mit dem Finger
  ok(!!$('pill') && $('tabbar').contains($('pill')), 'Hinterlegung (Pill) in der Tab-Leiste');
  $('tabbar').getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 64, right: 300, bottom: 64 });
  Object.defineProperty($('tabbar'), 'clientWidth', { value: 300, configurable: true });
  const ev = (type, x) => Object.assign(new w.Event(type, { bubbles: true }), { clientX: x, pointerId: 1, button: 0 });
  $('tabbar').dispatchEvent(ev('pointerdown', 150));
  ok(!$('tabbar').classList.contains('dragging'), 'Finger aufgelegt: noch kein Ziehen');
  $('tabbar').dispatchEvent(ev('pointermove', 160));
  ok($('tabCal').classList.contains('hover') && $('tabbar').classList.contains('dragging'), 'Bewegung: Hover auf Kalender');
  $('tabbar').dispatchEvent(ev('pointermove', 290));
  ok($('tabSettings').classList.contains('hover') && !$('tabCal').classList.contains('hover'), 'Ziehen nach rechts: Hover wandert');
  $('tabbar').dispatchEvent(ev('pointerup', 290));
  ok($('tabSettings').getAttribute('aria-selected') === 'true' && !$('viewSettings').hidden && !$('tabbar').classList.contains('dragging'), 'Loslassen wählt Einstellungen');
  ok($('viewSettings').classList.contains('view-in'), 'Ansicht blendet animiert ein');
  $('tabbar').dispatchEvent(ev('pointerdown', 150));
  $('tabbar').dispatchEvent(ev('pointermove', 20));
  $('tabbar').dispatchEvent(ev('pointercancel', 20));
  ok($('tabSettings').getAttribute('aria-selected') === 'true' && !$('tabbar').classList.contains('dragging'), 'Abbruch ändert den Tab nicht');
  // einfacher Tipp: direkt auf Kalender, schnelle Animation
  $('tabbar').dispatchEvent(ev('pointerdown', 150));
  $('tabbar').dispatchEvent(ev('pointerup', 150));
  ok($('tabCal').getAttribute('aria-selected') === 'true' && $('pill').classList.contains('fast'), 'Tipp wählt Tab direkt, schnelle Animation');
  $('tabbar').dispatchEvent(ev('pointerdown', 20));
  $('tabbar').dispatchEvent(ev('pointerup', 20));
  ok($('tabWrite').getAttribute('aria-selected') === 'true', 'Tipp links wählt linken Tab');
  $('tabCal').click();
  ok(!$('viewMain').hidden && $('tabCal').getAttribute('aria-selected') === 'true', 'Klick auf Tab geht weiter');

  // Wischen im Wochenbereich
  const area = $('weekarea');
  const pev = (type, x, y) => Object.assign(new w.Event(type, { bubbles: true }), { clientX: x, clientY: y, pointerId: 2, button: 0 });
  const wkNow = () => parseInt($('weeklabel').textContent.slice(5), 10);
  const base = wkNow();
  area.dispatchEvent(pev('pointerdown', 250, 100)); area.dispatchEvent(pev('pointerup', 120, 105));
  ok(wkNow() !== base && area.classList.contains('week-in'), 'Wischen nach links: nächste Woche');
  area.dispatchEvent(pev('pointerdown', 100, 100)); area.dispatchEvent(pev('pointerup', 230, 98));
  ok(wkNow() === base, 'Wischen nach rechts: zurück');
  area.dispatchEvent(pev('pointerdown', 100, 100)); area.dispatchEvent(pev('pointerup', 130, 100));
  ok(wkNow() === base, 'kurzer Wisch ändert nichts');
  area.dispatchEvent(pev('pointerdown', 100, 100)); area.dispatchEvent(pev('pointerup', 190, 220));
  ok(wkNow() === base, 'diagonal/vertikal ändert nichts');
  ok($('nav').firstElementChild === $('prev') && $('nav').lastElementChild === $('next'), 'Pfeile links und rechts in der Wochenzeile');
  area.dispatchEvent(pev('pointerdown', 250, 100)); area.dispatchEvent(pev('pointerup', 120, 100));
  $('head').click();
  ok(wkNow() === base, 'Datum-Tipp nach Wischen: aktuelle Woche');

  // Gewohnheiten anlegen + abhaken
  for (const n of ['Wasser trinken', 'Lesen']) {
    $('input').value = n;
    $('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  }
  d.querySelector('li .dot.today').click();
  ok(d.querySelectorAll('#list li').length === 2, '2 Gewohnheiten');

  // Einstellungen öffnen
  $('tabSettings').click();
  ok($('viewMain').hidden && !$('viewSettings').hidden && $('tabSettings').getAttribute('aria-selected') === 'true', 'Einstellungs-Tab öffnet sich');
  ok(d.querySelectorAll('#manage li').length === 2, 'Verwalten-Liste zeigt 2');
  $('input').value = 'Dehnen';
  $('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  ok(d.querySelectorAll('#manage li').length === 3 && $('input').value === '', 'Hinzufügen in Einstellungen aktualisiert Liste');
  d.querySelectorAll('#manage .remove')[2].click(); d.querySelectorAll('#manage .remove')[2].click();
  ok(d.querySelectorAll('#manage li').length === 2, 'Test-Gewohnheit wieder entfernt');

  // Entfernen mit Doppeltipp
  d.querySelector('#manage .remove').click();
  ok(d.querySelectorAll('#manage li').length === 2, 'erster Tipp löscht nicht');
  d.querySelector('#manage .remove').click();
  ok(d.querySelectorAll('#manage li').length === 1, 'zweiter Tipp entfernt');

  // Kopieren (jsdom hat keine Zwischenablage -> Fallback-Box)
  $('copy').click(); await tick();
  const exported = $('exportBox').hidden ? null : $('exportBox').value;
  ok(exported && JSON.parse(exported).habits.length === 1, 'Fallback zeigt Code, 1 Gewohnheit');

  // Zwischenablage simulieren
  let clip = '';
  Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: (t) => { clip = t; return Promise.resolve(); } }, configurable: true });
  $('copy').click(); await tick();
  ok(JSON.parse(clip).app === 'habits' && /Code copied/.test($('msg').textContent), 'Clipboard-Pfad: kopiert');
  ok($('exportBox').hidden, 'Fallback-Box wieder versteckt');

  // Wiederherstellen: neue Version hat 1 andere Gewohnheit
  $('closeX')?.click();
  $('importBox').value = clip;
  $('importBox').dispatchEvent(new w.Event('input'));
  $('restore').click();
  ok(/Tap again/.test($('msg').textContent) && /1 current/.test($('msg').textContent), 'Bestätigung nennt Zahlen');
  // Ändere die lokalen Daten, damit Ersetzen sichtbar wird
  $('restore').click();
  ok(/Restored: 1 habit/.test($('msg').textContent), 'Wiederhergestellt');
  ok(JSON.parse(w.localStorage.getItem('habits-v1')).length === 1, 'localStorage aktualisiert');

  // Altes Array-Format aus der vorherigen App-Version
  const old = JSON.stringify([{ id: 'abc', name: 'Altes Habit', done: { '2026-09-30': true, 'quatsch': true } }, { id: 'def', name: 'Zweites', done: {} }]);
  $('importBox').value = old;
  $('importBox').dispatchEvent(new w.Event('input'));
  $('restore').click(); $('restore').click();
  const st = JSON.parse(w.localStorage.getItem('habits-v1'));
  ok(st.length === 2 && st[0].name === 'Altes Habit', 'altes Array-Format importiert');
  ok(Object.keys(st[0].done).length === 1, 'ungültige Datumsschlüssel verworfen');

  // Ungültig / leer
  $('importBox').value = 'quatsch';
  $('restore').click();
  ok(/not a valid/.test($('msg').textContent), 'ungültiger Code abgelehnt');
  $('importBox').value = '';
  $('restore').click();
  ok(/Paste a code/.test($('msg').textContent), 'leeres Feld: Hinweis');
  ok(!(JSON.parse(w.localStorage.getItem('habits-v1')).length !== 2), 'Daten unverändert nach Fehlern');

  // Datei laden
  const file = new w.File([old], 'x.json', { type: 'application/json' });
  const fi = $('fileInput');
  Object.defineProperty(fi, 'files', { value: [file], configurable: true });
  fi.dispatchEvent(new w.Event('change')); await new Promise(r => setTimeout(r, 80));
  ok($('importBox').value === old, 'Datei in Eingabefeld geladen');

  // Datei sichern (share-Pfad simulieren)
  let shared = null;
  w.navigator.canShare = () => true;
  w.navigator.share = (o) => { shared = o; return Promise.resolve(); };
  $('saveFile').click(); await tick();
  ok(shared && shared.files[0].name.startsWith('habits-backup-'), 'Share-Sheet mit Datei');

  // Zurück
  $('tabCal').click();
  ok(!$('viewMain').hidden && $('viewSettings').hidden, 'Kalender-Tab zeigt Hauptansicht');
  ok(d.querySelectorAll('#list li').length === 2, 'Hauptansicht zeigt wiederhergestellte Daten');

  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
