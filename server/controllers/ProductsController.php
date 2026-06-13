<?php
class ProductsController
{
    private static function slugify(string $s): string
    {
        $s = strtolower(trim($s));
        $s = preg_replace('/[^a-z0-9]+/', '-', $s);
        return trim($s, '-') ?: 'item';
    }

    private static function uniqueSlug(string $base, ?int $ignoreId = null): string
    {
        $slug = $base; $i = 2;
        while (true) {
            $row = Database::one(
                "SELECT id FROM products WHERE slug=?" . ($ignoreId ? " AND id<>?" : ""),
                $ignoreId ? [$slug, $ignoreId] : [$slug]
            );
            if (!$row) return $slug;
            $slug = $base . '-' . $i++;
        }
    }

    /** Build the storefront-facing product object. */
    private static function shape(array $p, bool $full = false): array
    {
        $id = (int) $p['id'];
        $images = Database::all("SELECT url, alt, is_primary FROM product_images WHERE product_id=? ORDER BY position", [$id]);
        $variants = Database::all("SELECT name, color_hex, stock, price FROM product_variants WHERE product_id=? ORDER BY position", [$id]);
        $cat = Database::one("SELECT c.name FROM product_categories pc JOIN categories c ON c.id=pc.category_id WHERE pc.product_id=? LIMIT 1", [$id]);

        $out = [
            'id' => $p['slug'],
            'dbId' => $id,
            'name' => $p['name'],
            'price' => (float) $p['price'],
            'compareAtPrice' => $p['compare_at_price'] !== null ? (float) $p['compare_at_price'] : null,
            'category' => $cat['name'] ?? '',
            'panel' => $p['panel_hex'] ?: '#ECE7DE',
            'badge' => $p['badge'] ?: null,
            'stock' => (int) $p['stock'],
            'status' => $p['status'],
            'rating' => (float) $p['rating'],
            'reviewCount' => (int) $p['review_count'],
            'colors' => array_map(fn($v) => ['name' => $v['name'], 'hex' => $v['color_hex']], $variants),
            'images' => array_map(fn($im) => $im['url'], $images),
        ];
        if ($full) {
            $seo = Database::one("SELECT meta_title, meta_description, og_image_url FROM product_seo WHERE product_id=?", [$id]);
            $optRows = Database::all(
                "SELECT pvo.option_id FROM product_variants pv JOIN product_variant_options pvo ON pvo.variant_id=pv.id WHERE pv.product_id=?",
                [$id]
            );
            $out['variantOptionIds'] = array_values(array_unique(array_map(fn($r) => (int) $r['option_id'], $optRows)));
            $out += [
                'description' => $p['description'],
                'details' => $p['details'],
                'materials' => $p['materials'],
                'care' => $p['care'],
                'dimensions' => $p['dimensions'],
                'weight' => $p['weight'],
                'fit' => $p['fit'],
                'seo' => [
                    'metaTitle' => $seo['meta_title'] ?? null,
                    'metaDescription' => $seo['meta_description'] ?? null,
                    'ogImage' => $seo['og_image_url'] ?? null,
                ],
            ];
        }
        return $out;
    }

    /** Public list with filters. */
    public static function index(): void
    {
        $where = ["p.status='active'"];
        $args = [];
        if ($cat = Request::query('category')) {
            $where[] = "EXISTS (SELECT 1 FROM product_categories pc JOIN categories c ON c.id=pc.category_id WHERE pc.product_id=p.id AND (c.name=? OR c.slug=?))";
            $args[] = $cat; $args[] = $cat;
        }
        if ($color = Request::query('color')) {
            $where[] = "EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.name=?)";
            $args[] = $color;
        }
        if ($q = Request::query('q')) {
            $where[] = "(p.name LIKE ? OR p.description LIKE ?)";
            $args[] = "%$q%"; $args[] = "%$q%";
        }
        $order = "p.position ASC";
        switch (Request::query('sort')) {
            case 'price-asc': $order = "p.price ASC"; break;
            case 'price-desc': $order = "p.price DESC"; break;
            case 'name': $order = "p.name ASC"; break;
            case 'newest': $order = "p.created_at DESC"; break;
        }
        $rows = Database::all("SELECT * FROM products p WHERE " . implode(' AND ', $where) . " ORDER BY $order", $args);
        Response::ok(array_map(fn($r) => self::shape($r), $rows));
    }

    public static function show(array $params): void
    {
        $p = Database::one("SELECT * FROM products WHERE slug=?", [$params['id']]);
        if (!$p) Response::error('Product not found', 404);
        Response::ok(self::shape($p, true));
    }

    // ---------------- Admin ----------------

    public static function adminIndex(): void
    {
        Auth::requireAdmin();
        $rows = Database::all("SELECT * FROM products ORDER BY position ASC, id ASC");
        $out = array_map(function ($r) {
            $s = self::shape($r, true);
            $s['isFeatured'] = (bool) $r['is_featured'];
            return $s;
        }, $rows);
        Response::ok($out);
    }

    public static function adminShow(array $params): void
    {
        Auth::requireAdmin();
        $p = Database::one("SELECT * FROM products WHERE id=?", [(int) $params['id']]);
        if (!$p) Response::error('Product not found', 404);
        $s = self::shape($p, true);
        $s['isFeatured'] = (bool) $p['is_featured'];
        Response::ok($s);
    }

    public static function create(): void
    {
        Auth::requireAdmin();
        $b = Request::body();
        if (empty($b['name'])) Response::error('Name is required', 422);
        $slug = self::uniqueSlug(self::slugify($b['slug'] ?? $b['name']));
        Database::run(
            "INSERT INTO products (name,slug,sku,short_description,description,details,materials,care,dimensions,weight,fit,price,compare_at_price,panel_hex,badge,status,is_featured,stock,position)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                $b['name'], $slug, $b['sku'] ?? null, $b['shortDescription'] ?? null,
                $b['description'] ?? null, $b['details'] ?? null, $b['materials'] ?? null, $b['care'] ?? null,
                $b['dimensions'] ?? null, $b['weight'] ?? null, $b['fit'] ?? null,
                (float) ($b['price'] ?? 0), isset($b['compareAtPrice']) ? (float) $b['compareAtPrice'] : null,
                $b['panel'] ?? '#ECE7DE', $b['badge'] ?? '', $b['status'] ?? 'active',
                !empty($b['isFeatured']) ? 1 : 0, (int) ($b['stock'] ?? 0), (int) ($b['position'] ?? 0),
            ]
        );
        $id = Database::lastId();
        self::syncChildren($id, $b);
        $p = Database::one("SELECT * FROM products WHERE id=?", [$id]);
        Response::created(self::shape($p, true));
    }

    public static function update(array $params): void
    {
        Auth::requireAdmin();
        $id = (int) $params['id'];
        $p = Database::one("SELECT * FROM products WHERE id=?", [$id]);
        if (!$p) Response::error('Product not found', 404);
        $b = Request::body();
        $fields = [
            'name' => 'name', 'sku' => 'sku', 'shortDescription' => 'short_description',
            'description' => 'description', 'details' => 'details', 'materials' => 'materials',
            'care' => 'care', 'dimensions' => 'dimensions', 'weight' => 'weight', 'fit' => 'fit',
            'panel' => 'panel_hex', 'badge' => 'badge', 'status' => 'status',
        ];
        $set = []; $args = [];
        foreach ($fields as $in => $col) {
            if (array_key_exists($in, $b)) { $set[] = "$col=?"; $args[] = $b[$in]; }
        }
        if (array_key_exists('price', $b)) { $set[] = "price=?"; $args[] = (float) $b['price']; }
        if (array_key_exists('compareAtPrice', $b)) { $set[] = "compare_at_price=?"; $args[] = $b['compareAtPrice'] !== null ? (float) $b['compareAtPrice'] : null; }
        if (array_key_exists('stock', $b)) { $set[] = "stock=?"; $args[] = (int) $b['stock']; }
        if (array_key_exists('isFeatured', $b)) { $set[] = "is_featured=?"; $args[] = !empty($b['isFeatured']) ? 1 : 0; }
        if (array_key_exists('position', $b)) { $set[] = "position=?"; $args[] = (int) $b['position']; }
        if (!empty($b['name']) && empty($b['keepSlug'])) { $set[] = "slug=?"; $args[] = self::uniqueSlug(self::slugify($b['name']), $id); }
        if ($set) {
            $args[] = $id;
            Database::run("UPDATE products SET " . implode(',', $set) . " WHERE id=?", $args);
        }
        self::syncChildren($id, $b);
        $p = Database::one("SELECT * FROM products WHERE id=?", [$id]);
        Response::ok(self::shape($p, true));
    }

    public static function destroy(array $params): void
    {
        Auth::requireAdmin();
        $id = (int) $params['id'];
        Database::run("DELETE FROM products WHERE id=?", [$id]);
        Response::ok(['deleted' => $id]);
    }

    /** Replace images / variants / category / seo when provided. */
    private static function syncChildren(int $id, array $b): void
    {
        if (isset($b['images']) && is_array($b['images'])) {
            Database::run("DELETE FROM product_images WHERE product_id=?", [$id]);
            foreach (array_values($b['images']) as $i => $url) {
                if (!$url) continue;
                Database::run("INSERT INTO product_images (product_id,url,position,is_primary) VALUES (?,?,?,?)", [$id, $url, $i, $i === 0 ? 1 : 0]);
            }
        }
        // Preferred path: product picks from the GLOBAL variant options defined in
        // the Variants module. Each selected option becomes a product_variants row
        // (so the storefront keeps reading colors[{name,hex}]) plus a link row in
        // product_variant_options (so the admin form round-trips the exact chips).
        if (array_key_exists('variantOptionIds', $b) && is_array($b['variantOptionIds'])) {
            Database::run("DELETE FROM product_variants WHERE product_id=?", [$id]);
            $pos = 0;
            foreach (array_values($b['variantOptionIds']) as $optId) {
                $optId = (int) $optId;
                $opt = Database::one("SELECT id, value, meta FROM variant_options WHERE id=?", [$optId]);
                if (!$opt) continue;
                $meta = trim((string) ($opt['meta'] ?? ''));
                $hex = preg_match('/^#?[0-9a-fA-F]{3,8}$/', $meta) ? (str_starts_with($meta, '#') ? $meta : '#' . $meta) : null;
                Database::run("INSERT INTO product_variants (product_id,name,color_hex,position) VALUES (?,?,?,?)", [$id, $opt['value'], $hex, $pos]);
                Database::run("INSERT INTO product_variant_options (variant_id,option_id) VALUES (?,?)", [Database::lastId(), $optId]);
                $pos++;
            }
        } elseif (isset($b['colors']) && is_array($b['colors'])) {
            // Legacy free-form colors (kept for backward compatibility).
            Database::run("DELETE FROM product_variants WHERE product_id=?", [$id]);
            foreach (array_values($b['colors']) as $i => $c) {
                $name = is_array($c) ? ($c['name'] ?? '') : $c;
                $hex = is_array($c) ? ($c['hex'] ?? null) : null;
                if ($name === '') continue;
                Database::run("INSERT INTO product_variants (product_id,name,color_hex,position) VALUES (?,?,?,?)", [$id, $name, $hex, $i]);
            }
        }
        if (array_key_exists('category', $b)) {
            Database::run("DELETE FROM product_categories WHERE product_id=?", [$id]);
            $cat = Database::one("SELECT id FROM categories WHERE name=? OR slug=?", [$b['category'], $b['category']]);
            if ($cat) Database::run("INSERT INTO product_categories (product_id,category_id) VALUES (?,?)", [$id, $cat['id']]);
        }
        if (isset($b['seo']) && is_array($b['seo'])) {
            Database::run(
                "INSERT INTO product_seo (product_id,meta_title,meta_description,og_image_url) VALUES (?,?,?,?)
                 ON DUPLICATE KEY UPDATE meta_title=VALUES(meta_title), meta_description=VALUES(meta_description), og_image_url=VALUES(og_image_url)",
                [$id, $b['seo']['metaTitle'] ?? null, $b['seo']['metaDescription'] ?? null, $b['seo']['ogImage'] ?? null]
            );
        }
    }
}
