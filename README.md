# Doxie Diary

**Dein Hund. Dein Alltag. Ein Ort für alles.**
Modernes digitales Hundetagebuch mit Schwerpunkt Physiotherapie – als PWA, später auch nativ über Capacitor.

> Status: **Phase 1 – interaktiver Frontend-Prototyp mit Beispieldaten.** Es gibt noch kein Backend; alle Daten bleiben im `localStorage` des Browsers.

## Schnellstart (Windows, macOS, Linux)

Voraussetzung: Node.js ≥ 20.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Unit-Tests (Vitest)
npm run build      # statischer Build nach dist/
npm run preview    # Build lokal ansehen
```

Im Prototyp auf der Willkommensseite **„Prototyp mit Beispieldaten ansehen“** wählen. Unter *Konto → Beispieldaten zurücksetzen* lässt sich alles wiederherstellen.

Für eine Ansicht auf dem Smartphone im selben WLAN: `npm run dev -- --host` und die angezeigte Netzwerk-Adresse öffnen.

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [docs/01-produktkonzept.md](docs/01-produktkonzept.md) | Leitgedanken, Informationsarchitektur, Seiten, Navigation |
| [docs/02-designsystem.md](docs/02-designsystem.md) | Farben, Typografie, Komponenten, Bewegung, Diagramme |
| [docs/03-architektur.md](docs/03-architektur.md) | Stack, STRATO-Checkliste, API, DB-Schema, Sicherheit, Backup, Capacitor, Therapeut:innen |
| [docs/04-entwicklungsplan.md](docs/04-entwicklungsplan.md) | Phasen, Prioritäten, Fortschritt |

## Projektstruktur

```
src/
  components/ui/       Designsystem-Bausteine (Button, Card, Sheet, Felder, ProgressRing …)
  components/layout/   AppShell (Bottom Navigation / Sidebar), Hund-Wechsler, PageHeader
  features/            dashboard · dogs · physio · diary · account · auth
  data/                Domänentypen, Kategorien-Metadaten, Beispieldaten
  store/               Zustand (Prototyp) + Selektoren für Statistiken
  lib/                 Datum, Formatierung, Bildverkleinerung
docs/                  Konzept & Architektur
```

## Build-Varianten

| Variable | Zweck |
|---|---|
| `VITE_BASE=/doxie/` | Deployment in einen Unterordner |
| `VITE_ROUTER=hash` | Hash-URLs (Vorschau ohne Server-Rewrite) |
| `npm run build:preview` | Vorschau-Build mit relativen Pfaden + Hash-Routing nach `dist-showcase/` |
