<?php

declare(strict_types=1);

namespace Doxie\Controllers;

use Doxie\App;
use Doxie\Http\HttpException;
use Doxie\Http\Request;
use Doxie\Http\Response;
use Doxie\Repositories\DogRepository;
use Doxie\Support\Validator;

final class DogController
{
    private const MAX_DOGS = 20;

    public function __construct(private readonly App $app)
    {
    }

    public function index(Request $r): Response
    {
        $dogs = $this->app->dogs()->listForUser($this->app->userId());
        return Response::json(['dogs' => array_map(DogRepository::present(...), $dogs)]);
    }

    public function show(Request $r): Response
    {
        return Response::json(['dog' => DogRepository::present($this->load($r))]);
    }

    public function store(Request $r): Response
    {
        $userId = $this->app->userId();
        if (count($this->app->dogs()->listForUser($userId)) >= self::MAX_DOGS) {
            throw new HttpException(422, 'limit_reached', 'Du hast die maximale Anzahl an Hundeprofilen erreicht.');
        }
        $fields = $this->validate($r->body, partial: false);
        $id = $this->app->dogs()->create($userId, $fields);
        return Response::json(['dog' => DogRepository::present($this->app->dogs()->findForUser($id, $userId))], 201);
    }

    public function update(Request $r): Response
    {
        $userId = $this->app->userId();
        $dogId = $r->intParam('id');
        $this->app->access()->requireOwner($userId, $dogId);
        $this->app->dogs()->update($dogId, $this->validate($r->body, partial: true));
        return Response::json(['dog' => DogRepository::present($this->app->dogs()->findForUser($dogId, $userId))]);
    }

    public function destroy(Request $r): Response
    {
        $userId = $this->app->userId();
        $dog = $this->load($r);
        $this->app->access()->requireOwner($userId, (int) $dog['id']);
        $this->app->dogs()->delete((int) $dog['id']);
        if ($dog['photo_media_id'] !== null) {
            $this->removeMedia((int) $dog['photo_media_id']);
        }
        return Response::noContent();
    }

    public function uploadPhoto(Request $r): Response
    {
        $userId = $this->app->userId();
        $dog = $this->load($r);
        $this->app->access()->requireOwner($userId, (int) $dog['id']);

        $stored = $this->app->images()->storeUpload($r->files['photo'] ?? null);
        $mediaId = $this->app->media()->create($userId, $stored);
        $this->app->dogs()->setPhoto((int) $dog['id'], $mediaId);
        if ($dog['photo_media_id'] !== null) {
            $this->removeMedia((int) $dog['photo_media_id']);
        }
        return Response::json(['dog' => DogRepository::present($this->app->dogs()->findForUser((int) $dog['id'], $userId))]);
    }

    public function deletePhoto(Request $r): Response
    {
        $userId = $this->app->userId();
        $dog = $this->load($r);
        $this->app->access()->requireOwner($userId, (int) $dog['id']);
        if ($dog['photo_media_id'] !== null) {
            $this->app->dogs()->setPhoto((int) $dog['id'], null);
            $this->removeMedia((int) $dog['photo_media_id']);
        }
        return Response::json(['dog' => DogRepository::present($this->app->dogs()->findForUser((int) $dog['id'], $userId))]);
    }

    /** Lädt einen Hund nur, wenn der Benutzer Profilzugriff hat – sonst 404. */
    private function load(Request $r): array
    {
        $userId = $this->app->userId();
        $dogId = $r->intParam('id');
        $this->app->access()->requireRead($userId, $dogId, 'profile');
        return $this->app->dogs()->findForUser($dogId, $userId) ?? throw HttpException::notFound();
    }

    private function removeMedia(int $mediaId): void
    {
        $media = $this->app->media()->find($mediaId);
        if ($media !== null) {
            $this->app->media()->delete($mediaId);
            $this->app->images()->delete((string) $media['storage_key']);
        }
    }

    /** @return array<string, mixed> Spaltenname → bereinigter Wert */
    private function validate(array $body, bool $partial): array
    {
        $v = new Validator($body);
        $out = [];
        $field = static fn (string $k) => !$partial || $v->has($k);
        if ($field('name')) $out['name'] = $v->string('name', 1, 40);
        if ($field('breed')) $out['breed'] = $v->string('breed', 0, 60);
        if ($field('sex')) $out['sex'] = $v->enum('sex', ['female', 'male']);
        if ($field('birthDate')) $out['birth_date'] = $v->date('birthDate');
        if ($field('weightKg')) $out['weight_kg'] = round($v->number('weightKg', 0.1, 120), 2);
        if ($field('neutered')) $out['neutered'] = $v->nullableBool('neutered');
        if ($field('healthNotes')) $out['health_notes'] = $v->string('healthNotes', 0, 1000, multiline: true);
        if ($field('bio')) $out['bio'] = $v->string('bio', 0, 280, multiline: true);
        if ($field('accent')) $out['accent'] = $v->enum('accent', ['sage', 'honey', 'clay', 'sky']);
        $v->validate();
        return $out;
    }
}
