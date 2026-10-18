<?php

/**
 * Kopieren nach config.php und Werte eintragen. config.php NIE committen.
 * STRATO: liegt in <home>/doxie-private/config.php (außerhalb des Webroots).
 *
 * Geheimnis erzeugen:  php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
 */

return [
    'app' => [
        'env' => 'production',                 // 'development' zeigt Fehlermeldungen (ohne personenbezogene Daten)
        'url' => 'https://deine-domain.de',    // Basis-URL der App (für Links in E-Mails, Origin-Prüfung)
        'secret' => 'HIER-64-ZEICHEN-HEX',     // für HMAC (Rate-Limiting) – geheim halten
        'secure_cookies' => true,              // lokal ohne HTTPS: false
        'cookie_path' => '/',
        'allowed_origins' => [],               // später z. B. 'capacitor://localhost'
    ],
    'db' => [
        'dsn' => 'mysql:host=DB-HOST;port=3306;dbname=DB-NAME;charset=utf8mb4',
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
        'user' => 'noreply@deine-domain.de',
        'pass' => 'POSTFACH-PASSWORT',
        'from' => 'noreply@deine-domain.de',
        'from_name' => 'Doxie Diary',
    ],
];
