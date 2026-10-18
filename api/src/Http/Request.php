<?php

declare(strict_types=1);

namespace Doxie\Http;

final class Request
{
    /** @var array<string, string> */
    public array $params = [];

    /**
     * @param array<string, mixed> $query
     * @param array<string, mixed> $body
     * @param array<string, mixed> $files
     * @param array<string, string> $headers
     */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $body,
        public readonly array $files,
        public readonly array $headers,
        public readonly string $ip,
    ) {
    }

    /**
     * Ermittelt den API-Pfad unabhängig vom Installationsordner:
     * /doxie/api/v1/dogs → /dogs
     */
    public static function fromGlobals(): self
    {
        $uri = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        $pos = strpos($uri, '/api/v1');
        $path = $pos === false ? $uri : substr($uri, $pos + 7);
        $path = '/' . trim($path, '/');

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headers[strtolower(str_replace('_', '-', substr($key, 5)))] = (string) $value;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = (string) $_SERVER['CONTENT_TYPE'];
        }

        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $body = [];
        if (str_contains($headers['content-type'] ?? '', 'application/json')) {
            $raw = (string) file_get_contents('php://input', length: 1_000_000);
            if ($raw !== '') {
                $decoded = json_decode($raw, true);
                if (!is_array($decoded)) {
                    throw new HttpException(400, 'invalid_json', 'Ungültige Anfrage.');
                }
                $body = $decoded;
            }
        } elseif ($method === 'POST') {
            $body = $_POST;
        }

        return new self($method, $path, $_GET, $body, $_FILES, $headers, (string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    public function param(string $name): string
    {
        return $this->params[$name] ?? '';
    }

    public function intParam(string $name): int
    {
        $v = $this->param($name);
        if (!ctype_digit($v) || strlen($v) > 18) {
            throw HttpException::notFound();
        }
        return (int) $v;
    }

    public function isStateChanging(): bool
    {
        return !in_array($this->method, ['GET', 'HEAD', 'OPTIONS'], true);
    }
}
