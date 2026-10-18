<?php

declare(strict_types=1);

namespace Doxie\Mail;

/** Fallback über PHP mail(). Zustellbarkeit meist schlechter als SMTP. */
final class NativeMailer implements Mailer
{
    public function __construct(private readonly string $from, private readonly string $fromName)
    {
    }

    public function send(string $to, string $subject, string $text): void
    {
        $raw = Message::build($this->from, $this->fromName, $to, $subject, $text);
        [$head, $body] = explode("\r\n\r\n", $raw, 2);
        $headers = array_filter(explode("\r\n", $head), static fn ($h) => !str_starts_with($h, 'To:') && !str_starts_with($h, 'Subject:'));
        if (!mail($to, Message::encode($subject), $body, implode("\r\n", $headers), '-f' . $this->from)) {
            throw new \RuntimeException('mail() fehlgeschlagen');
        }
    }
}
