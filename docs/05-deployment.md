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
3. **Postfach anlegen:** z. B. `noreply@<domain>` für Systemmails (Passwort zurücksetzen).
4. **Release bauen** (lokal unter Windows im Projektordner):
   ```bash
   npm install
   npm run release
   ```
   Ergebnis: `release/doxiediary/` und `release/doxie-private/`.
5. **Hochladen** (WinSCP/FileZilla per SFTP): `doxiediary/` in den Webroot von doxiewerk.de, `doxie-private/` außerhalb davon (siehe Struktur oben).
6. **Konfiguration:** auf dem Server `doxie-private/config.example.php` nach `doxie-private/config.php` kopieren und ausfüllen:
   - `app.url` = `https://www.doxiewerk.de/doxiediary`, `cookie_path` = `/doxiediary/`
   - `app.secret` = Ausgabe von `php -r "echo bin2hex(random_bytes(32));"`
   - `db.*` = Werte aus Schritt 2
   - `mail.*` = `noreply@doxiewerk.de` (`smtp.strato.de`, Port 465, `ssl`)
7. **Datenbank-Schema anlegen** (per SSH):
   ```bash
   ssh su396778@5021038204.ssh.w2.strato.hosting
   php doxie-private/app/bin/migrate.php
   ```
8. **Domain:** keine Änderung nötig, die App liegt als Unterordner in der bestehenden Website.
9. **Prüfen:**
   - `https://www.doxiewerk.de/doxiediary/api/v1/health` → `{"ok":true}`
   - `https://www.doxiewerk.de/doxiediary/` → Willkommensseite, Registrierung, Hund anlegen, Foto hochladen
   - `doxie-private/` darf über keine URL erreichbar sein
   - Passwort-Reset-Mail kommt an

## Update einspielen

```bash
npm run release
```
Dann per SFTP **ersetzen**: `doxiediary/` komplett und `doxie-private/app/` komplett.
`config.php` und `storage/` **nicht** überschreiben. Danach per SSH:
```bash
php doxie-private/app/bin/migrate.php
```

## Backups (ohne Cronjobs)

Das STRATO-Paket bietet keine Cronjobs. Deshalb wird das Backup von deinem Windows-PC aus angestoßen. Zusätzlich gibt es STRATOs eigene Datensicherung.

**Manuell** (jederzeit):
```bash
ssh su396778@5021038204.ssh.w2.strato.hosting "php doxie-private/app/bin/backup.php"
```
Legt `storage/backups/db-<datum>.sql.gz` und `uploads-<datum>.tar.gz` an und behält jeweils die 14 neuesten.

**Automatisch über die Windows-Aufgabenplanung:**
1. Einmalig einen SSH-Schlüssel einrichten: `ssh-keygen -t ed25519` und den öffentlichen Schlüssel auf dem Server in `~/.ssh/authorized_keys` eintragen. Prüfen, ob die Anmeldung danach ohne Passwort klappt.
2. Aufgabenplanung → Einfache Aufgabe erstellen → täglich, z. B. 21:00 Uhr
   - Programm: `C:\Windows\System32\OpenSSH\ssh.exe`
   - Argumente: `su396778@5021038204.ssh.w2.strato.hosting "php doxie-private/app/bin/backup.php"`
   - Option „Aufgabe so schnell wie möglich nach einem verpassten Start ausführen“ aktivieren
3. **Kopie nach Hause** (wöchentlich empfohlen): `scp su396778@5021038204.ssh.w2.strato.hosting:doxie-private/storage/backups/* D:\Backups\doxie\`. Den Ordner verschlüsselt speichern, z. B. mit BitLocker, denn er enthält personenbezogene Daten.

## Wiederherstellung

1. Wartungsfenster: Domain-Ziel vorübergehend auf eine Hinweisseite setzen (optional).
2. Datenbank:
   ```bash
   gunzip -c doxie-private/storage/backups/db-<datum>.sql.gz | mysql -h <db-host> -u <db-user> -p <db-name>
   ```
3. Uploads:
   ```bash
   tar -xzf doxie-private/storage/backups/uploads-<datum>.tar.gz -C doxie-private/storage/uploads
   ```
4. `php doxie-private/app/bin/migrate.php --status` prüfen.
5. **Probelauf einmal pro Quartal** in eine zweite Datenbank (Test-DB) einspielen und `config.php` einer Testkopie darauf zeigen lassen.

## Sicherheits-Checkliste nach jedem Deployment

- [ ] `config.php` liegt nur in `doxie-private/`
- [ ] `app.env` = `production`, `secure_cookies` = `true`, `mail.driver` = `smtp`
- [ ] `https://www.doxiewerk.de/doxiediary/api/v1/gibt-es-nicht` liefert JSON-404 ohne technische Details
- [ ] Prüf-Skripte (`strato-check.php`, `rewrite-test/`) sind gelöscht
