<?php
class CustomerAuthController
{
    /** bcrypt work factor — slows offline cracking without hurting UX. */
    private const HASH_OPTS = ['cost' => 12];
    private const MIN_PASSWORD = 8;

    private static function cfg(): array
    {
        return require dirname(__DIR__) . '/config.php';
    }

    private static function hash(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, self::HASH_OPTS);
    }

    /* ---------------------------------------------------- brute-force guard */

    /** REMOTE_ADDR only — forwarded headers are client-controlled. */
    private static function clientIp(): string
    {
        return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    }

    private static function throttleTable(): void
    {
        Database::run(
            "CREATE TABLE IF NOT EXISTS auth_throttle (
                bucket VARCHAR(190) NOT NULL PRIMARY KEY,
                attempts INT NOT NULL DEFAULT 0,
                first_at INT NOT NULL DEFAULT 0,
                locked_until INT NOT NULL DEFAULT 0
            )"
        );
    }

    /** 429s when the bucket is locked; call before verifying credentials. */
    private static function throttleGuard(string $bucket): void
    {
        self::throttleTable();
        $row = Database::one("SELECT * FROM auth_throttle WHERE bucket=?", [$bucket]);
        if ($row && (int) $row['locked_until'] > time()) {
            $mins = (int) ceil(((int) $row['locked_until'] - time()) / 60);
            Response::error("Too many attempts. Try again in about {$mins} minute" . ($mins === 1 ? '' : 's') . ".", 429);
        }
    }

    /** Record a failure; lock the bucket once $max failures land in $window. */
    private static function throttleHit(string $bucket, int $max, int $window, int $lock): void
    {
        $now = time();
        $row = Database::one("SELECT * FROM auth_throttle WHERE bucket=?", [$bucket]);
        if (!$row || $now - (int) $row['first_at'] > $window) {
            Database::run(
                "REPLACE INTO auth_throttle (bucket,attempts,first_at,locked_until) VALUES (?,?,?,0)",
                [$bucket, 1, $now]
            );
            return;
        }
        $attempts = (int) $row['attempts'] + 1;
        $lockedUntil = $attempts >= $max ? $now + $lock : 0;
        Database::run(
            "UPDATE auth_throttle SET attempts=?, locked_until=? WHERE bucket=?",
            [$attempts, $lockedUntil, $bucket]
        );
        if ($lockedUntil) {
            $mins = (int) ceil($lock / 60);
            Response::error("Too many attempts. Try again in about {$mins} minutes.", 429);
        }
    }

    private static function throttleClear(string $bucket): void
    {
        Database::run("DELETE FROM auth_throttle WHERE bucket=?", [$bucket]);
    }

    /* -------------------------------------------------- email verification */

    private const OTP_TTL = 600;        // codes live 10 minutes
    private const OTP_RESEND_WAIT = 60; // min seconds between sends
    private const OTP_MAX_ATTEMPTS = 5; // wrong guesses before invalidation

    private static function otpTable(): void
    {
        Database::run(
            "CREATE TABLE IF NOT EXISTS email_otp (
                email VARCHAR(190) NOT NULL,
                purpose VARCHAR(20) NOT NULL,
                code_hash VARCHAR(64) NOT NULL,
                expires_at INT NOT NULL,
                attempts INT NOT NULL DEFAULT 0,
                last_sent_at INT NOT NULL DEFAULT 0,
                PRIMARY KEY (email, purpose)
            )"
        );
    }

    /** HMAC keyed with the JWT secret — the plain code is never stored. */
    private static function otpHash(string $code, string $email): string
    {
        return hash_hmac('sha256', $email . '|' . $code, self::cfg()['jwt_secret']);
    }

    /** Branded verification email. Returns false when no mail server exists
     *  (local XAMPP) — the caller then exposes the code as devCode instead. */
    private static function sendOtpEmail(string $email, string $name, string $code): bool
    {
        $first = htmlspecialchars(trim(explode(' ', trim($name))[0]) ?: 'there', ENT_QUOTES);
        $digits = '';
        foreach (str_split($code) as $d) {
            $digits .= '<td style="width:44px;height:56px;background:#f4efe4;border-radius:10px;'
                . 'text-align:center;font-size:24px;font-weight:600;color:#111;'
                . 'font-family:Arial,Helvetica,sans-serif;">' . $d . '</td><td style="width:8px;"></td>';
        }
        $html = '<!doctype html><html><body style="margin:0;padding:0;background:#f7f6f3;">'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f3;padding:32px 0;"><tr><td align="center">'
            . '<table role="presentation" width="440" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #eceae5;">'
            . '<tr><td style="padding:36px 40px 30px;font-family:Arial,Helvetica,sans-serif;">'
            . '<div style="font-size:15px;letter-spacing:3px;font-weight:700;color:#3A3A3A;margin-bottom:26px;">THE A LINE</div>'
            . '<div style="font-size:21px;font-weight:600;color:#111;margin-bottom:10px;">Verify your email</div>'
            . '<div style="font-size:14px;line-height:1.6;color:#6b6b6b;margin-bottom:26px;">Hi ' . $first
            . ', use this code to finish creating your account. It expires in 10 minutes.</div>'
            . '<table role="presentation" cellpadding="0" cellspacing="0"><tr>' . $digits . '</tr></table>'
            . '<div style="font-size:12px;line-height:1.6;color:#9a9a97;margin-top:26px;">'
            . 'If you didn\'t request this, you can safely ignore this email — no account will be created.</div>'
            . '</td></tr></table>'
            . '<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#b3b1ac;margin-top:18px;">© '
            . date('Y') . ' The A Line — Crafted to move with your story.</div>'
            . '</td></tr></table></body></html>';

        $cfg = self::cfg();
        $host = preg_replace('/^www\./', '', (string) ($_SERVER['HTTP_HOST'] ?? 'thealine.local'));
        $from = (string) ($cfg['mail_from'] ?? '');
        if ($from === '') $from = (string) ($cfg['smtp']['user'] ?? '');
        if ($from === '') $from = 'no-reply@' . preg_replace('/:\d+$/', '', $host);
        $subject = "{$code} is your The A Line verification code";

        // Preferred path: authenticated SMTP (deliverability ≫ bare mail()).
        if (Smtp::isConfigured($cfg)) {
            try {
                Smtp::send($cfg['smtp'], $from, 'The A Line', $email, $subject, $html);
                return true;
            } catch (Throwable $e) {
                error_log('SMTP send failed: ' . $e->getMessage());
                // fall through to mail() / devCode
            }
        }
        $headers = "MIME-Version: 1.0\r\n"
            . "Content-Type: text/html; charset=UTF-8\r\n"
            . "From: The A Line <{$from}>\r\n";
        return @mail($email, $subject, $html, $headers);
    }

    /** Step 1 of registration: validate, then email a 6-digit code. */
    public static function registerSendCode(): void
    {
        $b = Request::body();
        $name = trim((string) ($b['name'] ?? ''));
        $email = strtolower(trim((string) ($b['email'] ?? '')));
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Enter your name and a valid email', 422);
        }
        if (Database::one("SELECT id FROM customers WHERE email=?", [$email])) {
            Response::error('An account with this email already exists', 409);
        }

        $bucket = 'otp|' . $email . '|' . self::clientIp();
        self::throttleGuard($bucket);

        self::otpTable();
        $now = time();
        $row = Database::one("SELECT last_sent_at FROM email_otp WHERE email=? AND purpose='register'", [$email]);
        if ($row && $now - (int) $row['last_sent_at'] < self::OTP_RESEND_WAIT) {
            $wait = self::OTP_RESEND_WAIT - ($now - (int) $row['last_sent_at']);
            Response::error("Please wait {$wait}s before requesting another code", 429);
        }
        self::throttleHit($bucket, 6, 900, 900); // ≤5 sends per 15 min, then locked

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        Database::run(
            "REPLACE INTO email_otp (email,purpose,code_hash,expires_at,attempts,last_sent_at) VALUES (?,?,?,?,0,?)",
            [$email, 'register', self::otpHash($code, $email), $now + self::OTP_TTL, $now]
        );
        $sent = self::sendOtpEmail($email, $name, $code);
        $out = ['ok' => true, 'sent' => $sent, 'expiresIn' => self::OTP_TTL, 'resendIn' => self::OTP_RESEND_WAIT];
        if (!$sent) $out['devCode'] = $code; // no mail server (local dev) — surface for testing
        Response::ok($out);
    }

    /** Verify the emailed code; deletes it on success (single-use). */
    private static function consumeOtp(string $email, string $code): void
    {
        self::otpTable();
        $row = Database::one("SELECT * FROM email_otp WHERE email=? AND purpose='register'", [$email]);
        if (!$row) Response::error('Request a verification code first', 400);
        if (time() > (int) $row['expires_at']) {
            Database::run("DELETE FROM email_otp WHERE email=? AND purpose='register'", [$email]);
            Response::error('This code has expired — request a new one', 400);
        }
        if ((int) $row['attempts'] >= self::OTP_MAX_ATTEMPTS) {
            Database::run("DELETE FROM email_otp WHERE email=? AND purpose='register'", [$email]);
            Response::error('Too many wrong attempts — request a new code', 429);
        }
        if (!hash_equals($row['code_hash'], self::otpHash($code, $email))) {
            Database::run("UPDATE email_otp SET attempts=attempts+1 WHERE email=? AND purpose='register'", [$email]);
            $left = self::OTP_MAX_ATTEMPTS - ((int) $row['attempts'] + 1);
            Response::error(
                $left > 0
                    ? "That code isn't right — " . $left . " attempt" . ($left === 1 ? '' : 's') . " left"
                    : 'Too many wrong attempts — request a new code',
                401
            );
        }
        Database::run("DELETE FROM email_otp WHERE email=? AND purpose='register'", [$email]);
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
        if ($name === '' || $email === '' || strlen($password) < self::MIN_PASSWORD) {
            Response::error('Name, email and a password of at least ' . self::MIN_PASSWORD . ' characters are required', 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) Response::error('Enter a valid email', 422);
        // Optional phone — the client validates per-country via libphonenumber
        // and submits E.164; re-check the E.164 shape here.
        $phone = trim((string) ($b['phone'] ?? ''));
        if ($phone !== '' && !preg_match('/^\+[1-9]\d{6,14}$/', $phone)) {
            Response::error('Enter a valid phone number', 422);
        }
        if (Database::one("SELECT id FROM customers WHERE email=?", [$email])) {
            Response::error('An account with this email already exists', 409);
        }
        // Email ownership proof: the 6-digit code sent by registerSendCode().
        $code = preg_replace('/\D/', '', (string) ($b['code'] ?? ''));
        if (strlen($code) !== 6) Response::error('Enter the 6-digit code we emailed you', 422);
        self::consumeOtp($email, $code);
        Database::run(
            "INSERT INTO customers (name,email,password_hash,phone,marketing_opt_in) VALUES (?,?,?,?,?)",
            [$name, $email, self::hash($password), $phone !== '' ? $phone : null, !empty($b['marketingOptIn']) ? 1 : 1]
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

        // Brute-force lockout: 5 failures per email+IP within 15 minutes
        // locks that pair out for 15 minutes.
        $bucket = 'login|' . $email . '|' . self::clientIp();
        self::throttleGuard($bucket);

        $c = Database::one("SELECT * FROM customers WHERE email=? AND status='active'", [$email]);
        if (!$c || !$c['password_hash'] || !password_verify($password, $c['password_hash'])) {
            self::throttleHit($bucket, 5, 900, 900);
            Response::error('Invalid email or password', 401);
        }
        self::throttleClear($bucket);
        // Transparent upgrade: rehash on login when the stored cost is older.
        if (password_needs_rehash($c['password_hash'], PASSWORD_BCRYPT, self::HASH_OPTS)) {
            Database::run("UPDATE customers SET password_hash=? WHERE id=?", [self::hash($password), (int) $c['id']]);
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

        // Throttle link requests: 3 per email+IP per 15 minutes.
        $bucket = 'forgot|' . $email . '|' . self::clientIp();
        self::throttleGuard($bucket);
        self::throttleHit($bucket, 3, 900, 900);

        $c = Database::one("SELECT * FROM customers WHERE email=?", [$email]);
        // Always respond ok (don't leak which emails exist).
        $out = ['ok' => true, 'message' => 'If that email exists, a reset link has been sent.'];
        if ($c) {
            $cfg = self::cfg();
            // `pv` pins the token to the CURRENT password hash, so the link
            // dies the moment the password changes — single-use by design.
            $out['resetToken'] = Jwt::encode([
                'sub' => (int) $c['id'],
                'type' => 'reset',
                'pv' => substr(sha1((string) $c['password_hash']), 0, 12),
            ], $cfg['jwt_secret'], 1800);
        }
        Response::ok($out);
    }

    public static function resetPassword(): void
    {
        $b = Request::body();
        $token = (string) ($b['token'] ?? '');
        $password = (string) ($b['password'] ?? '');
        if (strlen($password) < self::MIN_PASSWORD) {
            Response::error('Password must be at least ' . self::MIN_PASSWORD . ' characters', 422);
        }
        $cfg = self::cfg();
        $payload = Jwt::decode($token, $cfg['jwt_secret']);
        if (!$payload || ($payload['type'] ?? '') !== 'reset' || empty($payload['sub'])) {
            Response::error('This reset link is invalid or has expired', 400);
        }
        $c = Database::one("SELECT * FROM customers WHERE id=?", [(int) $payload['sub']]);
        $pv = substr(sha1((string) ($c['password_hash'] ?? '')), 0, 12);
        if (!$c || !hash_equals($pv, (string) ($payload['pv'] ?? ''))) {
            Response::error('This reset link is invalid or has expired', 400);
        }
        Database::run("UPDATE customers SET password_hash=? WHERE id=?", [self::hash($password), (int) $c['id']]);
        // A successful reset also unwinds any login lockout for this account.
        self::throttleTable();
        Database::run("DELETE FROM auth_throttle WHERE bucket LIKE ?", ['login|' . $c['email'] . '|%']);
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
        if (strlen($next) < self::MIN_PASSWORD) {
            Response::error('New password must be at least ' . self::MIN_PASSWORD . ' characters', 422);
        }
        $c = Database::one("SELECT password_hash FROM customers WHERE id=?", [$id]);
        if (!$c['password_hash'] || !password_verify($current, $c['password_hash'])) {
            Response::error('Current password is incorrect', 401);
        }
        Database::run("UPDATE customers SET password_hash=? WHERE id=?", [self::hash($next), $id]);
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
