<?php

declare(strict_types=1);

namespace Doxie\Tests;

final class DogTest extends TestCase
{
    public function testCreateListShowAndPartialUpdate(): void
    {
        $c = new ApiClient();
        $c->register(self::email());
        $dog = self::createDog($c, ['healthNotes' => "Zeile 1\nZeile 2"]);
        self::assertSame('owner', $dog['access']['role']);
        self::assertSame("Zeile 1\nZeile 2", $dog['healthNotes']);

        self::assertCount(1, $c->get('/dogs')->json['dogs']);
        $res = $c->patch("/dogs/{$dog['id']}", ['weightKg' => 8.9, 'neutered' => null]);
        self::assertSame(200, $res->status, $res->body);
        self::assertSame(8.9, $res->json['dog']['weightKg']);
        self::assertNull($res->json['dog']['neutered']);
        self::assertSame('Lola', $res->json['dog']['name'], 'Nicht gesendete Felder bleiben erhalten');
    }

    public function testValidation(): void
    {
        $c = new ApiClient();
        $c->register(self::email());
        $res = $c->post('/dogs', ['name' => str_repeat('x', 41), 'sex' => 'other', 'birthDate' => '2999-01-01', 'weightKg' => 500, 'accent' => 'pink', 'neutered' => 'ja']);
        self::assertSame(422, $res->status);
        self::assertEqualsCanonicalizing(['name', 'sex', 'birthDate', 'weightKg', 'accent', 'neutered'], array_keys($res->json['error']['fields']));
        self::assertSame('Das Datum liegt in der Zukunft.', $res->json['error']['fields']['birthDate']);
    }

    public function testOtherUsersCannotSeeOrChangeDog(): void
    {
        $owner = new ApiClient();
        $owner->register(self::email('owner'));
        $dog = self::createDog($owner);

        $other = new ApiClient();
        $other->register(self::email('other'));
        self::assertSame([], $other->get('/dogs')->json['dogs']);
        self::assertSame(404, $other->get("/dogs/{$dog['id']}")->status);
        self::assertSame(404, $other->patch("/dogs/{$dog['id']}", ['name' => 'Gehackt'])->status);
        self::assertSame(404, $other->delete("/dogs/{$dog['id']}")->status);
        self::assertSame(404, $other->upload("/dogs/{$dog['id']}/photo", self::png())->status);
        // Nicht existierende ID verhält sich identisch
        self::assertSame(404, $other->get('/dogs/999999')->status);
        self::assertSame(404, $other->get('/dogs/abc')->status);

        self::assertSame('Lola', $owner->get("/dogs/{$dog['id']}")->json['dog']['name']);
    }

    public function testPhotoUploadIsReencodedAndPrivate(): void
    {
        $owner = new ApiClient();
        $owner->register(self::email());
        $dog = self::createDog($owner);

        $res = $owner->upload("/dogs/{$dog['id']}/photo", self::png(2400, 1200));
        self::assertSame(200, $res->status, $res->body);
        $mediaId = $res->json['dog']['photoMediaId'];
        self::assertNotNull($mediaId);

        $img = $owner->get("/media/{$mediaId}");
        self::assertSame(200, $img->status);
        self::assertSame('image/jpeg', $img->header('Content-Type'));
        [$w, $h] = getimagesizefromstring($img->body);
        self::assertSame([1600, 800], [$w, $h], 'Wird auf max. 1600 px verkleinert');

        $other = new ApiClient();
        $other->register(self::email());
        self::assertSame(404, $other->get("/media/{$mediaId}")->status);

        // Ersetzen löscht die alte Datei
        $files = fn () => glob(doxie_config()->storagePath('uploads') . '/*.jpg') ?: [];
        $before = count($files());
        $owner->upload("/dogs/{$dog['id']}/photo", self::png());
        self::assertCount($before, $files());
        self::assertSame(404, $owner->get("/media/{$mediaId}")->status);
    }

    public function testRejectsNonImages(): void
    {
        $c = new ApiClient();
        $c->register(self::email());
        $dog = self::createDog($c);
        $fake = tempnam(sys_get_temp_dir(), 'dx') . '.jpg';
        file_put_contents($fake, "<?php echo 'hallo';");
        $res = $c->upload("/dogs/{$dog['id']}/photo", $fake);
        self::assertSame(422, $res->status);
        self::assertSame('Bitte ein JPEG-, PNG- oder WebP-Bild hochladen.', $res->json['error']['fields']['photo']);
    }

    public function testDeleteDogRemovesPhoto(): void
    {
        $c = new ApiClient();
        $c->register(self::email());
        $dog = self::createDog($c);
        $mediaId = $c->upload("/dogs/{$dog['id']}/photo", self::png())->json['dog']['photoMediaId'];
        self::assertSame(204, $c->delete("/dogs/{$dog['id']}")->status);
        self::assertSame(404, $c->get("/dogs/{$dog['id']}")->status);
        self::assertSame(404, $c->get("/media/{$mediaId}")->status);
    }

    private static function png(int $w = 400, int $h = 300): string
    {
        $img = imagecreatetruecolor($w, $h);
        imagefill($img, 0, 0, imagecolorallocate($img, 120, 150, 110));
        $file = tempnam(sys_get_temp_dir(), 'dx') . '.png';
        imagepng($img, $file);
        return $file;
    }
}
