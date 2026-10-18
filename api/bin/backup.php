<?php

declare(strict_types=1);

/**
 * Backup von Datenbank und Uploads nach storage/backups (14 Stände).
 * STRATO bietet in diesem Paket keine Cronjobs → Aufruf per SSH, z. B. über die
 * Windows-Aufgabenplanung (siehe docs/05-deployment.md):
 *   ssh <user>@ssh.strato.de "php doxie-private/app/bin/backup.php"
 */

if (PHP_SAPI !== 'cli') {
    exit(1);
}
require dirname(__DIR__) . '/src/bootstrap.php';

$config = doxie_config();
$dir = $config->storagePath('backups');
if (!is_dir($dir)) {
    mkdir($dir, 0700, true);
}
$stamp = gmdate('Ymd-His');

// Zugangsdaten über temporäre Optionsdatei übergeben, nicht über die Prozessliste
preg_match('/host=([^;]+)/', (string) $config->get('db.dsn'), $h);
preg_match('/dbname=([^;]+)/', (string) $config->get('db.dsn'), $n);
preg_match('/port=(\d+)/', (string) $config->get('db.dsn'), $p);
$cnf = tempnam(sys_get_temp_dir(), 'dxb');
chmod($cnf, 0600);
file_put_contents($cnf, sprintf("[client]\nuser=%s\npassword=\"%s\"\nhost=%s\nport=%s\n", $config->get('db.user'), addcslashes((string) $config->get('db.pass'), '"\\'), $h[1] ?? 'localhost', $p[1] ?? '3306'));

$dbFile = "{$dir}/db-{$stamp}.sql.gz";
$cmd = sprintf('mysqldump --defaults-extra-file=%s --single-transaction --routines --no-tablespaces %s | gzip > %s', escapeshellarg($cnf), escapeshellarg($n[1] ?? ''), escapeshellarg($dbFile));
exec($cmd, $out, $code);
unlink($cnf);
if ($code !== 0 || !is_file($dbFile) || filesize($dbFile) < 100) {
    fwrite(STDERR, "Datenbank-Backup fehlgeschlagen.\n");
    exit(1);
}
chmod($dbFile, 0600);
echo "✔ Datenbank: " . basename($dbFile) . "\n";

$uploads = $config->storagePath('uploads');
if (is_dir($uploads)) {
    $tar = "{$dir}/uploads-{$stamp}.tar.gz";
    exec(sprintf('tar -czf %s -C %s .', escapeshellarg($tar), escapeshellarg($uploads)), $o2, $c2);
    if ($c2 === 0) {
        chmod($tar, 0600);
        echo "✔ Uploads: " . basename($tar) . "\n";
    }
}

// Rotation: je Typ die 14 neuesten behalten
foreach (['db-*.sql.gz', 'uploads-*.tar.gz'] as $pattern) {
    $files = glob("{$dir}/{$pattern}") ?: [];
    rsort($files);
    foreach (array_slice($files, 14) as $old) {
        unlink($old);
    }
}
