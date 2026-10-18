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

    /**
     * Geheimer Schlüssel für HMACs. Ist keiner konfiguriert, wird beim ersten
     * Aufruf einer erzeugt und in storage/secret.key abgelegt (nur Besitzer lesbar).
     */
    public function secret(): string
    {
        $configured = (string) $this->get('app.secret', '');
        if (strlen($configured) >= 32 && !str_contains($configured, 'HIER')) {
            return $configured;
        }
        $file = $this->storagePath('secret.key');
        if (is_file($file)) {
            return trim((string) file_get_contents($file));
        }
        if (!is_dir(dirname($file))) {
            mkdir(dirname($file), 0700, true);
        }
        $secret = bin2hex(random_bytes(32));
        file_put_contents($file, $secret, LOCK_EX);
        chmod($file, 0600);
        return $secret;
    }

    public function isProduction(): bool
    {
        return $this->get('app.env') === 'production';
    }
}
