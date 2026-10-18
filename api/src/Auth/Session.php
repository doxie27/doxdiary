<?php

declare(strict_types=1);

namespace Doxie\Auth;

use Doxie\Support\Config;

/**
 * Serverseitige PHP-Session mit sicheren Cookie-Parametern und CSRF-Token.
 * Sessions werden nur angelegt, wenn sie gebraucht werden (CSRF-Abruf, Login),
 * Sessiondateien liegen außerhalb des Webroots.
 */
final class Session
{
    private const COOKIE = 'doxie_sid';
    private const IDLE = 30 * 86400;      // 30 Tage ohne Nutzung → abgemeldet
    private const ABSOLUTE = 180 * 86400; // spätestens nach 180 Tagen neu anmelden
    private const TOUCH = 300;            // Aktivität höchstens alle 5 Min. schreiben

    private bool $started = false;

    public function __construct(private readonly Config $config)
    {
    }

    /** Startet die Session; ohne $create nur, wenn bereits ein Cookie existiert. */
    public function start(bool $create = false): bool
    {
        if ($this->started) {
            return true;
        }
        if (!$create && !isset($_COOKIE[self::COOKIE])) {
            return false;
        }
        $dir = $this->config->storagePath('sessions');
        if (!is_dir($dir)) {
            mkdir($dir, 0700, true);
        }
        session_name(self::COOKIE);
        session_save_path($dir);
        $opts = $this->cookieOptions(self::IDLE);
        unset($opts['expires']);
        session_set_cookie_params(['lifetime' => self::IDLE] + $opts);
        session_start([
            'use_strict_mode' => 1,
            'use_only_cookies' => 1,
            'use_trans_sid' => 0,
            'gc_maxlifetime' => self::IDLE,
            'gc_probability' => 1,
            'gc_divisor' => 100,
            'lazy_write' => 1,
        ]);
        $this->started = true;
        return true;
    }

    public function csrfToken(): string
    {
        $this->start(true);
        if (empty($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf'];
    }

    public function verifyCsrf(?string $token): bool
    {
        if (!$this->start() || empty($_SESSION['csrf']) || !is_string($token)) {
            return false;
        }
        return hash_equals($_SESSION['csrf'], $token);
    }

    /** Neue Session-ID nach dem Login (Schutz vor Session Fixation). */
    public function login(int $userId, int $sessionVersion): void
    {
        $this->start(true);
        session_regenerate_id(true);
        $now = time();
        $_SESSION = [
            'uid' => $userId,
            'ver' => $sessionVersion,
            'created' => $now,
            'seen' => $now,
            'csrf' => bin2hex(random_bytes(32)),
        ];
    }

    /** @return array{uid: int, ver: int}|null */
    public function current(): ?array
    {
        if (!$this->start() || !isset($_SESSION['uid'])) {
            return null;
        }
        $now = time();
        if ($now - (int) $_SESSION['seen'] > self::IDLE || $now - (int) $_SESSION['created'] > self::ABSOLUTE) {
            $this->logout();
            return null;
        }
        if ($now - (int) $_SESSION['seen'] > self::TOUCH) {
            $_SESSION['seen'] = $now;
            // Cookie-Laufzeit gleitend verlängern
            setcookie(self::COOKIE, (string) session_id(), $this->cookieOptions(self::IDLE));
        }
        return ['uid' => (int) $_SESSION['uid'], 'ver' => (int) $_SESSION['ver']];
    }

    public function logout(): void
    {
        if (!$this->start()) {
            return;
        }
        $_SESSION = [];
        session_destroy();
        setcookie(self::COOKIE, '', $this->cookieOptions(-3600));
        $this->started = false;
    }

    /** @return array{expires: int, path: string, secure: bool, httponly: bool, samesite: string} */
    private function cookieOptions(int $lifetime): array
    {
        return [
            'expires' => time() + $lifetime,
            'path' => (string) $this->config->get('app.cookie_path', '/'),
            'secure' => (bool) $this->config->get('app.secure_cookies', true),
            'httponly' => true,
            'samesite' => 'Lax',
        ];
    }
}
