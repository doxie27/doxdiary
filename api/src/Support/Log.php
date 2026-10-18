<?php

declare(strict_types=1);

namespace Doxie\Support;

/**
 * Fehlerprotokoll ohne personenbezogene Inhalte: Zeichenketten in Meldungen
 * (z. B. E-Mail-Adressen aus Datenbankfehlern) werden geschwärzt.
 */
final class Log
{
    public static function error(string $requestId, \Throwable $e): void
    {
        $config = doxie_config();
        $dir = $config->storagePath('logs');
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }
        $line = sprintf(
            "%s [%s] %s: %s at %s:%d\n",
            gmdate('c'),
            $requestId,
            $e::class,
            self::redact($e->getMessage()),
            basename($e->getFile()),
            $e->getLine(),
        );
        @file_put_contents($dir . '/app-' . gmdate('Y-m') . '.log', $line, FILE_APPEND | LOCK_EX);
    }

    public static function redact(string $message): string
    {
        $message = preg_replace("/'[^']*'/", "'…'", $message) ?? '';
        $message = preg_replace('/"[^"]*"/', '"…"', $message) ?? '';
        return preg_replace('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', '[email]', $message) ?? '';
    }
}
