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

## Phase 2 – Technische Basis ✅ (zur Prüfung)

| Ergebnis | Status |
|---|---|
| STRATO geprüft: PHP 8.4, MySQL 8, SSH, Domain auf Unterordner, keine Cronjobs | ✅ |
| Projektstruktur `api/` (PHP 8.2+, ohne Laufzeit-Abhängigkeiten) | ✅ |
| Migration `0001_init.sql` + `bin/migrate.php` | ✅ |
| Router, JSON-Fehler ohne interne Details, Validierung, Logging ohne personenbezogene Daten | ✅ |
| Registrierung, Login, Logout, Sessions (HttpOnly, SameSite=Lax, Secure), Session-Fixation-Schutz | ✅ |
| CSRF-Token + Origin-Prüfung für alle schreibenden Anfragen | ✅ |
| Rate-Limiting (Login, Registrierung, Reset), nur HMAC-Hashes gespeichert | ✅ |
| Passwort zurücksetzen (Einmal-Token, 60 min, neutrale Antwort), Passwort ändern, andere Sitzungen beenden | ✅ |
| Hunde-CRUD mit Berechtigungsprüfung, Foto-Upload (MIME-Prüfung, Neu-Kodierung, außerhalb Webroot) | ✅ |
| Datenexport, Kontolöschung inkl. Dateien | ✅ |
| Frontend: API-Client, echte Anmeldung, Onboarding, Hundeprofile aus der DB, Demo-Modus bleibt | ✅ |
| Release-Skript, `.htaccess` mit CSP/HSTS, Deployment- & Backup-Anleitung | ✅ `docs/05-deployment.md` |
| Tests: 24 PHPUnit-Integrationstests, 7 Vitest-Tests, Browser-E2E | ✅ |

**Noch nicht live:** Das Deployment auf STRATO steht aus. Dafür fehlen noch Domain, Datenbankzugang und der mod_rewrite-Test.
**Bewusst noch lokal (bis Phase 3/4):** Übungen, Pläne, Trainingseinheiten und Tagebuch werden im Live-Modus pro Konto im Browser gespeichert.

## Live-Stand (2026-10-18)

Läuft unter https://www.doxiewerk.de/doxiediary/: Health-Check grün (App + Datenbank), Passwort-Reset-Mail kommt an, neues Logo eingespielt.

## Phase 3 – Betrieb & Physiotherapie (nächste Schritte, priorisiert)

**3a · Absichern & Betrieb** (klein, zuerst)
1. P1 `phase-2` per Pull Request nach `main` übernehmen, danach eigener Branch für Phase 3
2. P1 E-Mail-Bestätigung: Link nach Registrierung (48 h), App sofort nutzbar mit Hinweis, „Mail erneut senden“, unbestätigte Konten nach 7 Tagen löschen (vorher Erinnerung)
3. P1 Admin-Basis (Admin-E-Mail nur in `config.php`): Systemstatus, geschützter Backup-Download (DB-Dump + Uploads), Admin-Aktionsprotokoll ohne Inhalte
4. P1 Aufräumjobs ohne Cron: gelegentlich bei normalen Anfragen (alte Rate-Limit-Einträge, abgelaufene Tokens, unbestätigte Konten)
5. P2 Rechtliches vorbereiten: Impressum-/Datenschutz-Links in der App (Texte von dir bzw. rechtlich geprüft)

**3b · Physiotherapie auf den Server** (Kern)
6. P1 Migration `0002`: Übungen, Hilfsmittel, Pläne, Plan-Übungen, Einheiten, Ergebnisse (mit Snapshots)
7. P1 API + Tests: Übungen (inkl. Foto), Pläne (Reihenfolge, Werte, Tage, Archiv), Einheiten speichern, Verlauf/Statistik
8. P1 Frontend auf API umstellen, Startvorlagen-Übungen pro neuem Konto
9. P1 Einmalige Übernahme bisher lokal gespeicherter Daten
10. P1 Trainingsmodus robust: Einheit wird bei Verbindungsabbruch zwischengespeichert und nachgesendet
11. P2 Bildschirm wach halten (Wake Lock), optionaler Signalton am Timer-Ende

**3c · Admin-Erweiterung** (am Ende von Phase 3)
12. P2 Kontoverwaltung: Liste, sperren/entsperren, löschen auf Anfrage, Reset-Mail auslösen – ohne Einsicht in Hunde-, Gesundheits- oder Tagebuchdaten
13. P2 Kennzahlen ohne Personenbezug (Konten, Hunde, Einheiten pro Woche)

## Phase 4 – Tagebuch, PWA, Qualität, Deployment (nach Freigabe)

1. P1 Tagebuch-API mit Fotos (inkl. Übernahme lokaler Einträge)
2. P1 PWA: Service Worker, Icons (PNG/maskable), Installationshinweis iOS/Android
3. P1 Mobile Feinschliff: Safe Areas, iOS-Tastatur, Pull-to-refresh-Verhalten
4. P1 Tests: Vitest-Komponententests, Playwright-E2E für Kernabläufe, Lighthouse/Accessibility
5. P1 Wiederherstellungstest mit zweiter Datenbank, automatischer Backup-Abruf über die Windows-Aufgabenplanung
6. P2 Dark Mode
7. P2 Rechtliches vorbereiten (Datenschutzerklärung, Impressum) – rechtliche Prüfung extern

## Später (Architektur vorbereitet)

Familienkonten · Therapeut:innen-Accounts & Praxen · Planzuweisung · Freigaben · Nachrichten · Medikamente · Ernährung · Tierarzttermine · GPS-Spaziergänge · Capacitor-Apps · Praxis-Abo

## Verlauf

| Datum | Schritt |
|---|---|
| 2026-10-18 | Phase 1 abgeschlossen: Konzept, Designsystem, Architektur, Prototyp; 7 Unit-Tests für den Trainingsablauf grün; visuelle Prüfung mobil (390 px) und Desktop (1360 px) |
| 2026-10-18 | STRATO-Hosting geprüft und Ergebnisse in `03-architektur.md` dokumentiert |
| 2026-10-18 | Phase 2 umgesetzt: PHP-API, Auth, Hunde, Uploads, Tests, Release & Deployment-Anleitung |
| 2026-10-18 | Live auf www.doxiewerk.de/doxiediary/, Logo aktualisiert, Phase-3-Plan priorisiert (Betrieb vor Physio-Server) |
