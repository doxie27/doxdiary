<?php

declare(strict_types=1);

namespace Doxie\Tests;

final class ApiResponse
{
    /** @var array<string, mixed>|null */
    public readonly ?array $json;

    public function __construct(public readonly int $status, public readonly string $headers, public readonly string $body)
    {
        $decoded = json_decode($body, true);
        $this->json = is_array($decoded) ? $decoded : null;
    }

    public function header(string $name): ?string
    {
        return preg_match('/^' . preg_quote($name, '/') . ':\s*(.+)$/mi', $this->headers, $m) ? trim($m[1]) : null;
    }

    public function errorCode(): ?string
    {
        return $this->json['error']['code'] ?? null;
    }
}
