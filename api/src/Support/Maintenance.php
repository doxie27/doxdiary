<?php

declare(strict_types=1);

namespace Doxie\Support;

use Doxie\App;
use Doxie\Services\AccountDeleter;

/**
 * Regelmäßige Aufräumarbeiten ohne Cronjobs: läuft nach einer normalen Anfrage,
 * höchstens einmal pro Stunde und nie parallel.
 */
final class Maintenance
{
    private const INTERVAL = 3600;
    private const VERIFY_DAYS = 7;
    private const REMIND_AFTER_DAYS = 5;

    public function __construct(private readonly App $app)
    {
    }

    public function runIfDue(): void
    {
        $marker = $this->app->config->storagePath('maintenance.last');
        if (is_file($marker) && time() - (int) file_get_contents($marker) < self::INTERVAL) {
            return;
        }
        $lock = fopen($this->app->config->storagePath('maintenance.lock'), 'c');
        if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
            return;
        }
        try {
            file_put_contents($marker, (string) time(), LOCK_EX);
            $this->run();
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /** @return array<string, int> Anzahl je Aufgabe (für Tests und Protokoll) */
    public function run(): array
    {
        $db = $this->app->db();
        $ago = static fn (int $sec) => gmdate('Y-m-d H:i:s', time() - $sec);
        $result = [
            'attempts' => $db->run('DELETE FROM auth_attempts WHERE attempted_at < ?', [$ago(86400)])->rowCount(),
            'resets' => $db->run('DELETE FROM password_resets WHERE created_at < ?', [$ago(7 * 86400)])->rowCount(),
            'verifications' => $db->run('DELETE FROM email_verifications WHERE created_at < ? AND (used_at IS NOT NULL OR expires_at < ?)', [$ago(14 * 86400), Db::now()])->rowCount(),
            'reminded' => 0,
            'deleted' => 0,
        ];

        // Erinnerung nach 5 Tagen ohne Bestätigung
        $remind = $db->all(
            'SELECT * FROM users WHERE email_verified_at IS NULL AND verification_reminded_at IS NULL AND created_at < ? AND created_at > ?',
            [$ago(self::REMIND_AFTER_DAYS * 86400), $ago(self::VERIFY_DAYS * 86400)],
        );
        foreach ($remind as $user) {
            $db->run('UPDATE users SET verification_reminded_at = ? WHERE id = ?', [Db::now(), $user['id']]);
            $this->app->mailing()->sendVerification($user, reminder: true);
            $result['reminded']++;
        }

        // Nach 7 Tagen unbestätigt: Konto samt Daten löschen
        $expired = $db->all('SELECT id FROM users WHERE email_verified_at IS NULL AND created_at < ?', [$ago(self::VERIFY_DAYS * 86400)]);
        $deleter = new AccountDeleter($this->app);
        foreach ($expired as $row) {
            $deleter->delete((int) $row['id']);
            $db->run("INSERT INTO admin_audit (admin_user_id, action, target_user_id, created_at) VALUES (NULL, 'auto_delete_unverified', ?, ?)", [$row['id'], Db::now()]);
            $result['deleted']++;
        }

        // Temporäre Backup-Dateien, die nicht ausgeliefert wurden
        foreach (glob($this->app->config->storagePath('tmp') . '/*') ?: [] as $file) {
            if (is_file($file) && filemtime($file) < time() - 3600) {
                @unlink($file);
            }
        }
        return $result;
    }
}
