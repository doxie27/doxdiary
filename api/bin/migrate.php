<?php

declare(strict_types=1);

/**
 * Wendet fehlende Migrationen an (lokal oder mit SSH-Zugang).
 *   php bin/migrate.php            Migrationen ausführen
 *   php bin/migrate.php --status   Stand anzeigen
 * Auf STRATO ohne Kommandozeile übernimmt das die App automatisch (Support\Migrator).
 */

if (PHP_SAPI !== 'cli') {
    exit(1);
}
require dirname(__DIR__) . '/src/bootstrap.php';

use Doxie\Support\Db;
use Doxie\Support\Migrator;

$migrator = new Migrator(Db::fromConfig(doxie_config()), Migrator::migrationsDir());

if (in_array('--status', $argv, true)) {
    $applied = $migrator->applied();
    foreach ($migrator->files() as $f) {
        printf("%s %s\n", in_array(basename($f, '.sql'), $applied, true) ? '✔' : '·', basename($f));
    }
    exit(0);
}
$done = $migrator->run();
echo $done ? implode("\n", array_map(static fn ($v) => "✔ {$v}", $done)) . "\n" : "Datenbank ist aktuell.\n";
