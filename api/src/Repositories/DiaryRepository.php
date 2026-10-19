<?php

declare(strict_types=1);

namespace Doxie\Repositories;

use Doxie\Support\Db;

final class DiaryRepository
{
    public function __construct(private readonly Db $db)
    {
    }

    /** @return list<array<string, mixed>> Einträge inkl. 'photos' (Media-IDs), neueste zuerst */
    public function listForDog(int $dogId): array
    {
        $entries = $this->db->all('SELECT * FROM diary_entries WHERE dog_id = ? ORDER BY occurred_at DESC LIMIT 2000', [$dogId]);
        return $this->withPhotos($entries);
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        $e = $this->db->one('SELECT * FROM diary_entries WHERE id = ?', [$id]);
        return $e === null ? null : $this->withPhotos([$e])[0];
    }

    /** @return array<string, mixed>|null */
    public function findByClientId(int $dogId, string $clientId): ?array
    {
        $e = $this->db->one('SELECT * FROM diary_entries WHERE dog_id = ? AND client_id = ?', [$dogId, $clientId]);
        return $e === null ? null : $this->withPhotos([$e])[0];
    }

    /** @param array<string, mixed> $f */
    public function create(int $dogId, int $userId, array $f, ?string $clientId = null): int
    {
        $now = Db::now();
        return $this->db->insert(
            'INSERT INTO diary_entries (dog_id, user_id, client_id, occurred_at, category, title, text, highlight, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$dogId, $userId, $clientId, $f['occurred_at'], $f['category'], $f['title'], $f['text'], ($f['highlight'] ?? false) ? 1 : 0, $now, $now],
        );
    }

    /** @param array<string, mixed> $f */
    public function update(int $id, array $f): void
    {
        $this->db->run(
            'UPDATE diary_entries SET occurred_at = ?, category = ?, title = ?, text = ?, highlight = ?, updated_at = ? WHERE id = ?',
            [$f['occurred_at'], $f['category'], $f['title'], $f['text'], ($f['highlight'] ?? false) ? 1 : 0, Db::now(), $id],
        );
    }

    public function delete(int $id): void
    {
        $this->db->run('DELETE FROM diary_entries WHERE id = ?', [$id]);
    }

    public function addPhoto(int $entryId, int $mediaId): void
    {
        $pos = (int) ($this->db->one('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM diary_photos WHERE entry_id = ?', [$entryId])['p'] ?? 0);
        $this->db->run('INSERT INTO diary_photos (entry_id, media_id, position) VALUES (?, ?, ?)', [$entryId, $mediaId, $pos]);
    }

    /** @return list<int> Media-IDs aller Tagebuchfotos eines Hundes (zum Aufräumen beim Löschen) */
    public function mediaIdsForDog(int $dogId): array
    {
        return array_map('intval', array_column($this->db->all(
            'SELECT p.media_id FROM diary_photos p JOIN diary_entries e ON e.id = p.entry_id WHERE e.dog_id = ?',
            [$dogId],
        ), 'media_id'));
    }

    public function photoCount(int $entryId): int
    {
        return (int) ($this->db->one('SELECT COUNT(*) AS n FROM diary_photos WHERE entry_id = ?', [$entryId])['n'] ?? 0);
    }

    /** @param list<array<string, mixed>> $entries */
    private function withPhotos(array $entries): array
    {
        if (!$entries) {
            return [];
        }
        $ids = array_column($entries, 'id');
        $in = implode(',', array_fill(0, count($ids), '?'));
        $photos = $this->db->all("SELECT entry_id, media_id FROM diary_photos WHERE entry_id IN ({$in}) ORDER BY position", $ids);
        $by = [];
        foreach ($photos as $p) {
            $by[$p['entry_id']][] = (int) $p['media_id'];
        }
        foreach ($entries as &$e) {
            $e['photos'] = $by[$e['id']] ?? [];
        }
        return $entries;
    }

    /** JSON-Form passend zu DiaryEntry in src/data/types.ts (Fotos als Media-IDs) */
    public static function present(array $e): array
    {
        return [
            'id' => (string) $e['id'],
            'dogId' => (string) $e['dog_id'],
            'at' => UserRepository::iso($e['occurred_at']),
            'category' => $e['category'],
            'title' => $e['title'],
            'text' => $e['text'],
            'highlight' => (bool) ($e['highlight'] ?? false),
            'photoIds' => array_map('strval', $e['photos'] ?? []),
        ];
    }
}
