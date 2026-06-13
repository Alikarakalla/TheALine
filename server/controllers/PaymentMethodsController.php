<?php
class PaymentMethodsController
{
    private static function shape(array $m): array
    {
        return [
            'id' => (int) $m['id'],
            'brand' => $m['brand'],
            'last4' => $m['last4'],
            'expMonth' => $m['exp_month'],
            'expYear' => $m['exp_year'],
            'holder' => $m['holder'],
            'isDefault' => (bool) $m['is_default'],
        ];
    }

    private static function detectBrand(string $number): string
    {
        $n = preg_replace('/\D/', '', $number);
        if (preg_match('/^4/', $n)) return 'Visa';
        if (preg_match('/^5[1-5]/', $n) || preg_match('/^2[2-7]/', $n)) return 'Mastercard';
        if (preg_match('/^3[47]/', $n)) return 'Amex';
        if (preg_match('/^6/', $n)) return 'Discover';
        return 'Card';
    }

    public static function index(): void
    {
        $cid = Auth::requireCustomer();
        $rows = Database::all("SELECT * FROM customer_payment_methods WHERE customer_id=? ORDER BY is_default DESC, id DESC", [$cid]);
        Response::ok(array_map([self::class, 'shape'], $rows));
    }

    public static function create(): void
    {
        $cid = Auth::requireCustomer();
        $b = Request::body();
        // Never persist the full PAN — only brand + last 4.
        $number = preg_replace('/\D/', '', (string) ($b['number'] ?? ''));
        $last4 = $number !== '' ? substr($number, -4) : ($b['last4'] ?? null);
        $brand = $b['brand'] ?? ($number !== '' ? self::detectBrand($number) : 'Card');
        $makeDefault = !empty($b['isDefault']) || !Database::one("SELECT id FROM customer_payment_methods WHERE customer_id=?", [$cid]);
        if ($makeDefault) Database::run("UPDATE customer_payment_methods SET is_default=0 WHERE customer_id=?", [$cid]);
        Database::run(
            "INSERT INTO customer_payment_methods (customer_id,brand,last4,exp_month,exp_year,holder,is_default) VALUES (?,?,?,?,?,?,?)",
            [$cid, $brand, $last4, $b['expMonth'] ?? null, $b['expYear'] ?? null, $b['holder'] ?? null, $makeDefault ? 1 : 0]
        );
        Response::created(self::shape(Database::one("SELECT * FROM customer_payment_methods WHERE id=?", [Database::lastId()])));
    }

    public static function update(array $p): void
    {
        $cid = Auth::requireCustomer();
        $id = (int) $p['id'];
        $m = Database::one("SELECT * FROM customer_payment_methods WHERE id=? AND customer_id=?", [$id, $cid]);
        if (!$m) Response::error('Card not found', 404);
        $b = Request::body();
        if (!empty($b['isDefault'])) {
            Database::run("UPDATE customer_payment_methods SET is_default=0 WHERE customer_id=?", [$cid]);
            Database::run("UPDATE customer_payment_methods SET is_default=1 WHERE id=?", [$id]);
        }
        $map = ['holder' => 'holder', 'expMonth' => 'exp_month', 'expYear' => 'exp_year'];
        $set = []; $args = [];
        foreach ($map as $in => $col) if (array_key_exists($in, $b)) { $set[] = "$col=?"; $args[] = $b[$in]; }
        if ($set) { $args[] = $id; Database::run("UPDATE customer_payment_methods SET " . implode(',', $set) . " WHERE id=?", $args); }
        Response::ok(self::shape(Database::one("SELECT * FROM customer_payment_methods WHERE id=?", [$id])));
    }

    public static function destroy(array $p): void
    {
        $cid = Auth::requireCustomer();
        Database::run("DELETE FROM customer_payment_methods WHERE id=? AND customer_id=?", [(int) $p['id'], $cid]);
        Response::ok(['deleted' => (int) $p['id']]);
    }
}
