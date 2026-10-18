<?php

declare(strict_types=1);

namespace Doxie\Auth;

use Doxie\Http\HttpException;
use Doxie\Support\Db;

/**
 * Zentrale Berechtigungsprüfung für alles, was zu einem Hund gehört.
 * Fremde und nicht existierende Hunde liefern beide 404 – so wird nicht
 * verraten, ob eine ID existiert.
 */
final class DogAccess
{
    public function __construct(private readonly Db $db)
    {
    }

    /** @return array{role: string, scopes: list<string>}|null */
    public function membership(int $userId, int $dogId): ?array
    {
        $row = $this->db->one(
            'SELECT role, scopes FROM dog_members WHERE dog_id = ? AND user_id = ? AND revoked_at IS NULL',
            [$dogId, $userId],
        );
        if ($row === null) {
            return null;
        }
        return ['role' => (string) $row['role'], 'scopes' => array_values(array_filter(explode(',', (string) $row['scopes'])))];
    }

    /** Lesen: Besitzer:in oder freigegebener Bereich. */
    public function requireRead(int $userId, int $dogId, string $scope): array
    {
        $m = $this->membership($userId, $dogId);
        if ($m === null || ($m['role'] !== 'owner' && !in_array($scope, $m['scopes'], true))) {
            throw HttpException::notFound();
        }
        return $m;
    }

    /** Ändern & Löschen von Profildaten: vorerst nur Besitzer:innen. */
    public function requireOwner(int $userId, int $dogId): void
    {
        $m = $this->membership($userId, $dogId);
        if ($m === null) {
            throw HttpException::notFound();
        }
        if ($m['role'] !== 'owner') {
            throw HttpException::forbidden();
        }
    }
}
