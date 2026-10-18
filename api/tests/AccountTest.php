<?php

declare(strict_types=1);

namespace Doxie\Tests;

final class AccountTest extends TestCase
{
    public function testUpdateProfile(): void
    {
        $c = new ApiClient();
        $c->register(self::email());
        $res = $c->patch('/me', ['firstName' => '  Nico ', 'lastName' => 'Muster']);
        self::assertSame(200, $res->status);
        self::assertSame('Nico', $res->json['user']['firstName']);
    }

    public function testChangePasswordKeepsCurrentSessionOnly(): void
    {
        $email = self::email();
        $a = new ApiClient();
        $a->register($email, 'erstes-passwort-1');
        $b = new ApiClient();
        $b->login($email, 'erstes-passwort-1');

        self::assertSame(422, $a->post('/me/password', ['currentPassword' => 'falsch', 'newPassword' => 'zweites-passwort-2'])->status);
        $res = $a->post('/me/password', ['currentPassword' => 'erstes-passwort-1', 'newPassword' => 'zweites-passwort-2']);
        self::assertSame(200, $res->status, $res->body);
        $a->csrf = $res->json['csrfToken'];

        self::assertSame(200, $a->get('/me')->status);
        self::assertSame(401, $b->get('/me')->status);
    }

    public function testExportContainsOwnDataOnly(): void
    {
        $c = new ApiClient();
        $c->register(self::email());
        self::createDog($c, ['name' => 'Bruno']);
        $other = new ApiClient();
        $other->register(self::email());
        self::createDog($other, ['name' => 'Fremd']);

        $res = $c->get('/me/export');
        self::assertSame(200, $res->status);
        self::assertStringContainsString('attachment', (string) $res->header('Content-Disposition'));
        self::assertSame(['Bruno'], array_column($res->json['dogs'], 'name'));
    }

    public function testDeleteAccountRemovesEverything(): void
    {
        $email = self::email('delete');
        $c = new ApiClient();
        $c->register($email, 'loesch-mich-bitte');
        $dog = self::createDog($c);
        $png = tempnam(sys_get_temp_dir(), 'dx') . '.png';
        imagepng(imagecreatetruecolor(50, 50), $png);
        $c->upload("/dogs/{$dog['id']}/photo", $png);
        $uploads = fn () => count(glob(doxie_config()->storagePath('uploads') . '/*.jpg') ?: []);
        $before = $uploads();

        self::assertSame(422, $c->post('/me/delete', ['password' => 'falsch'])->status);
        self::assertSame(204, $c->post('/me/delete', ['password' => 'loesch-mich-bitte'])->status);
        self::assertSame($before - 1, $uploads());
        self::assertSame(401, $c->get('/me')->status);
        self::assertSame(401, (new ApiClient())->login($email, 'loesch-mich-bitte')->status);

        // Neues Konto mit derselben Adresse sieht nichts vom alten
        $again = new ApiClient();
        $again->register($email);
        self::assertSame([], $again->get('/dogs')->json['dogs']);
    }
}
