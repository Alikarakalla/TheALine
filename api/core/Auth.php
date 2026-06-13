<?php
// Admin authentication guard.
require_once __DIR__ . '/Jwt.php';
require_once __DIR__ . '/Request.php';
require_once __DIR__ . '/Response.php';

class Auth
{
    /** Returns the admin payload, or sends 401 and exits. */
    public static function requireAdmin(): array
    {
        $cfg = require dirname(__DIR__) . '/config.php';
        $token = Request::bearer();
        if (!$token) {
            Response::error('Authentication required', 401);
        }
        $payload = Jwt::decode($token, $cfg['jwt_secret']);
        if (!$payload || ($payload['role'] ?? '') === '' ) {
            Response::error('Invalid or expired session', 401);
        }
        return $payload;
    }

    /** Optional: returns admin payload or null (no exit). */
    public static function admin(): ?array
    {
        $cfg = require dirname(__DIR__) . '/config.php';
        $token = Request::bearer();
        if (!$token) {
            return null;
        }
        return Jwt::decode($token, $cfg['jwt_secret']);
    }

    /** Returns the customer id from a valid customer token, or sends 401 and exits. */
    public static function requireCustomer(): int
    {
        $p = self::customer();
        if (!$p) {
            Response::error('Please sign in to continue', 401);
        }
        return (int) $p['sub'];
    }

    /** Optional: returns the customer token payload or null (no exit). */
    public static function customer(): ?array
    {
        $cfg = require dirname(__DIR__) . '/config.php';
        $token = Request::bearer();
        if (!$token) {
            return null;
        }
        $payload = Jwt::decode($token, $cfg['jwt_secret']);
        if (!$payload || ($payload['type'] ?? '') !== 'customer' || empty($payload['sub'])) {
            return null;
        }
        return $payload;
    }
}
