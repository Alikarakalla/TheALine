<?php
class AddressesController
{
    /** Delivery-pin columns (map-picked coordinates); idempotent. */
    private static function ensureColumns(): void
    {
        Database::run("ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS lat DECIMAL(10,7) NULL");
        Database::run("ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS lng DECIMAL(10,7) NULL");
    }

    /** Coordinate from the request body: numeric within range, else null. */
    private static function coord($v, float $max): ?float
    {
        if ($v === null || $v === '' || !is_numeric($v)) return null;
        $f = (float) $v;
        return abs($f) <= $max ? $f : null;
    }

    private static function shape(array $a): array
    {
        return [
            'id' => (int) $a['id'],
            'label' => $a['label'],
            'fullName' => $a['full_name'],
            'line1' => $a['line1'],
            'line2' => $a['line2'],
            'city' => $a['city'],
            'postcode' => $a['postcode'],
            'country' => $a['country'],
            'phone' => $a['phone'],
            'isDefault' => (bool) $a['is_default'],
            'lat' => isset($a['lat']) && $a['lat'] !== null ? (float) $a['lat'] : null,
            'lng' => isset($a['lng']) && $a['lng'] !== null ? (float) $a['lng'] : null,
        ];
    }

    public static function index(): void
    {
        $cid = Auth::requireCustomer();
        self::ensureColumns();
        $rows = Database::all("SELECT * FROM customer_addresses WHERE customer_id=? ORDER BY is_default DESC, id DESC", [$cid]);
        Response::ok(array_map([self::class, 'shape'], $rows));
    }

    public static function create(): void
    {
        $cid = Auth::requireCustomer();
        self::ensureColumns();
        $b = Request::body();
        $makeDefault = !empty($b['isDefault']) || !Database::one("SELECT id FROM customer_addresses WHERE customer_id=?", [$cid]);
        if ($makeDefault) Database::run("UPDATE customer_addresses SET is_default=0 WHERE customer_id=?", [$cid]);
        Database::run(
            "INSERT INTO customer_addresses (customer_id,label,full_name,line1,line2,city,postcode,country,phone,is_default,lat,lng) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                $cid, $b['label'] ?? null, $b['fullName'] ?? null, $b['line1'] ?? null, $b['line2'] ?? null,
                $b['city'] ?? null, $b['postcode'] ?? null, $b['country'] ?? null, $b['phone'] ?? null,
                $makeDefault ? 1 : 0, self::coord($b['lat'] ?? null, 90), self::coord($b['lng'] ?? null, 180),
            ]
        );
        Response::created(self::shape(Database::one("SELECT * FROM customer_addresses WHERE id=?", [Database::lastId()])));
    }

    public static function update(array $p): void
    {
        $cid = Auth::requireCustomer();
        $id = (int) $p['id'];
        $a = Database::one("SELECT * FROM customer_addresses WHERE id=? AND customer_id=?", [$id, $cid]);
        if (!$a) Response::error('Address not found', 404);
        self::ensureColumns();
        $b = Request::body();
        $map = ['label' => 'label', 'fullName' => 'full_name', 'line1' => 'line1', 'line2' => 'line2', 'city' => 'city', 'postcode' => 'postcode', 'country' => 'country', 'phone' => 'phone'];
        $set = []; $args = [];
        foreach ($map as $in => $col) if (array_key_exists($in, $b)) { $set[] = "$col=?"; $args[] = $b[$in]; }
        if (array_key_exists('lat', $b)) { $set[] = "lat=?"; $args[] = self::coord($b['lat'], 90); }
        if (array_key_exists('lng', $b)) { $set[] = "lng=?"; $args[] = self::coord($b['lng'], 180); }
        if ($set) { $args[] = $id; Database::run("UPDATE customer_addresses SET " . implode(',', $set) . " WHERE id=?", $args); }
        if (!empty($b['isDefault'])) {
            Database::run("UPDATE customer_addresses SET is_default=0 WHERE customer_id=?", [$cid]);
            Database::run("UPDATE customer_addresses SET is_default=1 WHERE id=?", [$id]);
        }
        Response::ok(self::shape(Database::one("SELECT * FROM customer_addresses WHERE id=?", [$id])));
    }

    public static function destroy(array $p): void
    {
        $cid = Auth::requireCustomer();
        Database::run("DELETE FROM customer_addresses WHERE id=? AND customer_id=?", [(int) $p['id'], $cid]);
        Response::ok(['deleted' => (int) $p['id']]);
    }
}
