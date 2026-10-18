<?php

declare(strict_types=1);

namespace Doxie\Services;

use Doxie\App;

/**
 * Löscht ein Konto vollständig: Hunde, bei denen es alleinige:r Besitzer:in ist,
 * alle zugehörigen Daten (per Fremdschlüssel) und alle hochgeladenen Dateien.
 */
final class AccountDeleter
{
    public function __construct(private readonly App $app)
    {
    }

    public function delete(int $userId): void
    {
        $keys = $this->app->media()->keysForOwner($userId);
        $this->app->db()->transaction(function () use ($userId): void {
            foreach ($this->app->dogs()->soleOwnedDogIds($userId) as $dogId) {
                $this->app->dogs()->delete($dogId);
            }
            $this->app->users()->delete($userId);
        });
        $images = $this->app->images();
        foreach ($keys as $key) {
            $images->delete($key);
        }
    }
}
