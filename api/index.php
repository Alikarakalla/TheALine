<?php
// Lovebag API — front controller.
error_reporting(E_ALL & ~E_DEPRECATED);
ini_set('display_errors', '0');

require_once __DIR__ . '/core/Database.php';
require_once __DIR__ . '/core/Response.php';
require_once __DIR__ . '/core/Request.php';
require_once __DIR__ . '/core/Jwt.php';
require_once __DIR__ . '/core/Auth.php';
require_once __DIR__ . '/core/Router.php';

// ---- CORS ----
// Reflect localhost (dev) and any origins listed in CORS_ORIGINS (.env).
// With no allowlist configured the API is open (no cookies are used — auth is a
// Bearer token — so a wildcard origin is safe).
$cfg = require __DIR__ . '/config.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allow = array_filter(array_map('trim', explode(',', (string) ($cfg['cors_origins'] ?? ''))));
$isLocal = $origin && preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin);
if ($origin && ($isLocal || in_array($origin, $allow, true))) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} elseif (!$allow) {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

set_exception_handler(function (Throwable $e) {
    Response::error('Server error: ' . $e->getMessage(), 500);
});

$router = new Router();

// Health / sanity
$router->get('health', function () {
    $row = Database::one('SELECT VERSION() AS v');
    Response::ok(['status' => 'up', 'db' => $row['v'] ?? null, 'php' => PHP_VERSION]);
});

// Resource routes are registered here as controllers are added:
require_once __DIR__ . '/routes.php';
registerRoutes($router);

$router->dispatch();
