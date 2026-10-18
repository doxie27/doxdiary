<?php

declare(strict_types=1);

namespace Doxie\Mail;

/**
 * Nur für Entwicklung und Tests: legt Mails als .eml-Datei ab, statt sie zu senden.
 * Enthält Adressen und Links – niemals in Produktion verwenden.
 */
final class LogMailer implements Mailer
{
    public function __construct(private readonly string $dir, private readonly string $from)
    {
    }

    public function send(string $to, string $subject, string $text): void
    {
        if (!is_dir($this->dir)) {
            mkdir($this->dir, 0700, true);
        }
        $file = sprintf('%s/%s-%s.eml', $this->dir, gmdate('Ymd-His'), bin2hex(random_bytes(4)));
        file_put_contents($file, "To: {$to}\nSubject: {$subject}\n\n{$text}\n");
    }
}
