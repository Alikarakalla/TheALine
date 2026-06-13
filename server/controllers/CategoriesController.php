<?php
class CategoriesController
{
    private static function slugify(string $s): string
    {
        $s = strtolower(trim($s));
        $s = preg_replace('/[^a-z0-9]+/', '-', $s);
        return trim($s, '-') ?: 'category';
    }
    private static function uniqueSlug(string $base, ?int $ignore = null): string
    {
        $slug = $base; $i = 2;
        while (Database::one("SELECT id FROM categories WHERE slug=?" . ($ignore ? " AND id<>?" : ""), $ignore ? [$slug, $ignore] : [$slug])) {
            $slug = $base . '-' . $i++;
        }
        return $slug;
    }

    private static function rows(): array
    {
        return Database::all(
            "SELECT c.*, (SELECT COUNT(*) FROM product_categories pc WHERE pc.category_id=c.id) AS product_count
             FROM categories c ORDER BY c.position ASC, c.name ASC"
        );
    }

    private static function shape(array $c): array
    {
        return [
            'id' => (int) $c['id'],
            'parentId' => $c['parent_id'] !== null ? (int) $c['parent_id'] : null,
            'name' => $c['name'],
            'slug' => $c['slug'],
            'description' => $c['description'],
            'image' => $c['image_url'],
            'position' => (int) $c['position'],
            'status' => $c['status'],
            'productCount' => (int) ($c['product_count'] ?? 0),
        ];
    }

    private static function tree(array $flat, ?int $parent = null): array
    {
        $out = [];
        foreach ($flat as $c) {
            if ($c['parentId'] === $parent) {
                $c['children'] = self::tree($flat, $c['id']);
                $out[] = $c;
            }
        }
        return $out;
    }

    /** Public: nested tree for storefront nav. */
    public static function index(): void
    {
        $flat = array_map([self::class, 'shape'], self::rows());
        Response::ok(self::tree($flat));
    }

    /** Admin: flat list (with tree available client-side). */
    public static function adminIndex(): void
    {
        Auth::requireAdmin();
        Response::ok(array_map([self::class, 'shape'], self::rows()));
    }

    public static function create(): void
    {
        Auth::requireAdmin();
        $b = Request::body();
        if (empty($b['name'])) Response::error('Name is required', 422);
        $slug = self::uniqueSlug(self::slugify($b['slug'] ?? $b['name']));
        Database::run(
            "INSERT INTO categories (parent_id,name,slug,description,image_url,position,status) VALUES (?,?,?,?,?,?,?)",
            [
                !empty($b['parentId']) ? (int) $b['parentId'] : null,
                $b['name'], $slug, $b['description'] ?? null, $b['image'] ?? null,
                (int) ($b['position'] ?? 0), $b['status'] ?? 'active',
            ]
        );
        Response::created(self::shape(Database::one("SELECT *, 0 product_count FROM categories WHERE id=?", [Database::lastId()])));
    }

    public static function update(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        if (!Database::one("SELECT id FROM categories WHERE id=?", [$id])) Response::error('Not found', 404);
        $b = Request::body();
        $set = []; $args = [];
        if (array_key_exists('name', $b)) { $set[] = "name=?"; $args[] = $b['name']; }
        if (array_key_exists('parentId', $b)) { $set[] = "parent_id=?"; $args[] = $b['parentId'] !== null && $b['parentId'] !== '' && (int)$b['parentId'] !== $id ? (int) $b['parentId'] : null; }
        if (array_key_exists('description', $b)) { $set[] = "description=?"; $args[] = $b['description']; }
        if (array_key_exists('image', $b)) { $set[] = "image_url=?"; $args[] = $b['image']; }
        if (array_key_exists('position', $b)) { $set[] = "position=?"; $args[] = (int) $b['position']; }
        if (array_key_exists('status', $b)) { $set[] = "status=?"; $args[] = $b['status']; }
        if (!empty($b['name'])) { $set[] = "slug=?"; $args[] = self::uniqueSlug(self::slugify($b['name']), $id); }
        if ($set) { $args[] = $id; Database::run("UPDATE categories SET " . implode(',', $set) . " WHERE id=?", $args); }
        Response::ok(self::shape(Database::one("SELECT *, 0 product_count FROM categories WHERE id=?", [$id])));
    }

    public static function destroy(array $p): void
    {
        Auth::requireAdmin();
        Database::run("DELETE FROM categories WHERE id=?", [(int) $p['id']]);
        Response::ok(['deleted' => (int) $p['id']]);
    }
}
