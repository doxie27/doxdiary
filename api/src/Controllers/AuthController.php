<?php

declare(strict_types=1);

namespace Doxie\Controllers;

use Doxie\App;
use Doxie\Auth\Passwords;
use Doxie\Http\HttpException;
use Doxie\Http\Request;
use Doxie\Http\Response;
use Doxie\Repositories\DogRepository;
use Doxie\Repositories\UserRepository;
use Doxie\Support\Log;
use Doxie\Support\Validator;

final class AuthController
{
    public function __construct(private readonly App $app)
    {
    }

    public function csrf(Request $r): Response
    {
        return Response::json(['csrfToken' => $this->app->session->csrfToken()]);
    }

    public function register(Request $r): Response
    {
        $limiter = $this->app->limiter();
        $limiter->check('register', $r->ip);

        $v = new Validator($r->body);
        $firstName = $v->string('firstName', 1, 60);
        $email = $v->email('email');
        $password = $v->password('password');
        $v->accepted('privacyAccepted', 'Bitte bestätige die Datenschutzhinweise.');
        $v->validate();

        $limiter->record('register', $r->ip);
        $users = $this->app->users();
        if ($users->findByEmail($email) !== null) {
            throw new HttpException(409, 'email_taken', 'Für diese E-Mail-Adresse gibt es bereits ein Konto. Melde dich an oder setze dein Passwort zurück.', ['email' => 'Bereits registriert.']);
        }
        $id = $users->create($email, Passwords::hash($password), $firstName);
        $this->app->session->login($id, 1);
        return $this->sessionPayload($id, 201);
    }

    public function login(Request $r): Response
    {
        $v = new Validator($r->body);
        $email = $v->email('email');
        $password = $v->password('password', 1);
        $v->validate();

        $limiter = $this->app->limiter();
        $limiter->check('login', $email);
        $limiter->check('login-ip', $r->ip);

        $users = $this->app->users();
        $user = $users->findByEmail($email);
        if ($user === null) {
            Passwords::dummyVerify($password);
        }
        if ($user === null || !Passwords::verify($password, (string) $user['password_hash'])) {
            $limiter->record('login', $email);
            $limiter->record('login-ip', $r->ip);
            throw new HttpException(401, 'invalid_credentials', 'E-Mail-Adresse oder Passwort ist nicht korrekt.');
        }
        $limiter->clear('login', $email);
        if (Passwords::needsRehash((string) $user['password_hash'])) {
            $users->updatePasswordHash((int) $user['id'], Passwords::hash($password));
        }
        $this->app->session->login((int) $user['id'], (int) $user['session_version']);
        return $this->sessionPayload((int) $user['id']);
    }

    public function logout(Request $r): Response
    {
        $this->app->session->logout();
        return Response::noContent();
    }

    /** Antwortet immer gleich, damit nicht erkennbar ist, ob ein Konto existiert. */
    public function forgot(Request $r): Response
    {
        $v = new Validator($r->body);
        $email = $v->email('email');
        $v->validate();

        $limiter = $this->app->limiter();
        $limiter->check('reset-ip', $r->ip);
        $limiter->record('reset-ip', $r->ip);

        $user = $this->app->users()->findByEmail($email);
        $quiet = true;
        try {
            $limiter->check('reset', $email);
        } catch (HttpException) {
            $quiet = false; // still schlucken: keine Mail, gleiche Antwort
        }
        if ($user !== null && $quiet) {
            $limiter->record('reset', $email);
            $token = $this->app->resets()->create((int) $user['id']);
            $link = rtrim((string) $this->app->config->get('app.url'), '/') . '/reset/confirm?token=' . $token;
            try {
                $this->app->mailer()->send($email, 'Dein Link zum Zurücksetzen des Passworts', $this->resetMail((string) $user['first_name'], $link));
            } catch (\Throwable $e) {
                Log::error('mail', $e);
            }
        }
        return Response::json(['ok' => true], 202);
    }

    public function reset(Request $r): Response
    {
        $v = new Validator($r->body);
        $token = $v->string('token', 20, 100);
        $password = $v->password('password');
        $v->validate();

        $this->app->limiter()->check('reset-confirm', $r->ip);
        $this->app->limiter()->record('reset-confirm', $r->ip);

        $userId = $this->app->resets()->consume($token);
        if ($userId === null) {
            throw new HttpException(400, 'invalid_token', 'Der Link ist ungültig oder abgelaufen. Fordere bitte einen neuen an.');
        }
        $this->app->users()->resetPassword($userId, Passwords::hash($password));
        return Response::noContent();
    }

    private function sessionPayload(int $userId, int $status = 200): Response
    {
        $user = $this->app->users()->find($userId);
        return Response::json([
            'user' => UserRepository::present($user),
            'dogs' => array_map(DogRepository::present(...), $this->app->dogs()->listForUser($userId)),
            'csrfToken' => $this->app->session->csrfToken(),
        ], $status);
    }

    private function resetMail(string $firstName, string $link): string
    {
        return "Hallo {$firstName},\n\n"
            . "du hast angefordert, dein Passwort für Doxie Diary zurückzusetzen.\n"
            . "Über diesen Link kannst du ein neues Passwort festlegen (gültig für 60 Minuten):\n\n"
            . "{$link}\n\n"
            . "Falls du das nicht warst, kannst du diese E-Mail ignorieren – dein Passwort bleibt unverändert.\n\n"
            . "Dein Doxie-Diary-Team\n";
    }
}
