<?php

declare(strict_types=1);

namespace Doxie;

use Doxie\Auth\DogAccess;
use Doxie\Auth\RateLimiter;
use Doxie\Auth\Session;
use Doxie\Controllers\AuthController;
use Doxie\Controllers\DogController;
use Doxie\Controllers\MeController;
use Doxie\Controllers\MediaController;
use Doxie\Http\HttpException;
use Doxie\Http\Request;
use Doxie\Http\Response;
use Doxie\Http\Router;
use Doxie\Mail\Mailer;
use Doxie\Mail\MailerFactory;
use Doxie\Media\ImageStore;
use Doxie\Controllers\AdminController;
use Doxie\Repositories\DogRepository;
use Doxie\Repositories\EmailVerificationRepository;
use Doxie\Repositories\MediaRepository;
use Doxie\Repositories\PasswordResetRepository;
use Doxie\Repositories\UserRepository;
use Doxie\Support\Config;
use Doxie\Support\Db;
use Doxie\Support\Log;
use Doxie\Support\Maintenance;
use Doxie\Support\Migrator;
use Doxie\Services\Mailing;

/**
 * Anwendungskern: verdrahtet Dienste, Routen und den Ablauf jeder Anfrage
 * (Origin-/CSRF-Prüfung → Authentifizierung → Controller → JSON-Antwort).
 */
final class App
{
    public readonly Session $session;
    private ?Db $db = null;
    private ?int $userId = null;

    public function __construct(public readonly Config $config)
    {
        $this->session = new Session($config);
    }

    public function db(): Db
    {
        return $this->db ??= Db::fromConfig($this->config);
    }

    public function users(): UserRepository { return new UserRepository($this->db()); }
    public function dogs(): DogRepository { return new DogRepository($this->db()); }
    public function media(): MediaRepository { return new MediaRepository($this->db()); }
    public function resets(): PasswordResetRepository { return new PasswordResetRepository($this->db()); }
    public function verifications(): EmailVerificationRepository { return new EmailVerificationRepository($this->db()); }
    public function mailing(): Mailing { return new Mailing($this); }
    public function access(): DogAccess { return new DogAccess($this->db()); }
    public function limiter(): RateLimiter { return new RateLimiter($this->db(), $this->config->secret(), (array) $this->config->get('limits', [])); }
    public function mailer(): Mailer { return MailerFactory::create($this->config); }
    public function images(): ImageStore { return new ImageStore($this->config->storagePath('uploads')); }

    /**
     * Admin nur, wenn die E-Mail in config.php unter admin.emails steht UND bestätigt ist.
     * @param array<string, mixed> $user
     */
    public function isAdmin(array $user): bool
    {
        $emails = array_map('mb_strtolower', (array) $this->config->get('admin.emails', []));
        return $user['email_verified_at'] !== null && in_array(mb_strtolower((string) $user['email']), $emails, true);
    }

    /** JSON des Benutzers inkl. Admin-Kennzeichen. */
    public function presentUser(int $id): array
    {
        $user = $this->users()->find($id) ?? throw HttpException::unauthenticated();
        return UserRepository::present($user, $this->isAdmin($user));
    }

    /** ID des angemeldeten Benutzers – nur in geschützten Routen aufrufen. */
    public function userId(): int
    {
        return $this->userId ?? throw HttpException::unauthenticated();
    }

    public function routes(): Router
    {
        $r = new Router();
        $auth = new AuthController($this);
        $me = new MeController($this);
        $dogs = new DogController($this);
        $media = new MediaController($this);

        $r->add('GET', '/health', $this->health(...), auth: false);
        $r->add('GET', '/auth/csrf', $auth->csrf(...), auth: false);
        $r->add('POST', '/auth/register', $auth->register(...), auth: false);
        $r->add('POST', '/auth/login', $auth->login(...), auth: false);
        $r->add('POST', '/auth/logout', $auth->logout(...), auth: false);
        $r->add('POST', '/auth/password/forgot', $auth->forgot(...), auth: false);
        $r->add('POST', '/auth/password/reset', $auth->reset(...), auth: false);
        $r->add('POST', '/auth/email/verify', $auth->verifyEmail(...), auth: false);
        $r->add('GET', '/meta', fn () => Response::json(['legal' => [
            'imprintUrl' => $this->config->get('legal.imprint_url'),
            'privacyUrl' => $this->config->get('legal.privacy_url'),
        ]]), auth: false);

        $r->add('GET', '/me', $me->show(...));
        $r->add('PATCH', '/me', $me->update(...));
        $r->add('POST', '/me/password', $me->changePassword(...));
        $r->add('GET', '/me/export', $me->export(...));
        $r->add('POST', '/me/delete', $me->delete(...));
        $r->add('POST', '/me/email/resend', $me->resendVerification(...));

        $admin = new AdminController($this);
        $r->add('GET', '/admin/status', $admin->status(...));
        $r->add('POST', '/admin/backup', $admin->backup(...));
        $r->add('GET', '/admin/backup', $admin->backupWithToken(...), auth: false);
        $r->add('GET', '/admin/users', $admin->users(...));
        $r->add('POST', '/admin/users/{id}/lock', $admin->lock(...));
        $r->add('POST', '/admin/users/{id}/unlock', $admin->unlock(...));
        $r->add('POST', '/admin/users/{id}/reset', $admin->sendReset(...));
        $r->add('POST', '/admin/users/{id}/delete', $admin->deleteUser(...));
        $r->add('GET', '/admin/audit', $admin->audit(...));

        $r->add('GET', '/dogs', $dogs->index(...));
        $r->add('POST', '/dogs', $dogs->store(...));
        $r->add('GET', '/dogs/{id}', $dogs->show(...));
        $r->add('PATCH', '/dogs/{id}', $dogs->update(...));
        $r->add('DELETE', '/dogs/{id}', $dogs->destroy(...));
        $r->add('POST', '/dogs/{id}/photo', $dogs->uploadPhoto(...));
        $r->add('DELETE', '/dogs/{id}/photo', $dogs->deletePhoto(...));

        $r->add('GET', '/media/{id}', $media->show(...));
        return $r;
    }

    /** Einfacher Betriebscheck: läuft PHP, ist die Datenbank erreichbar und migriert? */
    private function health(Request $r): Response
    {
        try {
            $this->db()->one('SELECT 1 FROM users LIMIT 1');
            return Response::json(['ok' => true, 'db' => true]);
        } catch (\Throwable $e) {
            Log::error('health', $e);
            return Response::json(['ok' => false, 'db' => false], 503);
        }
    }

    public function handle(): Response
    {
        $requestId = bin2hex(random_bytes(6));
        try {
            if ($this->config->get('app.auto_migrate', true)) {
                try {
                    Migrator::ensureCurrent($this->config, $this->db(...));
                } catch (\Throwable $e) {
                    // z. B. falsches DB-Passwort: protokollieren, /health meldet dann "db": false
                    Log::error($requestId, $e);
                }
            }
            $request = Request::fromGlobals();
            [$handler, $needsAuth] = $this->routes()->match($request);

            if ($request->isStateChanging()) {
                $this->checkOrigin($request);
                if (!$this->session->verifyCsrf($request->header('x-csrf-token'))) {
                    throw new HttpException(419, 'csrf_failed', 'Deine Sitzung ist abgelaufen. Bitte versuche es erneut.');
                }
            }
            if ($needsAuth) {
                $this->authenticate();
            }
            return $handler($request);
        } catch (HttpException $e) {
            return Response::error($e);
        } catch (\Throwable $e) {
            Log::error($requestId, $e);
            $message = $this->config->isProduction() ? 'Ein unerwarteter Fehler ist aufgetreten.' : Log::redact($e->getMessage());
            return Response::json(['error' => ['code' => 'server_error', 'message' => $message, 'requestId' => $requestId]], 500);
        }
    }

    private function authenticate(): void
    {
        $current = $this->session->current() ?? throw HttpException::unauthenticated();
        $user = $this->users()->find($current['uid']);
        // session_version ändert sich bei Passwort-Reset → alle anderen Sitzungen ungültig
        if ($user === null || (int) $user['session_version'] !== $current['ver']) {
            $this->session->logout();
            throw HttpException::unauthenticated();
        }
        if ($user['locked_at'] !== null) {
            $this->session->logout();
            throw new HttpException(403, 'account_locked', 'Dieses Konto ist gesperrt. Bitte wende dich an den Support.');
        }
        $this->userId = (int) $user['id'];
    }

    /**
     * Wartung nach dem Senden der Antwort (STRATO bietet keine Cronjobs):
     * höchstens einmal pro Stunde, unter Dateisperre.
     */
    public function afterResponse(): void
    {
        if (!$this->config->get('app.maintenance', true)) {
            return;
        }
        try {
            (new Maintenance($this))->runIfDue();
        } catch (\Throwable $e) {
            Log::error('maintenance', $e);
        }
    }

    /** Zusätzlicher Schutz zu CSRF-Tokens: fremde Origins lehnen wir ab. */
    private function checkOrigin(Request $request): void
    {
        $origin = $request->header('origin');
        if ($origin === null || $origin === '') {
            return;
        }
        $allowed = array_merge([(string) $this->config->get('app.url')], (array) $this->config->get('app.allowed_origins', []));
        $norm = static fn (string $u) => strtolower(rtrim((string) preg_replace('#^(https?://[^/]+).*$#i', '$1', $u), '/'));
        foreach ($allowed as $a) {
            if ($a !== '' && $norm($a) === $norm($origin)) {
                return;
            }
        }
        throw HttpException::forbidden('Anfrage von unbekannter Herkunft.');
    }
}
