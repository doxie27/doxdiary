# 05 · Deployment auf STRATO, Backup & Wiederherstellung

> Ziel: **https://www.doxiediary.de/**. SFTP/SSH-Host `5021038204.ssh.w2.strato.hosting`, Benutzer `su396778`.
> Datenbank-Zugang und Passwörter stehen nur in `doxie-private/config.php` auf dem Server.
> Passwörter gehören **nur** in `doxie-private/config.php` auf dem Server – nie in Chat, Git oder E-Mail.

## Zielstruktur auf dem Server

```
<sftp-start>/
├── doxie-private/                 ← NICHT öffentlich, außerhalb des Webroots
│   ├── config.php                 Zugangsdaten (aus config.example.php erstellen)
│   ├── .htaccess                  "Require all denied" (Sicherheitsnetz)
│   ├── app/                       src/, bin/, migrations/
│   └── storage/                   wird automatisch angelegt: uploads/, sessions/, logs/, backups/
└── www/                           Webroot (doxiewerk.de)
    └── doxiediary/                ← Zielordner der Domain www.doxiediary.de → App unter https://www.doxiediary.de/
        ├── .htaccess              feste Domain, HTTPS, SPA-Fallback (RewriteBase /), Sicherheitsheader, CSP
        ├── index.html, assets/    React-Build
        └── api/
            ├── .htaccess          alles → index.php
            └── index.php          sucht doxie-private/app in übergeordneten Ordnern
```

Die Domain www.doxiediary.de zeigt im STRATO-Kundenlogin direkt auf den Ordner `www/doxiediary/`. Aufrufe über andere Hostnamen (z. B. www.doxiewerk.de/doxiediary/…, doxiediary.de ohne www) leitet die `.htaccess` per 301 auf https://www.doxiediary.de/… um.

## Erstinstallation (einmalig)

1. **mod_rewrite testen:** Ordner `deploy/rewrite-test/` per SFTP in den aktuellen Webspace laden, `https://www.doxiediary.de/rewrite-test/abc` aufrufen. Erwartet: „mod_rewrite funktioniert ✔“. Danach den Ordner löschen.
2. **Datenbank anlegen:** STRATO-Kundenlogin → Datenbanken → **MariaDB**-Datenbank (angelegt: MariaDB 11.8). Host, Name und Benutzer notieren, das Passwort sicher aufbewahren.
3. **Postfach anlegen:** `noreply@doxiediary.de` für Systemmails (Passwort zurücksetzen).
4. **Release bauen** (lokal unter Windows im Projektordner):
   ```bash
   npm install
   npm run release
   ```
   Ergebnis: `release/doxiediary/` und `release/doxie-private/`.
5. **Hochladen** (WinSCP/FileZilla per SFTP): `doxiediary/` in den Webroot von doxiediary.de, `doxie-private/` außerhalb davon (siehe Struktur oben).
6. **Konfiguration:** auf dem Server `doxie-private/config.example.php` nach `doxie-private/config.php` kopieren und ausfüllen:
   - `app.url` = `https://www.doxiediary.de`, `cookie_path` = `/`
   - `app.secret` leer lassen – der Server erzeugt ihn beim ersten Aufruf in `storage/secret.key`
   - `db.*` = Werte aus Schritt 2
   - `mail.*` = `noreply@doxiediary.de` (`smtp.strato.de`, Port 465, `ssl`)
7. **Datenbank-Schema:** Es ist nichts zu tun. Der Benutzer `su396778` darf nur SFTP, keine Kommandozeile. Die App legt die Tabellen deshalb beim ersten Aufruf selbst an (`Support\Migrator`, gesteuert über `storage/schema.version` und eine Dateisperre).
8. **Domain:** im STRATO-Kundenlogin www.doxiediary.de (und doxiediary.de) auf den Ordner `/doxiediary` zeigen lassen und SSL aktivieren.
9. **Prüfen:**
   - `https://www.doxiediary.de/api/v1/health` → `{"ok":true,"db":true}` (bei `"db":false`: DB-Zugang in config.php oder Migration prüfen)
   - `https://www.doxiediary.de/` → Willkommensseite, Registrierung, Hund anlegen, Foto hochladen
   - `doxie-private/` darf über keine URL erreichbar sein
   - Passwort-Reset-Mail kommt an

## Update einspielen

```bash
npm run release
```
Dann per SFTP **ersetzen**: `doxiediary/` komplett und `doxie-private/app/` komplett.
`config.php` und `storage/` **nicht** überschreiben. Neue Migrationen werden beim nächsten Aufruf der App automatisch eingespielt. Danach `…/api/v1/health` aufrufen und prüfen.

## Konfiguration ab Version 0.3

In `doxie-private/config.php` kommen drei Abschnitte dazu (Vorlage: `config.example.php`):

```php
'admin' => [
    'emails' => ['nico.sellmaier2712@outlook.de'],   // Admin nur für diese, bestätigten Adressen
],
'backup' => [
    'password' => 'LANGES-BACKUP-PASSWORT',           // verschlüsselt jedes Backup (AES-256) – sicher notieren!
    'token' => '',                                    // optional: für automatischen Abruf, mind. 32 Zeichen
],
'legal' => [
    'imprint_url' => null,                            // null = mitgelieferte Seite impressum.html
    'privacy_url' => null,                            // null = mitgelieferte Seite datenschutz.html
],
```

## Domain ändern

Die Domain steht nur an zwei Stellen: in `config.php` auf dem Server und als `--host=` im Release-Skript (`package.json`).
`--base=` ist der URL-Pfad (`/` = App direkt auf der Domain), `--folder=` nur der Name des Release-Ordners.

1. Domain im STRATO-Kundenlogin auf denselben Webspace zeigen lassen und **SSL-Zertifikat für die neue Domain aktivieren**.
2. `npm run release` mit neuer `--host=` bauen und hochladen. Die `.htaccess` leitet dann jede andere Domain (alte Domain, ohne www) per 301 auf die neue um – Pfad und Parameter bleiben erhalten.
3. In `doxie-private/config.php` anpassen: `app.url`, `cookie_path`, `allowed_origins`, ggf. `mail.user`/`mail.from` (Postfach unter der neuen Domain anlegen).
4. Folgen für Nutzer:innen: einmal neu anmelden (Cookie gehört zur Domain), App auf dem Homescreen neu hinzufügen. Daten auf dem Server bleiben unverändert.
5. Backup-Abholung: URL in `backup-download.ps1` bzw. im Aufgabenplanungs-Aufruf anpassen.

## Backups (ohne Cronjobs und ohne Kommandozeile)

1. **In der App:** Konto → Administration → „Backup herunterladen“ (mit Passwortbestätigung). Die ZIP-Datei enthält `database.sql` (kompletter Dump) und alle Fotos und ist mit `backup.password` verschlüsselt.
2. **Automatisch jeden Tag:** `deploy/backup-download.ps1` über die Windows-Aufgabenplanung. Die Einrichtung steht im Kopf des Skripts. Der Token liegt nur auf deinem PC und in `config.php`. Das Skript behält die letzten 30 Backups und schreibt `backup.log`.
3. **Zusätzlich:** die STRATO-eigene Datensicherung im Kundenlogin.
4. Der Admin-Bereich zeigt das Datum des letzten Backups. Ein grüner Punkt bedeutet: nicht älter als 7 Tage.

`bin/backup.php` bleibt für Umgebungen mit Kommandozeile erhalten.

## Wiederherstellung

1. Backup-ZIP mit **7-Zip** öffnen (Passwort = `backup.password`). Der Windows-Explorer kann AES-ZIPs nicht entpacken.
2. **Datenbank:** STRATO-Kundenlogin → Datenbanken → phpMyAdmin → Datenbank wählen → „Importieren“ → `database.sql`. Der Dump legt alle Tabellen neu an (`DROP TABLE IF EXISTS`).
3. **Fotos:** den Inhalt von `uploads/` per SFTP nach `doxie-private/storage/uploads/` kopieren.
4. `…/api/v1/health` prüfen und in der App anmelden.
5. **Probelauf einmal pro Quartal:** eine zweite, leere Datenbank anlegen, das Backup dort importieren und mit einer Testkopie der `config.php` prüfen. Ohne Probelauf ist ein Backup nur eine Hoffnung.

## Sicherheits-Checkliste nach jedem Deployment

- [ ] `config.php` liegt nur in `doxie-private/`
- [ ] `app.env` = `production`, `secure_cookies` = `true`, `mail.driver` = `smtp`
- [ ] `https://www.doxiediary.de/api/v1/gibt-es-nicht` liefert JSON-404 ohne technische Details
- [ ] Prüf-Skripte (`strato-check.php`, `rewrite-test/`) sind gelöscht
- [ ] `…/api/v1/health` liefert `{"ok":true,"db":true}`
- [ ] `backup.password` gesetzt und an sicherem Ort notiert, erstes Backup heruntergeladen und mit 7-Zip geöffnet
- [ ] Admin-Bereich erreichbar, Systemstatus ohne gelbe Punkte
