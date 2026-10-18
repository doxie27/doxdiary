<?php
/**
 * Doxie Diary – Hosting-Check für STRATO
 *
 * 1. Datei per SFTP in den Webspace laden (Dateinamen gern um eine Zufallszahl ergänzen,
 *    z. B. strato-check-83721.php), im Browser aufrufen.
 * 2. Ausgabe kopieren und an Claude schicken.
 * 3. DATEI DANACH SOFORT WIEDER LÖSCHEN.
 *
 * Gibt keine Zugangsdaten oder Inhalte aus – nur Versionen, Module und Limits.
 */
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex');

$yes = fn (bool $b) => $b ? 'ja' : 'NEIN';
$docRoot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/');
$parent = dirname($docRoot);

$lines = [
    'PHP-Version'               => PHP_VERSION,
    'Server-API'                => PHP_SAPI,
    'Server-Software'           => $_SERVER['SERVER_SOFTWARE'] ?? '?',
    'HTTPS aktiv'               => $yes(($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'),
    '--- Erweiterungen'         => '',
    'pdo_mysql'                 => $yes(extension_loaded('pdo_mysql')),
    'mbstring'                  => $yes(extension_loaded('mbstring')),
    'fileinfo (MIME-Prüfung)'   => $yes(extension_loaded('fileinfo')),
    'gd (Bilder neu kodieren)'  => $yes(extension_loaded('gd')),
    'gd WebP-Unterstützung'     => $yes(function_exists('imagewebp')),
    'imagick'                   => $yes(extension_loaded('imagick')),
    'openssl'                   => $yes(extension_loaded('openssl')),
    'sodium'                    => $yes(extension_loaded('sodium')),
    'intl'                      => $yes(extension_loaded('intl')),
    'curl'                      => $yes(extension_loaded('curl')),
    'zip'                       => $yes(extension_loaded('zip')),
    '--- Sicherheit'            => '',
    'Argon2id verfügbar'        => $yes(defined('PASSWORD_ARGON2ID')),
    'random_bytes'              => $yes(function_exists('random_bytes')),
    'display_errors'            => ini_get('display_errors') ?: 'aus',
    'session.save_path'         => ini_get('session.save_path') !== '' ? 'gesetzt' : 'Standard',
    'session.cookie_secure'     => ini_get('session.cookie_secure') ?: '0',
    '--- Limits'                => '',
    'upload_max_filesize'       => ini_get('upload_max_filesize'),
    'post_max_size'             => ini_get('post_max_size'),
    'memory_limit'              => ini_get('memory_limit'),
    'max_execution_time'        => ini_get('max_execution_time'),
    'max_file_uploads'          => ini_get('max_file_uploads'),
    '--- Dateisystem'           => '',
    'Webroot-Tiefe'             => substr_count($docRoot, '/') . ' Ebenen',
    'Übergeordnetes Verz. lesbar'     => $yes(@is_readable($parent)),
    'Übergeordnetes Verz. beschreibbar' => $yes(@is_writable($parent)),
    'open_basedir'              => ini_get('open_basedir') ? 'aktiv (' . count(explode(PATH_SEPARATOR, ini_get('open_basedir'))) . ' Pfade)' : 'nicht gesetzt',
    'Freier Speicher'           => ($f = @disk_free_space($docRoot)) ? round($f / 1073741824, 1) . ' GB' : '?',
    '--- Sonstiges'             => '',
    'mail() vorhanden'          => $yes(function_exists('mail')),
    'exec/shell möglich'        => $yes(function_exists('exec') && !in_array('exec', array_map('trim', explode(',', (string) ini_get('disable_functions'))), true)),
    'mod_rewrite'               => function_exists('apache_get_modules') ? $yes(in_array('mod_rewrite', apache_get_modules(), true)) : 'nicht ermittelbar (per .htaccess-Test prüfen)',
    'Zeitzone'                  => date_default_timezone_get(),
];

foreach ($lines as $k => $v) {
    echo str_starts_with($k, '---') ? "\n" . substr($k, 4) . "\n" : str_pad($k, 36) . $v . "\n";
}
echo "\nBitte diese Datei jetzt wieder löschen.\n";
