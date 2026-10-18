<?php

declare(strict_types=1);

namespace Doxie\Repositories;

use Doxie\Support\Db;

/** Einmal-Tokens fürs Zurücksetzen. Gespeichert wird nur der SHA-256-Hash. */
final class PasswordResetRepository
{
    public const TTL = 3600;

    public function __construct(private readonly Db $db)
    {
    }

    public function create(int $userId): string
    {
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        // Ältere offene Tokens verfallen lassen – es gilt immer nur der neueste Link
        $this->db->run('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL', [Db::now(), $userId]);
        $this->db->insert(
            'INSERT INTO password_resets (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)',
            [$userId, hash('sha256', $token), gmdate('Y-m-d H:i:s', time() + self::TTL), Db::now()],
        );
        return $token;
    }

    /** Löst ein Token ein (einmalig) und liefert die Benutzer-ID. */
    public function consume(string $token): ?int
    {
        return $this->db->transaction(function () use ($token): ?int {
            $row = $this->db->one(
                'SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? FOR UPDATE',
                [hash('sha256', $token), Db::now()],
            );
            if ($row === null) {
                return null;
            }
            $this->db->run('UPDATE password_resets SET used_at = ? WHERE id = ?', [Db::now(), $row['id']]);
            return (int) $row['user_id'];
        });
    }
}
