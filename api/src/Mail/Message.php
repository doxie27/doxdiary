<?php

declare(strict_types=1);

namespace Doxie\Mail;

/** Baut eine einfache UTF-8-Textnachricht (RFC 5322) ohne Header-Injection. */
final class Message
{
    public static function build(string $from, string $fromName, string $to, string $subject, string $text): string
    {
        foreach ([$from, $to] as $addr) {
            if (filter_var($addr, FILTER_VALIDATE_EMAIL) === false) {
                throw new \InvalidArgumentException('Ungültige Adresse');
            }
        }
        $domain = substr((string) strrchr($from, '@'), 1);
        $headers = [
            'Date: ' . gmdate('D, d M Y H:i:s') . ' +0000',
            'From: ' . self::encode($fromName) . " <{$from}>",
            "To: <{$to}>",
            'Subject: ' . self::encode($subject),
            'Message-ID: <' . bin2hex(random_bytes(12)) . "@{$domain}>",
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            'Auto-Submitted: auto-generated',
        ];
        return implode("\r\n", $headers) . "\r\n\r\n" . chunk_split(base64_encode($text), 76, "\r\n");
    }

    public static function encode(string $value): string
    {
        $value = str_replace(["\r", "\n"], '', $value);
        return preg_match('/[^\x20-\x7E]/', $value) ? '=?UTF-8?B?' . base64_encode($value) . '?=' : $value;
    }
}
