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
- `src/components/`: `CalendarView` (Kopf, Wochenzeile, Karten, Wischen), `SettingsView`, `TabBar` (Pille, Ziehen)
- `src/lib/`: `dates.ts` (Woche, ISO-Woche, Streak), `storage.ts`, `backup.ts` (Export/Import/Kopieren), `id.ts`
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
4. **Zoom bleibt gesperrt** (Viewport-Meta, `touch-action`, Gesten-Events). Eingabefelder mindestens 16px Schrift.
5. **Tests dürfen `localStorage` nutzen**, es wird nach jedem Test geleert (`src/test-setup.ts`).
6. **Dateien nie mit `open(f, 'w')` im selben Ausdruck lesen und schreiben** (leert die Datei). Erst lesen, dann schreiben.

## Datenformat

Intern: Array von `{ id: string, name: string, done: { "YYYY-MM-DD": true } }`.

Sicherung (Export): `{ app: "habits", version: 1, exported: ISO-Datum, habits: [...] }`.
Der Import akzeptiert zusätzlich das ältere reine Array-Format und verwirft ungültige Datumsschlüssel.
Wiederherstellen ersetzt die aktuellen Daten (mit Bestätigung per zweitem Tipp).

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
  springt zurück zur aktuellen Woche. Im ganzen Wochenbereich (leicht breiter als die Seite) wechselt
  Wischen nach links/rechts die Woche. Die Pfeile ‹ › stehen mittig über Montag und Sonntag (7-Spalten-Raster). Streak = Tage in Folge bis heute (oder bis gestern).
- Untere Tab-Leiste mit drei Tabs, schwebende abgerundete Kapsel am unteren Rand (mit Safe-Area-Abstand für das
  iPhone, bewusst tief), aktiver Tab mit runder Hinterlegung, die beim Wechsel gleitet. Ein einfacher Tipp lässt sie schneller
  rübergleiten. Man kann mit dem Finger über die Leiste ziehen (ab ca. 6 px Bewegung), die Hinterlegung folgt, Loslassen wählt den Tab. Beim Tab-Wechsel blendet die Ansicht
  kurz ein (leichter Schub von der Seite):
  - links: Stift-Symbol, Seite ist bewusst noch leer (für ein späteres Feature)
  - Mitte: Kalender-Symbol, die Hauptansicht (beim Start aktiv)
  - rechts: Einstellungs-Symbol (zwei Schieberegler)
- Hauptansicht zeigt Wochenleiste und Kalender immer, auch ohne Gewohnheit (kein Leertext).
- Einstellungen: Neue Gewohnheit anlegen (Eingabefeld ganz oben), Gewohnheiten entfernen (zweiter Tipp bestätigt), Daten sichern (Code kopieren oder als Datei
  über das Teilen-Menü), Daten wiederherstellen (Code einfügen oder Datei laden).
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

- Linker Tab (Stift) ist leer, Inhalt noch offen.
- Echtes Gerätetesten steht aus: Zoom-Sperre, Schrift (Archivo Black), Teilen-Menü bei "Als Datei sichern",
  Offline-Start. Bei Problemen zuerst dort prüfen.
