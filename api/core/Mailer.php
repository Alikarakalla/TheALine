<?php
// Transactional mail helper: authenticated SMTP first (best deliverability),
// PHP mail() as the fallback. Never throws — callers must not fail their
// request because an email couldn't be sent.
class Mailer
{
    public static function send(string $to, string $subject, string $html, array $inline = []): bool
    {
        $cfg = require dirname(__DIR__) . '/config.php';
        $from = (string) ($cfg['mail_from'] ?? '');
        if ($from === '') $from = (string) ($cfg['smtp']['user'] ?? '');
        if ($from === '') {
            $host = preg_replace('/^www\.|:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? 'thealine.local'));
            $from = 'no-reply@' . $host;
        }

        if (class_exists('Smtp') && Smtp::isConfigured($cfg)) {
            try {
                Smtp::send($cfg['smtp'], $from, 'The A Line', $to, $subject, $html, $inline);
                return true;
            } catch (Throwable $e) {
                error_log('Mailer SMTP failed: ' . $e->getMessage());
            }
        }
        $headers = "MIME-Version: 1.0\r\n"
            . "Content-Type: text/html; charset=UTF-8\r\n"
            . "From: The A Line <{$from}>\r\n";
        return @mail($to, $subject, $html, $headers);
    }
}
