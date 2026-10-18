# 04 · Entwicklungsplan & Fortschritt

Priorität: **P1** = muss für V1, **P2** = sollte, **P3** = später.

## Phase 1 – Konzept, Design, Prototyp ✅ (zur Freigabe)

| Ergebnis | Status |
|---|---|
| Informationsarchitektur, Seiten, Navigation | ✅ `docs/01-produktkonzept.md` |
| Designsystem (Tokens, Typo, Komponenten, Bewegung) | ✅ `docs/02-designsystem.md`, `src/index.css`, `src/components/ui` |
| Technische Architektur inkl. Schema, Sicherheit, Backup | ✅ `docs/03-architektur.md` |
| Interaktiver Prototyp mit Beispieldaten | ✅ siehe unten |

**Im Prototyp tatsächlich bedienbar** (Daten nur lokal im Browser):
Willkommen & Auth-Oberflächen (ohne echte Anmeldung) · Dashboard · Hund wechseln · Hundeprofil ansehen/bearbeiten inkl. Foto · Hund anlegen · Trainingspläne anlegen/bearbeiten/sortieren/Werte anpassen/archivieren/löschen · Übungsbibliothek mit Suche, Filter, Anlegen, Bearbeiten, Foto, Löschen · Trainingsmodus (Timer, Wiederholungszähler, Sätze, Pausen, Überspringen, Pausieren, Rückmeldung, Beschwerde-Hinweis, Zusammenfassung, Speichern) · Verlauf (Kennzahlen, Monatskalender, Wochendiagramm, Beobachtungen, Einheiten-Details) · Tagebuch (Timeline, Filter, Einträge mit Fotos anlegen/bearbeiten/löschen) · Konto (Name, JSON-Export, Demo zurücksetzen, Abmelden).

**Bewusst noch nicht:** echte Registrierung/Login, Server, E-Mail, Videos, Offline-Service-Worker, Dark Mode, Teilen.

## Phase 2 – Technische Basis (nach Freigabe)

1. ✅ STRATO-Voraussetzungen geprüft (PHP 8.4, Argon2id, GD/Imagick, Verzeichnis außerhalb des Webroots). MySQL 8, SSH/SFTP, Domain auf Unterordner. Offen: mod_rewrite, Cron
2. P1 Ordnerstruktur `api/`, Config außerhalb Webroot, `.htaccess`-Vorlagen
3. P1 Migrationen + Schema `0001_init.sql`, Migrationsrunner
4. P1 Router, JSON-Responses, Fehlerbehandlung, Validierung, Policy-Schicht
5. P1 Registrierung, Login/Logout, Sessions, CSRF, Rate-Limit
6. P1 Passwort zurücksetzen (Token + Mailversand via SMTP)
7. P1 Hunde-CRUD + Foto-Upload (Re-Encoding, außerhalb Webroot)
8. P1 Frontend: `src/api`-Client, Store auf API umstellen, Lade-/Fehlerzustände
9. P2 PHPUnit-Tests für Auth & Berechtigungen, Vitest für API-Client

## Phase 3 – Physiotherapie (nach Freigabe)

1. P1 Übungen-API inkl. Hilfsmittel & Medien (Bild; Video mit Größenlimit)
2. P1 Pläne-API mit Items, Reihenfolge, Wochentagen, Archiv
3. P1 Einheiten speichern (Snapshots), Verlauf-Endpoints mit Aggregation
4. P1 Trainingsmodus an API anbinden, Zwischenstand bei Abbruch lokal sichern
5. P2 Bildschirm wach halten (Wake Lock API) während des Trainings
6. P2 Akustisches Signal am Timer-Ende (optional, abschaltbar)
7. P3 Wiederkehrende Erinnerungen (Push erst mit PWA/Capacitor)

## Phase 4 – Tagebuch, PWA, Qualität, Deployment (nach Freigabe)

1. P1 Tagebuch-API mit Fotos
2. P1 PWA: Service Worker, Icons (PNG/maskable), Installationshinweis iOS/Android
3. P1 Mobile Feinschliff: Safe Areas, iOS-Tastatur, Pull-to-refresh-Verhalten
4. P1 Tests: Vitest-Komponententests, Playwright-E2E für Kernabläufe, Lighthouse/Accessibility
5. P1 Deployment: Build-Skript, SFTP-Upload, Backup-Cron, Wiederherstellungstest
6. P2 Dark Mode
7. P2 Rechtliches vorbereiten (Datenschutzerklärung, Impressum) – rechtliche Prüfung extern

## Später (Architektur vorbereitet)

Familienkonten · Therapeut:innen-Accounts & Praxen · Planzuweisung · Freigaben · Nachrichten · Medikamente · Ernährung · Tierarzttermine · GPS-Spaziergänge · Capacitor-Apps · Praxis-Abo

## Verlauf

| Datum | Schritt |
|---|---|
| 2026-10-18 | Phase 1 abgeschlossen: Konzept, Designsystem, Architektur, Prototyp; 7 Unit-Tests für den Trainingsablauf grün; visuelle Prüfung mobil (390 px) und Desktop (1360 px) |
| 2026-10-18 | STRATO-Hosting geprüft und Ergebnisse in `03-architektur.md` dokumentiert |
