<?php

declare(strict_types=1);

namespace Doxie\Repositories;

use Doxie\Support\Db;

final class PlanRepository
{
    public function __construct(private readonly Db $db)
    {
    }

    /** @return list<array<string, mixed>> Pläne inkl. 'items' */
    public function listForDog(int $dogId): array
    {
        $plans = $this->db->all('SELECT * FROM training_plans WHERE dog_id = ? ORDER BY created_at, id', [$dogId]);
        if (!$plans) {
            return [];
        }
        $ids = array_column($plans, 'id');
        $in = implode(',', array_fill(0, count($ids), '?'));
        $items = $this->db->all("SELECT * FROM plan_items WHERE plan_id IN ({$in}) ORDER BY position", $ids);
        foreach ($plans as &$p) {
            $p['items'] = array_values(array_filter($items, static fn ($i) => $i['plan_id'] === $p['id']));
        }
        return $plans;
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        $plan = $this->db->one('SELECT * FROM training_plans WHERE id = ?', [$id]);
        if ($plan !== null) {
            $plan['items'] = $this->db->all('SELECT * FROM plan_items WHERE plan_id = ? ORDER BY position', [$id]);
        }
        return $plan;
    }

    /**
     * Legt einen Plan an oder ersetzt Felder und Übungsliste vollständig.
     * Bestehende Item-IDs bleiben erhalten (für Verlaufs-Verknüpfungen), wenn sie mitgesendet werden.
     *
     * @param array<string, mixed> $f
     * @param list<array<string, mixed>> $items
     */
    public function save(?int $planId, int $dogId, int $userId, array $f, array $items): int
    {
        return $this->db->transaction(function () use ($planId, $dogId, $userId, $f, $items): int {
            $now = Db::now();
            if ($planId === null) {
                $planId = $this->db->insert(
                    'INSERT INTO training_plans (dog_id, created_by_user_id, name, description, weekdays, time_of_day, archived_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [$dogId, $userId, $f['name'], $f['description'], $f['weekdays'], $f['time_of_day'], $f['archived'] ? $now : null, $now, $now],
                );
            } else {
                $this->db->run(
                    'UPDATE training_plans SET name = ?, description = ?, weekdays = ?, time_of_day = ?, archived_at = CASE WHEN ? THEN COALESCE(archived_at, ?) ELSE NULL END, updated_at = ? WHERE id = ?',
                    [$f['name'], $f['description'], $f['weekdays'], $f['time_of_day'], $f['archived'] ? 1 : 0, $now, $now, $planId],
                );
            }
            $existing = array_map('intval', array_column($this->db->all('SELECT id FROM plan_items WHERE plan_id = ?', [$planId]), 'id'));
            $keep = [];
            foreach ($items as $pos => $it) {
                $values = [$it['exercise_id'], $pos, $it['reps'], $it['sets'], $it['duration_sec'], $it['rest_sec']];
                if ($it['id'] !== null && in_array($it['id'], $existing, true)) {
                    $this->db->run('UPDATE plan_items SET exercise_id = ?, position = ?, reps = ?, sets = ?, duration_sec = ?, rest_sec = ? WHERE id = ?', [...$values, $it['id']]);
                    $keep[] = $it['id'];
                } else {
                    $keep[] = $this->db->insert('INSERT INTO plan_items (exercise_id, position, reps, sets, duration_sec, rest_sec, plan_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [...$values, $planId]);
                }
            }
            foreach (array_diff($existing, $keep) as $removed) {
                $this->db->run('DELETE FROM plan_items WHERE id = ?', [$removed]);
            }
            return $planId;
        });
    }

    public function delete(int $id): void
    {
        $this->db->run('DELETE FROM training_plans WHERE id = ?', [$id]);
    }

    /** @param list<int> $days ISO-Wochentage 1–7 */
    public static function toMask(array $days): int
    {
        return array_reduce($days, static fn (int $m, int $d) => $m | (1 << ($d - 1)), 0);
    }

    /** @return list<int> */
    public static function fromMask(int $mask): array
    {
        return array_values(array_filter(range(1, 7), static fn ($d) => ($mask & (1 << ($d - 1))) !== 0));
    }

    /** JSON-Form passend zu TrainingPlan in src/data/types.ts */
    public static function present(array $p): array
    {
        return [
            'id' => (string) $p['id'],
            'dogId' => (string) $p['dog_id'],
            'name' => $p['name'],
            'description' => $p['description'],
            'weekdays' => self::fromMask((int) $p['weekdays']),
            'timeOfDay' => $p['time_of_day'],
            'items' => array_map(static fn ($i) => [
                'id' => (string) $i['id'],
                'exerciseId' => (string) $i['exercise_id'],
                'reps' => $i['reps'] === null ? null : (int) $i['reps'],
                'sets' => $i['sets'] === null ? null : (int) $i['sets'],
                'durationSec' => $i['duration_sec'] === null ? null : (int) $i['duration_sec'],
                'restSec' => $i['rest_sec'] === null ? null : (int) $i['rest_sec'],
            ], $p['items'] ?? []),
            'archived' => $p['archived_at'] !== null,
            'source' => ['kind' => $p['source'], 'name' => ''],
            'createdAt' => UserRepository::iso($p['created_at']),
        ];
    }
}
