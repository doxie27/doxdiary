<?php

declare(strict_types=1);

namespace Doxie\Support;

/**
 * Wendet SQL-Migrationen aus migrations/*.sql an.
 *
 * STRATO-Webhosting erlaubt hier nur SFTP, keine Kommandozeile. Deshalb prüft
 * die App bei jeder Anfrage anhand einer kleinen Versionsdatei (ohne DB-Zugriff),
 * ob neue Migrationen mitgeliefert wurden, und spielt sie dann unter Dateisperre
 * ein. Ausgeführt werden nur die mitgelieferten Dateien – kein öffentlicher Installer.
 */
final class Migrator
{
    public function __construct(private readonly Db $db, private readonly string $dir)
    {
    }

    public static function migrationsDir(): string
    {
        return dirname(__DIR__, 2) . '/migrations';
    }

    /** @return list<string> Dateipfade, sortiert */
    public function files(): array
    {
        $files = glob($this->dir . '/*.sql') ?: [];
        sort($files);
        return $files;
    }

    /** @return list<string> bereits angewendete Versionen */
    public function applied(): array
    {
        $this->db->run('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) NOT NULL PRIMARY KEY, applied_at DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
        return array_column($this->db->all('SELECT version FROM schema_migrations'), 'version');
    }

    /** @return list<string> neu angewendete Versionen */
    public function run(): array
    {
        $applied = $this->applied();
        $done = [];
        foreach ($this->files() as $file) {
            $version = basename($file, '.sql');
            if (in_array($version, $applied, true)) {
                continue;
            }
            // Kommentare entfernen, an Semikolon am Zeilenende trennen (keine Prozeduren im Schema)
            $sql = (string) preg_replace('/^\s*--.*$/m', '', (string) file_get_contents($file));
            foreach (preg_split('/;\s*$/m', $sql) ?: [] as $statement) {
                if (trim($statement) !== '') {
                    $this->db->pdo()->exec($statement);
                }
            }
            $this->db->run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [$version, Db::now()]);
            $done[] = $version;
        }
        return $done;
    }

    /** Neueste mitgelieferte Version, z. B. "0001_init". */
    public function latest(): string
    {
        $files = $this->files();
        return $files ? basename((string) end($files), '.sql') : '';
    }

    /**
     * Sorgt dafür, dass die Datenbank auf dem Stand der mitgelieferten Migrationen ist.
     * Schneller Pfad ohne DB-Verbindung, wenn die Versionsdatei aktuell ist.
     *
     * @param callable(): Db $db
     */
    public static function ensureCurrent(Config $config, callable $db): void
    {
        $dir = self::migrationsDir();
        $files = glob($dir . '/*.sql') ?: [];
        sort($files);
        $latest = $files ? basename((string) end($files), '.sql') : '';
        $marker = $config->storagePath('schema.version');
        if (is_file($marker) && trim((string) file_get_contents($marker)) === $latest) {
            return;
        }
        if (!is_dir(dirname($marker))) {
            mkdir(dirname($marker), 0700, true);
        }
        $lock = fopen($config->storagePath('migrate.lock'), 'c');
        if ($lock === false || !flock($lock, LOCK_EX)) {
            throw new \RuntimeException('Migrationssperre nicht verfügbar');
        }
        try {
            // Nach Erhalt der Sperre erneut prüfen – ein paralleler Aufruf war evtl. schneller
            if (!is_file($marker) || trim((string) file_get_contents($marker)) !== $latest) {
                (new self($db(), $dir))->run();
                file_put_contents($marker, $latest, LOCK_EX);
            }
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}
