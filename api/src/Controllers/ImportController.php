<?php

declare(strict_types=1);

namespace Doxie\Controllers;

use Doxie\App;
use Doxie\Http\HttpException;
use Doxie\Http\Request;
use Doxie\Http\Response;
use Doxie\Repositories\DiaryRepository;
use Doxie\Repositories\ExerciseRepository;
use Doxie\Repositories\PlanRepository;
use Doxie\Repositories\SessionRepository;
use Doxie\Support\Validator;

/**
 * Einmalige Übernahme von Daten, die vor Phase 3/4 nur im Browser lagen.
 * Alles in einer Transaktion; Einheiten und Tagebucheinträge sind über die
 * lokale ID idempotent. Fotos lädt das Frontend danach einzeln hoch (Zuordnung
 * über die zurückgegebene diaryMap).
 */
final class ImportController
{
    public function __construct(private readonly App $app)
    {
    }

    public function import(Request $r): Response
    {
        $userId = $this->app->userId();
        $db = $this->app->db();
        $exRepo = new ExerciseRepository($db);
        $planRepo = new PlanRepository($db);
        $sessionRepo = new SessionRepository($db);
        $diaryRepo = new DiaryRepository($db);
        $exRepo->seedTemplatesOnce($userId);

        $v = new Validator($r->body);
        $exercises = $v->list('exercises', 300);
        $plans = $v->list('plans', 200);
        $sessions = $v->list('sessions', 3000);
        $diary = $v->list('diary', 3000);
        $v->validate();

        $ownedDogs = array_map(static fn ($d) => (string) $d['id'], $this->app->dogs()->listForUser($userId));
        $ownerDogs = array_values(array_filter($ownedDogs, fn ($id) => ($this->app->access()->membership($userId, (int) $id)['role'] ?? '') === 'owner'));

        $result = $db->transaction(function () use ($userId, $exercises, $plans, $sessions, $diary, $ownerDogs, $exRepo, $planRepo, $sessionRepo, $diaryRepo): array {
            $counts = ['exercises' => 0, 'plans' => 0, 'sessions' => 0, 'diary' => 0];
            // Übungen: gleichnamige vorhandene (z. B. Startvorlagen) werden wiederverwendet
            $byName = [];
            foreach ($exRepo->listForOwner($userId) as $e) {
                $byName[mb_strtolower($e['name'])] = (int) $e['id'];
            }
            $exMap = [];
            foreach ($exercises as $i => $raw) {
                if (!is_array($raw) || !is_string($raw['id'] ?? null)) {
                    continue;
                }
                $key = mb_strtolower(trim((string) ($raw['name'] ?? '')));
                if (isset($byName[$key])) {
                    $exMap[$raw['id']] = $byName[$key];
                    continue;
                }
                $f = $this->exerciseFields($raw, "exercises.{$i}");
                $exMap[$raw['id']] = $byName[$key] = $exRepo->create($userId, $f);
                $counts['exercises']++;
            }

            $planMap = [];
            $itemMap = [];
            foreach ($plans as $i => $raw) {
                if (!is_array($raw) || !in_array((string) ($raw['dogId'] ?? ''), $ownerDogs, true)) {
                    continue;
                }
                $items = [];
                foreach ((array) ($raw['items'] ?? []) as $it) {
                    if (is_array($it) && isset($exMap[$it['exerciseId'] ?? ''])) {
                        $items[] = ['id' => null, 'exercise_id' => $exMap[$it['exerciseId']], 'reps' => self::int($it['reps'] ?? null), 'sets' => self::int($it['sets'] ?? null), 'duration_sec' => self::int($it['durationSec'] ?? null), 'rest_sec' => self::int($it['restSec'] ?? null), 'local' => (string) ($it['id'] ?? '')];
                    }
                }
                if (!$items) {
                    continue;
                }
                $pv = new Validator($raw);
                $fields = [
                    'name' => $pv->string('name', 1, 80),
                    'description' => $pv->string('description', 0, 400, multiline: true),
                    'weekdays' => PlanRepository::toMask(array_values(array_filter((array) ($raw['weekdays'] ?? []), static fn ($d) => is_int($d) && $d >= 1 && $d <= 7))),
                    'time_of_day' => is_string($raw['timeOfDay'] ?? null) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $raw['timeOfDay']) ? $raw['timeOfDay'] : null,
                    'archived' => ($raw['archived'] ?? false) === true,
                ];
                self::throwIfErrors($pv, "plans.{$i}");
                $planId = $planRepo->save(null, (int) $raw['dogId'], $userId, $fields, $items);
                $planMap[(string) $raw['id']] = $planId;
                $saved = $planRepo->find($planId)['items'];
                foreach ($items as $pos => $it) {
                    $itemMap[$it['local']] = (int) $saved[$pos]['id'];
                }
                $counts['plans']++;
            }

            foreach ($sessions as $i => $raw) {
                if (!is_array($raw) || !in_array((string) ($raw['dogId'] ?? ''), $ownerDogs, true)) {
                    continue;
                }
                $dogId = (int) $raw['dogId'];
                $clientId = substr((string) preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($raw['id'] ?? '')), 0, 64);
                if (strlen($clientId) < 3 || $sessionRepo->findByClientId($dogId, $clientId) !== null) {
                    continue;
                }
                $sv = new Validator($raw);
                $s = [
                    'plan_id' => $planMap[(string) ($raw['planId'] ?? '')] ?? null,
                    'client_id' => $clientId,
                    'plan_name' => $sv->string('planName', 1, 80),
                    'started_at' => $sv->datetime('startedAt'),
                    'finished_at' => $sv->datetime('finishedAt'),
                    'active_sec' => (int) $sv->nullableInt('activeSec', 0, 86400),
                    'note' => $sv->string('note', 0, 500, multiline: true),
                ];
                self::throwIfErrors($sv, "sessions.{$i}");
                $results = [];
                foreach (array_slice((array) ($raw['results'] ?? []), 0, 50) as $res) {
                    if (!is_array($res)) {
                        continue;
                    }
                    $status = ($res['status'] ?? '') === 'skipped' ? 'skipped' : 'done';
                    $fb = in_array($res['feedback'] ?? null, ['good', 'hard', 'issue'], true) ? $res['feedback'] : null;
                    $exId = $exMap[(string) ($res['exerciseId'] ?? '')] ?? null;
                    $name = (string) ($res['exerciseName'] ?? '');
                    if ($name === '' && $exId !== null) {
                        $name = (string) ($exRepo->findOwned($exId, $userId)['name'] ?? '');
                    }
                    $results[] = [
                        'exercise_id' => $exId,
                        'plan_item_id' => $itemMap[(string) ($res['itemId'] ?? '')] ?? null,
                        'exercise_name' => mb_substr($name !== '' ? $name : 'Übung', 0, 80),
                        'status' => $status,
                        'feedback' => $status === 'done' ? $fb : null,
                        'note' => mb_substr(is_string($res['note'] ?? null) ? $res['note'] : '', 0, 300),
                    ];
                }
                $sessionRepo->create($dogId, $userId, $s, $results);
                $counts['sessions']++;
            }

            $diaryMap = [];
            foreach ($diary as $i => $raw) {
                if (!is_array($raw) || !in_array((string) ($raw['dogId'] ?? ''), $ownerDogs, true)) {
                    continue;
                }
                $dogId = (int) $raw['dogId'];
                $clientId = substr((string) preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($raw['id'] ?? '')), 0, 64);
                if (strlen($clientId) < 3) {
                    continue;
                }
                $existing = $diaryRepo->findByClientId($dogId, $clientId);
                if ($existing === null) {
                    $raw['title'] = trim((string) ($raw['title'] ?? '')) !== '' ? $raw['title'] : 'Eintrag';
                    try {
                        $f = DiaryController::validate($raw);
                    } catch (HttpException $e) {
                        throw HttpException::validation(array_combine(array_map(static fn ($k) => "diary.{$i}.{$k}", array_keys($e->fields)), $e->fields));
                    }
                    $id = $diaryRepo->create($dogId, $userId, $f, $clientId);
                    $counts['diary']++;
                } else {
                    $id = (int) $existing['id'];
                }
                $diaryMap[(string) $raw['id']] = (string) $id;
            }
            return $counts + ['diaryMap' => $diaryMap];
        });

        return Response::json(['imported' => $result]);
    }

    /** @return array<string, mixed> */
    private function exerciseFields(array $raw, string $prefix): array
    {
        $v = new Validator($raw);
        $f = [
            'name' => $v->string('name', 1, 80),
            'description' => $v->string('description', 0, 2000, multiline: true),
            'category' => $v->enum('category', ['kraft', 'balance', 'mobilitaet', 'wahrnehmung', 'ausdauer', 'entspannung']),
            'reps' => $v->nullableInt('reps', 1, 200),
            'sets' => $v->nullableInt('sets', 1, 20),
            'duration_sec' => $v->nullableInt('durationSec', 1, 7200),
            'rest_sec' => $v->nullableInt('restSec', 0, 3600),
            'equipment' => $v->stringList('equipment', 20, 60),
            'notes' => $v->string('notes', 0, 1000, multiline: true),
        ];
        self::throwIfErrors($v, $prefix);
        return $f;
    }

    private static function int(mixed $v): ?int
    {
        return is_int($v) && $v >= 0 && $v <= 7200 ? $v : null;
    }

    private static function throwIfErrors(Validator $v, string $prefix): void
    {
        foreach ($v->errors() as $k => $msg) {
            throw HttpException::validation(["{$prefix}.{$k}" => $msg]);
        }
    }
}
