<?php
// Minimal .env loader (no external dependencies).
// Reads KEY=VALUE lines into the process so config.php can pull settings from
// the environment. Real environment variables (e.g. set in a hosting panel)
// always win over .env files, and an earlier-loaded file wins over a later one.
class Env
{
    private static array $vars = [];
    private static array $loaded = [];

    public static function load(string $path): void
    {
        if (isset(self::$loaded[$path]) || !is_file($path) || !is_readable($path)) {
            return;
        }
        self::$loaded[$path] = true;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                continue;
            }
            $pos = strpos($line, '=');
            if ($pos === false) {
                continue;
            }
            $key = trim(substr($line, 0, $pos));
            $val = trim(substr($line, $pos + 1));
            // strip one layer of surrounding quotes
            $len = strlen($val);
            if ($len >= 2) {
                $q = $val[0];
                if (($q === '"' || $q === "'") && $val[$len - 1] === $q) {
                    $val = substr($val, 1, -1);
                }
            }
            if ($key === '') {
                continue;
            }
            // don't override a real env var or a value from an earlier file
            if (getenv($key) !== false || isset(self::$vars[$key])) {
                continue;
            }
            self::$vars[$key] = $val;
        }
    }

    /** Get a value: real env var first, then loaded .env files, else default. */
    public static function get(string $key, ?string $default = null): ?string
    {
        $env = getenv($key);
        if ($env !== false && $env !== '') {
            return $env;
        }
        if (isset(self::$vars[$key]) && self::$vars[$key] !== '') {
            return self::$vars[$key];
        }
        return $default;
    }
}
