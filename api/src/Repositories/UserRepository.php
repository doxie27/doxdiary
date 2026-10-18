<?php

declare(strict_types=1);

namespace Doxie\Repositories;

use Doxie\Support\Db;

final class UserRepository
{
    public function __construct(private readonly Db $db)
    {
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        return $this->db->one('SELECT * FROM users WHERE id = ?', [$id]);
    }

    /** @return array<string, mixed>|null */
    public function findByEmail(string $email): ?array
    {
        return $this->db->one('SELECT * FROM users WHERE email = ?', [$email]);
    }

    public function create(string $email, string $passwordHash, string $firstName): int
    {
        $now = Db::now();
        return $this->db->insert(
            'INSERT INTO users (email, password_hash, first_name, privacy_accepted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [$email, $passwordHash, $firstName, $now, $now, $now],
        );
    }

    public function updateProfile(int $id, string $firstName, string $lastName): void
    {
        $this->db->run('UPDATE users SET first_name = ?, last_name = ?, updated_at = ? WHERE id = ?', [$firstName, $lastName, Db::now(), $id]);
    }

    public function updatePasswordHash(int $id, string $hash): void
    {
        $this->db->run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [$hash, Db::now(), $id]);
    }

    /** Neues Passwort + alle bestehenden Sessions ungültig machen. */
    public function resetPassword(int $id, string $hash): void
    {
        $this->db->run(
            'UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = ? WHERE id = ?',
            [$hash, Db::now(), $id],
        );
    }

    public function delete(int $id): void
    {
        $this->db->run('DELETE FROM users WHERE id = ?', [$id]);
    }

    /** @param array<string, mixed> $u */
    public static function present(array $u): array
    {
        return [
            'id' => (string) $u['id'],
            'firstName' => $u['first_name'],
            'lastName' => $u['last_name'],
            'email' => $u['email'],
            'role' => $u['role'],
            'createdAt' => self::iso($u['created_at']),
        ];
    }

    public static function iso(?string $utc): ?string
    {
        return $utc === null ? null : str_replace(' ', 'T', $utc) . 'Z';
    }
}
