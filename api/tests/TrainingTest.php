<?php

declare(strict_types=1);

namespace Doxie\Tests;

final class TrainingTest extends TestCase
{
    /** @return array{ApiClient, array, list<array>} */
    private static function account(): array
    {
        $c = new ApiClient();
        $c->register(self::email('physio'));
        $dog = self::createDog($c);
        $exercises = $c->get('/exercises')->json['exercises'];
        return [$c, $dog, $exercises];
    }

    public function testTemplatesAreSeededOnceAndCanBeDeleted(): void
    {
        [$c, , $exercises] = self::account();
        self::assertCount(9, $exercises);
        self::assertContains('Sitz-Steh-Wechsel', array_column($exercises, 'name'));
        foreach ($exercises as $e) {
            self::assertSame(204, $c->delete("/exercises/{$e['id']}")->status);
        }
        self::assertSame([], $c->get('/exercises')->json['exercises'], 'Vorlagen werden nicht erneut angelegt');
    }

    public function testExerciseCrudAndValidation(): void
    {
        [$c] = self::account();
        $bad = $c->post('/exercises', ['name' => '', 'category' => 'yoga', 'reps' => null, 'durationSec' => null, 'equipment' => 'x']);
        self::assertSame(422, $bad->status);
        self::assertArrayHasKey('category', $bad->json['error']['fields']);

        $res = $c->post('/exercises', ['name' => 'Pfote geben', 'description' => "Links\nrechts", 'category' => 'balance', 'reps' => 5, 'sets' => 2, 'durationSec' => null, 'restSec' => 10, 'equipment' => ['Leckerli', ' Leckerli ', ''], 'notes' => '']);
        self::assertSame(201, $res->status, $res->body);
        self::assertSame(['Leckerli'], $res->json['exercise']['equipment']);
        $id = $res->json['exercise']['id'];
        self::assertSame(12, $c->patch("/exercises/{$id}", ['reps' => 12])->json['exercise']['reps']);
    }

    public function testPlanWithOrderOverridesAndArchive(): void
    {
        [$c, $dog, $ex] = self::account();
        $res = $c->post("/dogs/{$dog['id']}/plans", [
            'name' => 'Lolas Morgenrunde', 'description' => '', 'weekdays' => [1, 3, 5], 'timeOfDay' => '08:00', 'archived' => false,
            'items' => [
                ['exerciseId' => $ex[2]['id'], 'reps' => 3, 'sets' => null, 'durationSec' => null, 'restSec' => null],
                ['exerciseId' => $ex[0]['id'], 'reps' => null, 'sets' => null, 'durationSec' => 45, 'restSec' => null],
            ],
        ]);
        self::assertSame(201, $res->status, $res->body);
        $plan = $res->json['plan'];
        self::assertSame([1, 3, 5], $plan['weekdays']);
        self::assertSame([$ex[2]['id'], $ex[0]['id']], array_column($plan['items'], 'exerciseId'));
        self::assertSame(3, $plan['items'][0]['reps']);

        // Reihenfolge tauschen, Item-IDs bleiben erhalten, archivieren
        $plan['items'] = array_reverse($plan['items']);
        $plan['archived'] = true;
        $updated = $c->patch("/plans/{$plan['id']}", $plan)->json['plan'];
        self::assertTrue($updated['archived']);
        self::assertSame(array_column($plan['items'], 'id'), array_column($updated['items'], 'id'));

        self::assertSame(422, $c->patch("/plans/{$plan['id']}", ['name' => 'x', 'items' => [], 'weekdays' => []])->status);
        self::assertSame(422, $c->post("/dogs/{$dog['id']}/plans", ['name' => 'x', 'weekdays' => [], 'timeOfDay' => '25:00', 'items' => [['exerciseId' => $ex[0]['id']]]])->status);
    }

    public function testCannotUseOrSeeOtherPeoplesData(): void
    {
        [$a, $dogA, $exA] = self::account();
        [$b, $dogB] = self::account();
        $planA = $a->post("/dogs/{$dogA['id']}/plans", ['name' => 'A', 'weekdays' => [], 'items' => [['exerciseId' => $exA[0]['id']]]])->json['plan'];

        // Fremde Übung im eigenen Plan
        $res = $b->post("/dogs/{$dogB['id']}/plans", ['name' => 'B', 'weekdays' => [], 'items' => [['exerciseId' => $exA[0]['id']]]]);
        self::assertSame(422, $res->status);
        // Fremde Pläne, Hunde, Übungen
        self::assertSame(404, $b->get("/dogs/{$dogA['id']}/plans")->status);
        self::assertSame(404, $b->get("/dogs/{$dogA['id']}/sessions")->status);
        self::assertSame(404, $b->patch("/plans/{$planA['id']}", $planA)->status);
        self::assertSame(404, $b->delete("/plans/{$planA['id']}")->status);
        self::assertSame(404, $b->patch("/exercises/{$exA[0]['id']}", ['reps' => 1])->status);
        self::assertSame(404, $b->post("/dogs/{$dogA['id']}/sessions", ['clientId' => 'abcdefgh1'])->status);
    }

    public function testSessionIsIdempotentAndKeepsSnapshots(): void
    {
        [$c, $dog, $ex] = self::account();
        $plan = $c->post("/dogs/{$dog['id']}/plans", ['name' => 'Abendrunde', 'weekdays' => [1, 2, 3, 4, 5, 6, 7], 'items' => [['exerciseId' => $ex[0]['id']], ['exerciseId' => $ex[1]['id']]]])->json['plan'];
        $payload = [
            'clientId' => 'session-' . bin2hex(random_bytes(6)),
            'planId' => $plan['id'],
            'planName' => $plan['name'],
            'startedAt' => gmdate('Y-m-d\TH:i:s\Z', time() - 900),
            'finishedAt' => gmdate('Y-m-d\TH:i:s\Z', time() - 300),
            'activeSec' => 420,
            'note' => 'Super motiviert',
            'results' => [
                ['itemId' => $plan['items'][0]['id'], 'exerciseId' => $ex[0]['id'], 'exerciseName' => $ex[0]['name'], 'status' => 'done', 'feedback' => 'issue', 'note' => 'Kurz gezögert'],
                ['itemId' => $plan['items'][1]['id'], 'exerciseId' => $ex[1]['id'], 'exerciseName' => $ex[1]['name'], 'status' => 'skipped', 'feedback' => null, 'note' => ''],
            ],
        ];
        $first = $c->post("/dogs/{$dog['id']}/sessions", $payload);
        self::assertSame(201, $first->status, $first->body);
        $again = $c->post("/dogs/{$dog['id']}/sessions", $payload);
        self::assertSame(200, $again->status);
        self::assertSame($first->json['session']['id'], $again->json['session']['id']);
        self::assertCount(1, $c->get("/dogs/{$dog['id']}/sessions")->json['sessions']);

        // Plan und Übung löschen → Verlauf bleibt mit Namen erhalten
        $c->delete("/plans/{$plan['id']}");
        $c->delete("/exercises/{$ex[0]['id']}");
        $s = $c->get("/dogs/{$dog['id']}/sessions")->json['sessions'][0];
        self::assertSame('Abendrunde', $s['planName']);
        self::assertSame('', $s['planId']);
        self::assertSame($ex[0]['name'], $s['results'][0]['exerciseName']);
        self::assertSame('', $s['results'][0]['exerciseId']);
        self::assertSame('issue', $s['results'][0]['feedback']);
        self::assertNull($s['results'][1]['feedback']);
    }

    public function testSessionValidation(): void
    {
        [$c, $dog] = self::account();
        $res = $c->post("/dogs/{$dog['id']}/sessions", ['clientId' => 'x', 'planName' => '', 'startedAt' => 'gestern', 'finishedAt' => '2999-01-01T00:00:00Z', 'results' => []]);
        self::assertSame(422, $res->status);
        self::assertEqualsCanonicalizing(['clientId', 'planName', 'startedAt', 'finishedAt'], array_keys($res->json['error']['fields']));
    }
}
