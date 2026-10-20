<?php

/**
 * Kopieren nach config.php und Werte eintragen. config.php NIE committen.
 * STRATO: liegt in <home>/doxie-private/config.php (außerhalb des Webroots).
 */

return [
    'app' => [
        'env' => 'production',                 // 'development' zeigt Fehlermeldungen (ohne personenbezogene Daten)
        'url' => 'https://www.doxiediary.de/doxiediary', // Basis-URL der App (Links in E-Mails, Origin-Prüfung)
        'secret' => '',                        // leer lassen: wird automatisch in storage/secret.key erzeugt
        'secure_cookies' => true,              // lokal ohne HTTPS: false
        'cookie_path' => '/doxiediary/',       // Session-Cookie nur für die App, nicht für die ganze Domain
        'allowed_origins' => ['https://doxiediary.de'], // Aufruf ohne www; später z. B. 'capacitor://localhost'
    ],
    'admin' => [
        // Admin-Zugang nur für diese (bestätigten) E-Mail-Adressen
        'emails' => ['deine@adresse.de'],
    ],
    'backup' => [
        // Verschlüsselt Backups (AES-256). Gut aufbewahren – ohne Passwort kein Wiederherstellen!
        'password' => '',
        // Für die automatische Abholung per Windows-Aufgabenplanung, mind. 32 Zeichen, sonst deaktiviert
        'token' => '',
    ],
    'legal' => [
        // null = mitgelieferte Seiten der App (impressum.html, datenschutz.html)
        'imprint_url' => null,
        'privacy_url' => null,
    ],
    'db' => [
        'dsn' => 'mysql:host=DB-HOST;port=3306;dbname=DB-NAME;charset=utf8mb4', // Werte aus dem STRATO-Kundenlogin
        'user' => 'DB-BENUTZER',
        'pass' => 'DB-PASSWORT',
    ],
    'paths' => [
        'storage' => __DIR__ . '/storage',     // Uploads, Sessions, Logs, Backups
    ],
    'mail' => [
        'driver' => 'smtp',                    // smtp | mail | log (log nur lokal!)
        'host' => 'smtp.strato.de',
        'port' => 465,
        'encryption' => 'ssl',                 // ssl (465) oder tls (587, STARTTLS)
        'user' => 'noreply@doxiediary.de',
        'pass' => 'POSTFACH-PASSWORT',
        'from' => 'noreply@doxiediary.de',
        'from_name' => 'Doxie Diary',
    ],
];
