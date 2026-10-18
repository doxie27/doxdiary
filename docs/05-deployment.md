# 05 · Deployment auf STRATO, Backup & Wiederherstellung

> Ziel: **https://www.doxiewerk.de/doxiediary/**. SFTP/SSH-Host `5021038204.ssh.w2.strato.hosting`, Benutzer `su396778`.
> Datenbank-Zugang und Passwörter stehen nur in `doxie-private/config.php` auf dem Server.
> Passwörter gehören **nur** in `doxie-private/config.php` auf dem Server – nie in Chat, Git oder E-Mail.

## Zielstruktur auf dem Server

```
<sftp-start>/
├── doxie-private/                 ← NICHT öffentlich, außerhalb des Webroots von doxiewerk.de
│   ├── config.php                 Zugangsdaten (aus config.example.php erstellen)
│   ├── .htaccess                  "Require all denied" (Sicherheitsnetz)
│   ├── app/                       src/, bin/, migrations/
│   └── storage/                   wird automatisch angelegt: uploads/, sessions/, logs/, backups/
└── <webroot doxiewerk.de>/        bestehende Website
    └── doxiediary/                ← App unter https://www.doxiewerk.de/doxiediary/
        ├── .htaccess              HTTPS, SPA-Fallback (RewriteBase /doxiediary/), Sicherheitsheader, CSP
        ├── index.html, assets/    React-Build
        └── api/
            ├── .htaccess          alles → index.php
            └── index.php          sucht doxie-private/app in übergeordneten Ordnern
```

Die genaue Lage des Webroots wird nach dem ersten SFTP-Login festgelegt. Die übrige Website auf doxiewerk.de bleibt unberührt. Das Session-Cookie gilt nur für `/doxiediary/`.

## Erstinstallation (einmalig)

1. **mod_rewrite testen:** Ordner `deploy/rewrite-test/` per SFTP in den aktuellen Webspace laden, `https://www.doxiewerk.de/rewrite-test/abc` aufrufen. Erwartet: „mod_rewrite funktioniert ✔“. Danach den Ordner löschen.
2. **Datenbank anlegen:** STRATO-Kundenlogin → Datenbanken → **MariaDB**-Datenbank (angelegt: MariaDB 11.8). Host, Name und Benutzer notieren, das Passwort sicher aufbewahren.
3. **Postfach anlegen:** `noreply@doxiewerk.de` für Systemmails (Passwort zurücksetzen).
4. **Release bauen** (lokal unter Windows im Projektordner):
   ```bash
   npm install
   npm run release
   ```
   Ergebnis: `release/doxiediary/` und `release/doxie-private/`.
5. **Hochladen** (WinSCP/FileZilla per SFTP): `doxiediary/` in den Webroot von doxiewerk.de, `doxie-private/` außerhalb davon (siehe Struktur oben).
6. **Konfiguration:** auf dem Server `doxie-private/config.example.php` nach `doxie-private/config.php` kopieren und ausfüllen:
   - `app.url` = `https://www.doxiewerk.de/doxiediary`, `cookie_path` = `/doxiediary/`
   - `app.secret` leer lassen – der Server erzeugt ihn beim ersten Aufruf in `storage/secret.key`
   - `db.*` = Werte aus Schritt 2
   - `mail.*` = `noreply@doxiewerk.de` (`smtp.strato.de`, Port 465, `ssl`)
7. **Datenbank-Schema:** Es ist nichts zu tun. Der Benutzer `su396778` darf nur SFTP, keine Kommandozeile. Die App legt die Tabellen deshalb beim ersten Aufruf selbst an (`Support\Migrator`, gesteuert über `storage/schema.version` und eine Dateisperre).
8. **Domain:** keine Änderung nötig, die App liegt als Unterordner in der bestehenden Website.
9. **Prüfen:**
   - `https://www.doxiewerk.de/doxiediary/api/v1/health` → `{"ok":true,"db":true}` (bei `"db":false`: DB-Zugang in config.php oder Migration prüfen)
   - `https://www.doxiewerk.de/doxiediary/` → Willkommensseite, Registrierung, Hund anlegen, Foto hochladen
   - `doxie-private/` darf über keine URL erreichbar sein
   - Passwort-Reset-Mail kommt an

## Update einspielen

```bash
npm run release
```
Dann per SFTP **ersetzen**: `doxiediary/` komplett und `doxie-private/app/` komplett.
`config.php` und `storage/` **nicht** überschreiben. Neue Migrationen werden beim nächsten Aufruf der App automatisch eingespielt. Danach `…/api/v1/health` aufrufen und prüfen.

## Backups (ohne Cronjobs und ohne Kommandozeile)

Dein STRATO-Zugang erlaubt nur SFTP. Weder Cronjobs noch SSH-Befehle sind möglich. Deshalb:

1. **Ab sofort:** die STRATO-eigene Datensicherung des Webspace und der Datenbank (Kundenlogin → Sicherungen). Dort lässt sich ein älterer Stand wiederherstellen.
2. **Uploads sichern:** regelmäßig den Ordner `doxie-private/storage/uploads/` per SFTP herunterladen und auf dem eigenen Rechner verschlüsselt ablegen (z. B. BitLocker).
3. **Geplant für Phase 4:** ein geschützter Backup-Download (Datenbank-Dump + Uploads als Archiv), nur mit eigenem Schlüssel aufrufbar. Damit kann die Windows-Aufgabenplanung täglich automatisch eine Kopie abholen.

`bin/backup.php` bleibt für Umgebungen mit Kommandozeile erhalten.

## Wiederherstellung

1. Datenbank über die STRATO-Sicherung oder phpMyAdmin (Kundenlogin → Datenbanken) wiederherstellen.
2. Uploads per SFTP zurück nach `doxie-private/storage/uploads/` kopieren.
3. `…/api/v1/health` prüfen.
4. Probelauf einmal pro Quartal mit einer zweiten Datenbank (Test-DB) durchführen.

## Sicherheits-Checkliste nach jedem Deployment

- [ ] `config.php` liegt nur in `doxie-private/`
- [ ] `app.env` = `production`, `secure_cookies` = `true`, `mail.driver` = `smtp`
- [ ] `https://www.doxiewerk.de/doxiediary/api/v1/gibt-es-nicht` liefert JSON-404 ohne technische Details
- [ ] Prüf-Skripte (`strato-check.php`, `rewrite-test/`) sind gelöscht
- [ ] `…/api/v1/health` liefert `{"ok":true,"db":true}`
