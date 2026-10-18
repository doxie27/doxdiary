<?php

declare(strict_types=1);

namespace Doxie\Services;

use Doxie\App;
use Doxie\Mail\Templates;
use Doxie\Support\Log;

/** Versand der System-Mails. Fehler werden protokolliert, aber nicht an Nutzer:innen durchgereicht. */
final class Mailing
{
    public function __construct(private readonly App $app)
    {
    }

    public function link(string $path, string $token): string
    {
        return rtrim((string) $this->app->config->get('app.url'), '/') . $path . '?token=' . $token;
    }

    /** @param array<string, mixed> $user */
    public function sendVerification(array $user, bool $reminder = false): bool
    {
        $token = $this->app->verifications()->create((int) $user['id'], (string) $user['email']);
        $link = $this->link('/verify-email', $token);
        [$subject, $text] = $reminder
            ? Templates::verifyReminder((string) $user['first_name'], $link, date('d.m.Y', strtotime((string) $user['created_at'] . ' UTC') + 7 * 86400))
            : Templates::verifyEmail((string) $user['first_name'], $link);
        return $this->send((string) $user['email'], $subject, $text);
    }

    /** @param array<string, mixed> $user */
    public function sendPasswordReset(array $user): bool
    {
        $token = $this->app->resets()->create((int) $user['id']);
        [$subject, $text] = Templates::passwordReset((string) $user['first_name'], $this->link('/reset/confirm', $token));
        return $this->send((string) $user['email'], $subject, $text);
    }

    private function send(string $to, string $subject, string $text): bool
    {
        try {
            $this->app->mailer()->send($to, $subject, $text);
            return true;
        } catch (\Throwable $e) {
            Log::error('mail', $e);
            return false;
        }
    }
}
