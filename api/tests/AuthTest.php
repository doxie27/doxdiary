<?php

declare(strict_types=1);

namespace Doxie\Tests;

final class AuthTest extends TestCase
{
    public function testRegisterValidatesInput(): void
    {
        $c = new ApiClient();
        $c->fetchCsrf();
        $res = $c->post('/auth/register', ['firstName' => '', 'email' => 'kein-mail', 'password' => 'kurz']);
        self::assertSame(422, $res->status);
        self::assertSame(['firstName', 'email', 'password', 'privacyAccepted'], array_keys($res->json['error']['fields']));
    }

    public function testRegisterLogsInAndNormalisesEmail(): void
    {
        $c = new ApiClient();
        $email = self::email('Reg');
        $res = $c->register(strtoupper($email));
        self::assertSame(201, $res->status, $res->body);
        self::assertSame(strtolower($email), $res->json['user']['email']);
        self::assertArrayNotHasKey('password_hash', $res->json['user']);
        self::assertSame(200, $c->get('/me')->status);
    }

    public function testDuplicateEmailIsRejected(): void
    {
        $email = self::email();
        (new ApiClient())->register($email);
        $res = (new ApiClient())->register($email);
        self::assertSame(409, $res->status);
        self::assertSame('email_taken', $res->errorCode());
    }

    public function testStateChangingRequestsRequireCsrfToken(): void
    {
        $c = new ApiClient();
        $res = $c->post('/auth/login', ['email' => 'a@b.de', 'password' => 'x']);
        self::assertSame(419, $res->status);
        $c->fetchCsrf();
        $c->csrf = str_repeat('0', 64);
        self::assertSame(419, $c->post('/auth/login', ['email' => 'a@b.de', 'password' => 'x'])->status);
    }

    public function testForeignOriginIsRejected(): void
    {
        $c = new ApiClient();
        $c->fetchCsrf();
        $c->origin = 'https://evil.example';
        self::assertSame(403, $c->post('/auth/login', ['email' => 'a@b.de', 'password' => 'x'])->status);
        $c->origin = 'http://localhost:5173';
        self::assertSame(401, $c->post('/auth/login', ['email' => 'a@b.de', 'password' => 'x'])->status);
    }

    public function testLoginRegeneratesSessionAndLogoutEndsIt(): void
    {
        $email = self::email();
        (new ApiClient())->register($email, 'richtiges-passwort');

        $c = new ApiClient();
        $c->fetchCsrf();
        $before = $c->cookie('doxie_sid');
        $res = $c->login($email, 'richtiges-passwort');
        self::assertSame(200, $res->status, $res->body);
        self::assertNotSame($before, $c->cookie('doxie_sid'), 'Session-ID muss nach Login wechseln');

        $c->post('/auth/logout');
        self::assertSame(401, $c->get('/me')->status);
    }

    public function testWrongPasswordAndRateLimit(): void
    {
        $email = self::email();
        (new ApiClient())->register($email, 'richtiges-passwort');
        $c = new ApiClient();
        for ($i = 0; $i < 5; $i++) {
            $res = $c->login($email, 'falsch-falsch');
            self::assertSame(401, $res->status);
            self::assertSame('invalid_credentials', $res->errorCode());
        }
        // Auch das richtige Passwort wird jetzt vorübergehend blockiert
        self::assertSame(429, $c->login($email, 'richtiges-passwort')->status);
    }

    public function testUnknownEmailGivesSameErrorAsWrongPassword(): void
    {
        $res = (new ApiClient())->login(self::email('unbekannt'), 'irgendwas-langes');
        self::assertSame(401, $res->status);
        self::assertSame('invalid_credentials', $res->errorCode());
    }

    public function testProtectedRoutesNeedLogin(): void
    {
        $c = new ApiClient();
        self::assertSame(401, $c->get('/me')->status);
        self::assertSame(401, $c->get('/dogs')->status);
        self::assertSame(401, $c->get('/media/1')->status);
    }

    public function testSessionCookieIsHttpOnlyAndSameSite(): void
    {
        $res = (new ApiClient())->get('/auth/csrf');
        $cookie = (string) $res->header('Set-Cookie');
        self::assertStringContainsString('HttpOnly', $cookie);
        self::assertStringContainsStringIgnoringCase('SameSite=Lax', $cookie);
    }

    public function testErrorsDoNotLeakInternals(): void
    {
        $res = (new ApiClient())->get('/gibt-es-nicht');
        self::assertSame(404, $res->status);
        self::assertSame(['error' => ['code' => 'not_found', 'message' => 'Nicht gefunden.']], $res->json);
        self::assertSame('nosniff', $res->header('X-Content-Type-Options'));
    }
}
