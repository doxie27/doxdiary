<?php

declare(strict_types=1);

namespace Doxie\Tests;

final class PasswordResetTest extends TestCase
{
    public function testUnknownEmailGetsNeutralAnswerAndNoMail(): void
    {
        $email = self::email('ghost');
        $c = new ApiClient();
        $c->fetchCsrf();
        $res = $c->post('/auth/password/forgot', ['email' => $email]);
        self::assertSame(202, $res->status);
        self::assertNull(self::lastMailTo($email));
    }

    public function testFullResetFlowInvalidatesOldSessions(): void
    {
        $email = self::email('reset');
        $device1 = new ApiClient();
        $device1->register($email, 'altes-passwort-123');

        $c = new ApiClient();
        $c->fetchCsrf();
        self::assertSame(202, $c->post('/auth/password/forgot', ['email' => $email])->status);
        $mail = self::lastMailTo($email);
        self::assertNotNull($mail);
        self::assertMatchesRegularExpression('#http://localhost:5173/reset/confirm\?token=[A-Za-z0-9_-]{43}#', $mail);
        preg_match('/token=([A-Za-z0-9_-]+)/', $mail, $m);

        self::assertSame(422, $c->post('/auth/password/reset', ['token' => $m[1], 'password' => 'kurz'])->status);
        self::assertSame(204, $c->post('/auth/password/reset', ['token' => $m[1], 'password' => 'neues-passwort-456'])->status);
        self::assertSame(400, $c->post('/auth/password/reset', ['token' => $m[1], 'password' => 'noch-ein-passwort'])->status, 'Token nur einmal gültig');

        self::assertSame(401, $device1->get('/me')->status, 'Bestehende Sitzungen werden beendet');
        self::assertSame(401, (new ApiClient())->login($email, 'altes-passwort-123')->status);
        self::assertSame(200, (new ApiClient())->login($email, 'neues-passwort-456')->status);
    }

    public function testOnlyNewestLinkIsValid(): void
    {
        $email = self::email('twice');
        (new ApiClient())->register($email);
        $c = new ApiClient();
        $c->fetchCsrf();
        $c->post('/auth/password/forgot', ['email' => $email]);
        preg_match('/token=([A-Za-z0-9_-]+)/', (string) self::lastMailTo($email), $first);
        sleep(1);
        $c->post('/auth/password/forgot', ['email' => $email]);
        self::assertSame(400, $c->post('/auth/password/reset', ['token' => $first[1], 'password' => 'neues-passwort-456'])->status);
    }
}
