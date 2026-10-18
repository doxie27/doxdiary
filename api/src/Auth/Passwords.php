<?php

declare(strict_types=1);

namespace Doxie\Auth;

/** Argon2id, falls verfügbar (auf STRATO geprüft), sonst bcrypt. */
final class Passwords
{
    public static function hash(string $password): string
    {
        return password_hash($password, self::algo());
    }

    public static function verify(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    public static function needsRehash(string $hash): bool
    {
        return password_needs_rehash($hash, self::algo());
    }

    /** Dummy-Hash für unbekannte E-Mails, damit die Antwortzeit nichts verrät. */
    public static function dummyVerify(string $password): void
    {
        static $dummy = null;
        $dummy ??= self::hash('doxie-timing-equaliser');
        password_verify($password, $dummy);
    }

    private static function algo(): string
    {
        return defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
    }
}
