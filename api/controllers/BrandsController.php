<?php
class BrandsController
{
    private static function shape(array $b): array
    {
        return [
            'id' => (int) $b['id'], 'name' => $b['name'], 'slug' => $b['slug'],
            'description' => $b['description'], 'logo' => $b['logo_url'],
            'status' => $b['status'], 'position' => (int) $b['position'],
            'productCount' => (int) ($b['product_count'] ?? 0),
        ];
    }
    private static function rows(): array
    {
        return Database::all("SELECT b.*, (SELECT COUNT(*) FROM products p WHERE p.brand_id=b.id) product_count FROM brands b ORDER BY b.position, b.name");
    }
    public static function index(): void
    {
        Response::ok(array_map([self::class, 'shape'], Database::all("SELECT b.*, 0 product_count FROM brands b WHERE status='active' ORDER BY position, name")));
    }
    public static function adminIndex(): void
    {
        Auth::requireAdmin();
        Response::ok(array_map([self::class, 'shape'], self::rows()));
    }
    public static function create(): void
    {
        Auth::requireAdmin();
        $b = Request::body();
        if (empty($b['name'])) Response::error('Name required', 422);
        $slug = Util::uniqueSlug('brands', Util::slugify($b['slug'] ?? $b['name']));
        Database::run("INSERT INTO brands (name,slug,description,logo_url,status,position) VALUES (?,?,?,?,?,?)",
            [$b['name'], $slug, $b['description'] ?? null, $b['logo'] ?? null, $b['status'] ?? 'active', (int) ($b['position'] ?? 0)]);
        Response::created(self::shape(Database::one("SELECT *,0 product_count FROM brands WHERE id=?", [Database::lastId()])));
    }
    public static function update(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        $b = Request::body();
        $set = []; $args = [];
        foreach (['name' => 'name', 'description' => 'description', 'logo' => 'logo_url', 'status' => 'status'] as $in => $col) {
            if (array_key_exists($in, $b)) { $set[] = "$col=?"; $args[] = $b[$in]; }
        }
        if (array_key_exists('position', $b)) { $set[] = "position=?"; $args[] = (int) $b['position']; }
        if (!empty($b['name'])) { $set[] = "slug=?"; $args[] = Util::uniqueSlug('brands', Util::slugify($b['name']), $id); }
        if ($set) { $args[] = $id; Database::run("UPDATE brands SET " . implode(',', $set) . " WHERE id=?", $args); }
        Response::ok(self::shape(Database::one("SELECT *,0 product_count FROM brands WHERE id=?", [$id])));
    }
    public static function destroy(array $p): void
    {
        Auth::requireAdmin();
        Database::run("DELETE FROM brands WHERE id=?", [(int) $p['id']]);
        Response::ok(['deleted' => (int) $p['id']]);
    }
}
