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

## Phase 3 – Betrieb & Physiotherapie ✅

| Ergebnis | Status |
|---|---|
| `phase-2` nach `main` übernommen (Fast-Forward), Arbeit in `phase-3` | ✅ |
| E-Mail-Bestätigung: Link 48 h, Hinweis in der App, erneut senden, Erinnerung nach 5 Tagen, Löschung nach 7 Tagen; Bestandskonten gelten als bestätigt | ✅ |
| Wartung ohne Cron (nach der Antwort, max. stündlich, Dateisperre) | ✅ |
| Admin (nur bestätigte Adressen aus `config.php`): Status, Kennzahlen, Kontoliste, sperren/entsperren, Reset-Mail, löschen, Protokoll – ohne Einsicht in Inhalte | ✅ |
| Backup: AES-256-verschlüsseltes ZIP (SQL-Dump in PHP + Fotos), per App oder per Token automatisch | ✅ |
| Physiotherapie auf dem Server: Übungen (inkl. Foto, Startvorlagen), Pläne (Reihenfolge, Werte, Tage, Archiv), Einheiten (Snapshots, idempotent) | ✅ |
| Offline-Warteschlange für Trainingseinheiten, Wake Lock, Signalton | ✅ |
| Impressum/Datenschutz-Links aus der Konfiguration | ✅ (Datenschutzerklärung selbst: offen, rechtliche Prüfung) |

## Phase 4 – Tagebuch, PWA, Qualität ✅

| Ergebnis | Status |
|---|---|
| Tagebuch auf dem Server, bis zu 4 Fotos pro Eintrag | ✅ |
| Einmaliger Import alter lokaler Daten inkl. Fotos, danach aus dem Browser gelöscht | ✅ |
| Keine Trainings-/Tagebuchinhalte mehr im localStorage | ✅ |
| PWA: eigener Service Worker (App-Hülle offline, API nie gecacht), Update-Hinweis, Installationsanleitung iOS/Android | ✅ |
| Offline-Start: Hinweis „Keine Verbindung“ statt Abmeldung | ✅ |
| Mobile: kein Auto-Zoom auf iOS (16-px-Eingaben), Safe Areas | ✅ |
| Tests: 48 PHPUnit, 14 Vitest, E2E-Skript `e2e/live-flow.mjs` (12 Schritte) | ✅ |
| Windows-Skript für automatischen Backup-Abruf, Wiederherstellungsanleitung | ✅ |

## Version 0.4 – Rückblick & Bericht ✅

| Ergebnis | Status |
|---|---|
| ★-Highlights im Tagebuch (Liste und Eintrag), Migration `0005` | ✅ |
| Rückblick in der App: Woche, Monat, Jahr, frei; Kategorien-Filter; Titel, Kennzahlen, Highlights, Fotos, Trainingsaktivität, Zeitleiste | ✅ |
| PDF auf dem Gerät (pdf-lib, eingebettete App-Schriften, Logo als Vektor, Fotos verkleinert); bei „Jahr“ als Erinnerungsbuch mit Monatskapiteln | ✅ |
| Bericht für Tierarzt/Physio: Stammdaten, Pläne, Trainingshäufigkeit, Planerfüllung, „schwierig“ je Übung, Beschwerden & Notizen, Gesundheitseinträge, Hinweis „keine medizinische Bewertung“ | ✅ |
| Teilen-Menü auf dem Handy, Download am PC | ✅ |
| Bewusst nicht: KI-Zusammenfassung | – |

## Nächste Ideen

1. P2 Dark Mode (Tokens sind vorbereitet)
2. P2 Datenschutzerklärung für die App fertigstellen (Verarbeitungsübersicht liefere ich, rechtliche Prüfung extern)
3. P2 E-Mail-Adresse ändern (mit Bestätigung der neuen Adresse)
4. P3 Erinnerungen (Web Push) an geplante Trainings
5. P3 Zwei-Faktor-Anmeldung für das Admin-Konto
6. P3 Video-Uploads für Übungen

## Später (Architektur vorbereitet)

Familienkonten · Therapeut:innen-Accounts & Praxen · Planzuweisung · Freigaben · Nachrichten · Medikamente · Ernährung · Tierarzttermine · GPS-Spaziergänge · Capacitor-Apps · Praxis-Abo

## Verlauf

| Datum | Schritt |
|---|---|
| 2026-10-18 | Phase 1 abgeschlossen: Konzept, Designsystem, Architektur, Prototyp; 7 Unit-Tests für den Trainingsablauf grün; visuelle Prüfung mobil (390 px) und Desktop (1360 px) |
| 2026-10-18 | STRATO-Hosting geprüft und Ergebnisse in `03-architektur.md` dokumentiert |
| 2026-10-18 | Phase 2 umgesetzt: PHP-API, Auth, Hunde, Uploads, Tests, Release & Deployment-Anleitung |
| 2026-10-18 | Live auf www.doxiewerk.de/doxiediary/, Logo aktualisiert, Phase-3-Plan priorisiert (Betrieb vor Physio-Server) |
| 2026-10-18 | Phase 3 & 4 umgesetzt: Bestätigung, Admin, Backup, Physio & Tagebuch auf dem Server, Import, PWA, Offline |
| 2026-10-19 | Version 0.4: Rückblick, Erinnerungsbuch, Tierarzt-/Physio-Bericht als PDF, Highlights |
