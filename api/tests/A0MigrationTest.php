<?php

declare(strict_types=1);

namespace Doxie\Tests;

use Doxie\Support\Db;

/** Läuft alphabetisch zuerst: frische Datenbank, Schema entsteht beim ersten Aufruf. */
final class A0MigrationTest extends TestCase
{
    public function testFirstRequestCreatesSchemaAndWritesMarker(): void
    {
        $res = (new ApiClient())->get('/health');
        self::assertSame(['ok' => true, 'db' => true], $res->json);

        $db = Db::fromConfig(doxie_config());
        self::assertSame(['0001_init'], array_column($db->all('SELECT version FROM schema_migrations'), 'version'));
        self::assertSame('0001_init', trim((string) file_get_contents(doxie_config()->storagePath('schema.version'))));

        // Zweiter Aufruf: nichts passiert, keine doppelten Einträge
        (new ApiClient())->get('/health');
        self::assertCount(1, $db->all('SELECT version FROM schema_migrations'));
    }
}
