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
            // Direct assignments only.
            'productCount' => (int) ($c['product_count'] ?? 0),
            // Distinct products in this category OR any descendant (rolled up).
            'totalCount' => (int) ($c['total_count'] ?? ($c['product_count'] ?? 0)),
        ];
    }

    /**
     * Flat, shaped category list with rolled-up product counts. The rollup
     * counts each product once across a whole subtree (a product can now sit in
     * several categories), so we union product ids per subtree rather than
     * summing direct counts.
     */
    private static function flat(): array
    {
        $rows = self::rows();
        $direct = [];                 // category_id => [product_id => true]
        foreach (Database::all("SELECT product_id, category_id FROM product_categories") as $pr) {
            $direct[(int) $pr['category_id']][(int) $pr['product_id']] = true;
        }
        $children = [];               // parent_id (0 = top level) => [child_id, ...]
        foreach ($rows as $r) {
            $children[$r['parent_id'] !== null ? (int) $r['parent_id'] : 0][] = (int) $r['id'];
        }
        $collect = function (int $id) use (&$collect, &$children, &$direct): array {
            $set = $direct[$id] ?? [];
            foreach ($children[$id] ?? [] as $kid) $set += $collect($kid);
            return $set;
        };
        return array_map(function ($r) use ($collect) {
            $r['total_count'] = count($collect((int) $r['id']));
            return self::shape($r);
        }, $rows);
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

    /** Ids of every descendant of $id (children, grandchildren, …) — for cycle guards. */
    private static function descendantIds(int $id): array
    {
        $children = [];
        foreach (Database::all("SELECT id, parent_id FROM categories") as $r) {
            $children[$r['parent_id'] !== null ? (int) $r['parent_id'] : 0][] = (int) $r['id'];
        }
        $out = [];
        $walk = function (int $pid) use (&$walk, &$children, &$out) {
            foreach ($children[$pid] ?? [] as $kid) { $out[] = $kid; $walk($kid); }
        };
        $walk($id);
        return $out;
    }

    /** Public: nested tree for storefront nav (active categories only). */
    public static function index(): void
    {
        $flat = array_filter(self::flat(), fn($c) => $c['status'] === 'active');
        Response::ok(self::tree(array_values($flat)));
    }

    /** Admin: flat list (with tree available client-side). */
    public static function adminIndex(): void
    {
        Auth::requireAdmin();
        Response::ok(self::flat());
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
        if (array_key_exists('parentId', $b)) {
            $pid = ($b['parentId'] !== null && $b['parentId'] !== '') ? (int) $b['parentId'] : null;
            // A category cannot become a child of itself or of one of its own
            // descendants — that would detach the whole subtree from the tree.
            if ($pid !== null && ($pid === $id || in_array($pid, self::descendantIds($id), true))) {
                Response::error('A category cannot be moved under itself or one of its sub-categories', 422);
            }
            $set[] = "parent_id=?"; $args[] = $pid;
        }
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
