<?php
class AuthController
{
    public static function login(): void
    {
        $email = trim((string) Request::input('email', ''));
        $password = (string) Request::input('password', '');
        if ($email === '' || $password === '') {
            Response::error('Email and password are required', 422);
        }
        $admin = Database::one("SELECT * FROM admins WHERE email=? AND status='active'", [$email]);
        if (!$admin || !password_verify($password, $admin['password_hash'])) {
            Response::error('Invalid email or password', 401);
        }
        Database::run("UPDATE admins SET last_login_at=NOW() WHERE id=?", [$admin['id']]);

        $cfg = require dirname(__DIR__) . '/config.php';
        $token = Jwt::encode([
            'sub' => (int) $admin['id'],
            'email' => $admin['email'],
            'name' => $admin['name'],
            'role' => $admin['role'],
        ], $cfg['jwt_secret'], $cfg['jwt_ttl']);

        Response::ok([
            'token' => $token,
            'admin' => [
                'id' => (int) $admin['id'],
                'name' => $admin['name'],
                'email' => $admin['email'],
                'role' => $admin['role'],
            ],
        ]);
    }

    public static function me(): void
    {
        $p = Auth::requireAdmin();
        Response::ok([
            'id' => $p['sub'] ?? null,
            'name' => $p['name'] ?? null,
            'email' => $p['email'] ?? null,
            'role' => $p['role'] ?? null,
        ]);
    }
}
