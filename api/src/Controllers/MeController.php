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
use Doxie\Support\Validator;

final class MeController
{
    public function __construct(private readonly App $app)
    {
    }

    public function show(Request $r): Response
    {
        $id = $this->app->userId();
        return Response::json([
            'user' => UserRepository::present($this->app->users()->find($id)),
            'dogs' => array_map(DogRepository::present(...), $this->app->dogs()->listForUser($id)),
            'csrfToken' => $this->app->session->csrfToken(),
        ]);
    }

    public function update(Request $r): Response
    {
        $id = $this->app->userId();
        $user = $this->app->users()->find($id);
        $v = new Validator($r->body);
        $first = $v->has('firstName') ? $v->string('firstName', 1, 60) : (string) $user['first_name'];
        $last = $v->has('lastName') ? $v->string('lastName', 0, 60) : (string) $user['last_name'];
        $v->validate();
        $this->app->users()->updateProfile($id, $first, $last);
        return Response::json(['user' => UserRepository::present($this->app->users()->find($id))]);
    }

    public function changePassword(Request $r): Response
    {
        $id = $this->app->userId();
        $v = new Validator($r->body);
        $current = $v->password('currentPassword', 1);
        $new = $v->password('newPassword');
        $v->validate();

        $this->app->limiter()->check('password', (string) $id);
        $user = $this->app->users()->find($id);
        if (!Passwords::verify($current, (string) $user['password_hash'])) {
            $this->app->limiter()->record('password', (string) $id);
            throw HttpException::validation(['currentPassword' => 'Das aktuelle Passwort ist nicht korrekt.']);
        }
        $this->app->users()->resetPassword($id, Passwords::hash($new));
        // Diese Sitzung bleibt angemeldet, alle anderen werden beendet
        $this->app->session->login($id, (int) $user['session_version'] + 1);
        return Response::json(['csrfToken' => $this->app->session->csrfToken()]);
    }

    /** Datenexport (Art. 20 DSGVO). Wird mit jeder Phase um weitere Bereiche ergänzt. */
    public function export(Request $r): Response
    {
        $id = $this->app->userId();
        $data = [
            'format' => 'doxie-diary/v1',
            'exportedAt' => gmdate('c'),
            'user' => UserRepository::present($this->app->users()->find($id)),
            'dogs' => array_map(DogRepository::present(...), $this->app->dogs()->listForUser($id)),
        ];
        $res = Response::json($data);
        return new Response(200, $res->body, $res->headers + [
            'Content-Disposition' => 'attachment; filename="doxie-diary-export-' . gmdate('Y-m-d') . '.json"',
        ]);
    }

    /** Konto löschen – erfordert das Passwort. Entfernt Hunde (falls alleinige:r Besitzer:in) und Dateien. */
    public function delete(Request $r): Response
    {
        $id = $this->app->userId();
        $v = new Validator($r->body);
        $password = $v->password('password', 1);
        $v->validate();

        $user = $this->app->users()->find($id);
        if (!Passwords::verify($password, (string) $user['password_hash'])) {
            throw HttpException::validation(['password' => 'Das Passwort ist nicht korrekt.']);
        }
        $images = $this->app->images();
        $keys = $this->app->media()->keysForOwner($id);
        $this->app->db()->transaction(function () use ($id): void {
            foreach ($this->app->dogs()->soleOwnedDogIds($id) as $dogId) {
                $this->app->dogs()->delete($dogId);
            }
            $this->app->users()->delete($id);
        });
        foreach ($keys as $key) {
            $images->delete($key);
        }
        $this->app->session->logout();
        return Response::noContent();
    }
}
