# 03 · Technische Architektur

## Überblick

```
┌──────────────── Browser / PWA / (später) Capacitor ────────────────┐
│ React 19 · TypeScript · Vite · Tailwind v4 · React Router · Lucide │
│   features/*  →  store (Hook)  →  api/* (Phase 2, fetch + CSRF)    │
└───────────────────────────────┬────────────────────────────────────┘
                                │ HTTPS, JSON, Session-Cookie
┌───────────────────────────────▼────────────────────────────────────┐
│ STRATO Webhosting (Apache + PHP 8.x)                               │
│  /            statischer Vite-Build (index.html, assets/)          │
│  /api/        PHP-Front-Controller → Router → Controller → Repo    │
│  außerhalb Webroot: config.php (Zugangsdaten), storage/uploads     │
└───────────────────────────────┬────────────────────────────────────┘
                                │ PDO (prepared statements)
                         ┌──────▼──────┐
                         │ MySQL/MariaDB│
                         └─────────────┘
```

Kein dauerhaft laufender Node-Prozess: Node wird nur lokal für Entwicklung und Build verwendet.

## STRATO – geprüfte Voraussetzungen

Ermittelt am 2026-10-18 mit `deploy/strato-check.php`. Das Skript wurde danach wieder gelöscht.

| Punkt | Ergebnis | Konsequenz |
|---|---|---|
| PHP | **8.4.25**, FastCGI, Apache | Code-Ziel **PHP ≥ 8.2**. Wir nutzen keine 8.4-only-Features, damit eine Rückstufung durch STRATO nichts bricht. Lokal wird mit 8.3 getestet. |
| HTTPS | aktiv | Cookies mit `Secure`, HSTS möglich |
| Erweiterungen | pdo_mysql, mbstring, fileinfo, gd (inkl. WebP), imagick, openssl, sodium, intl, curl, zip | Alles für Auth, Uploads und Bildverarbeitung ist vorhanden. Bilder werden mit GD neu kodiert, Imagick dient als Option. |
| Passwort-Hashing | Argon2id verfügbar | `PASSWORD_ARGON2ID` als Standard |
| `display_errors` | aus | Gut. Zusätzlich setzt die App es selbst. |
| `session.cookie_secure` | 0 | Die App setzt Cookie-Parameter selbst (`Secure`, `HttpOnly`, `SameSite=Lax`) und einen eigenen `session.save_path` außerhalb des Webroots. |
| Upload-Limits | 128 MB pro Datei, POST bis 1024 MB, 20 Dateien | Die App setzt strengere eigene Limits: Bilder ≤ 10 MB, Videos später ≤ 100 MB. |
| Speicher / Laufzeit | 512 MB, 360 s | Ausreichend für Bildverarbeitung und Export |
| Verzeichnis über dem Webroot | lesbar **und** beschreibbar, kein `open_basedir` | `config.php`, `storage/` (Uploads, Sessions, Backups) liegen **außerhalb** des öffentlichen Bereichs. |
| Freier Speicher | Anzeige = gemeinsamer Speicher, nicht das Paketkontingent | Das Kontingent laut Paketübersicht ist maßgeblich. |
| `mail()` | vorhanden | Bevorzugt wird trotzdem SMTP über ein STRATO-Postfach (bessere Zustellbarkeit, SPF/DKIM). |
| `exec` | möglich | `mysqldump` für Backups per PHP oder Cron |
| Zeitzone | Europe/Berlin | Datenbank speichert UTC. Die Anzeige erfolgt im Frontend lokal. |

**Ergänzt durch Angaben aus dem Kundenlogin (2026-10-18):**

| Punkt | Ergebnis | Konsequenz |
|---|---|---|
| Datenbanken | bis zu 25, MySQL 8 oder MariaDB wählbar; angelegt: **MariaDB 11.8** | Schema und Abfragen nutzen nur Standard-SQL und laufen auf MariaDB und MySQL 8. Lokal wird gegen MariaDB getestet. Eine Datenbank für Produktion, eine zweite später für Restore-Tests. Host/Benutzer stehen nur in `config.php` auf dem Server. |
| SSH & SFTP | verfügbar | Deployment per `rsync`/SFTP, Migrationen per CLI (`php bin/migrate.php`), Backups per `mysqldump` |
| Domain → Unterordner | möglich | Die Domain zeigt auf `<home>/doxie-public/`, der private Ordner liegt daneben. |

**Noch offen:**

| Punkt | Wo prüfen |
|---|---|
| `mod_rewrite` / `.htaccess` | Test zu Beginn von Phase 2 |
| Cronjobs | Kundenlogin → Hosting-Paket → Verwaltung/Einstellungen. Falls kein Cron enthalten ist: Backup per SSH-Skript manuell oder über einen geschützten Backup-Endpunkt. |
| SMTP-Postfach für Systemmails | E-Mail |

### Geplantes Verzeichnislayout auf STRATO

```
<home>/
├── doxie-private/          ← nicht öffentlich
│   ├── config.php          Zugangsdaten (nie im Repo)
│   ├── storage/uploads/    Fotos/Videos
│   ├── storage/sessions/   PHP-Sessions
│   ├── storage/backups/    DB-Dumps (Rotation)
│   └── app/                PHP-Quellcode (src/, vendor/, migrations/)
└── doxie-public/           ← Domain zeigt hierher (Webroot)
    ├── index.html, assets/ Vite-Build
    ├── .htaccess           SPA-Fallback, Sicherheitsheader
    └── api/index.php       Einziger PHP-Einstieg, lädt ../doxie-private/app
```

## Repository-Struktur (Ziel ab Phase 2)

```
doxie-diary/
├── src/                     React-App
│   ├── app/                 (Routing, Provider – derzeit App.tsx)
│   ├── components/ui/       Designsystem-Bausteine
│   ├── components/layout/   AppShell, Navigation, PageHeader
│   ├── features/<bereich>/  Seiten & Teilkomponenten je Bereich
│   ├── data/                Typen (= Domänenmodell), Metadaten, Beispieldaten
│   ├── store/               Zustand + Selektoren (Prototyp: localStorage)
│   ├── api/                 ← Phase 2: typisierter API-Client
│   └── lib/                 Datum, Formatierung, Bilder
├── api/                     ← Phase 2: PHP-Backend
│   ├── public/index.php     Front-Controller (einziger öffentlicher PHP-Einstieg)
│   ├── src/                 Router, Controller, Repositories, Policies, Validation
│   ├── migrations/          0001_init.sql, 0002_…
│   └── bin/migrate.php      Migrationsrunner (merkt sich Stand in schema_migrations)
├── public/                  Statische Assets (Manifest, Icons)
├── docs/                    Konzept & Entscheidungen
└── deploy/                  .htaccess-Vorlagen, Deploy-Skript, Backup-Skript
```

## Frontend-Entscheidungen

| Entscheidung | Begründung |
|---|---|
| **React Router** mit History-URLs; Hash-Modus per `VITE_ROUTER=hash` | Saubere URLs; STRATO bekommt `.htaccess`-Fallback auf `index.html`. Hash-Modus für Vorschau-Builds/Capacitor-Sonderfälle. |
| **Kein State-Framework** – `useReducer` + Context | App-Größe rechtfertigt kein Redux/Zustand. In Phase 2 kommt TanStack Query *nur falls nötig*; zunächst einfacher `api`-Client + Store. |
| **Domänentypen = API-Vertrag** (`src/data/types.ts`) | Ein Ort für das Modell; PHP liefert exakt diese JSON-Formen. |
| **Ablauf-Logik als reine Funktionen** (`sessionMachine.ts`) | Testbar ohne Browser, robust gegen UI-Änderungen. |
| **Selbst gehostete Fonts**, keine CDNs, kein Tracking | DSGVO, Offline-Fähigkeit. |
| **Mobile-First Tailwind**, `lg:` für Desktop | Eine Codebasis, Desktop als Erweiterung. |
| `base` per `VITE_BASE` | Deployment in Unterordner (`/doxie/`) oder Root möglich. |

## Backend-Entwurf (Phase 2)

Bewusst **ohne Framework und ohne Laufzeit-Abhängigkeiten**: eigener Router, PDO, klare Schichten, eigener schlanker SMTP-Client. Composer dient nur lokal für PHPUnit; auf den Server kommt kein `vendor/`.

**Umgesetzt in Phase 2** (`api/`): `src/Http` (Request, Response, Router), `src/Auth` (Session, Passwörter, Rate-Limiter, DogAccess-Policy), `src/Repositories`, `src/Controllers`, `src/Media/ImageStore`, `src/Mail` (SMTP/Log/mail()), `bin/migrate.php`, `bin/backup.php`, `tests/` (PHPUnit-Integrationstests gegen echten Server und Test-DB).

### API (REST, JSON, Präfix `/api/v1`)

| Methode & Pfad | Zweck |
|---|---|
| `GET /auth/csrf` | CSRF-Token für die Session |
| `POST /auth/register`, `/auth/login`, `/auth/logout` | Konto |
| `POST /auth/password/forgot`, `/auth/password/reset` | Reset mit Einmal-Token |
| `GET/PATCH /me`, `POST /me/password`, `GET /me/export`, `POST /me/delete` | Profil, Passwort ändern, Datenexport, Löschung (mit Passwortbestätigung) |
| `GET/POST /dogs`, `GET/PATCH/DELETE /dogs/{id}`, `POST /dogs/{id}/photo` | Hunde |
| `GET/POST /exercises`, `GET/PATCH/DELETE /exercises/{id}`, `POST /exercises/{id}/media` | Übungen |
| `GET/POST /dogs/{id}/plans`, `GET/PATCH/DELETE /plans/{id}` | Trainingspläne (Items als Teil des Plans, Reihenfolge = Array-Index) |
| `GET/POST /dogs/{id}/sessions`, `GET /sessions/{id}` | Trainingseinheiten |
| `GET/POST /dogs/{id}/diary`, `PATCH/DELETE /diary/{id}` | Tagebuch |
| `GET /media/{id}` | Ausgabe privater Dateien **nur nach Berechtigungsprüfung** |

Fehlerformat einheitlich: `{ "error": { "code": "validation_failed", "message": "…", "fields": { "name": "…" } } }` – nie Stacktraces oder SQL.

### Datenbankschema (Entwurf)

```sql
users            (id, email UNIQUE, password_hash, first_name, last_name,
                  role ENUM('owner','therapist') DEFAULT 'owner',
                  email_verified_at, created_at, updated_at, deleted_at)
password_resets  (id, user_id, token_hash, expires_at, used_at)
login_attempts   (id, email_hash, ip_hash, attempted_at)            -- Rate-Limiting

dogs             (id, name, breed, sex, birth_date, weight_kg, neutered NULL,
                  health_notes, bio, photo_media_id NULL, accent, created_at, updated_at)
dog_members      (dog_id, user_id, role ENUM('owner','family','therapist'),
                  scopes SET('profile','training','diary'),
                  invited_by, accepted_at, revoked_at, PRIMARY KEY(dog_id,user_id))

exercises        (id, owner_user_id, name, description, category, reps, sets,
                  duration_sec, rest_sec, notes, media_id NULL,
                  source ENUM('owner','therapist'), created_at, updated_at)
exercise_equipment (exercise_id, label, position)

training_plans   (id, dog_id, created_by_user_id, name, description,
                  weekdays TINYINT (Bitmaske Mo=1…So=64), time_of_day NULL,
                  archived_at NULL, source ENUM('owner','therapist'), created_at, updated_at)
plan_items       (id, plan_id, exercise_id, position, reps, sets, duration_sec, rest_sec)

training_sessions(id, dog_id, plan_id NULL, plan_name_snapshot, user_id,
                  started_at, finished_at, active_sec, note)
session_results  (id, session_id, plan_item_id NULL, exercise_id NULL,
                  exercise_name_snapshot, status ENUM('done','skipped'),
                  feedback ENUM('good','hard','issue') NULL, note)

diary_entries    (id, dog_id, user_id, occurred_at, category, title, text, created_at, updated_at)
diary_photos     (entry_id, media_id, position)

media            (id, owner_user_id, storage_key, mime, bytes, width, height, created_at)
schema_migrations(version, applied_at)
```

- **Snapshots** (`plan_name_snapshot`, `exercise_name_snapshot`) halten den Verlauf korrekt, auch wenn Pläne/Übungen später geändert oder gelöscht werden.
- Alle Fremdschlüssel mit `ON DELETE CASCADE` ab `users`/`dogs` → Kontolöschung entfernt alles konsistent.
- `utf8mb4`, InnoDB, `DATETIME` in UTC.

### Berechtigungen (Policy-Schicht)

Jeder Zugriff auf ein Objekt läuft über **eine** zentrale Prüfung:

```
canAccessDog(user, dogId, scope)  →  EXISTS dog_members WHERE user_id=? AND dog_id=? AND revoked_at IS NULL AND (role='owner' OR FIND_IN_SET(scope, scopes))
```

Pläne, Einheiten, Tagebuch und Medien werden immer über ihren Hund (bzw. Besitzer bei Übungen) geprüft. Unbekannte und fremde IDs liefern beide `404`, damit keine Existenz verraten wird. Das Frontend filtert zusätzlich, ist aber **nie** die Sicherheitsgrenze.

### Sicherheit

| Thema | Umsetzung |
|---|---|
| Passwörter | `password_hash()` mit `PASSWORD_ARGON2ID` (Fallback `PASSWORD_BCRYPT`, je nach STRATO-Build), `password_needs_rehash()` beim Login; min. 10 Zeichen |
| Sessions | PHP-Sessions, Cookie `HttpOnly; Secure; SameSite=Lax`, `session_regenerate_id(true)` nach Login, Idle-Timeout + absolute Laufzeit, Sessiondateien außerhalb des Webroots |
| CSRF | Synchronizer-Token pro Session; Header `X-CSRF-Token` bei allen POST/PATCH/DELETE; zusätzlich `Origin`-Prüfung |
| Brute Force | Rate-Limit pro E-Mail-Hash + IP-Hash, progressive Verzögerung |
| Passwort-Reset | 32-Byte-Zufallstoken, nur Hash gespeichert, 60 min gültig, einmalig; neutrale Antwort („falls ein Konto existiert …“) |
| Eingaben | Serverseitige Validierung je Endpoint (Typ, Länge, Wertebereich, Enum), JSON-Schema-ähnliche Regeln |
| SQL | Ausschließlich PDO-Prepared-Statements, `ATTR_EMULATE_PREPARES=false` |
| Ausgabe | JSON mit `Content-Type: application/json`; React escaped HTML automatisch |
| Uploads | MIME per `finfo` prüfen (JPEG/PNG/WebP; Video MP4 später), Größenlimit, Bilder per GD neu kodieren (entfernt EXIF/GPS), zufälliger Dateiname, Speicherung **außerhalb des Webroots**, Auslieferung über `/api/media/{id}` mit Berechtigungsprüfung |
| Header | `.htaccess`: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, CSP (`default-src 'self'`) |
| Fehler | `display_errors=Off`; Logs ohne personenbezogene Inhalte (nur IDs, Fehlercodes) |
| Geheimnisse | `config.php` außerhalb des Webroots, nie im Repo; `api/config.example.php` dokumentiert alle Schlüssel |

### Migrationen

Nummerierte SQL-Dateien in `api/migrations/`. `bin/migrate.php` (lokal per CLI oder einmalig geschützt per Browser, falls kein SSH) wendet fehlende Versionen in Transaktionen an und protokolliert sie in `schema_migrations`.

### Backup & Wiederherstellung

> Umsetzung ohne Cronjobs: siehe `docs/05-deployment.md` (`bin/backup.php`, angestoßen per SSH über die Windows-Aufgabenplanung).

1. **Datenbank:** täglicher Dump per STRATO-Cronjob (`mysqldump --single-transaction`), komprimiert, außerhalb des Webroots, 14 Tage Rotation; zusätzlich STRATO-eigene Datensicherung.
2. **Uploads:** wöchentliches Archiv des `storage/`-Ordners.
3. **Extern:** regelmäßiger Download der Backups (SFTP) auf ein eigenes Gerät / verschlüsselten Speicher.
4. **Wiederherstellung** dokumentiert und **einmal pro Quartal getestet** (Dump in Test-DB einspielen, App gegen Test-DB starten).

## PWA (Phase 4)

`manifest.webmanifest` ist bereits angelegt. Später: `vite-plugin-pwa` (Workbox) mit App-Shell-Caching, PNG-Icons (192/512, maskable), Offline-Hinweis; API-Antworten werden **nicht** dauerhaft gecacht (sensible Daten).

## Capacitor (später)

- Der statische Build wird unverändert in die native Hülle gepackt.
- **Wichtig:** In der nativen App läuft das Frontend unter `capacitor://localhost` bzw. `https://localhost` – Cookies zur STRATO-Domain gelten dort als Drittanbieter-Cookies. Lösung, wenn es soweit ist: entweder `SameSite=None; Secure` + CORS mit `credentials` für exakt diese Origins, oder ein zusätzlicher Token-Modus (kurzlebiges Access-Token + Refresh-Token im sicheren Gerätespeicher) **nur** für die native App. Die API-Schicht im Frontend wird so gebaut, dass dieser Wechsel an einer Stelle passiert.

## Vorbereitung Therapeut:innen-Rolle

| Baustein | Bereits vorbereitet |
|---|---|
| `users.role` | `owner` / `therapist` |
| `dog_members` mit `role` + `scopes` | Freigabe pro Hund und Bereich (z. B. nur Training) |
| `source` an Übungen und Plänen | Kennzeichnung „von deiner Praxis“ |
| Snapshots im Verlauf | Protokolle bleiben auch nach Planänderungen der Praxis nachvollziehbar |
| Policy-Schicht | Neue Rollen = neue Regeln an einer Stelle |

Später ergänzt: `practices`, `practice_members`, `invitations`, `messages`, `subscriptions` – ohne Umbau bestehender Tabellen.

## Datenschutz

- Datenminimierung: nur Vorname Pflicht; keine Telefonnummer, keine Adresse.
- Keine externen Dienste im Frontend (keine Fonts/CDNs/Analytics).
- Export (JSON, im Prototyp bereits funktionsfähig) und vollständige Kontolöschung.
- Fotos werden beim Upload von EXIF/GPS-Daten befreit.
- Vor öffentlichem Start: Datenschutzerklärung, Impressum, AV-Vertrag mit STRATO, Prüfung DSGVO/TTDSG (Rechtsberatung).
