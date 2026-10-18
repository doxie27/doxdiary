<?php

declare(strict_types=1);

namespace Doxie\Support;

final class Config
{
    /** @param array<string, mixed> $values */
    public function __construct(private readonly array $values)
    {
    }

    /** Liest verschachtelte Werte, z. B. get('db.dsn'). */
    public function get(string $key, mixed $default = null): mixed
    {
        $value = $this->values;
        foreach (explode('.', $key) as $part) {
            if (!is_array($value) || !array_key_exists($part, $value)) {
                return $default;
            }
            $value = $value[$part];
        }
        return $value;
    }

    public function storagePath(string $sub = ''): string
    {
        $base = rtrim((string) $this->get('paths.storage'), '/');
        return $sub === '' ? $base : $base . '/' . ltrim($sub, '/');
    }

    public function isProduction(): bool
    {
        return $this->get('app.env') === 'production';
    }
}
