<?php

declare(strict_types=1);

namespace Doxie\Tests;

use Doxie\Support\Db;

final class VerificationTest extends TestCase
{
    public function testRegistrationSendsVerificationMailAndLinkVerifies(): void
    {
        $email = self::email('verify');
        $c = new ApiClient();
        $res = $c->register($email);
        self::assertFalse($res->json['user']['emailVerified']);
        $mail = (string) self::lastMailTo($email);
        self::assertMatchesRegularExpression('#http://localhost:5173/verify-email\?token=[A-Za-z0-9_-]{43}#', $mail);

        // Link funktioniert auch auf einem anderen Gerät ohne Anmeldung
        $other = new ApiClient();
        $other->fetchCsrf();
        self::verify($other, $email);
        self::assertTrue($c->get('/me')->json['user']['emailVerified']);

        preg_match('/token=([A-Za-z0-9_-]+)/', $mail, $m);
        self::assertSame(400, $other->post('/auth/email/verify', ['token' => $m[1]])->status, 'Link nur einmal gültig');
    }

    public function testResendIsRateLimitedAndInvalidatesOldLink(): void
    {
        $email = self::email('resend');
        $c = new ApiClient();
        $c->register($email);
        preg_match('/token=([A-Za-z0-9_-]+)/', (string) self::lastMailTo($email), $first);
        sleep(1);
        self::assertSame(200, $c->post('/me/email/resend')->status);
        self::assertSame(400, $c->post('/auth/email/verify', ['token' => $first[1]])->status);
        $c->post('/me/email/resend');
        $c->post('/me/email/resend');
        self::assertSame(429, $c->post('/me/email/resend')->status);
    }

    public function testMaintenanceRemindsAndDeletesUnverifiedAccounts(): void
    {
        $remindEmail = self::email('remind');
        $deleteEmail = self::email('expire');
        $keepEmail = self::email('keep');
        foreach ([$remindEmail, $deleteEmail, $keepEmail] as $e) {
            $c = new ApiClient();
            $c->register($e);
            if ($e === $deleteEmail) {
                self::createDog($c);
            }
        }
        $db = Db::fromConfig(doxie_config());
        $db->run('UPDATE users SET created_at = ? WHERE email = ?', [gmdate('Y-m-d H:i:s', time() - 6 * 86400), $remindEmail]);
        $db->run('UPDATE users SET created_at = ? WHERE email = ?', [gmdate('Y-m-d H:i:s', time() - 8 * 86400), $deleteEmail]);

        $result = (new \Doxie\Support\Maintenance(self::app()))->run();
        self::assertGreaterThanOrEqual(1, $result['reminded']);
        self::assertGreaterThanOrEqual(1, $result['deleted']);
        self::assertStringContainsString('Erinnerung', (string) self::lastMailTo($remindEmail));
        self::assertNull($db->one('SELECT id FROM users WHERE email = ?', [$deleteEmail]));
        self::assertNotNull($db->one('SELECT id FROM users WHERE email = ?', [$keepEmail]));
        self::assertNotNull($db->one('SELECT id FROM users WHERE email = ?', [$remindEmail]));

        // Zweiter Lauf erinnert nicht erneut
        (new \Doxie\Support\Maintenance(self::app()))->run();
        self::assertSame(1, substr_count(implode("\n", array_map('file_get_contents', glob(self::mailDir() . '/*.eml'))), "To: {$remindEmail}\nSubject: Erinnerung"));
    }
}
