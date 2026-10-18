<?php

declare(strict_types=1);

namespace Doxie\Controllers;

use Doxie\App;
use Doxie\Http\HttpException;
use Doxie\Http\Request;
use Doxie\Http\Response;

/** Liefert private Dateien aus – ausschließlich nach Berechtigungsprüfung. */
final class MediaController
{
    public function __construct(private readonly App $app)
    {
    }

    public function show(Request $r): Response
    {
        $id = $r->intParam('id');
        if (!$this->app->media()->canView($id, $this->app->userId())) {
            throw HttpException::notFound();
        }
        $media = $this->app->media()->find($id) ?? throw HttpException::notFound();
        $path = $this->app->images()->path((string) $media['storage_key']);
        if (!is_file($path)) {
            throw HttpException::notFound();
        }
        $etag = substr((string) $media['storage_key'], 0, 16);
        if (trim((string) $r->header('if-none-match'), '"') === $etag) {
            return new Response(304, '', ['ETag' => '"' . $etag . '"', 'Cache-Control' => 'private, max-age=604800, immutable']);
        }
        return Response::file($path, (string) $media['mime'], $etag);
    }
}
