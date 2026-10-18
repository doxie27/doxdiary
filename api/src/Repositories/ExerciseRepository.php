<?php

declare(strict_types=1);

namespace Doxie\Repositories;

use Doxie\Services\ExerciseTemplates;
use Doxie\Support\Db;

final class ExerciseRepository
{
    public const FIELDS = ['name', 'description', 'category', 'reps', 'sets', 'duration_sec', 'rest_sec', 'equipment', 'notes'];

    public function __construct(private readonly Db $db)
    {
    }

    /** @return list<array<string, mixed>> */
    public function listForOwner(int $userId): array
    {
        return $this->db->all('SELECT * FROM exercises WHERE owner_user_id = ? ORDER BY name', [$userId]);
    }

    /** @return array<string, mixed>|null */
    public function findOwned(int $id, int $userId): ?array
    {
        return $this->db->one('SELECT * FROM exercises WHERE id = ? AND owner_user_id = ?', [$id, $userId]);
    }

    /** @param list<int> $ids @return list<int> diejenigen IDs, die dem Benutzer gehören */
    public function ownedIds(array $ids, int $userId): array
    {
        if (!$ids) {
            return [];
        }
        $in = implode(',', array_fill(0, count($ids), '?'));
        return array_map('intval', array_column($this->db->all("SELECT id FROM exercises WHERE owner_user_id = ? AND id IN ({$in})", [$userId, ...$ids]), 'id'));
    }

    /** @param array<string, mixed> $f */
    public function create(int $userId, array $f, ?string $templateKey = null): int
    {
        $now = Db::now();
        return $this->db->insert(
            'INSERT INTO exercises (owner_user_id, name, description, category, reps, sets, duration_sec, rest_sec, equipment, notes, template_key, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$userId, $f['name'], $f['description'], $f['category'], $f['reps'], $f['sets'], $f['duration_sec'], $f['rest_sec'], json_encode(array_values($f['equipment']), JSON_UNESCAPED_UNICODE), $f['notes'], $templateKey, $now, $now],
        );
    }

    /** @param array<string, mixed> $f */
    public function update(int $id, array $f): void
    {
        $sets = [];
        $params = [];
        foreach ($f as $col => $value) {
            if (!in_array($col, self::FIELDS, true)) {
                throw new \InvalidArgumentException('Unbekannte Spalte');
            }
            $sets[] = "{$col} = ?";
            $params[] = $col === 'equipment' ? json_encode(array_values($value), JSON_UNESCAPED_UNICODE) : $value;
        }
        if (!$sets) {
            return;
        }
        $this->db->run('UPDATE exercises SET ' . implode(', ', $sets) . ', updated_at = ? WHERE id = ?', [...$params, Db::now(), $id]);
    }

    public function setMedia(int $id, ?int $mediaId): void
    {
        $this->db->run('UPDATE exercises SET media_id = ?, updated_at = ? WHERE id = ?', [$mediaId, Db::now(), $id]);
    }

    public function delete(int $id): void
    {
        $this->db->run('DELETE FROM exercises WHERE id = ?', [$id]);
    }

    /** Legt beim ersten Abruf die Startvorlagen an (nur einmal pro Konto). */
    public function seedTemplatesOnce(int $userId): void
    {
        $this->db->transaction(function () use ($userId): void {
            $user = $this->db->one('SELECT templates_seeded_at FROM users WHERE id = ? FOR UPDATE', [$userId]);
            if ($user === null || $user['templates_seeded_at'] !== null) {
                return;
            }
            foreach (ExerciseTemplates::all() as $t) {
                $this->create($userId, $t, $t['key']);
            }
            $this->db->run('UPDATE users SET templates_seeded_at = ? WHERE id = ?', [Db::now(), $userId]);
        });
    }

    /** JSON-Form passend zu Exercise in src/data/types.ts */
    public static function present(array $e): array
    {
        return [
            'id' => (string) $e['id'],
            'name' => $e['name'],
            'description' => $e['description'],
            'category' => $e['category'],
            'reps' => $e['reps'] === null ? null : (int) $e['reps'],
            'sets' => $e['sets'] === null ? null : (int) $e['sets'],
            'durationSec' => $e['duration_sec'] === null ? null : (int) $e['duration_sec'],
            'restSec' => $e['rest_sec'] === null ? null : (int) $e['rest_sec'],
            'equipment' => json_decode((string) $e['equipment'], true) ?: [],
            'notes' => $e['notes'],
            'mediaId' => $e['media_id'] === null ? null : (string) $e['media_id'],
            'source' => ['kind' => $e['source'], 'name' => ''],
        ];
    }
}
