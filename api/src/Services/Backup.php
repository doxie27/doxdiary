<?php

declare(strict_types=1);

namespace Doxie\Services;

use Doxie\App;
use Doxie\Support\Db;

/**
 * Erstellt ein ZIP mit SQL-Dump (rein in PHP, ohne mysqldump) und allen Uploads.
 * Mit backup.password in config.php wird jeder Eintrag AES-256-verschlüsselt.
 * Wiederherstellung: SQL über phpMyAdmin importieren, Uploads per SFTP zurückkopieren.
 */
final class Backup
{
    public function __construct(private readonly App $app)
    {
    }

    /** @return string Pfad zur temporären ZIP-Datei (wird nach Auslieferung gelöscht) */
    public function create(): string
    {
        $tmpDir = $this->app->config->storagePath('tmp');
        if (!is_dir($tmpDir)) {
            mkdir($tmpDir, 0700, true);
        }
        $stamp = gmdate('Ymd-His');
        $sqlFile = "{$tmpDir}/db-{$stamp}-" . bin2hex(random_bytes(4)) . '.sql';
        $zipFile = "{$tmpDir}/doxie-backup-{$stamp}-" . bin2hex(random_bytes(4)) . '.zip';
        $this->dumpDatabase($sqlFile);

        $zip = new \ZipArchive();
        if ($zip->open($zipFile, \ZipArchive::CREATE | \ZipArchive::EXCL) !== true) {
            throw new \RuntimeException('ZIP konnte nicht angelegt werden');
        }
        $password = (string) $this->app->config->get('backup.password', '');
        if ($password !== '' && !\ZipArchive::isEncryptionMethodSupported(\ZipArchive::EM_AES_256)) {
            throw new \RuntimeException('AES-Verschlüsselung für ZIP auf diesem Server nicht verfügbar');
        }
        $entries = ['database.sql' => $sqlFile];
        $uploads = $this->app->config->storagePath('uploads');
        foreach (glob($uploads . '/*.jpg') ?: [] as $file) {
            $entries['uploads/' . basename($file)] = $file;
        }
        $zip->addFromString('LIESMICH.txt', "Doxie-Diary-Backup vom {$stamp} (UTC)\n\n"
            . "database.sql  → in phpMyAdmin in eine leere Datenbank importieren\n"
            . "uploads/      → per SFTP nach doxie-private/storage/uploads/ kopieren\n");
        foreach ($entries as $name => $path) {
            $zip->addFile($path, $name);
            if ($password !== '') {
                $zip->setEncryptionName($name, \ZipArchive::EM_AES_256, $password);
            }
        }
        $zip->close();
        unlink($sqlFile);
        chmod($zipFile, 0600);
        return $zipFile;
    }

    private function dumpDatabase(string $file): void
    {
        $db = $this->app->db();
        $pdo = $db->pdo();
        $out = fopen($file, 'wb');
        fwrite($out, "-- Doxie Diary SQL-Dump " . gmdate('c') . "\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\nSET time_zone = '+00:00';\n\n");
        foreach ($db->all("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'") as $row) {
            $table = (string) array_values($row)[0];
            $q = '`' . str_replace('`', '``', $table) . '`';
            $create = $db->one("SHOW CREATE TABLE {$q}");
            fwrite($out, "DROP TABLE IF EXISTS {$q};\n" . array_values($create)[1] . ";\n\n");
            $stmt = $pdo->query("SELECT * FROM {$q}");
            while ($r = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $values = array_map(static fn ($v) => $v === null ? 'NULL' : (is_int($v) || is_float($v) ? (string) $v : $pdo->quote((string) $v)), $r);
                fwrite($out, "INSERT INTO {$q} VALUES (" . implode(', ', $values) . ");\n");
            }
            fwrite($out, "\n");
        }
        fwrite($out, "SET FOREIGN_KEY_CHECKS = 1;\n");
        fclose($out);
    }
}
