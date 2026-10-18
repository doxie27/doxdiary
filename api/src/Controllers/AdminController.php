<?php

declare(strict_types=1);

namespace Doxie\Controllers;

use Doxie\App;
use Doxie\Auth\Passwords;
use Doxie\Http\HttpException;
use Doxie\Http\Request;
use Doxie\Http\Response;
use Doxie\Repositories\UserRepository;
use Doxie\Services\AccountDeleter;
use Doxie\Services\Backup;
use Doxie\Support\Db;
use Doxie\Support\Migrator;
use Doxie\Support\Validator;

/**
 * Admin-Bereich für den Betrieb. Grundsatz: keine Einsicht in Hunde-, Gesundheits-,
 * Trainings- oder Tagebuchinhalte anderer Nutzer:innen – nur Kontodaten und Zahlen.
 * Für Nicht-Admins verhalten sich alle Routen wie nicht vorhanden (404).
 */
final class AdminController
{
    public function __construct(private readonly App $app)
    {
    }

    public function status(Request $r): Response
    {
        $this->requireAdmin();
        $db = $this->app->db();
        $migrator = new Migrator($db, Migrator::migrationsDir());
        $count = static fn (string $sql, array $p = []) => (int) ($db->one($sql, $p)['n'] ?? 0);
        $tableExists = static fn (string $t) => $db->one('SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', [$t]) !== null;

        $uploads = glob($this->app->config->storagePath('uploads') . '/*.jpg') ?: [];
        $errors = 0;
        foreach (glob($this->app->config->storagePath('logs') . '/app-*.log') ?: [] as $log) {
            if (filemtime($log) > time() - 31 * 86400) {
                $errors += count(file($log) ?: []);
            }
        }

        $weekly = [];
        if ($tableExists('training_sessions')) {
            for ($i = 7; $i >= 0; $i--) {
                $from = gmdate('Y-m-d', strtotime("monday this week -{$i} week"));
                $to = gmdate('Y-m-d', strtotime("monday this week -" . ($i - 1) . ' week'));
                $weekly[] = ['week' => $from, 'sessions' => $count('SELECT COUNT(*) n FROM training_sessions WHERE started_at >= ? AND started_at < ?', [$from, $to])];
            }
        }
        $lastBackup = $db->one("SELECT created_at FROM admin_audit WHERE action IN ('backup', 'backup_token') ORDER BY id DESC LIMIT 1");

        return Response::json([
            'system' => [
                'php' => PHP_VERSION,
                'database' => (string) ($db->one('SELECT VERSION() v')['v'] ?? ''),
                'migrationsApplied' => count($migrator->applied()),
                'migrationsAvailable' => count($migrator->files()),
                'latestMigration' => $migrator->latest(),
                'uploadsCount' => count($uploads),
                'uploadsBytes' => array_sum(array_map('filesize', $uploads)),
                'errorsLast30Days' => $errors,
                'mailDriver' => (string) $this->app->config->get('mail.driver'),
                'backupEncrypted' => (string) $this->app->config->get('backup.password', '') !== '',
                'backupTokenConfigured' => strlen((string) $this->app->config->get('backup.token', '')) >= 32,
                'lastBackupAt' => UserRepository::iso($lastBackup['created_at'] ?? null),
            ],
            'stats' => [
                'users' => $count('SELECT COUNT(*) n FROM users'),
                'usersVerified' => $count('SELECT COUNT(*) n FROM users WHERE email_verified_at IS NOT NULL'),
                'usersLocked' => $count('SELECT COUNT(*) n FROM users WHERE locked_at IS NOT NULL'),
                'activeLast30Days' => $count('SELECT COUNT(*) n FROM users WHERE last_login_at > ?', [gmdate('Y-m-d H:i:s', time() - 30 * 86400)]),
                'dogs' => $count('SELECT COUNT(*) n FROM dogs'),
                'sessions' => $tableExists('training_sessions') ? $count('SELECT COUNT(*) n FROM training_sessions') : 0,
                'diaryEntries' => $tableExists('diary_entries') ? $count('SELECT COUNT(*) n FROM diary_entries') : 0,
                'sessionsPerWeek' => $weekly,
            ],
        ]);
    }

    /** Backup über die App – mit erneuter Passwortbestätigung. */
    public function backup(Request $r): Response
    {
        $admin = $this->requireAdmin();
        $this->confirmPassword($admin, $r);
        return $this->sendBackup((int) $admin['id'], 'backup');
    }

    /**
     * Backup für die automatische Abholung (Windows-Aufgabenplanung):
     * Header "Authorization: Bearer <backup.token>". Ohne konfigurierten Token: 404.
     */
    public function backupWithToken(Request $r): Response
    {
        $token = (string) $this->app->config->get('backup.token', '');
        $given = preg_replace('/^Bearer\s+/i', '', (string) $r->header('authorization'));
        if (strlen($token) < 32) {
            throw HttpException::notFound();
        }
        $this->app->limiter()->check('admin-reauth', 'backup-token:' . $r->ip);
        if (!hash_equals($token, (string) $given)) {
            $this->app->limiter()->record('admin-reauth', 'backup-token:' . $r->ip);
            throw HttpException::notFound();
        }
        return $this->sendBackup(null, 'backup_token');
    }

    public function users(Request $r): Response
    {
        $this->requireAdmin();
        $list = array_map(static fn (array $u) => [
            'id' => (string) $u['id'],
            'name' => trim($u['first_name'] . ' ' . $u['last_name']),
            'email' => $u['email'],
            'createdAt' => UserRepository::iso($u['created_at']),
            'lastLoginAt' => UserRepository::iso($u['last_login_at']),
            'verified' => $u['email_verified_at'] !== null,
            'locked' => $u['locked_at'] !== null,
            'dogs' => (int) $u['dogs'],
        ], $this->app->users()->adminList());
        return Response::json(['users' => $list]);
    }

    public function lock(Request $r): Response
    {
        [$admin, $target] = $this->target($r);
        $this->app->users()->setLocked((int) $target['id'], true);
        $this->log((int) $admin['id'], 'lock', (int) $target['id']);
        return Response::json(['ok' => true]);
    }

    public function unlock(Request $r): Response
    {
        [$admin, $target] = $this->target($r);
        $this->app->users()->setLocked((int) $target['id'], false);
        $this->log((int) $admin['id'], 'unlock', (int) $target['id']);
        return Response::json(['ok' => true]);
    }

    public function sendReset(Request $r): Response
    {
        [$admin, $target] = $this->target($r, allowSelf: true);
        $this->app->mailing()->sendPasswordReset($target);
        $this->log((int) $admin['id'], 'send_reset', (int) $target['id']);
        return Response::json(['ok' => true]);
    }

    public function deleteUser(Request $r): Response
    {
        [$admin, $target] = $this->target($r);
        $this->confirmPassword($admin, $r);
        (new AccountDeleter($this->app))->delete((int) $target['id']);
        $this->log((int) $admin['id'], 'delete_user', (int) $target['id']);
        return Response::noContent();
    }

    public function audit(Request $r): Response
    {
        $this->requireAdmin();
        $rows = $this->app->db()->all(
            'SELECT a.action, a.created_at, a.target_user_id, t.email AS target_email
             FROM admin_audit a LEFT JOIN users t ON t.id = a.target_user_id ORDER BY a.id DESC LIMIT 50',
        );
        return Response::json(['entries' => array_map(static fn ($e) => [
            'action' => $e['action'],
            'at' => UserRepository::iso($e['created_at']),
            'target' => $e['target_email'] ?? ($e['target_user_id'] ? 'gelöschtes Konto' : null),
        ], $rows)]);
    }

    /** @return array<string, mixed> */
    private function requireAdmin(): array
    {
        $user = $this->app->users()->find($this->app->userId());
        if ($user === null || !$this->app->isAdmin($user)) {
            throw HttpException::notFound();
        }
        return $user;
    }

    /** @return array{array<string, mixed>, array<string, mixed>} */
    private function target(Request $r, bool $allowSelf = false): array
    {
        $admin = $this->requireAdmin();
        $target = $this->app->users()->find($r->intParam('id')) ?? throw HttpException::notFound();
        if (!$allowSelf && (int) $target['id'] === (int) $admin['id']) {
            throw new HttpException(422, 'self_action', 'Diese Aktion ist für dein eigenes Konto nicht möglich.');
        }
        return [$admin, $target];
    }

    private function confirmPassword(array $admin, Request $r): void
    {
        $v = new Validator($r->body);
        $password = $v->password('password', 1);
        $v->validate();
        $limiter = $this->app->limiter();
        $limiter->check('admin-reauth', (string) $admin['id']);
        if (!Passwords::verify($password, (string) $admin['password_hash'])) {
            $limiter->record('admin-reauth', (string) $admin['id']);
            throw HttpException::validation(['password' => 'Das Passwort ist nicht korrekt.']);
        }
    }

    private function sendBackup(?int $adminId, string $action): Response
    {
        // Ohne Verschlüsselung kein Backup: die Datei enthält Gesundheits- und Tagebuchdaten
        if ((string) $this->app->config->get('backup.password', '') === '') {
            throw new HttpException(422, 'backup_not_encrypted', 'Bitte zuerst in der config.php ein backup.password festlegen. Backups werden nur verschlüsselt ausgegeben.');
        }
        $file = (new Backup($this->app))->create();
        $this->log($adminId, $action, null);
        return Response::download($file, 'doxie-diary-backup-' . gmdate('Y-m-d') . '.zip');
    }

    private function log(?int $adminId, string $action, ?int $targetId): void
    {
        $this->app->db()->run(
            'INSERT INTO admin_audit (admin_user_id, action, target_user_id, created_at) VALUES (?, ?, ?, ?)',
            [$adminId, $action, $targetId, Db::now()],
        );
    }
}
