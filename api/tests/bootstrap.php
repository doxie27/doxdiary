<?php

declare(strict_types=1);

/**
 * Integrationstests gegen einen echten PHP-Server und eine Test-Datenbank:
 * Schema wird frisch migriert, der eingebaute Server läuft für die Suite.
 */

require dirname(__DIR__) . '/vendor/autoload.php';

$config = __DIR__ . '/config.test.php';
putenv('DOXIE_CONFIG=' . $config);
require dirname(__DIR__) . '/src/bootstrap.php';

$cfg = doxie_config();
$db = Doxie\Support\Db::fromConfig($cfg);
$db->pdo()->exec('SET FOREIGN_KEY_CHECKS = 0');
foreach ($db->all('SHOW TABLES') as $row) {
    $db->pdo()->exec('DROP TABLE `' . str_replace('`', '', (string) array_values($row)[0]) . '`');
}
$db->pdo()->exec('SET FOREIGN_KEY_CHECKS = 1');
exec('rm -rf ' . escapeshellarg($cfg->storagePath()));
// Schema wird – wie auf STRATO – automatisch beim ersten Aufruf angelegt (siehe MigrationTest)

$port = 18000 + random_int(0, 999);
define('DOXIE_TEST_BASE', "http://127.0.0.1:{$port}/api/v1");
$public = dirname(__DIR__) . '/public';
$proc = proc_open(
    [PHP_BINARY, '-S', "127.0.0.1:{$port}", '-t', $public, $public . '/index.php'],
    [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']],
    $pipes,
    null,
    ['DOXIE_CONFIG' => $config] + getenv(),
);
register_shutdown_function(static fn () => proc_terminate($proc));
for ($i = 0; $i < 50; $i++) {
    if (@file_get_contents(DOXIE_TEST_BASE . '/health') !== false) {
        break;
    }
    usleep(100_000);
}
