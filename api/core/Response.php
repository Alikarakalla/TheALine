<?php
// JSON response envelope: { ok, data } | { ok:false, error }.
class Response
{
    public static function json($data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function ok($data = null, int $status = 200): void
    {
        self::json(['ok' => true, 'data' => $data], $status);
    }

    public static function created($data = null): void
    {
        self::ok($data, 201);
    }

    public static function error(string $message, int $status = 400, $details = null): void
    {
        $body = ['ok' => false, 'error' => $message];
        if ($details !== null) {
            $body['details'] = $details;
        }
        self::json($body, $status);
    }
}
