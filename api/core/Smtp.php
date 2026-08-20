<?php
// Minimal dependency-free SMTP client (implicit SSL or STARTTLS, AUTH LOGIN)
// for transactional mail — one connection per message, which is fine at OTP
// volume. Configured via the smtp block in config.php (.env SMTP_* vars).
class Smtp
{
    /** @var resource */
    private $fp;

    public static function isConfigured(array $cfg): bool
    {
        $s = $cfg['smtp'] ?? [];
        return !empty($s['host']) && !empty($s['user']) && !empty($s['pass']);
    }

    /** Connect + authenticate only (no mail sent) — credential check. */
    public static function verify(array $smtp): void
    {
        $c = self::open($smtp);
        try {
            $c->cmd('QUIT', 221);
        } finally {
            fclose($c->fp);
        }
    }

    /**
     * Send one HTML email. Optional $inline images are embedded as
     * multipart/related parts referenced from the HTML via cid: URLs —
     * each entry: ['cid' => 'brandlogo', 'path' => '/abs/file.png',
     * 'type' => 'image/png']. Throws RuntimeException on any SMTP failure.
     */
    public static function send(
        array $smtp,
        string $fromEmail,
        string $fromName,
        string $to,
        string $subject,
        string $html,
        array $inline = []
    ): void {
        $c = self::open($smtp);
        try {
            $c->cmd("MAIL FROM:<{$fromEmail}>", 250);
            $c->cmd("RCPT TO:<{$to}>", 250);
            $c->cmd('DATA', 354);
            $domain = substr(strrchr($fromEmail, '@') ?: '@local', 1);
            $headers = [
                'Date: ' . date('r'),
                'From: ' . self::header($fromName) . " <{$fromEmail}>",
                "To: <{$to}>",
                'Subject: ' . self::header($subject),
                'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $domain . '>',
                'MIME-Version: 1.0',
            ];
            $htmlB64 = rtrim(chunk_split(base64_encode($html), 76, "\r\n"), "\r\n");

            if (!$inline) {
                $headers[] = 'Content-Type: text/html; charset=UTF-8';
                // base64 body sidesteps line-length and dot-stuffing rules
                $headers[] = 'Content-Transfer-Encoding: base64';
                $c->write(implode("\r\n", $headers) . "\r\n\r\n" . $htmlB64 . "\r\n.");
            } else {
                $b = 'PART_' . bin2hex(random_bytes(8));
                $headers[] = "Content-Type: multipart/related; boundary=\"{$b}\"";
                $parts = "--{$b}\r\n"
                    . "Content-Type: text/html; charset=UTF-8\r\n"
                    . "Content-Transfer-Encoding: base64\r\n\r\n"
                    . $htmlB64 . "\r\n";
                foreach ($inline as $img) {
                    $data = @file_get_contents((string) ($img['path'] ?? ''));
                    if ($data === false) continue;
                    $name = basename((string) $img['path']);
                    $parts .= "--{$b}\r\n"
                        . 'Content-Type: ' . ($img['type'] ?? 'image/png') . "; name=\"{$name}\"\r\n"
                        . "Content-Transfer-Encoding: base64\r\n"
                        . 'Content-ID: <' . $img['cid'] . ">\r\n"
                        . "Content-Disposition: inline; filename=\"{$name}\"\r\n\r\n"
                        . rtrim(chunk_split(base64_encode($data), 76, "\r\n"), "\r\n") . "\r\n";
                }
                $parts .= "--{$b}--";
                $c->write(implode("\r\n", $headers) . "\r\n\r\n" . $parts . "\r\n.");
            }
            $c->expect(250);
            $c->cmd('QUIT', 221);
        } finally {
            fclose($c->fp);
        }
    }

    /** Open a connection, negotiate TLS as configured, authenticate. */
    private static function open(array $smtp): self
    {
        $host = (string) $smtp['host'];
        $port = (int) ($smtp['port'] ?? 465);
        $secure = strtolower((string) ($smtp['secure'] ?? 'ssl')); // ssl | tls | none
        $timeout = 12;

        $remote = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
        $fp = @stream_socket_client($remote, $errno, $errstr, $timeout);
        if (!$fp) {
            throw new RuntimeException("SMTP connect to {$host}:{$port} failed: {$errstr}");
        }
        stream_set_timeout($fp, $timeout);

        $c = new self();
        $c->fp = $fp;
        $c->expect(220);
        $c->cmd('EHLO ' . (gethostname() ?: 'localhost'), 250);
        if ($secure === 'tls') {
            $c->cmd('STARTTLS', 220);
            if (!@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                fclose($fp);
                throw new RuntimeException('SMTP STARTTLS negotiation failed');
            }
            $c->cmd('EHLO ' . (gethostname() ?: 'localhost'), 250);
        }
        $c->cmd('AUTH LOGIN', 334);
        $c->cmd(base64_encode((string) $smtp['user']), 334);
        $c->cmd(base64_encode((string) $smtp['pass']), 235);
        return $c;
    }

    private function cmd(string $line, int $expect): void
    {
        $this->write($line);
        $this->expect($expect);
    }

    private function write(string $line): void
    {
        if (fwrite($this->fp, $line . "\r\n") === false) {
            throw new RuntimeException('SMTP write failed');
        }
    }

    /** Read a (possibly multi-line) reply and require the given status code. */
    private function expect(int $code): void
    {
        $reply = '';
        while (($line = fgets($this->fp, 1024)) !== false) {
            $reply .= $line;
            if (strlen($line) < 4 || $line[3] !== '-') {
                break; // last line of the reply ("250 " vs "250-")
            }
        }
        if ((int) substr($reply, 0, 3) !== $code) {
            // Auth errors etc. — surface the server's words, minus CRLFs.
            throw new RuntimeException('SMTP: ' . trim(preg_replace('/\s+/', ' ', $reply) ?? ''));
        }
    }

    /** RFC 2047 header encoding when non-ASCII is present. */
    private static function header(string $s): string
    {
        return preg_match('/[^\x20-\x7e]/', $s)
            ? '=?UTF-8?B?' . base64_encode($s) . '?='
            : $s;
    }
}
