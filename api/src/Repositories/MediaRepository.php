<?php

declare(strict_types=1);

namespace Doxie\Repositories;

use Doxie\Support\Db;

final class MediaRepository
{
    public function __construct(private readonly Db $db)
    {
    }

    /** @param array{storage_key: string, mime: string, bytes: int, width: int, height: int} $m */
    public function create(int $ownerId, array $m): int
    {
        return $this->db->insert(
            'INSERT INTO media (owner_user_id, storage_key, mime, bytes, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$ownerId, $m['storage_key'], $m['mime'], $m['bytes'], $m['width'], $m['height'], Db::now()],
        );
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        return $this->db->one('SELECT * FROM media WHERE id = ?', [$id]);
    }

    public function delete(int $id): void
    {
        $this->db->run('DELETE FROM media WHERE id = ?', [$id]);
    }

    /**
     * Darf der Benutzer diese Datei sehen? Eigene Uploads oder Fotos von
     * Hunden mit Profil-Freigabe. Weitere Verknüpfungen folgen in Phase 3/4.
     */
    public function canView(int $mediaId, int $userId): bool
    {
        $row = $this->db->one(
            "SELECT 1 FROM media md WHERE md.id = ? AND (
                md.owner_user_id = ?
                OR EXISTS (
                    SELECT 1 FROM dogs d JOIN dog_members m ON m.dog_id = d.id
                    WHERE d.photo_media_id = md.id AND m.user_id = ? AND m.revoked_at IS NULL
                      AND (m.role = 'owner' OR FIND_IN_SET('profile', m.scopes))
                )
            )",
            [$mediaId, $userId, $userId],
        );
        return $row !== null;
    }

    /** @return list<string> Speicher-Schlüssel aller Dateien eines Benutzers */
    public function keysForOwner(int $userId): array
    {
        return array_map(static fn ($r) => (string) $r['storage_key'], $this->db->all('SELECT storage_key FROM media WHERE owner_user_id = ?', [$userId]));
    }
}
