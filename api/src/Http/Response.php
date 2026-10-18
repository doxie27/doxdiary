<?php

declare(strict_types=1);

namespace Doxie\Http;

final class Response
{
    /** @param array<string, string> $headers */
    public function __construct(
        public readonly int $status,
        public readonly string $body,
        public readonly array $headers = [],
        public readonly ?string $file = null,
        public readonly bool $deleteFileAfterSend = false,
    ) {
    }

    public static function json(mixed $data, int $status = 200): self
    {
        return new self($status, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), [
            'Content-Type' => 'application/json; charset=utf-8',
            'Cache-Control' => 'no-store',
        ]);
    }

    public static function noContent(): self
    {
        return new self(204, '', ['Cache-Control' => 'no-store']);
    }

    public static function error(HttpException $e): self
    {
        $error = ['code' => $e->errorCode, 'message' => $e->getMessage()];
        if ($e->fields) {
            $error['fields'] = $e->fields;
        }
        return self::json(['error' => $error], $e->status);
    }

    /** Liefert eine Datei aus (z. B. ein privates Foto nach Berechtigungsprüfung). */
    public static function file(string $path, string $mime, string $etag): self
    {
        return new self(200, '', [
            'Content-Type' => $mime,
            'Content-Length' => (string) filesize($path),
            'Cache-Control' => 'private, max-age=604800, immutable',
            'ETag' => '"' . $etag . '"',
            'Content-Disposition' => 'inline',
        ], $path);
    }

    /** Download einer temporären Datei, die nach dem Senden gelöscht wird. */
    public static function download(string $path, string $filename): self
    {
        return new self(200, '', [
            'Content-Type' => 'application/zip',
            'Content-Length' => (string) filesize($path),
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'no-store',
        ], $path, true);
    }

    public function send(): void
    {
        http_response_code($this->status);
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: no-referrer');
        header('X-Frame-Options: DENY');
        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value);
        }
        if ($this->file !== null) {
            readfile($this->file);
            if ($this->deleteFileAfterSend) {
                @unlink($this->file);
            }
            return;
        }
        echo $this->body;
    }
}
