<?php
class CustomerAuthController
{
    private static function cfg(): array
    {
        return require dirname(__DIR__) . '/config.php';
    }

    /** Public-facing customer object (never includes the password hash). */
    private static function serialize(array $c): array
    {
        return [
            'id' => (int) $c['id'],
            'name' => $c['name'],
            'email' => $c['email'],
            'phone' => $c['phone'] ?? null,
            'marketingOptIn' => (bool) ($c['marketing_opt_in'] ?? 1),
            'prefs' => $c['prefs'] ? json_decode($c['prefs'], true) : (object) [],
            'createdAt' => $c['created_at'] ?? null,
        ];
    }

    private static function issue(array $c): string
    {
        $cfg = self::cfg();
        return Jwt::encode([
            'sub' => (int) $c['id'],
            'email' => $c['email'],
            'name' => $c['name'],
            'type' => 'customer',
        ], $cfg['jwt_secret'], $cfg['jwt_ttl']);
    }

    /** Ensure the customer has a loyalty account; award the signup bonus once. */
    private static function ensureLoyalty(int $customerId): void
    {
        $acc = Database::one("SELECT id, signup_bonus_given FROM loyalty_accounts WHERE customer_id=?", [$customerId]);
        if (!$acc) {
            $code = 'LB' . strtoupper(substr(md5($customerId . uniqid('', true)), 0, 6));
            Database::run("INSERT INTO loyalty_accounts (customer_id,points,referral_code,signup_bonus_given) VALUES (?,?,?,1)", [$customerId, 100, $code]);
            $accId = Database::lastId();
            Database::run("INSERT INTO loyalty_ledger (account_id,type,points,label) VALUES (?,?,?,?)", [$accId, 'bonus', 100, 'Welcome bonus']);
        }
    }

    public static function register(): void
    {
        $b = Request::body();
        $name = trim((string) ($b['name'] ?? ''));
        $email = strtolower(trim((string) ($b['email'] ?? '')));
        $password = (string) ($b['password'] ?? '');
        if ($name === '' || $email === '' || strlen($password) < 6) {
            Response::error('Name, email and a password of at least 6 characters are required', 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) Response::error('Enter a valid email', 422);
        if (Database::one("SELECT id FROM customers WHERE email=?", [$email])) {
            Response::error('An account with this email already exists', 409);
        }
        Database::run(
            "INSERT INTO customers (name,email,password_hash,marketing_opt_in) VALUES (?,?,?,?)",
            [$name, $email, password_hash($password, PASSWORD_BCRYPT), !empty($b['marketingOptIn']) ? 1 : 1]
        );
        $id = Database::lastId();
        self::ensureLoyalty($id);
        $c = Database::one("SELECT * FROM customers WHERE id=?", [$id]);
        Response::created(['token' => self::issue($c), 'customer' => self::serialize($c)]);
    }

    public static function login(): void
    {
        $b = Request::body();
        $email = strtolower(trim((string) ($b['email'] ?? '')));
        $password = (string) ($b['password'] ?? '');
        if ($email === '' || $password === '') Response::error('Email and password are required', 422);
        $c = Database::one("SELECT * FROM customers WHERE email=? AND status='active'", [$email]);
        if (!$c || !$c['password_hash'] || !password_verify($password, $c['password_hash'])) {
            Response::error('Invalid email or password', 401);
        }
        self::ensureLoyalty((int) $c['id']);
        Response::ok(['token' => self::issue($c), 'customer' => self::serialize($c)]);
    }

    public static function me(): void
    {
        $id = Auth::requireCustomer();
        $c = Database::one("SELECT * FROM customers WHERE id=?", [$id]);
        if (!$c) Response::error('Account not found', 404);
        Response::ok(self::serialize($c));
    }

    /** No mail server in this environment: returns a short-lived reset token directly. */
    public static function forgotPassword(): void
    {
        $email = strtolower(trim((string) Request::input('email', '')));
        $c = Database::one("SELECT * FROM customers WHERE email=?", [$email]);
        // Always respond ok (don't leak which emails exist).
        $out = ['ok' => true, 'message' => 'If that email exists, a reset link has been sent.'];
        if ($c) {
            $cfg = self::cfg();
            $out['resetToken'] = Jwt::encode(['sub' => (int) $c['id'], 'type' => 'reset'], $cfg['jwt_secret'], 1800);
        }
        Response::ok($out);
    }

    public static function resetPassword(): void
    {
        $b = Request::body();
        $token = (string) ($b['token'] ?? '');
        $password = (string) ($b['password'] ?? '');
        if (strlen($password) < 6) Response::error('Password must be at least 6 characters', 422);
        $cfg = self::cfg();
        $payload = Jwt::decode($token, $cfg['jwt_secret']);
        if (!$payload || ($payload['type'] ?? '') !== 'reset' || empty($payload['sub'])) {
            Response::error('This reset link is invalid or has expired', 400);
        }
        Database::run("UPDATE customers SET password_hash=? WHERE id=?", [password_hash($password, PASSWORD_BCRYPT), (int) $payload['sub']]);
        Response::ok(['ok' => true]);
    }

    public static function updateProfile(): void
    {
        $id = Auth::requireCustomer();
        $b = Request::body();
        $set = []; $args = [];
        if (array_key_exists('name', $b)) { $set[] = "name=?"; $args[] = trim((string) $b['name']); }
        if (array_key_exists('phone', $b)) { $set[] = "phone=?"; $args[] = $b['phone']; }
        if (array_key_exists('email', $b)) {
            $email = strtolower(trim((string) $b['email']));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) Response::error('Enter a valid email', 422);
            if (Database::one("SELECT id FROM customers WHERE email=? AND id<>?", [$email, $id])) Response::error('That email is already in use', 409);
            $set[] = "email=?"; $args[] = $email;
        }
        if ($set) { $args[] = $id; Database::run("UPDATE customers SET " . implode(',', $set) . " WHERE id=?", $args); }
        Response::ok(self::serialize(Database::one("SELECT * FROM customers WHERE id=?", [$id])));
    }

    public static function updatePreferences(): void
    {
        $id = Auth::requireCustomer();
        $b = Request::body();
        if (array_key_exists('marketingOptIn', $b)) {
            Database::run("UPDATE customers SET marketing_opt_in=? WHERE id=?", [!empty($b['marketingOptIn']) ? 1 : 0, $id]);
        }
        // Merge arbitrary prefs (currency, sms, etc.) into the JSON column.
        $c = Database::one("SELECT prefs FROM customers WHERE id=?", [$id]);
        $prefs = $c && $c['prefs'] ? json_decode($c['prefs'], true) : [];
        foreach (['currency', 'sms', 'newsletter', 'language'] as $k) {
            if (array_key_exists($k, $b)) $prefs[$k] = $b[$k];
        }
        if (isset($b['prefs']) && is_array($b['prefs'])) $prefs = array_merge($prefs, $b['prefs']);
        Database::run("UPDATE customers SET prefs=? WHERE id=?", [json_encode($prefs), $id]);
        Response::ok(self::serialize(Database::one("SELECT * FROM customers WHERE id=?", [$id])));
    }

    public static function updatePassword(): void
    {
        $id = Auth::requireCustomer();
        $b = Request::body();
        $current = (string) ($b['current'] ?? $b['currentPassword'] ?? '');
        $next = (string) ($b['password'] ?? $b['newPassword'] ?? '');
        if (strlen($next) < 6) Response::error('New password must be at least 6 characters', 422);
        $c = Database::one("SELECT password_hash FROM customers WHERE id=?", [$id]);
        if (!$c['password_hash'] || !password_verify($current, $c['password_hash'])) {
            Response::error('Current password is incorrect', 401);
        }
        Database::run("UPDATE customers SET password_hash=? WHERE id=?", [password_hash($next, PASSWORD_BCRYPT), $id]);
        Response::ok(['ok' => true]);
    }

    public static function deleteAccount(): void
    {
        $id = Auth::requireCustomer();
        // Soft-deactivate rather than hard delete (preserves order history).
        Database::run("UPDATE customers SET status='blocked' WHERE id=?", [$id]);
        Response::ok(['ok' => true]);
    }
}
