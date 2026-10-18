<?php

declare(strict_types=1);

namespace Doxie\Repositories;

use Doxie\Support\Db;

final class DogRepository
{
    private const COLUMNS = 'd.id, d.name, d.breed, d.sex, d.birth_date, d.weight_kg, d.neutered, d.health_notes, d.bio, d.accent, d.photo_media_id, d.created_at, d.updated_at, m.role, m.scopes';

    public function __construct(private readonly Db $db)
    {
    }

    /** @return list<array<string, mixed>> */
    public function listForUser(int $userId): array
    {
        return $this->db->all(
            'SELECT ' . self::COLUMNS . ' FROM dogs d JOIN dog_members m ON m.dog_id = d.id
             WHERE m.user_id = ? AND m.revoked_at IS NULL ORDER BY d.created_at, d.id',
            [$userId],
        );
    }

    /** @return array<string, mixed>|null */
    public function findForUser(int $dogId, int $userId): ?array
    {
        return $this->db->one(
            'SELECT ' . self::COLUMNS . ' FROM dogs d JOIN dog_members m ON m.dog_id = d.id
             WHERE d.id = ? AND m.user_id = ? AND m.revoked_at IS NULL',
            [$dogId, $userId],
        );
    }

    /** @param array<string, mixed> $f */
    public function create(int $ownerId, array $f): int
    {
        return $this->db->transaction(function () use ($ownerId, $f): int {
            $now = Db::now();
            $id = $this->db->insert(
                'INSERT INTO dogs (name, breed, sex, birth_date, weight_kg, neutered, health_notes, bio, accent, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$f['name'], $f['breed'], $f['sex'], $f['birth_date'], (string) $f['weight_kg'], self::bool($f['neutered']), $f['health_notes'], $f['bio'], $f['accent'], $now, $now],
            );
            $this->db->run(
                "INSERT INTO dog_members (dog_id, user_id, role, scopes, accepted_at, created_at) VALUES (?, ?, 'owner', 'profile,training,diary', ?, ?)",
                [$id, $ownerId, $now, $now],
            );
            return $id;
        });
    }

    /** @param array<string, mixed> $f Nur erlaubte Spalten (vom Controller geprüft) */
    public function update(int $dogId, array $f): void
    {
        if (!$f) {
            return;
        }
        $allowed = ['name', 'breed', 'sex', 'birth_date', 'weight_kg', 'neutered', 'health_notes', 'bio', 'accent'];
        $sets = [];
        $params = [];
        foreach ($f as $col => $value) {
            if (!in_array($col, $allowed, true)) {
                throw new \InvalidArgumentException('Unbekannte Spalte');
            }
            $sets[] = "{$col} = ?";
            $params[] = match ($col) {
                'neutered' => self::bool($value),
                'weight_kg' => (string) $value,
                default => $value,
            };
        }
        $params[] = Db::now();
        $params[] = $dogId;
        $this->db->run('UPDATE dogs SET ' . implode(', ', $sets) . ', updated_at = ? WHERE id = ?', $params);
    }

    public function setPhoto(int $dogId, ?int $mediaId): void
    {
        $this->db->run('UPDATE dogs SET photo_media_id = ?, updated_at = ? WHERE id = ?', [$mediaId, Db::now(), $dogId]);
    }

    public function delete(int $dogId): void
    {
        $this->db->run('DELETE FROM dogs WHERE id = ?', [$dogId]);
    }

    /** IDs der Hunde, bei denen der Benutzer einzige:r Besitzer:in ist (für Kontolöschung). */
    public function soleOwnedDogIds(int $userId): array
    {
        $rows = $this->db->all(
            "SELECT m.dog_id FROM dog_members m
             WHERE m.user_id = ? AND m.role = 'owner'
               AND NOT EXISTS (SELECT 1 FROM dog_members o WHERE o.dog_id = m.dog_id AND o.role = 'owner' AND o.user_id <> m.user_id AND o.revoked_at IS NULL)",
            [$userId],
        );
        return array_map(static fn ($r) => (int) $r['dog_id'], $rows);
    }

    private static function bool(?bool $v): ?int
    {
        return $v === null ? null : ($v ? 1 : 0);
    }

    /** JSON-Form passend zu src/data/types.ts (Dog) im Frontend. */
    public static function present(array $d): array
    {
        return [
            'id' => (string) $d['id'],
            'name' => $d['name'],
            'breed' => $d['breed'],
            'sex' => $d['sex'],
            'birthDate' => $d['birth_date'],
            'weightKg' => (float) $d['weight_kg'],
            'neutered' => $d['neutered'] === null ? null : (bool) $d['neutered'],
            'healthNotes' => $d['health_notes'],
            'bio' => $d['bio'],
            'accent' => $d['accent'],
            'photoMediaId' => $d['photo_media_id'] === null ? null : (string) $d['photo_media_id'],
            'access' => ['role' => $d['role'], 'scopes' => array_values(array_filter(explode(',', (string) $d['scopes'])))],
            'updatedAt' => UserRepository::iso($d['updated_at']),
        ];
    }
}
