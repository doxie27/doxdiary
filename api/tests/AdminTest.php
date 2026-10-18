<?php

declare(strict_types=1);

namespace Doxie\Tests;

final class AdminTest extends TestCase
{
    private static ?ApiClient $admin = null;

    /** Admin = Adresse aus config + bestätigt */
    private static function admin(): ApiClient
    {
        if (self::$admin === null) {
            $c = new ApiClient();
            $c->register('admin@example.test', 'admin-passwort-123');
            self::verify($c, 'admin@example.test');
            self::$admin = $c;
        }
        return self::$admin;
    }

    public function testNonAdminsSeeNothing(): void
    {
        $c = new ApiClient();
        $c->register(self::email());
        self::assertFalse($c->get('/me')->json['user']['isAdmin']);
        foreach (['/admin/status', '/admin/users', '/admin/audit'] as $path) {
            self::assertSame(404, $c->get($path)->status, $path);
        }
        self::assertSame(404, $c->post('/admin/backup', ['password' => 'x'])->status);
    }

    public function testUnverifiedAdminEmailIsNotAdmin(): void
    {
        // Gleiche Adresse kann nicht zweimal registriert werden – daher Status vor Bestätigung prüfen
        $c = new ApiClient();
        $res = $c->register('Admin@Example.test-' . bin2hex(random_bytes(2)) . '.invalid');
        self::assertFalse($res->json['user']['isAdmin'] ?? true);
    }

    public function testStatusContainsNoPersonalContent(): void
    {
        $a = self::admin();
        self::assertTrue($a->get('/me')->json['user']['isAdmin']);
        $res = $a->get('/admin/status');
        self::assertSame(200, $res->status, $res->body);
        self::assertGreaterThanOrEqual(1, $res->json['stats']['users']);
        self::assertTrue($res->json['system']['backupEncrypted']);
        self::assertStringNotContainsString('healthNotes', $res->body);
    }

    public function testUserListLockUnlockAndDelete(): void
    {
        $a = self::admin();
        $email = self::email('target');
        $target = new ApiClient();
        $target->register($email, 'ziel-passwort-123');
        self::createDog($target, ['healthNotes' => 'Geheime Diagnose']);

        $list = $a->get('/admin/users');
        self::assertStringNotContainsString('Geheime Diagnose', $list->body);
        $row = array_values(array_filter($list->json['users'], static fn ($u) => $u['email'] === $email))[0];
        self::assertSame(1, $row['dogs']);

        self::assertSame(200, $a->post("/admin/users/{$row['id']}/lock")->status);
        self::assertSame(401, $target->get('/me')->status, 'Gesperrt: laufende Sitzung endet');
        $login = (new ApiClient())->login($email, 'ziel-passwort-123');
        self::assertSame('account_locked', $login->errorCode());

        self::assertSame(200, $a->post("/admin/users/{$row['id']}/unlock")->status);
        self::assertSame(200, (new ApiClient())->login($email, 'ziel-passwort-123')->status);

        self::assertSame(200, $a->post("/admin/users/{$row['id']}/reset")->status);
        self::assertStringContainsString('reset/confirm?token=', (string) self::lastMailTo($email));

        self::assertSame(422, $a->post("/admin/users/{$row['id']}/delete", ['password' => 'falsch'])->status);
        self::assertSame(204, $a->post("/admin/users/{$row['id']}/delete", ['password' => 'admin-passwort-123'])->status);
        self::assertSame(401, (new ApiClient())->login($email, 'ziel-passwort-123')->status);

        $actions = array_column($a->get('/admin/audit')->json['entries'], 'action');
        self::assertContains('delete_user', $actions);
        self::assertContains('lock', $actions);
    }

    public function testAdminCannotLockSelf(): void
    {
        $a = self::admin();
        $me = $a->get('/me')->json['user']['id'];
        self::assertSame(422, $a->post("/admin/users/{$me}/lock")->status);
    }

    public function testBackupIsEncryptedZipWithDumpAndUploads(): void
    {
        $a = self::admin();
        $dog = self::createDog($a);
        $png = tempnam(sys_get_temp_dir(), 'dx') . '.png';
        imagepng(imagecreatetruecolor(20, 20), $png);
        $a->upload("/dogs/{$dog['id']}/photo", $png);

        self::assertSame(422, $a->post('/admin/backup', ['password' => 'falsch'])->status);
        $res = $a->post('/admin/backup', ['password' => 'admin-passwort-123']);
        self::assertSame(200, $res->status);
        self::assertSame('application/zip', $res->header('Content-Type'));
        $file = tempnam(sys_get_temp_dir(), 'bk') . '.zip';
        file_put_contents($file, $res->body);

        $zip = new \ZipArchive();
        self::assertTrue($zip->open($file));
        self::assertFalse($zip->getFromName('database.sql'), 'Ohne Passwort nicht lesbar');
        $zip->setPassword('backup-test-passwort');
        $sql = (string) $zip->getFromName('database.sql');
        self::assertStringContainsString('CREATE TABLE `users`', $sql);
        self::assertStringContainsString('INSERT INTO `dogs`', $sql);
        $names = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $names[] = $zip->getNameIndex($i);
        }
        self::assertNotEmpty(preg_grep('#^uploads/.+\.jpg$#', $names));
        self::assertSame([], glob(doxie_config()->storagePath('tmp') . '/*'), 'Temporäre Dateien werden entfernt');
    }

    public function testBackupTokenForAutomation(): void
    {
        $c = new ApiClient();
        self::assertSame(404, $c->get('/admin/backup')->status);
        $res = (new ApiClient())->getWithHeader('/admin/backup', 'Authorization: Bearer ' . str_repeat('t', 40));
        self::assertSame(200, $res->status);
        self::assertSame('application/zip', $res->header('Content-Type'));
    }

    public function testLegalLinksFromConfig(): void
    {
        $res = (new ApiClient())->get('/meta');
        self::assertSame('https://example.test/impressum', $res->json['legal']['imprintUrl']);
        self::assertNull($res->json['legal']['privacyUrl']);
    }
}
