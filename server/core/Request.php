<?php
// Request helpers: JSON body, query params, bearer token, path.
class Request
{
    private static ?array $body = null;

    public static function body(): array
    {
        if (self::$body === null) {
            $raw = file_get_contents('php://input');
            $decoded = json_decode($raw ?: '[]', true);
            self::$body = is_array($decoded) ? $decoded : [];
        }
        return self::$body;
    }

    public static function input(string $key, $default = null)
    {
        $b = self::body();
        return $b[$key] ?? $default;
    }

    public static function query(string $key, $default = null)
    {
        return $_GET[$key] ?? $default;
    }

    public static function method(): string
    {
        return $_SERVER['REQUEST_METHOD'] ?? 'GET';
    }

    public static function bearer(): ?string
    {
        $h = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';
        if (!$h && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $h = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
        if (preg_match('/Bearer\s+(.+)/i', $h, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    /** The route path relative to the API root, e.g. "products/5". */
    public static function path(): string
    {
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
        $uri = rawurldecode($uri);
        $base = self::basePath();
        if ($base !== '' && strpos($uri, $base) === 0) {
            $uri = substr($uri, strlen($base));
        }
        return trim($uri, '/');
    }

    /**
     * The URL path the API is mounted at (no trailing slash), e.g.
     * "/lovebag/api" on XAMPP or "/api" on Hostinger. Set API_BASE_PATH in .env
     * to force it; otherwise it is auto-detected from the front controller.
     */
    private static function basePath(): string
    {
        $cfg = require dirname(__DIR__) . '/config.php';
        $explicit = trim((string) ($cfg['api_base_path'] ?? ''));
        if ($explicit !== '') {
            return '/' . trim($explicit, '/');
        }
        // Auto-detect: SCRIPT_NAME is .../index.php; its directory is the base.
        $script = $_SERVER['SCRIPT_NAME'] ?? '';
        $dir = rtrim(str_replace('\\', '/', dirname($script)), '/');
        return $dir === '' || $dir === '/' ? '' : $dir;
    }
}
