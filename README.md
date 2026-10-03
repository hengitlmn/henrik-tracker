# Habit Tracker

Minimalistischer Habit Tracker als PWA für das iPhone. Daten bleiben lokal im Browser (localStorage).

## Lokal starten

```bash
npm install        # einmalig, nur für die Tests
npm run serve      # http://localhost:8080
npm test           # Verhaltenstests
```

## Veröffentlichen

Den Ordner `public/` auf Netlify ziehen (app.netlify.com/drop, später unter Deploys des Projekts).
Auf dem iPhone die Adresse in Safari öffnen, Teilen, "Zum Home-Bildschirm".

Vor jedem Update in `public/sw.js` die Nummer bei `CACHE` erhöhen.

Mehr Details für die Weiterentwicklung stehen in `CLAUDE.md`.
