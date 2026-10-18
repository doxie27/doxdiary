<?php

declare(strict_types=1);

namespace Doxie\Repositories;

use Doxie\Support\Db;

final class SessionRepository
{
    public function __construct(private readonly Db $db)
    {
    }

    /** @return list<array<string, mixed>> Einheiten inkl. 'results', neueste zuerst */
    public function listForDog(int $dogId, string $sinceUtc): array
    {
        $sessions = $this->db->all('SELECT * FROM training_sessions WHERE dog_id = ? AND started_at >= ? ORDER BY started_at DESC LIMIT 2000', [$dogId, $sinceUtc]);
        if (!$sessions) {
            return [];
        }
        $ids = array_column($sessions, 'id');
        $in = implode(',', array_fill(0, count($ids), '?'));
        $results = $this->db->all("SELECT * FROM session_results WHERE session_id IN ({$in}) ORDER BY position", $ids);
        $by = [];
        foreach ($results as $r) {
            $by[$r['session_id']][] = $r;
        }
        foreach ($sessions as &$s) {
            $s['results'] = $by[$s['id']] ?? [];
        }
        return $sessions;
    }

    /** @return array<string, mixed>|null */
    public function findByClientId(int $dogId, string $clientId): ?array
    {
        $s = $this->db->one('SELECT * FROM training_sessions WHERE dog_id = ? AND client_id = ?', [$dogId, $clientId]);
        if ($s !== null) {
            $s['results'] = $this->db->all('SELECT * FROM session_results WHERE session_id = ? ORDER BY position', [$s['id']]);
        }
        return $s;
    }

    /**
     * @param array<string, mixed> $s
     * @param list<array<string, mixed>> $results
     */
    public function create(int $dogId, int $userId, array $s, array $results): int
    {
        return $this->db->transaction(function () use ($dogId, $userId, $s, $results): int {
            $id = $this->db->insert(
                'INSERT INTO training_sessions (dog_id, plan_id, user_id, client_id, plan_name, started_at, finished_at, active_sec, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$dogId, $s['plan_id'], $userId, $s['client_id'], $s['plan_name'], $s['started_at'], $s['finished_at'], $s['active_sec'], $s['note'], Db::now()],
            );
            foreach ($results as $pos => $r) {
                $this->db->run(
                    'INSERT INTO session_results (session_id, plan_item_id, exercise_id, exercise_name, position, status, feedback, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [$id, $r['plan_item_id'], $r['exercise_id'], $r['exercise_name'], $pos, $r['status'], $r['feedback'], $r['note']],
                );
            }
            return $id;
        });
    }

    /** JSON-Form passend zu TrainingSession in src/data/types.ts */
    public static function present(array $s): array
    {
        return [
            'id' => (string) $s['id'],
            'clientId' => $s['client_id'],
            'dogId' => (string) $s['dog_id'],
            'planId' => $s['plan_id'] === null ? '' : (string) $s['plan_id'],
            'planName' => $s['plan_name'],
            'startedAt' => UserRepository::iso($s['started_at']),
            'finishedAt' => UserRepository::iso($s['finished_at']),
            'activeSec' => (int) $s['active_sec'],
            'note' => $s['note'],
            'results' => array_map(static fn ($r) => [
                'itemId' => $r['plan_item_id'] === null ? 'r' . $r['id'] : (string) $r['plan_item_id'],
                'exerciseId' => $r['exercise_id'] === null ? '' : (string) $r['exercise_id'],
                'exerciseName' => $r['exercise_name'],
                'status' => $r['status'],
                'feedback' => $r['feedback'],
                'note' => $r['note'],
            ], $s['results'] ?? []),
        ];
    }
}
