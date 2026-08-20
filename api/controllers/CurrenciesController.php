<?php
// Store currencies — one base (rate 1) plus any number of display currencies
// with exchange rates relative to the base. The storefront converts every
// price for display; orders are always stored in the base currency.
class CurrenciesController
{
    private static function ensure(): void
    {
        Database::run(
            "CREATE TABLE IF NOT EXISTS currencies (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(8) NOT NULL UNIQUE,
                name_en VARCHAR(80) NOT NULL,
                name_ar VARCHAR(80) NULL,
                symbol VARCHAR(12) NOT NULL,
                rate DECIMAL(28,12) NOT NULL DEFAULT 1,
                decimals TINYINT NOT NULL DEFAULT 2,
                is_base TINYINT(1) NOT NULL DEFAULT 0,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                sort_order INT NOT NULL DEFAULT 0
            )"
        );
        if (!Database::one("SELECT id FROM currencies LIMIT 1")) {
            Database::run(
                "INSERT INTO currencies (code,name_en,name_ar,symbol,rate,decimals,is_base,is_active,sort_order) VALUES
                 ('EUR','Euro','يورو','€',1,2,1,1,0),
                 ('USD','US Dollar','الدولار الأمريكي','$',1.08,2,0,1,1),
                 ('LBP','Lebanese Pound','الليرة اللبنانية','LBP',96000,0,0,1,2)"
            );
        }
    }

    private static function shape(array $c): array
    {
        return [
            'id' => (int) $c['id'],
            'code' => $c['code'],
            'nameEn' => $c['name_en'],
            'nameAr' => $c['name_ar'],
            'symbol' => $c['symbol'],
            'rate' => (float) $c['rate'],
            'decimals' => (int) $c['decimals'],
            'isBase' => (bool) $c['is_base'],
            'isActive' => (bool) $c['is_active'],
            'sortOrder' => (int) $c['sort_order'],
        ];
    }

    /** Public: active currencies for the storefront selector + conversion. */
    public static function index(): void
    {
        self::ensure();
        $rows = Database::all("SELECT * FROM currencies WHERE is_active=1 ORDER BY is_base DESC, sort_order, code");
        Response::ok(array_map([self::class, 'shape'], $rows));
    }

    public static function adminIndex(): void
    {
        Auth::requireAdmin();
        self::ensure();
        $rows = Database::all("SELECT * FROM currencies ORDER BY is_base DESC, sort_order, code");
        Response::ok(array_map([self::class, 'shape'], $rows));
    }

    private static function readBody(): array
    {
        $b = Request::body();
        $code = strtoupper(trim((string) ($b['code'] ?? '')));
        if ($code === '' || strlen($code) > 8) Response::error('Enter a currency code (e.g. USD)', 422);
        $nameEn = trim((string) ($b['nameEn'] ?? ''));
        if ($nameEn === '') Response::error('Enter the currency name', 422);
        $symbol = trim((string) ($b['symbol'] ?? ''));
        if ($symbol === '') Response::error('Enter the currency symbol', 422);
        $rate = (float) ($b['rate'] ?? 1);
        if ($rate <= 0) Response::error('The exchange rate must be greater than zero', 422);
        return [
            'code' => $code,
            'name_en' => $nameEn,
            'name_ar' => trim((string) ($b['nameAr'] ?? '')) ?: null,
            'symbol' => $symbol,
            'rate' => $rate,
            'decimals' => max(0, min(6, (int) ($b['decimals'] ?? 2))),
            'is_active' => !empty($b['isActive']) ? 1 : 0,
            'sort_order' => (int) ($b['sortOrder'] ?? 0),
        ];
    }

    public static function create(): void
    {
        Auth::requireAdmin();
        self::ensure();
        $d = self::readBody();
        if (Database::one("SELECT id FROM currencies WHERE code=?", [$d['code']])) {
            Response::error('That currency code already exists', 409);
        }
        Database::run(
            "INSERT INTO currencies (code,name_en,name_ar,symbol,rate,decimals,is_base,is_active,sort_order) VALUES (?,?,?,?,?,?,0,?,?)",
            [$d['code'], $d['name_en'], $d['name_ar'], $d['symbol'], $d['rate'], $d['decimals'], $d['is_active'], $d['sort_order']]
        );
        Response::created(self::shape(Database::one("SELECT * FROM currencies WHERE id=?", [Database::lastId()])));
    }

    public static function update(array $p): void
    {
        Auth::requireAdmin();
        self::ensure();
        $id = (int) $p['id'];
        $cur = Database::one("SELECT * FROM currencies WHERE id=?", [$id]);
        if (!$cur) Response::error('Currency not found', 404);
        $d = self::readBody();
        if (Database::one("SELECT id FROM currencies WHERE code=? AND id<>?", [$d['code'], $id])) {
            Response::error('That currency code already exists', 409);
        }
        // The base currency's rate is 1 by definition.
        if ($cur['is_base']) $d['rate'] = 1;
        Database::run(
            "UPDATE currencies SET code=?, name_en=?, name_ar=?, symbol=?, rate=?, decimals=?, is_active=?, sort_order=? WHERE id=?",
            [$d['code'], $d['name_en'], $d['name_ar'], $d['symbol'], $d['rate'], $d['decimals'], $cur['is_base'] ? 1 : $d['is_active'], $d['sort_order'], $id]
        );
        Response::ok(self::shape(Database::one("SELECT * FROM currencies WHERE id=?", [$id])));
    }

    public static function destroy(array $p): void
    {
        Auth::requireAdmin();
        self::ensure();
        $id = (int) $p['id'];
        $cur = Database::one("SELECT * FROM currencies WHERE id=?", [$id]);
        if (!$cur) Response::error('Currency not found', 404);
        if ($cur['is_base']) Response::error('The base currency cannot be deleted — set another base first', 422);
        Database::run("DELETE FROM currencies WHERE id=?", [$id]);
        Response::ok(['deleted' => $id]);
    }

    /** Make this currency the base and re-express every rate relative to it. */
    public static function setBase(array $p): void
    {
        Auth::requireAdmin();
        self::ensure();
        $id = (int) $p['id'];
        $cur = Database::one("SELECT * FROM currencies WHERE id=?", [$id]);
        if (!$cur) Response::error('Currency not found', 404);
        $baseRate = (float) $cur['rate'];
        if ($baseRate <= 0) Response::error('Set a valid rate before making this the base', 422);
        // rate_new = rate_old / rate_of_new_base — the new base lands exactly on 1.
        Database::run("UPDATE currencies SET rate = rate / ?", [$baseRate]);
        Database::run("UPDATE currencies SET is_base=0");
        Database::run("UPDATE currencies SET is_base=1, rate=1, is_active=1 WHERE id=?", [$id]);
        $rows = Database::all("SELECT * FROM currencies ORDER BY is_base DESC, sort_order, code");
        Response::ok(array_map([self::class, 'shape'], $rows));
    }
}
