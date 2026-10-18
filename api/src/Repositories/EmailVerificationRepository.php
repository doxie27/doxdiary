<?php

declare(strict_types=1);

namespace Doxie\Repositories;

use Doxie\Support\Db;

/** Einmal-Links zur Bestätigung der E-Mail-Adresse. Gespeichert wird nur der Hash. */
final class EmailVerificationRepository
{
    public const TTL = 48 * 3600;

    public function __construct(private readonly Db $db)
    {
    }

    public function create(int $userId, string $email): string
    {
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        $this->db->run('UPDATE email_verifications SET used_at = ? WHERE user_id = ? AND used_at IS NULL', [Db::now(), $userId]);
        $this->db->insert(
            'INSERT INTO email_verifications (user_id, email, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
            [$userId, $email, hash('sha256', $token), gmdate('Y-m-d H:i:s', time() + self::TTL), Db::now()],
        );
        return $token;
    }

    /** Löst ein Token ein, wenn die Adresse noch zum Konto gehört. Liefert die Benutzer-ID. */
    public function consume(string $token): ?int
    {
        return $this->db->transaction(function () use ($token): ?int {
            $row = $this->db->one(
                'SELECT v.id, v.user_id FROM email_verifications v JOIN users u ON u.id = v.user_id
                 WHERE v.token_hash = ? AND v.used_at IS NULL AND v.expires_at > ? AND u.email = v.email FOR UPDATE',
                [hash('sha256', $token), Db::now()],
            );
            if ($row === null) {
                return null;
            }
            $this->db->run('UPDATE email_verifications SET used_at = ? WHERE id = ?', [Db::now(), $row['id']]);
            $this->db->run('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?', [Db::now(), $row['user_id']]);
            return (int) $row['user_id'];
        });
    }
}
