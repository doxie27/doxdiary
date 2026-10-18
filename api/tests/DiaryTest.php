<?php

declare(strict_types=1);

namespace Doxie\Tests;

final class DiaryTest extends TestCase
{
    private static function png(): string
    {
        $f = tempnam(sys_get_temp_dir(), 'dx') . '.png';
        imagepng(imagecreatetruecolor(30, 30), $f);
        return $f;
    }

    public function testEntryCrudWithPhotos(): void
    {
        $c = new ApiClient();
        $c->register(self::email('diary'));
        $dog = self::createDog($c);
        $res = $c->post("/dogs/{$dog['id']}/diary", ['at' => gmdate('Y-m-d\TH:i:s\Z'), 'category' => 'erlebnis', 'title' => 'See', 'text' => "Erster Ausflug\nan den See"]);
        self::assertSame(201, $res->status, $res->body);
        $entry = $res->json['entry'];

        for ($i = 0; $i < 4; $i++) {
            self::assertSame(201, $c->upload("/diary/{$entry['id']}/photos", self::png())->status);
        }
        $full = $c->upload("/diary/{$entry['id']}/photos", self::png());
        self::assertSame(422, $full->status, 'Max. 4 Fotos');
        $photos = $c->get("/dogs/{$dog['id']}/diary")->json['entries'][0]['photoIds'];
        self::assertCount(4, $photos);
        self::assertSame(200, $c->get("/media/{$photos[0]}")->status);

        $updated = $c->delete("/diary/{$entry['id']}/photos/{$photos[0]}")->json['entry'];
        self::assertCount(3, $updated['photoIds']);
        self::assertSame(404, $c->get("/media/{$photos[0]}")->status);

        self::assertSame(200, $c->patch("/diary/{$entry['id']}", ['at' => $entry['at'], 'category' => 'alltag', 'title' => 'See (bearbeitet)', 'text' => ''])->status);
        self::assertSame(422, $c->patch("/diary/{$entry['id']}", ['at' => 'morgen', 'category' => 'x', 'title' => '', 'text' => ''])->status);

        $before = count(glob(doxie_config()->storagePath('uploads') . '/*.jpg'));
        self::assertSame(204, $c->delete("/diary/{$entry['id']}")->status);
        self::assertSame($before - 3, count(glob(doxie_config()->storagePath('uploads') . '/*.jpg')), 'Fotos werden mitgelöscht');
    }

    public function testDiaryIsPrivate(): void
    {
        $a = new ApiClient();
        $a->register(self::email());
        $dog = self::createDog($a);
        $entry = $a->post("/dogs/{$dog['id']}/diary", ['at' => gmdate('c'), 'category' => 'gesundheit', 'title' => 'Tierarzt', 'text' => 'Diagnose'])->json['entry'];
        $photo = $a->upload("/diary/{$entry['id']}/photos", self::png())->json['entry']['photoIds'][0];

        $b = new ApiClient();
        $b->register(self::email());
        self::assertSame(404, $b->get("/dogs/{$dog['id']}/diary")->status);
        self::assertSame(404, $b->patch("/diary/{$entry['id']}", ['at' => gmdate('c'), 'category' => 'alltag', 'title' => 'x', 'text' => ''])->status);
        self::assertSame(404, $b->delete("/diary/{$entry['id']}")->status);
        self::assertSame(404, $b->get("/media/{$photo}")->status);
    }

    public function testDeletingDogRemovesDiaryPhotos(): void
    {
        $c = new ApiClient();
        $c->register(self::email());
        $dog = self::createDog($c);
        $entry = $c->post("/dogs/{$dog['id']}/diary", ['at' => gmdate('c'), 'category' => 'alltag', 'title' => 'x', 'text' => ''])->json['entry'];
        $c->upload("/diary/{$entry['id']}/photos", self::png());
        $before = count(glob(doxie_config()->storagePath('uploads') . '/*.jpg'));
        $c->delete("/dogs/{$dog['id']}");
        self::assertSame($before - 1, count(glob(doxie_config()->storagePath('uploads') . '/*.jpg')));
    }

    public function testImportOfLocalDataIsIdempotentForSessionsAndDiary(): void
    {
        $c = new ApiClient();
        $c->register(self::email('import'));
        $dog = self::createDog($c);
        $local = [
            'exercises' => [
                ['id' => 'e1', 'name' => 'Sitz-Steh-Wechsel', 'description' => '', 'category' => 'kraft', 'reps' => 8, 'sets' => 2, 'durationSec' => null, 'restSec' => 30, 'equipment' => [], 'notes' => ''],
                ['id' => 'ex-own', 'name' => 'Eigene Übung', 'description' => 'x', 'category' => 'balance', 'reps' => 4, 'sets' => 1, 'durationSec' => null, 'restSec' => null, 'equipment' => ['Kissen'], 'notes' => ''],
            ],
            'plans' => [[
                'id' => 'plan-local', 'dogId' => $dog['id'], 'name' => 'Lokaler Plan', 'description' => '', 'weekdays' => [1, 2], 'timeOfDay' => '07:30', 'archived' => false,
                'items' => [['id' => 'it-1', 'exerciseId' => 'e1', 'reps' => null, 'sets' => null, 'durationSec' => null, 'restSec' => null], ['id' => 'it-2', 'exerciseId' => 'ex-own', 'reps' => 6, 'sets' => null, 'durationSec' => null, 'restSec' => null]],
            ]],
            'sessions' => [[
                'id' => 'session-abc123', 'dogId' => $dog['id'], 'planId' => 'plan-local', 'planName' => 'Lokaler Plan',
                'startedAt' => gmdate('c', time() - 86400), 'finishedAt' => gmdate('c', time() - 86000), 'activeSec' => 300, 'note' => '',
                'results' => [['itemId' => 'it-1', 'exerciseId' => 'e1', 'status' => 'done', 'feedback' => 'good', 'note' => '']],
            ]],
            'diary' => [['id' => 'entry-xyz789', 'dogId' => $dog['id'], 'at' => gmdate('c', time() - 3600), 'category' => 'alltag', 'title' => 'Morgenrunde', 'text' => 'Nebel', 'photos' => []]],
        ];
        $res = $c->post('/me/import', $local);
        self::assertSame(200, $res->status, $res->body);
        self::assertSame(1, $res->json['imported']['exercises'], 'Vorlage wird wiederverwendet, nur eigene Übung neu');
        self::assertSame(1, $res->json['imported']['plans']);
        self::assertSame(1, $res->json['imported']['sessions']);
        self::assertArrayHasKey('entry-xyz789', $res->json['imported']['diaryMap']);

        $session = $c->get("/dogs/{$dog['id']}/sessions")->json['sessions'][0];
        self::assertSame('Sitz-Steh-Wechsel', $session['results'][0]['exerciseName']);
        self::assertNotSame('', $session['planId']);

        // Erneuter Import (z. B. nach Abbruch): keine doppelten Einheiten/Einträge
        $again = $c->post('/me/import', ['sessions' => $local['sessions'], 'diary' => $local['diary']]);
        self::assertSame(0, $again->json['imported']['sessions']);
        self::assertSame(0, $again->json['imported']['diary']);
        self::assertCount(1, $c->get("/dogs/{$dog['id']}/diary")->json['entries']);
    }

    public function testImportIgnoresForeignDogs(): void
    {
        $a = new ApiClient();
        $a->register(self::email());
        $foreignDog = self::createDog($a);
        $b = new ApiClient();
        $b->register(self::email());
        $res = $b->post('/me/import', ['diary' => [['id' => 'entry-foreign1', 'dogId' => $foreignDog['id'], 'at' => gmdate('c'), 'category' => 'alltag', 'title' => 'x', 'text' => '']]]);
        self::assertSame(0, $res->json['imported']['diary']);
        self::assertSame([], $a->get("/dogs/{$foreignDog['id']}/diary")->json['entries']);
    }
}
