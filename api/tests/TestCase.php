<?php

declare(strict_types=1);

namespace Doxie\Tests;

abstract class TestCase extends \PHPUnit\Framework\TestCase
{
    protected static function email(string $prefix = 'user'): string
    {
        return $prefix . '-' . bin2hex(random_bytes(4)) . '@example.test';
    }

    /** Legt einen Hund mit gültigen Standardwerten an. */
    protected static function createDog(ApiClient $c, array $overrides = []): array
    {
        $res = $c->post('/dogs', $overrides + [
            'name' => 'Lola', 'breed' => 'Rauhaardackel', 'sex' => 'female', 'birthDate' => '2019-04-12',
            'weightKg' => 8.4, 'neutered' => true, 'healthNotes' => '', 'bio' => '', 'accent' => 'honey',
        ]);
        \PHPUnit\Framework\Assert::assertSame(201, $res->status, $res->body);
        return $res->json['dog'];
    }

    protected static function mailDir(): string
    {
        return doxie_config()->storagePath('mail');
    }

    /** Letzte Mail an eine Adresse (LogMailer) */
    protected static function lastMailTo(string $email): ?string
    {
        $files = glob(self::mailDir() . '/*.eml') ?: [];
        rsort($files);
        foreach ($files as $f) {
            $c = (string) file_get_contents($f);
            if (str_contains($c, "To: {$email}")) {
                return $c;
            }
        }
        return null;
    }
}
