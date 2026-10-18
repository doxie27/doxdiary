<?php

declare(strict_types=1);

/**
 * Lädt Konfiguration und Autoloader. Wird vom Front-Controller und von den
 * CLI-Skripten (bin/*) eingebunden. Keine Laufzeit-Abhängigkeiten nötig.
 */

spl_autoload_register(static function (string $class): void {
    $prefix = 'Doxie\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $file = __DIR__ . '/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

use Doxie\Support\Config;

/**
 * Reihenfolge: Umgebungsvariable DOXIE_CONFIG (Tests) → ../config.php (Repo/Entwicklung)
 * → ../../config.php (STRATO: doxie-private/config.php neben app/).
 */
function doxie_config(): Config
{
    static $config = null;
    if ($config instanceof Config) {
        return $config;
    }
    $candidates = array_filter([
        getenv('DOXIE_CONFIG') ?: null,
        dirname(__DIR__) . '/config.php',
        dirname(__DIR__, 2) . '/config.php',
    ]);
    foreach ($candidates as $path) {
        if (is_file($path)) {
            return $config = new Config(require $path);
        }
    }
    throw new RuntimeException('Keine config.php gefunden. Siehe api/config.example.php.');
}
