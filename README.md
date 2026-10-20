# Doxie Diary

**Dein Hund. Dein Alltag. Ein Ort für alles.**
Modernes digitales Hundetagebuch mit Schwerpunkt Physiotherapie – als PWA, später auch nativ über Capacitor.

> Status: **Version 0.4** für https://www.doxiediary.de/doxiediary/. Konten mit E-Mail-Bestätigung, Hundeprofile, Physiotherapie und Tagebuch auf dem Server, Rückblick und Tierarzt-Bericht als PDF, Admin-Bereich mit verschlüsseltem Backup, installierbare PWA. Der Demo-Modus mit Beispieldaten funktioniert weiterhin ohne Server.

## Schnellstart (Windows, macOS, Linux)

Voraussetzung: Node.js ≥ 20.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Unit-Tests (Vitest)
npm run build      # statischer Build nach dist/
npm run preview    # Build lokal ansehen
```

Ohne Backend: Auf der Willkommensseite **„Prototyp mit Beispieldaten ansehen“** wählen.

## Mit Backend entwickeln (Windows)

Zusätzlich nötig: **PHP ≥ 8.2** (mit `pdo_mysql`, `gd`, `fileinfo`, `mbstring`) und **MariaDB/MySQL**. Am einfachsten über [Laragon](https://laragon.org) oder XAMPP.

1. Datenbank `doxie` anlegen, z. B. mit HeidiSQL (bei Laragon dabei).
2. `api/config.example.php` nach `api/config.php` kopieren. Für lokal setzen: `env` = `development`, `url` = `http://localhost:5173`, `secure_cookies` = `false`, `mail.driver` = `log`, DB-Zugang eintragen.
3. Im Projektordner:
   ```bash
   npm run api:migrate   # Schema anlegen
   npm run api           # PHP-API auf http://127.0.0.1:8080
   npm run dev           # zweites Terminal: App auf http://localhost:5173
   ```
   Vite leitet `/api` automatisch an PHP weiter. Mails (z. B. Passwort-Reset) landen lokal als Dateien in `api/storage/mail/`.

**API-Tests:** `cd api && composer install`, eine leere Datenbank `doxie_test` anlegen, dann `npm run api:test`. Die Zugangsdaten stehen in `api/tests/config.test.php` und lassen sich per Umgebungsvariable `DOXIE_TEST_DSN` / `DOXIE_TEST_DB_USER` / `DOXIE_TEST_DB_PASS` überschreiben.

**Browser-Durchlauf (E2E):** Mit laufendem `npm run api` und `npm run dev` startet `node e2e/live-flow.mjs` einen kompletten Ablauf. Er prüft Registrierung, Bestätigung, Plan, Training (auch offline), Tagebuch mit Foto, Import und Admin-Backup. Unter Windows einmalig vorher `npx playwright install chromium` ausführen.

**Deployment auf STRATO:** `npm run release`, dann weiter nach [docs/05-deployment.md](docs/05-deployment.md).

Für eine Ansicht auf dem Smartphone im selben WLAN: `npm run dev -- --host` und die angezeigte Netzwerk-Adresse öffnen.

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [docs/01-produktkonzept.md](docs/01-produktkonzept.md) | Leitgedanken, Informationsarchitektur, Seiten, Navigation |
| [docs/02-designsystem.md](docs/02-designsystem.md) | Farben, Typografie, Komponenten, Bewegung, Diagramme |
| [docs/03-architektur.md](docs/03-architektur.md) | Stack, STRATO-Checkliste, API, DB-Schema, Sicherheit, Backup, Capacitor, Therapeut:innen |
| [docs/04-entwicklungsplan.md](docs/04-entwicklungsplan.md) | Phasen, Prioritäten, Fortschritt |
| [docs/05-deployment.md](docs/05-deployment.md) | Installation auf STRATO, Updates, Backup ohne Cronjobs, Wiederherstellung |

## Projektstruktur

```
api/                   PHP-Backend (public/index.php, src/, migrations/, bin/, tests/)
src/
  api/                 API-Client (CSRF, Fehler) und Endpunkte
  components/ui/       Designsystem-Bausteine (Button, Card, Sheet, Felder, ProgressRing …)
  components/layout/   AppShell (Bottom Navigation / Sidebar), Hund-Wechsler, PageHeader
  features/            dashboard · dogs · physio · diary · account · auth
  data/                Domänentypen, Kategorien-Metadaten, Beispieldaten
  store/               Zustand (Demo/Live) + Selektoren + useDogActions
  lib/                 Datum, Formatierung, Bildverkleinerung
deploy/                .htaccess-Vorlage, Prüfskripte für STRATO
scripts/               build-release.mjs
docs/                  Konzept, Architektur, Deployment
```

## Build-Varianten

| Variable | Zweck |
|---|---|
| `VITE_BASE=/doxie/` | Deployment in einen Unterordner |
| `VITE_ROUTER=hash` | Hash-URLs (Vorschau ohne Server-Rewrite) |
| `npm run build:preview` | Vorschau-Build mit relativen Pfaden + Hash-Routing nach `dist-showcase/` |
