<?php

declare(strict_types=1);

namespace Doxie\Mail;

use Doxie\Support\Config;

/** Wählt den Versandweg anhand von mail.driver: smtp (Produktion), mail, log (Entwicklung/Tests). */
final class MailerFactory
{
    public static function create(Config $config): Mailer
    {
        $from = (string) $config->get('mail.from');
        $name = (string) $config->get('mail.from_name', 'Doxie Diary');
        return match ($config->get('mail.driver', 'log')) {
            'smtp' => new SmtpMailer(
                (string) $config->get('mail.host'),
                (int) $config->get('mail.port', 465),
                (string) $config->get('mail.encryption', 'ssl'),
                (string) $config->get('mail.user'),
                (string) $config->get('mail.pass'),
                $from,
                $name,
            ),
            'mail' => new NativeMailer($from, $name),
            default => new LogMailer($config->storagePath('mail'), $from),
        };
    }
}
