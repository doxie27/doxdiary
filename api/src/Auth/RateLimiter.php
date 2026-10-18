<?php

declare(strict_types=1);

namespace Doxie\Auth;

use Doxie\Http\HttpException;
use Doxie\Support\Db;

/**
 * Begrenzt Anmelde- und Reset-Versuche. Gespeichert werden nur HMAC-Hashes
 * von E-Mail bzw. IP – keine Klartextdaten.
 */
final class RateLimiter
{
    /** Standardgrenzen: [maximale Versuche, Zeitfenster in Sekunden] */
    public const DEFAULTS = [
        'register' => [10, 3600],       // pro IP
        'login' => [5, 900],            // pro E-Mail
        'login-ip' => [30, 900],        // pro IP
        'reset' => [3, 3600],           // Reset-Mails pro E-Mail
        'reset-ip' => [10, 3600],
        'reset-confirm' => [20, 3600],
        'password' => [5, 900],         // Passwort ändern pro Konto
        'verify-resend' => [3, 3600],   // Bestätigungsmail erneut senden
        'admin-reauth' => [5, 900],     // Passwortbestätigung im Admin-Bereich
    ];

    /** @param array<string, array{int, int}> $overrides z. B. aus config 'limits' */
    public function __construct(private readonly Db $db, private readonly string $secret, private readonly array $overrides = [])
    {
    }

    /** Prüft das konfigurierte Limit für eine Aktion. */
    public function check(string $action, string $subject): void
    {
        [$max, $window] = $this->overrides[$action] ?? self::DEFAULTS[$action];
        $this->ensureAllowed($action, $subject, $max, $window);
    }

    public function hash(string $subject): string
    {
        return hash_hmac('sha256', mb_strtolower($subject), $this->secret);
    }

    public function ensureAllowed(string $action, string $subject, int $max, int $windowSec): void
    {
        $row = $this->db->one(
            'SELECT COUNT(*) AS n FROM auth_attempts WHERE action = ? AND subject_hash = ? AND attempted_at > ?',
            [$action, $this->hash($subject), gmdate('Y-m-d H:i:s', time() - $windowSec)],
        );
        if ((int) ($row['n'] ?? 0) >= $max) {
            throw new HttpException(429, 'too_many_attempts', 'Zu viele Versuche. Bitte warte ein paar Minuten und versuche es dann erneut.');
        }
    }

    public function record(string $action, string $subject): void
    {
        $this->db->run(
            'INSERT INTO auth_attempts (action, subject_hash, attempted_at) VALUES (?, ?, ?)',
            [$action, $this->hash($subject), Db::now()],
        );
        if (random_int(1, 100) === 1) {
            $this->db->run('DELETE FROM auth_attempts WHERE attempted_at < ?', [gmdate('Y-m-d H:i:s', time() - 86400)]);
        }
    }

    public function clear(string $action, string $subject): void
    {
        $this->db->run('DELETE FROM auth_attempts WHERE action = ? AND subject_hash = ?', [$action, $this->hash($subject)]);
    }
}
