<?php
// The A Line — backend configuration.
//
// Every setting comes from an environment variable (.env) so the SAME code runs
// unchanged on local XAMPP and on Hostinger. When a variable is missing, the
// local-dev default (XAMPP / MariaDB) is used — so locally you need no .env.
//
// In production set these in `server/.env` (or the repo-root `.env`):
//   DB_HOST DB_PORT DB_NAME DB_USER DB_PASS JWT_SECRET UPLOAD_URL CORS_ORIGINS
require_once __DIR__ . '/core/Env.php';
Env::load(__DIR__ . '/.env');           // server/.env (deploy-local overrides)
Env::load(dirname(__DIR__) . '/.env');  // repo-root .env (shared with the frontend)

return [
    'db' => [
        'host'    => Env::get('DB_HOST', '127.0.0.1'),
        'port'    => (int) Env::get('DB_PORT', '3308'),
        'name'    => Env::get('DB_NAME', 'lovebag_db'),
        'user'    => Env::get('DB_USER', 'root'),
        'pass'    => Env::get('DB_PASS', ''),
        'charset' => 'utf8mb4',
    ],
    // HS256 secret for login tokens. MUST be overridden in production via JWT_SECRET.
    'jwt_secret'    => Env::get('JWT_SECRET', 'lovebag_dev_only_change_me_secret'),
    'jwt_ttl'       => (int) Env::get('JWT_TTL', (string) (60 * 60 * 24 * 7)),
    // Uploaded files live next to the API and are served by Apache directly.
    'upload_dir'    => __DIR__ . DIRECTORY_SEPARATOR . 'uploads',
    'upload_url'    => rtrim(Env::get('UPLOAD_URL', 'http://localhost/lovebag/api/uploads'), '/'),
    'api_base'      => rtrim(Env::get('API_BASE', 'http://localhost/lovebag/api'), '/'),
    // URL path the API is mounted at. '' = auto-detect from the front controller.
    'api_base_path' => Env::get('API_BASE_PATH', ''),
    // Comma-separated browser origins allowed to call the API (CORS). '' = same-origin / open.
    'cors_origins'  => Env::get('CORS_ORIGINS', ''),
];
