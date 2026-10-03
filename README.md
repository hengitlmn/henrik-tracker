# Habit Tracker

Minimalistischer Habit Tracker als PWA für das iPhone. React, Vite und TypeScript.
Daten bleiben lokal im Browser (`localStorage`, Schlüssel `habits-v1`).

## Entwickeln

```bash
npm install        # einmalig
npm run dev        # http://localhost:5173 (im WLAN auch vom iPhone erreichbar)
npm test           # Tests (Vitest)
npm run build      # Produktionsbuild nach dist/
npm run preview    # gebauten Stand lokal ansehen (http://localhost:4173)
```

## Veröffentlichen

Jeder Push auf `main` baut und veröffentlicht automatisch (Vercel, Build-Befehl `npm run build`,
Ausgabeordner `dist`). Auf dem iPhone die Adresse in Safari öffnen, Teilen, "Zum Home-Bildschirm".

Der Service Worker (Offline-Cache) wird beim Build automatisch erzeugt und aktualisiert sich selbst.
Nach einem Update die App auf dem iPhone einmal komplett schließen und neu öffnen.

Mehr Details für die Weiterentwicklung stehen in `CLAUDE.md`.
