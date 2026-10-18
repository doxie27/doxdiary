<?php

declare(strict_types=1);

namespace Doxie\Controllers;

use Doxie\App;
use Doxie\Http\HttpException;
use Doxie\Http\Request;
use Doxie\Http\Response;
use Doxie\Repositories\ExerciseRepository;
use Doxie\Repositories\PlanRepository;
use Doxie\Repositories\SessionRepository;
use Doxie\Support\Validator;

/**
 * Physiotherapie: Übungsbibliothek (pro Konto), Trainingspläne und Einheiten (pro Hund).
 * Lesen braucht den Bereich „training“, Ändern die Besitzer-Rolle.
 */
final class TrainingController
{
    private const CATEGORIES = ['kraft', 'balance', 'mobilitaet', 'wahrnehmung', 'ausdauer', 'entspannung'];
    private const MAX_EXERCISES = 300;
    private const MAX_PLANS_PER_DOG = 50;

    public function __construct(private readonly App $app)
    {
    }

    private function exercises(): ExerciseRepository { return new ExerciseRepository($this->app->db()); }
    private function plans(): PlanRepository { return new PlanRepository($this->app->db()); }
    private function sessions(): SessionRepository { return new SessionRepository($this->app->db()); }

    // ── Übungen ──────────────────────────────────────────────────────────

    public function listExercises(Request $r): Response
    {
        $userId = $this->app->userId();
        $this->exercises()->seedTemplatesOnce($userId);
        return Response::json(['exercises' => array_map(ExerciseRepository::present(...), $this->exercises()->listForOwner($userId))]);
    }

    public function createExercise(Request $r): Response
    {
        $userId = $this->app->userId();
        if (count($this->exercises()->listForOwner($userId)) >= self::MAX_EXERCISES) {
            throw new HttpException(422, 'limit_reached', 'Du hast die maximale Anzahl an Übungen erreicht.');
        }
        $id = $this->exercises()->create($userId, $this->validateExercise($r->body, partial: false));
        return Response::json(['exercise' => ExerciseRepository::present($this->exercises()->findOwned($id, $userId))], 201);
    }

    public function updateExercise(Request $r): Response
    {
        $ex = $this->ownedExercise($r);
        $this->exercises()->update((int) $ex['id'], $this->validateExercise($r->body, partial: true));
        return Response::json(['exercise' => ExerciseRepository::present($this->exercises()->findOwned((int) $ex['id'], $this->app->userId()))]);
    }

    public function deleteExercise(Request $r): Response
    {
        $ex = $this->ownedExercise($r);
        $this->exercises()->delete((int) $ex['id']);
        if ($ex['media_id'] !== null) {
            $this->removeMedia((int) $ex['media_id']);
        }
        return Response::noContent();
    }

    public function uploadExercisePhoto(Request $r): Response
    {
        $ex = $this->ownedExercise($r);
        $userId = $this->app->userId();
        $mediaId = $this->app->media()->create($userId, $this->app->images()->storeUpload($r->files['photo'] ?? null));
        $this->exercises()->setMedia((int) $ex['id'], $mediaId);
        if ($ex['media_id'] !== null) {
            $this->removeMedia((int) $ex['media_id']);
        }
        return Response::json(['exercise' => ExerciseRepository::present($this->exercises()->findOwned((int) $ex['id'], $userId))]);
    }

    public function deleteExercisePhoto(Request $r): Response
    {
        $ex = $this->ownedExercise($r);
        if ($ex['media_id'] !== null) {
            $this->exercises()->setMedia((int) $ex['id'], null);
            $this->removeMedia((int) $ex['media_id']);
        }
        return Response::json(['exercise' => ExerciseRepository::present($this->exercises()->findOwned((int) $ex['id'], $this->app->userId()))]);
    }

    // ── Pläne ────────────────────────────────────────────────────────────

    public function listPlans(Request $r): Response
    {
        $dogId = $r->intParam('id');
        $this->app->access()->requireRead($this->app->userId(), $dogId, 'training');
        return Response::json(['plans' => array_map(PlanRepository::present(...), $this->plans()->listForDog($dogId))]);
    }

    public function createPlan(Request $r): Response
    {
        $userId = $this->app->userId();
        $dogId = $r->intParam('id');
        $this->app->access()->requireOwner($userId, $dogId);
        if (count($this->plans()->listForDog($dogId)) >= self::MAX_PLANS_PER_DOG) {
            throw new HttpException(422, 'limit_reached', 'Für diesen Hund gibt es bereits sehr viele Pläne. Archivierte Pläne kannst du löschen.');
        }
        [$fields, $items] = $this->validatePlan($r->body, $userId, null);
        $id = $this->plans()->save(null, $dogId, $userId, $fields, $items);
        return Response::json(['plan' => PlanRepository::present($this->plans()->find($id))], 201);
    }

    public function updatePlan(Request $r): Response
    {
        $userId = $this->app->userId();
        $plan = $this->ownedPlan($r);
        [$fields, $items] = $this->validatePlan($r->body, $userId, $plan);
        $this->plans()->save((int) $plan['id'], (int) $plan['dog_id'], $userId, $fields, $items);
        return Response::json(['plan' => PlanRepository::present($this->plans()->find((int) $plan['id']))]);
    }

    public function deletePlan(Request $r): Response
    {
        $plan = $this->ownedPlan($r);
        $this->plans()->delete((int) $plan['id']);
        return Response::noContent();
    }

    // ── Einheiten ────────────────────────────────────────────────────────

    public function listSessions(Request $r): Response
    {
        $dogId = $r->intParam('id');
        $this->app->access()->requireRead($this->app->userId(), $dogId, 'training');
        $days = max(1, min(1100, (int) ($r->query['days'] ?? 400)));
        $since = gmdate('Y-m-d H:i:s', time() - $days * 86400);
        return Response::json(['sessions' => array_map(SessionRepository::present(...), $this->sessions()->listForDog($dogId, $since))]);
    }

    /** Idempotent über clientId: wiederholtes Senden (z. B. nach Funkloch) legt nichts doppelt an. */
    public function createSession(Request $r): Response
    {
        $userId = $this->app->userId();
        $dogId = $r->intParam('id');
        $this->app->access()->requireOwner($userId, $dogId);

        $v = new Validator($r->body);
        $clientId = $v->string('clientId', 8, 64);
        if (!isset($v->errors()['clientId']) && !preg_match('/^[A-Za-z0-9_-]+$/', $clientId)) {
            $v->fail('clientId', 'Ungültige Kennung.');
        }
        $planName = $v->string('planName', 1, 80);
        $started = $v->datetime('startedAt');
        $finished = $v->datetime('finishedAt');
        $active = (int) $v->nullableInt('activeSec', 0, 86400);
        $note = $v->string('note', 0, 500, multiline: true);
        $rawResults = $v->list('results', 50);
        $planId = null;
        $planItems = [];
        if (is_string($r->body['planId'] ?? null) && ctype_digit($r->body['planId'])) {
            $plan = $this->plans()->find((int) $r->body['planId']);
            if ($plan !== null && (int) $plan['dog_id'] === $dogId) {
                $planId = (int) $plan['id'];
                $planItems = array_map('intval', array_column($plan['items'], 'id'));
            }
        }
        $v->validate();

        $existing = $this->sessions()->findByClientId($dogId, $clientId);
        if ($existing !== null) {
            return Response::json(['session' => SessionRepository::present($existing)]);
        }

        $exerciseIds = [];
        foreach ($rawResults as $raw) {
            if (is_array($raw) && is_string($raw['exerciseId'] ?? null) && ctype_digit($raw['exerciseId'])) {
                $exerciseIds[] = (int) $raw['exerciseId'];
            }
        }
        $owned = $this->exercises()->ownedIds(array_values(array_unique($exerciseIds)), $userId);
        $results = [];
        foreach ($rawResults as $i => $raw) {
            $rv = new Validator(is_array($raw) ? $raw : []);
            $status = $rv->enum('status', ['done', 'skipped']);
            $feedback = ($raw['feedback'] ?? null) === null ? null : $rv->enum('feedback', ['good', 'hard', 'issue']);
            $rnote = $rv->string('note', 0, 300, multiline: true);
            $name = $rv->string('exerciseName', 1, 80);
            foreach ($rv->errors() as $k => $msg) {
                throw HttpException::validation(["results.{$i}.{$k}" => $msg]);
            }
            $exId = is_string($raw['exerciseId'] ?? null) && ctype_digit($raw['exerciseId']) ? (int) $raw['exerciseId'] : null;
            $itemId = is_string($raw['itemId'] ?? null) && ctype_digit($raw['itemId']) ? (int) $raw['itemId'] : null;
            $results[] = [
                'exercise_id' => $exId !== null && in_array($exId, $owned, true) ? $exId : null,
                'plan_item_id' => $itemId !== null && in_array($itemId, $planItems, true) ? $itemId : null,
                'exercise_name' => $name,
                'status' => $status,
                'feedback' => $status === 'done' ? $feedback : null,
                'note' => $rnote,
            ];
        }

        $id = $this->sessions()->create($dogId, $userId, [
            'plan_id' => $planId,
            'client_id' => $clientId,
            'plan_name' => $planName,
            'started_at' => $started,
            'finished_at' => max($started, $finished),
            'active_sec' => $active,
            'note' => $note,
        ], $results);
        return Response::json(['session' => SessionRepository::present($this->sessions()->findByClientId($dogId, $clientId) ?? ['id' => $id])], 201);
    }

    // ── Hilfen ───────────────────────────────────────────────────────────

    private function ownedExercise(Request $r): array
    {
        return $this->exercises()->findOwned($r->intParam('id'), $this->app->userId()) ?? throw HttpException::notFound();
    }

    /** Plan laden und Besitzrecht am zugehörigen Hund prüfen – fremde Pläne: 404. */
    private function ownedPlan(Request $r): array
    {
        $plan = $this->plans()->find($r->intParam('id')) ?? throw HttpException::notFound();
        $this->app->access()->requireOwner($this->app->userId(), (int) $plan['dog_id']);
        return $plan;
    }

    private function removeMedia(int $mediaId): void
    {
        $media = $this->app->media()->find($mediaId);
        if ($media !== null) {
            $this->app->media()->delete($mediaId);
            $this->app->images()->delete((string) $media['storage_key']);
        }
    }

    /** @return array<string, mixed> */
    private function validateExercise(array $body, bool $partial): array
    {
        $v = new Validator($body);
        $out = [];
        $has = static fn (string $k) => !$partial || $v->has($k);
        if ($has('name')) $out['name'] = $v->string('name', 1, 80);
        if ($has('description')) $out['description'] = $v->string('description', 0, 2000, multiline: true);
        if ($has('category')) $out['category'] = $v->enum('category', self::CATEGORIES);
        if ($has('reps')) $out['reps'] = $v->nullableInt('reps', 1, 200);
        if ($has('sets')) $out['sets'] = $v->nullableInt('sets', 1, 20);
        if ($has('durationSec')) $out['duration_sec'] = $v->nullableInt('durationSec', 1, 7200);
        if ($has('restSec')) $out['rest_sec'] = $v->nullableInt('restSec', 0, 3600);
        if ($has('equipment')) $out['equipment'] = $v->stringList('equipment', 20, 60);
        if ($has('notes')) $out['notes'] = $v->string('notes', 0, 1000, multiline: true);
        if (!$partial && $out['reps'] === null && $out['duration_sec'] === null) {
            $v->fail('reps', 'Lege Wiederholungen oder eine Dauer fest.');
        }
        $v->validate();
        return $out;
    }

    /** @return array{array<string, mixed>, list<array<string, mixed>>} */
    private function validatePlan(array $body, int $userId, ?array $plan): array
    {
        $v = new Validator($body);
        $fields = [
            'name' => $v->string('name', 1, 80),
            'description' => $v->string('description', 0, 400, multiline: true),
            'weekdays' => 0,
            'time_of_day' => null,
            'archived' => ($body['archived'] ?? false) === true,
        ];
        $days = $v->list('weekdays', 7);
        foreach ($days as $d) {
            if (!is_int($d) || $d < 1 || $d > 7) {
                $v->fail('weekdays', 'Ungültiger Wochentag.');
            }
        }
        $fields['weekdays'] = PlanRepository::toMask(array_values(array_unique(array_filter($days, 'is_int'))));
        $time = $body['timeOfDay'] ?? null;
        if ($time !== null && !(is_string($time) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time))) {
            $v->fail('timeOfDay', 'Bitte eine Uhrzeit wie 08:30 angeben.');
        }
        $fields['time_of_day'] = $time;
        $rawItems = $v->list('items', 30);
        if (!$rawItems) {
            $v->fail('items', 'Füge mindestens eine Übung hinzu.');
        }
        $v->validate();

        $exIds = [];
        foreach ($rawItems as $raw) {
            $exIds[] = is_array($raw) && is_string($raw['exerciseId'] ?? null) && ctype_digit($raw['exerciseId']) ? (int) $raw['exerciseId'] : 0;
        }
        $owned = $this->exercises()->ownedIds(array_values(array_unique($exIds)), $userId);
        $existingItems = $plan ? array_map('intval', array_column($plan['items'], 'id')) : [];
        $items = [];
        foreach ($rawItems as $i => $raw) {
            $iv = new Validator(is_array($raw) ? $raw : []);
            $item = [
                'id' => null,
                'exercise_id' => $exIds[$i],
                'reps' => $iv->nullableInt('reps', 1, 200),
                'sets' => $iv->nullableInt('sets', 1, 20),
                'duration_sec' => $iv->nullableInt('durationSec', 1, 7200),
                'rest_sec' => $iv->nullableInt('restSec', 0, 3600),
            ];
            if (!in_array($exIds[$i], $owned, true)) {
                $iv->fail('exerciseId', 'Übung nicht gefunden.');
            }
            foreach ($iv->errors() as $k => $msg) {
                throw HttpException::validation(["items.{$i}.{$k}" => $msg]);
            }
            $rawId = is_array($raw) ? ($raw['id'] ?? null) : null;
            if (is_string($rawId) && ctype_digit($rawId) && in_array((int) $rawId, $existingItems, true)) {
                $item['id'] = (int) $rawId;
            }
            $items[] = $item;
        }
        return [$fields, $items];
    }
}
