# Habit Tracker (PWA)

Minimalistischer Habit Tracker, der auf dem iPhone als App vom Home-Bildschirm läuft (PWA, kein native App).
Stack: React 19, TypeScript, Vite, `vite-plugin-pwa`, Tests mit Vitest und Testing Library. Gehostet auf Vercel,
automatisch gebaut bei jedem Push auf `main`. Daten nur in `localStorage`, kein Backend.
Der Nutzer schreibt auf Deutsch, antworte auf Deutsch (kurz und konkret, bei komplexen Themen ausführlicher).

## Struktur

- `index.html`: Vite-Einstiegsseite (Meta-Tags, Google-Fonts-Link, `#root`)
- `src/main.tsx`: Einstieg, Zoom-Sperre (Gesten-Events), Service-Worker-Registrierung
- `src/App.tsx`: Tab-Zustand, Ansichtswechsel mit Animation, Abhaken
- `src/hooks.ts`: `useHabits` (localStorage, speichert nur bei Änderungen), `useToday`, `useWeekNav`
- `src/components/`: `CalendarView` (Kopf, Wochenzeile, Karten, Wischen), `TodoView`, `SettingsView` (Übersicht) mit
  `HabitsSettings` und `DataSettings`, `MoneyView` (Konten, Kontoseite) mit `EntryForm`, `EntryDays` (Einträge nach Tagen), `MoneyStats`, `MoneyCalendar`, `MonthNav`, `MoneySettings`, `SettingsSheet` (Blatt von unten mit X), `TabBar` (Pille, Ziehen, langes Drücken)
- `src/lib/`: `dates.ts` (Woche, ISO-Woche, Streak), `money.ts` (Salden, Format, Betrag lesen, Prüfung), `stats.ts` (Monatssummen, Kategorien, Suche), `storage.ts`, `backup.ts` (Export/Import/Kopieren), `id.ts`
- `src/styles.css`: gesamtes Design (CSS-Variablen auf `:root`)
- `src/**/*.test.ts(x)`: Tests (jsdom). `src/test-setup.ts` leert `localStorage` nach jedem Test.
- `public/`: nur die Icons (`icon-180/192/512.png`). Manifest und Service Worker erzeugt der Build.
- `vite.config.ts`: Vite, PWA-Manifest, Workbox
- `tools/make_icons.py`: erzeugt die Icons aus `assets/logo-original.png`
- `assets/logo-original.png`: Original-Logo (schwarzes H auf Weiß)
- Git-Tag `legacy-vanilla`: letzter Stand der alten Version (reines HTML/CSS/JS in `public/index.html`)

## Befehle

- `npm install` einmalig, dann `npm test` (muss nach jeder Änderung grün sein) und `npm run typecheck`
- `npm run dev` startet den Entwicklungsserver auf http://localhost:5173
- `npm run build` erzeugt `dist/`, `npm run preview` zeigt den gebauten Stand auf http://localhost:4173
- `npm run icons` baut die Icons neu (braucht Python mit Pillow)

## Wichtige Regeln

1. **Kein Cache-Hochzählen mehr nötig:** Der Service Worker wird beim Build erzeugt und aktualisiert sich selbst.
   Nach einem Deploy muss die App auf dem iPhone trotzdem einmal komplett geschlossen und neu geöffnet werden.
2. **Daten liegen nur im Browser:** `localStorage`, Schlüssel `habits-v1`. Jede Adresse und jede installierte
   Home-Bildschirm-App hat eigenen Speicher. Den Schlüssel oder das Datenformat nie ohne Migration ändern.
   Den Hosting-Anbieter oder die Adresse nur ändern, wenn vorher gesichert wird (am besten eigene Domain nutzen).
3. **Neue Abhängigkeiten bewusst wählen** (App klein und schnell halten). Schriften nur per Google-Fonts-Link.
4. **Keine sichtbare Scroll-Leiste** (in `styles.css` ausgeblendet, Scrollen funktioniert weiter).
5. **Zoom bleibt gesperrt** (Viewport-Meta, `touch-action`, Gesten-Events). Eingabefelder mindestens 16px Schrift.
6. **Tests dürfen `localStorage` nutzen**, es wird nach jedem Test geleert (`src/test-setup.ts`).
7. **Scroll-Prinzip für jede Seite:** Kopfbereiche bleiben beim Scrollen fest (`position: sticky; top: 0`, mit
   `margin-top: -34px; padding-top: 34px` gegen das obere Padding von `main`, Hintergrund `var(--bg)`, kleiner
   Ausblendverlauf darunter), nur der Inhalt scrollt darunter durch. Beispiele: Tag/Datum/Wochenzeile im Kalender,
   "‹ Settings" plus Titel auf Unterseiten. Bei neuen Seiten selbst entscheiden, was fest bleibt (Titel, Zurück,
   Filter, Wochenleiste), ohne dass der Nutzer es jedes Mal sagt. "Add"-Buttons stehen unter dem letzten Eintrag.
8. **Dateien nie mit `open(f, 'w')` im selben Ausdruck lesen und schreiben** (leert die Datei). Erst lesen, dann schreiben.

## Datenformat

Intern: Array von `{ id: string, name: string, done: { "YYYY-MM-DD": true }, color?: "#RRGGBB" }`.
`color` ist optional (Farbe der abgehakten Kreise, ohne Angabe der Akzent); alte Daten ohne `color` bleiben gültig.

To-dos: eigener Schlüssel `todos-v1`, Array von `{ id: string, title: string, completedAt?: ISO-Zeitpunkt }` (kein `completedAt` = offen).

Money: eigener Schlüssel `money-v1`, `{ groups: [{id,name}], accounts: [{id,groupId,name,start}], entries: [{id,type:"income"|"expense"|"transfer",date:"YYYY-MM-DD",accountId,toAccountId?,category?,amount,note?}], categories: {income:[],expense:[]}, budgets: [{category,limit}] }`.
`budgets` (Monatslimit je Ausgaben-Kategorie, Cent, eins pro Kategorie) ist neu und optional: fehlt es, gilt eine leere Liste.
Alle Beträge in Cent (ganze Zahlen, `amount` immer positiv). Kontostand = `start` + Einträge (Überweisung: Quelle minus, Ziel plus).
Anzeige deutsch (`€ 1.057,60`), Eingabe `12,5` oder `12.50`. Ungültige Teile fallen beim Laden/Import weg (`parseMoney`).

Sicherung (Export): `{ app: "habits", version: 1, exported: ISO-Datum, habits: [...], todos: [...], money: {...} }`.
`money` ist wie `todos` optional beim Import (fehlt es, bleibt Money unverändert). `todos` ist optional beim Import: fehlt es (ältere Datei), bleiben die aktuellen To-dos unverändert.
Der Import akzeptiert zusätzlich das ältere reine Array-Format und verwirft ungültige Datumsschlüssel.
Wiederherstellen ersetzt die aktuellen Daten (Datei wählen, dann mit "Confirm" bestätigen).

## Design-Entscheidungen

- Minimalistisch und nur dunkel (kein Light-/Dark-Theme): Hintergrund `#121212`, helle Schrift `#F2F2F0`,
  ein Akzent (`#6F85FF`). Farben als CSS-Variablen auf `:root`.
- Schrift: Hanken Grotesk für den Text. Das Datum oben nutzt `"Arial Black"`, dann `"Archivo Black"`
  (Google Fonts als Ersatz, weil iOS Arial Black nicht hat), dann Arial. Dafür `font-weight: 900` und
  `font-synthesis: none`, damit nichts künstlich fett wird.
- Oben mittig: Wochentag (englisch) über dem Datum im Format `03. October` (englisch), vertikal mittig
  zwischen Bildschirmrand und Wochenzeile. Kein Fortschrittstext und kein Balken mehr.
- **Die gesamte App-Oberfläche ist englisch, auch alle künftigen Texte** (Buttons, Hinweise, Fehlermeldungen,
  aria-labels, Dateinamen). Nur die Kommunikation mit dem Nutzer im Chat bleibt deutsch.
- Wochenanzeige oben: `Week 41` (ISO-Kalenderwoche), darunter pro Tag das Datum (`01`–`31`) über dem Buchstaben
  (M T W T F S S). Jede Gewohnheit ist eine abgerundete Karte (`--bar`) mit Name links, Streak als Pille rechts und 7 Kreisen
  (Montag bis Sonntag), gleiche Innenabstände wie die Wochenzeile, damit alles im Raster bleibt. Vergangene Tage nachtragbar, zukünftige Tage
  gesperrt, aber man kann mit ‹ › beliebig weit in zukünftige Wochen blättern. Tipp auf das Datum oben
  springt zurück zur aktuellen Woche. Tag, Datum und Wochenzeile sind beim Scrollen fest (`position: sticky`),
  die Gewohnheits-Karten laufen darunter durch (weicher Ausblendverlauf). Im ganzen Wochenbereich (leicht breiter als die Seite) wechselt
  Wischen nach links/rechts die Woche. Die Pfeile ‹ › stehen mittig über Montag und Sonntag (7-Spalten-Raster). Streak = Tage in Folge bis heute (oder bis gestern).
- Untere Tab-Leiste mit fünf Tabs, schwebende abgerundete Kapsel im Liquid-Glass-Stil (durchscheinend mit `backdrop-filter`, feiner Rand, bewusst kein Schlagschatten, Inhalt scheint weichgezeichnet durch) am unteren Rand (mit Safe-Area-Abstand für das
  iPhone, bewusst tief), aktiver Tab mit runder Hinterlegung, die beim Wechsel gleitet. Ein einfacher Tipp lässt sie schneller
  rübergleiten. Man kann mit dem Finger über die Leiste ziehen (ab ca. 6 px Bewegung), die Hinterlegung folgt, Loslassen wählt den Tab. Beim Tab-Wechsel blendet die Ansicht
  kurz ein (leichter Schub von der Seite):
  - von links nach rechts: To-do (Haken im Kreis), Money (Geldschein), Kalender (Mitte, beim Start aktiv,
    Icon ist ein H im Stil des App-Logos), Gym (Hantel), Notes (Notizblatt)
  - Gym und Notes sind bewusst noch leer (für spätere Features)
  - Money-Tab (Vorbild: Money-Manager-App aus den Screenrecordings des Nutzers): fester Kopf ohne Überschrift mit
    drei Spalten mittig: "Networth" (Gesamtstand aller Konten, weißer Titel, Betrag blau, bei Minus rot), "+ Month"
    (Einnahmen, blau) und "- Month" (Ausgaben, rot). Ein Tipp auf irgendeine der drei Zellen schaltet den Zeitraum von
    + und - gemeinsam weiter (Networth bleibt gleich): Month ist die Ausgangslage, dann YTD (seit 1.1.) → Year (365 Tage) →
    Day (heute) → Week (7 Tage) → Month (30 Tage). Überweisungen zählen nie
    (Assets/Liabilities und Saved gibt es nicht mehr),
    darunter Abschnitte (Gruppen) als Kopfzeile mit Summe (blau, negativ rot) und
    Konten als Zeilen in einer Karte. Tipp auf ein Konto: Kontoseite mit "‹ Accounts", Monatswahl, Deposit /
    Withdrawal / Total / Balance und den Einträgen nach Tagen; Plus-Button unten rechts über der Leiste. Plus öffnet
    das Formular: Income / Expense / Transfer, Date, Account (Transfer: From/To), Category (Auswahl-Raster mit "Add"),
    Amount, Note, "Save" und "Continue" (speichert und bleibt offen). Tipp auf einen Eintrag = ändern/löschen.
    Monatswechsel auch per Wischen (wie die Woche im Kalender). Plus-Button hängt per Portal an `document.body`
    (sonst verschiebt die Einblend-Animation der Ansicht das `position: fixed`).
    Doppeltipp auf das Money-Icon: kleines Glas-Menü über dem Icon mit Accounts / Stats / Calendar (Bereiche innerhalb
    des Money-Tabs).
    Stats (Monat mit ‹ › und Wischen): Net-Karte (Income/Expense/Entries, Sparquote), Budgets je Kategorie mit Fortschrittsbalken
    (blau, ab 80 % gelb, über 100 % rot; Tipp = Limit ändern/entfernen, "+ Budget" unten), Kreisdiagramm der Ausgaben nach
    Kategorie mit Legende, Balken Income/Expense der letzten 6 Monate. Überweisungen zählen nicht als Einnahme/Ausgabe.
    Calendar: alle Einträge aller Konten untereinander, neueste Tage oben, im Stil der Kontoseite; fester Kopf mit Suche
    (alle Wörter müssen passen: Notiz, Kategorie, Konto, Typ, Betrag, Tag wie `08.10.`, `2026-10`, `Thu`, `October`)
    und Tagesfilter (Kalender-Knopf); Tipp auf einen Eintrag öffnet ihn zum Ändern.
    Noch nicht gebaut: Budget pro Konto/Jahr, Wiederholungen, Fotos, Konten ausblenden/sortieren, Gebühren bei Überweisungen.
  - Settings ist kein Tab mehr: Lange auf die Leiste drücken (350 ms). Die Leiste gibt kurz nach (`squish`) und spuckt
    wie ein Wassertropfen ein kleines Glas-Menü "Settings" nach oben aus (Dehnen/Stauchen, ohne Zusatzblase,
    bewusst keine Vibration, iOS kennt `navigator.vibrate` nicht). Tipp darauf öffnet die Settings
    als Blatt, das von unten hochfährt, oben rechts schließt ein X (auch Tipp auf den abgedunkelten Hintergrund).
    Langes Drücken wählt keinen Tab; Ziehen über die Leiste bricht es ab.
  - To-do-Tab (Vorbild: To-do-App aus dem Screen-Recording des Nutzers): fester Kopf "Today" plus Datum (`Sat 3. Oct`),
    Aufgaben als einfache Zeilen mit Kästchen und fettem Titel, darunter ein "+" (Tipp öffnet eine Eingabezeile, Enter
    fügt hinzu und lässt sie offen). Abhaken verschiebt die Aufgabe unter "Hide completed" (auf-/zuklappbar) mit
    Zeitstempel (`3. Oct 14:55`), Rückgängig setzt sie an die ursprüngliche Stelle. Tipp auf den Titel = umbenennen,
    Papierkorb daneben = löschen. Noch nicht gebaut: Datum/Uhrzeit, Tags, Detail-Sheet, Suche, Sortieren, Erinnerungen,
    Wiederholung, Dauer, roter Plus-Button (bewusst auf später verschoben).
- Hauptansicht zeigt Wochenleiste und Kalender immer, auch ohne Gewohnheit (kein Leertext).
- Einstellungen (im Blatt) im Stil der iOS-Einstellungen, ohne Überschrift: oben eine große Konto-Karte (graues rundes
  Profilbild, "Sign in", Chevron; Funktion folgt später), darunter Zeilen mit farbiger Icon-Kachel und Chevron:
  "Money" (Unterseite: Abschnitte und Konten anlegen, Startguthaben optional, Entfernen per Doppeltipp; entfernt auch die Einträge des Kontos) und "Habits" (Unterseite: zunächst nur ein grauer "+ Add"-Button; Tipp öffnet ein Eingabefeld; jede Gewohnheit erscheint
  darunter als graue Karte mit Name, Entfernen per Doppeltipp und Farbwahl für die abgehakten Kreise, 7 Farben) und "Data" (Unterseite: zwei
  Buttons nebeneinander, "Back up" speichert eine Datei über das Teilen-Menü, "Restore" wählt eine Datei und
  braucht dann "Confirm"). Unterseiten haben oben links "‹ Settings" zum Zurückgehen. Schließen des Blatts setzt
  die Einstellungen auf die Übersicht zurück. Code kopieren/einfügen gibt es nicht mehr.
- Alle Icons sind einfache Inline-SVGs mit `currentColor`, Strichstärke 1.6.

## App-Icon

iOS rundet Icons selbst ab und füllt Transparenz schwarz. Das Icon muss ein quadratisches, deckendes PNG
ohne vorgerundete Ecken sein. `tools/make_icons.py` füllt die schwarzen Ecken des Originals weiß auf.
iOS speichert das Icon beim "Zum Home-Bildschirm"-Hinzufügen: Nach einer Icon-Änderung muss die App
vom Home-Bildschirm gelöscht und neu hinzugefügt werden (vorher Daten über die Einstellungen sichern).

## Deployment

Git-Repository auf GitHub, Vercel baut bei jedem Push auf `main` (Build `npm run build`, Ausgabe `dist`).
Andere Branches und Pull Requests bekommen eine eigene Vorschau-Adresse zum Testen auf dem iPhone.
Auf dem iPhone in Safari öffnen, Teilen, "Zum Home-Bildschirm". Das Vercel-Projekt muss öffentlich erreichbar
sein (kein Passwortschutz), sonst lädt iOS das Icon nicht und zeigt nur ein H auf Schwarz.
Umzug von Netlify: einmal Daten sichern, neue Adresse hinzufügen, wiederherstellen, alte App löschen.

## Offene Punkte / Ideen

- Money-, Gym- und Notes-Tab sind leer, Inhalt noch offen.
- Echtes Gerätetesten steht aus: Zoom-Sperre, Schrift (Archivo Black), Teilen-Menü bei "Als Datei sichern",
  Offline-Start. Bei Problemen zuerst dort prüfen.
