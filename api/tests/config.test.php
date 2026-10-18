<?php
// Testkonfiguration: eigene Datenbank, temporärer Speicher, Mails als Dateien.
$dsn = getenv('DOXIE_TEST_DSN') ?: 'mysql:host=127.0.0.1;dbname=doxie_test;charset=utf8mb4';
return [
    'app' => ['env' => 'development', 'url' => 'http://localhost:5173', 'secret' => '', 'secure_cookies' => false, 'allowed_origins' => [], 'maintenance' => false],
    'db' => ['dsn' => $dsn, 'user' => getenv('DOXIE_TEST_DB_USER') ?: 'doxie', 'pass' => getenv('DOXIE_TEST_DB_PASS') ?: 'devpass'],
    'paths' => ['storage' => sys_get_temp_dir() . '/doxie-test-storage'],
    // Tests registrieren viele Konten von einer IP – nur IP-Limits lockern, Konto-Limits bleiben
    'limits' => ['register' => [1000, 3600], 'login-ip' => [1000, 900], 'reset-ip' => [1000, 3600], 'reset-confirm' => [1000, 3600]],
    'admin' => ['emails' => ['admin@example.test']],
    'backup' => ['token' => str_repeat('t', 40), 'password' => 'backup-test-passwort'],
    'legal' => ['imprint_url' => 'https://example.test/impressum', 'privacy_url' => null],
    // Wartung läuft in Tests gezielt über MaintenanceTest, nicht nach jeder Anfrage
    'app_maintenance_note' => true,
    'mail' => ['driver' => 'log', 'from' => 'noreply@test.local', 'from_name' => 'Doxie Diary'],
];
