<?php

declare(strict_types=1);

namespace Doxie\Controllers;

use Doxie\App;
use Doxie\Auth\Passwords;
use Doxie\Http\HttpException;
use Doxie\Http\Request;
use Doxie\Http\Response;
use Doxie\Repositories\DogRepository;
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
        $this->app->mailing()->sendVerification($users->find($id));
        $this->app->session->login($id, 1);
        $users->markLogin($id);
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
        if ($user['locked_at'] !== null) {
            throw new HttpException(403, 'account_locked', 'Dieses Konto ist gesperrt. Bitte wende dich an den Support.');
        }
        $users->markLogin((int) $user['id']);
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
            $this->app->mailing()->sendPasswordReset($user);
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

    public function verifyEmail(Request $r): Response
    {
        $v = new Validator($r->body);
        $token = $v->string('token', 20, 100);
        $v->validate();
        $this->app->limiter()->check('reset-confirm', $r->ip);
        $this->app->limiter()->record('reset-confirm', $r->ip);
        if ($this->app->verifications()->consume($token) === null) {
            throw new HttpException(400, 'invalid_token', 'Der Bestätigungslink ist ungültig oder abgelaufen. In der App kannst du einen neuen anfordern.');
        }
        return Response::json(['ok' => true]);
    }

    private function sessionPayload(int $userId, int $status = 200): Response
    {
        return Response::json([
            'user' => $this->app->presentUser($userId),
            'dogs' => array_map(DogRepository::present(...), $this->app->dogs()->listForUser($userId)),
            'csrfToken' => $this->app->session->csrfToken(),
        ], $status);
    }
}
