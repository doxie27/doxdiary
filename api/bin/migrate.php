<?php

declare(strict_types=1);

/**
 * Wendet fehlende Migrationen aus migrations/*.sql an.
 *   php bin/migrate.php            Migrationen ausführen
 *   php bin/migrate.php --status   Stand anzeigen
 * Nur über die Kommandozeile (lokal oder per SSH auf STRATO).
 */

if (PHP_SAPI !== 'cli') {
    exit(1);
}
require dirname(__DIR__) . '/src/bootstrap.php';

use Doxie\Support\Db;

$db = Db::fromConfig(doxie_config());
$db->run('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) NOT NULL PRIMARY KEY, applied_at DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
$applied = array_column($db->all('SELECT version FROM schema_migrations'), 'version');
$files = glob(dirname(__DIR__) . '/migrations/*.sql') ?: [];
sort($files);

$pending = array_values(array_filter($files, static fn ($f) => !in_array(basename($f, '.sql'), $applied, true)));
if (in_array('--status', $argv, true)) {
    foreach ($files as $f) {
        printf("%s %s\n", in_array(basename($f, '.sql'), $applied, true) ? '✔' : '·', basename($f));
    }
    exit(0);
}
if (!$pending) {
    echo "Datenbank ist aktuell.\n";
    exit(0);
}
foreach ($pending as $file) {
    $version = basename($file, '.sql');
    $sql = (string) file_get_contents($file);
    // Kommentare entfernen, an Semikolon am Zeilenende trennen (keine Prozeduren im Schema)
    $sql = (string) preg_replace('/^\s*--.*$/m', '', $sql);
    foreach (preg_split('/;\s*$/m', $sql) ?: [] as $statement) {
        if (trim($statement) !== '') {
            $db->pdo()->exec($statement);
        }
    }
    $db->run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [$version, Db::now()]);
    echo "✔ {$version}\n";
}
