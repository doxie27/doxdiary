<?php

declare(strict_types=1);

namespace Doxie\Controllers;

use Doxie\App;
use Doxie\Http\HttpException;
use Doxie\Http\Request;
use Doxie\Http\Response;
use Doxie\Repositories\DiaryRepository;
use Doxie\Support\Validator;

/** Tagebuch pro Hund. Lesen: Bereich „diary“, Schreiben: Besitzer:in. */
final class DiaryController
{
    public const MAX_PHOTOS = 4;
    private const CATEGORIES = ['alltag', 'gesundheit', 'verhalten', 'training', 'erlebnis'];

    public function __construct(private readonly App $app)
    {
    }

    private function diary(): DiaryRepository
    {
        return new DiaryRepository($this->app->db());
    }

    public function index(Request $r): Response
    {
        $dogId = $r->intParam('id');
        $this->app->access()->requireRead($this->app->userId(), $dogId, 'diary');
        return Response::json(['entries' => array_map(DiaryRepository::present(...), $this->diary()->listForDog($dogId))]);
    }

    public function store(Request $r): Response
    {
        $userId = $this->app->userId();
        $dogId = $r->intParam('id');
        $this->app->access()->requireOwner($userId, $dogId);
        $id = $this->diary()->create($dogId, $userId, self::validate($r->body));
        return Response::json(['entry' => DiaryRepository::present($this->diary()->find($id))], 201);
    }

    public function update(Request $r): Response
    {
        $entry = $this->ownedEntry($r);
        $this->diary()->update((int) $entry['id'], self::validate($r->body));
        return Response::json(['entry' => DiaryRepository::present($this->diary()->find((int) $entry['id']))]);
    }

    public function destroy(Request $r): Response
    {
        $entry = $this->ownedEntry($r);
        $media = array_filter(array_map(fn ($id) => $this->app->media()->find($id), $entry['photos']));
        $this->diary()->delete((int) $entry['id']);
        foreach ($media as $m) {
            $this->app->media()->delete((int) $m['id']);
            $this->app->images()->delete((string) $m['storage_key']);
        }
        return Response::noContent();
    }

    public function addPhoto(Request $r): Response
    {
        $entry = $this->ownedEntry($r);
        if (count($entry['photos']) >= self::MAX_PHOTOS) {
            throw HttpException::validation(['photo' => 'Höchstens ' . self::MAX_PHOTOS . ' Fotos pro Eintrag.']);
        }
        $mediaId = $this->app->media()->create($this->app->userId(), $this->app->images()->storeUpload($r->files['photo'] ?? null));
        $this->diary()->addPhoto((int) $entry['id'], $mediaId);
        return Response::json(['entry' => DiaryRepository::present($this->diary()->find((int) $entry['id']))], 201);
    }

    public function removePhoto(Request $r): Response
    {
        $entry = $this->ownedEntry($r);
        $mediaId = $r->intParam('mediaId');
        if (!in_array($mediaId, $entry['photos'], true)) {
            throw HttpException::notFound();
        }
        $media = $this->app->media()->find($mediaId);
        $this->app->media()->delete($mediaId);
        if ($media !== null) {
            $this->app->images()->delete((string) $media['storage_key']);
        }
        return Response::json(['entry' => DiaryRepository::present($this->diary()->find((int) $entry['id']))]);
    }

    private function ownedEntry(Request $r): array
    {
        $entry = $this->diary()->find($r->intParam('id')) ?? throw HttpException::notFound();
        $this->app->access()->requireOwner($this->app->userId(), (int) $entry['dog_id']);
        return $entry;
    }

    /** @return array<string, mixed> */
    public static function validate(array $body): array
    {
        $v = new Validator($body);
        $f = [
            'occurred_at' => $v->datetime('at'),
            'category' => $v->enum('category', self::CATEGORIES),
            'title' => $v->string('title', 1, 80),
            'text' => $v->string('text', 0, 5000, multiline: true),
            'highlight' => ($body['highlight'] ?? false) === true,
        ];
        $v->validate();
        return $f;
    }
}
