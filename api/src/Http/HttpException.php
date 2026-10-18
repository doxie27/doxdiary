<?php

declare(strict_types=1);

namespace Doxie\Http;

/** Fachlicher Fehler mit stabilem Code für das Frontend und deutscher Meldung. */
class HttpException extends \RuntimeException
{
    /** @param array<string, string> $fields */
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
        public readonly array $fields = [],
    ) {
        parent::__construct($message);
    }

    public static function notFound(): self
    {
        return new self(404, 'not_found', 'Nicht gefunden.');
    }

    public static function unauthenticated(): self
    {
        return new self(401, 'unauthenticated', 'Bitte melde dich an.');
    }

    public static function forbidden(string $message = 'Dafür fehlt dir die Berechtigung.'): self
    {
        return new self(403, 'forbidden', $message);
    }

    /** @param array<string, string> $fields */
    public static function validation(array $fields): self
    {
        return new self(422, 'validation_failed', 'Bitte prüfe deine Eingaben.', $fields);
    }
}
