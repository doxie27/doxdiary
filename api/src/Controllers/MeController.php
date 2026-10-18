<?php

declare(strict_types=1);

namespace Doxie\Controllers;

use Doxie\App;
use Doxie\Auth\Passwords;
use Doxie\Http\HttpException;
use Doxie\Http\Request;
use Doxie\Http\Response;
use Doxie\Repositories\DiaryRepository;
use Doxie\Repositories\DogRepository;
use Doxie\Repositories\ExerciseRepository;
use Doxie\Repositories\PlanRepository;
use Doxie\Repositories\SessionRepository;
use Doxie\Repositories\UserRepository;
use Doxie\Services\AccountDeleter;
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
            'user' => $this->app->presentUser($id),
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
        return Response::json(['user' => $this->app->presentUser($id)]);
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
        $db = $this->app->db();
        $dogs = $this->app->dogs()->listForUser($id);
        $perDog = [];
        foreach ($dogs as $dog) {
            $dogId = (int) $dog['id'];
            $perDog[] = [
                'dog' => DogRepository::present($dog),
                'plans' => array_map(PlanRepository::present(...), (new PlanRepository($db))->listForDog($dogId)),
                'sessions' => array_map(SessionRepository::present(...), (new SessionRepository($db))->listForDog($dogId, '1970-01-01 00:00:00')),
                'diary' => array_map(DiaryRepository::present(...), (new DiaryRepository($db))->listForDog($dogId)),
            ];
        }
        $data = [
            'format' => 'doxie-diary/v2',
            'exportedAt' => gmdate('c'),
            'user' => UserRepository::present($this->app->users()->find($id)),
            'exercises' => array_map(ExerciseRepository::present(...), (new ExerciseRepository($db))->listForOwner($id)),
            'dogs' => $perDog,
            'note' => 'Fotos sind nicht enthalten. Sie lassen sich in der App einzeln speichern.',
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
        (new AccountDeleter($this->app))->delete($id);
        $this->app->session->logout();
        return Response::noContent();
    }

    public function resendVerification(Request $r): Response
    {
        $id = $this->app->userId();
        $user = $this->app->users()->find($id);
        if ($user['email_verified_at'] !== null) {
            return Response::json(['ok' => true, 'alreadyVerified' => true]);
        }
        $this->app->limiter()->check('verify-resend', (string) $id);
        $this->app->limiter()->record('verify-resend', (string) $id);
        $this->app->mailing()->sendVerification($user);
        return Response::json(['ok' => true]);
    }
}
