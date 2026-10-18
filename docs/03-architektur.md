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

## STRATO – Voraussetzungen prüfen ⚠️

Ich habe keinen Zugriff auf deinen STRATO-Account. Öffentliche Quellen sind für das Paket „Basic“ widersprüchlich (u. a. Berichte über PHP 8.0 als Standard bei manchen Tarifen). **Bevor wir in Phase 2 hosting-spezifisch werden, bitte im STRATO-Kundenlogin prüfen:**

| Punkt | Wo prüfen | Benötigt / Alternative |
|---|---|---|
| PHP-Version wählbar ≥ 8.1 (ideal 8.2/8.3) | Hosting → Einstellungen → PHP-Version | Pflicht (Enums, readonly, `never`) – sonst Code auf 8.0 halten |
| Anzahl MySQL-Datenbanken & Version (MySQL 8 / MariaDB 10.x) | Datenbanken verwalten | 1 DB genügt |
| `.htaccess` + `mod_rewrite` | Standard bei STRATO, kurz testen | SPA-Fallback & API-Routing |
| SSH/SFTP-Zugang | Zugänge / SFTP | Deployment per SFTP oder `rsync` |
| Verzeichnis **oberhalb** des Webroots oder Domain auf Unterordner zeigbar | Domainverwaltung → Ziel | Für `config.php` und Uploads außerhalb des öffentlichen Bereichs |
| Cronjobs | Hosting → Cronjobs | Für Backups / Aufräumen (sonst manuell) |
| SSL-Zertifikat für die Domain | Domains → SSL | Pflicht (Secure-Cookies, PWA) |
| E-Mail-Versand aus PHP (`mail()` oder SMTP-Postfach) | E-Mail / Postfächer | Passwort-Reset; bevorzugt SMTP über ein STRATO-Postfach |
| Upload-Limits (`upload_max_filesize`, `post_max_size`) | `phpinfo()` | Fotos ≤ 8 MB, Videos ggf. begrenzen |
| Speicherplatz | Paketübersicht | Fotos/Videos |

Ein `api/public/info-check.php` (wird in Phase 2 mitgeliefert und nach Prüfung gelöscht) gibt die relevanten Werte gesammelt aus.

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

Bewusst **ohne großes Framework** (STRATO-Shared-Hosting, kein Composer-Zwang): schlanker eigener Router, PDO, klare Schichten. Composer wird lokal genutzt (z. B. für PHPUnit, PHPMailer) und `vendor/` mit deployt.

### API (REST, JSON, Präfix `/api/v1`)

| Methode & Pfad | Zweck |
|---|---|
| `GET /auth/csrf` | CSRF-Token für die Session |
| `POST /auth/register`, `/auth/login`, `/auth/logout` | Konto |
| `POST /auth/password/forgot`, `/auth/password/reset` | Reset mit Einmal-Token |
| `GET/PATCH /me`, `DELETE /me`, `GET /me/export` | Profil, Löschung, Datenexport |
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
| Geheimnisse | `config.php` außerhalb des Webroots bzw. `.env` nicht im Repo; `.env.example` dokumentiert Schlüssel |

### Migrationen

Nummerierte SQL-Dateien in `api/migrations/`. `bin/migrate.php` (lokal per CLI oder einmalig geschützt per Browser, falls kein SSH) wendet fehlende Versionen in Transaktionen an und protokolliert sie in `schema_migrations`.

### Backup & Wiederherstellung

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
