<?php

declare(strict_types=1);

namespace Doxie\Mail;

/** Texte aller System-Mails an einem Ort. Rückgabe: [Betreff, Text]. */
final class Templates
{
    private const SIGNATURE = "\n\nDein Doxie-Diary-Team\n";

    /** @return array{string, string} */
    public static function passwordReset(string $firstName, string $link): array
    {
        return ['Dein Link zum Zurücksetzen des Passworts', "Hallo {$firstName},\n\n"
            . "du hast angefordert, dein Passwort für Doxie Diary zurückzusetzen.\n"
            . "Über diesen Link kannst du ein neues Passwort festlegen (gültig für 60 Minuten):\n\n{$link}\n\n"
            . 'Falls du das nicht warst, kannst du diese E-Mail ignorieren – dein Passwort bleibt unverändert.' . self::SIGNATURE];
    }

    /** @return array{string, string} */
    public static function verifyEmail(string $firstName, string $link): array
    {
        return ['Bitte bestätige deine E-Mail-Adresse', "Hallo {$firstName},\n\n"
            . "schön, dass du Doxie Diary nutzt! Bitte bestätige deine E-Mail-Adresse über diesen Link (gültig für 48 Stunden):\n\n{$link}\n\n"
            . "So stellen wir sicher, dass du dein Passwort jederzeit zurücksetzen kannst.\n"
            . 'Falls du dich nicht registriert hast, ignoriere diese E-Mail einfach – das Konto wird nach 7 Tagen automatisch gelöscht.' . self::SIGNATURE];
    }

    /** @return array{string, string} */
    public static function verifyReminder(string $firstName, string $link, string $deleteDate): array
    {
        return ['Erinnerung: Bitte bestätige deine E-Mail-Adresse', "Hallo {$firstName},\n\n"
            . "deine E-Mail-Adresse für Doxie Diary ist noch nicht bestätigt. Bitte bestätige sie über diesen Link:\n\n{$link}\n\n"
            . "Ohne Bestätigung wird dein Konto am {$deleteDate} automatisch gelöscht." . self::SIGNATURE];
    }
}
