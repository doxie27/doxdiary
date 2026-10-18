<?php

declare(strict_types=1);

namespace Doxie\Mail;

/**
 * Schlanker SMTP-Client (SSL auf 465 oder STARTTLS auf 587, AUTH LOGIN).
 * Für STRATO: smtp.strato.de, Port 465, Zugangsdaten eines Postfachs.
 */
final class SmtpMailer implements Mailer
{
    /** @var resource|null */
    private $socket = null;

    public function __construct(
        private readonly string $host,
        private readonly int $port,
        private readonly string $encryption,
        private readonly string $user,
        private readonly string $pass,
        private readonly string $from,
        private readonly string $fromName,
    ) {
    }

    public function send(string $to, string $subject, string $text): void
    {
        $data = Message::build($this->from, $this->fromName, $to, $subject, $text);
        $remote = ($this->encryption === 'ssl' ? 'ssl://' : 'tcp://') . $this->host . ':' . $this->port;
        $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
        $socket = stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
        if ($socket === false) {
            throw new \RuntimeException("SMTP-Verbindung fehlgeschlagen ({$errno})");
        }
        $this->socket = $socket;
        stream_set_timeout($socket, 15);
        try {
            $this->expect(220);
            $ehlo = 'EHLO ' . (gethostname() ?: 'localhost');
            $this->command($ehlo, 250);
            if ($this->encryption === 'tls') {
                $this->command('STARTTLS', 220);
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) {
                    throw new \RuntimeException('STARTTLS fehlgeschlagen');
                }
                $this->command($ehlo, 250);
            }
            $this->command('AUTH LOGIN', 334);
            $this->command(base64_encode($this->user), 334);
            $this->command(base64_encode($this->pass), 235);
            $this->command("MAIL FROM:<{$this->from}>", 250);
            $this->command("RCPT TO:<{$to}>", 250);
            $this->command('DATA', 354);
            // Dot-Stuffing nach RFC 5321
            $this->command(preg_replace('/^\./m', '..', $data) . "\r\n.", 250);
            $this->command('QUIT', 221);
        } finally {
            fclose($socket);
            $this->socket = null;
        }
    }

    private function command(string $line, int $expected): void
    {
        fwrite($this->socket, $line . "\r\n");
        $this->expect($expected);
    }

    private function expect(int $code): void
    {
        $response = '';
        while (($line = fgets($this->socket, 515)) !== false) {
            $response .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') {
                break;
            }
        }
        if ((int) substr($response, 0, 3) !== $code) {
            // Antwort des Servers nicht protokollieren – könnte Adressen enthalten
            throw new \RuntimeException("SMTP: erwartet {$code}, erhalten " . substr($response, 0, 3));
        }
    }
}
