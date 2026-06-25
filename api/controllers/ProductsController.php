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

    /** A category (by slug or name) plus every category nested beneath it. */
    private static function categoryAndDescendantIds(string $slugOrName): array
    {
        $root = Database::one("SELECT id FROM categories WHERE slug=? OR name=?", [$slugOrName, $slugOrName]);
        if (!$root) return [];
        $children = [];
        foreach (Database::all("SELECT id, parent_id FROM categories") as $r) {
            $children[$r['parent_id'] !== null ? (int) $r['parent_id'] : 0][] = (int) $r['id'];
        }
        $ids = [];
        $walk = function (int $id) use (&$walk, &$children, &$ids) {
            $ids[] = $id;
            foreach ($children[$id] ?? [] as $kid) $walk($kid);
        };
        $walk((int) $root['id']);
        return $ids;
    }

    /** hex string from a variant_option `meta` value, or null. */
    private static function hexOf(?string $meta): ?string
    {
        $m = trim((string) $meta);
        if ($m === '' || !preg_match('/^#?[0-9a-fA-F]{3,8}$/', $m)) return null;
        return str_starts_with($m, '#') ? $m : '#' . $m;
    }

    /**
     * Variant data for a product: the attribute axes it varies on (Color, Size…)
     * each with their used options, plus the concrete combinations.
     * @return array{attributes: array, variants: array, colors: array}
     */
    private static function variantData(int $id): array
    {
        $vrows = Database::all(
            "SELECT id, sku, name, color_hex, price, compare_at_price, stock, image_url, images, status, position
             FROM product_variants WHERE product_id=? ORDER BY position, id",
            [$id]
        );
        // option ids per variant
        $optByVariant = [];
        foreach (Database::all(
            "SELECT pvo.variant_id, pvo.option_id FROM product_variant_options pvo
             JOIN product_variants pv ON pv.id=pvo.variant_id WHERE pv.product_id=?",
            [$id]
        ) as $r) {
            $optByVariant[(int) $r['variant_id']][] = (int) $r['option_id'];
        }

        // attributes + their used options (in attribute/option order)
        $usedOptIds = [];
        foreach ($optByVariant as $ids) foreach ($ids as $oid) $usedOptIds[$oid] = true;
        $attributes = [];
        if ($usedOptIds) {
            $in = implode(',', array_fill(0, count($usedOptIds), '?'));
            $rows = Database::all(
                "SELECT o.id oid, o.value, o.meta, a.id aid, a.name aname, a.slug aslug
                 FROM variant_options o JOIN variant_attributes a ON a.id=o.attribute_id
                 WHERE o.id IN ($in) ORDER BY a.position, a.id, o.position, o.id",
                array_keys($usedOptIds)
            );
            $byAttr = [];
            foreach ($rows as $r) {
                $aid = (int) $r['aid'];
                if (!isset($byAttr[$aid])) $byAttr[$aid] = ['id' => $aid, 'name' => $r['aname'], 'slug' => $r['aslug'], 'options' => []];
                $byAttr[$aid]['options'][] = ['id' => (int) $r['oid'], 'value' => $r['value'], 'hex' => self::hexOf($r['meta'])];
            }
            $attributes = array_values($byAttr);
        }

        $variants = array_map(function ($v) use ($optByVariant) {
            $imgs = $v['images'] ? json_decode($v['images'], true) : null;
            if (!is_array($imgs)) $imgs = $v['image_url'] ? [$v['image_url']] : [];
            $imgs = array_values(array_filter($imgs));
            return [
                'id' => (int) $v['id'],
                'sku' => $v['sku'],
                'name' => $v['name'],
                'price' => $v['price'] !== null ? (float) $v['price'] : null,
                'compareAtPrice' => $v['compare_at_price'] !== null ? (float) $v['compare_at_price'] : null,
                'stock' => (int) $v['stock'],
                'image' => $imgs[0] ?? null,   // primary, back-compat
                'images' => $imgs,             // full gallery
                'status' => $v['status'],
                'optionIds' => $optByVariant[(int) $v['id']] ?? [],
            ];
        }, $vrows);

        // Back-compat `colors`: distinct colour-type options (those with a hex).
        $colors = [];
        $seen = [];
        foreach ($attributes as $a) foreach ($a['options'] as $o) {
            if ($o['hex'] && !isset($seen[$o['value']])) { $seen[$o['value']] = true; $colors[] = ['name' => $o['value'], 'hex' => $o['hex']]; }
        }
        return ['attributes' => $attributes, 'variants' => $variants, 'colors' => $colors];
    }

    /** Build the storefront-facing product object. */
    private static function shape(array $p, bool $full = false): array
    {
        $id = (int) $p['id'];
        $images = Database::all("SELECT url, alt, is_primary FROM product_images WHERE product_id=? ORDER BY position", [$id]);
        $vd = self::variantData($id);
        $cats = Database::all(
            "SELECT c.id, c.name, c.slug FROM product_categories pc JOIN categories c ON c.id=pc.category_id
             WHERE pc.product_id=? ORDER BY c.position, c.name",
            [$id]
        );
        $tags = Database::all(
            "SELECT t.id, t.name, t.slug, t.color FROM product_tags pt JOIN tags t ON t.id=pt.tag_id
             WHERE pt.product_id=? ORDER BY t.name",
            [$id]
        );
        $brand = !empty($p['brand_id']) ? Database::one("SELECT id, name FROM brands WHERE id=?", [(int) $p['brand_id']]) : null;

        $out = [
            'id' => $p['slug'],
            'dbId' => $id,
            'slug' => $p['slug'],
            'name' => $p['name'],
            'sku' => $p['sku'],
            'price' => (float) $p['price'],
            'compareAtPrice' => $p['compare_at_price'] !== null ? (float) $p['compare_at_price'] : null,
            'costPrice' => $p['cost_price'] !== null ? (float) $p['cost_price'] : null,
            'brandId' => $brand ? (int) $brand['id'] : null,
            'brand' => $brand['name'] ?? null,
            'tags' => array_map(fn($t) => ['id' => (int) $t['id'], 'name' => $t['name'], 'slug' => $t['slug'], 'color' => $t['color'] ?? null], $tags),
            'tagIds' => array_map(fn($t) => (int) $t['id'], $tags),
            // `category` stays the first/primary name for back-compat; `categories`
            // carries the full set (a product can live in several at once).
            'category' => $cats[0]['name'] ?? '',
            'categories' => array_map(fn($c) => ['id' => (int) $c['id'], 'name' => $c['name'], 'slug' => $c['slug']], $cats),
            'categoryIds' => array_map(fn($c) => (int) $c['id'], $cats),
            'panel' => $p['panel_hex'] ?: '#ECE7DE',
            'badge' => $p['badge'] ?: null,
            'stock' => (int) $p['stock'],
            'status' => $p['status'],
            'rating' => (float) $p['rating'],
            'reviewCount' => (int) $p['review_count'],
            'colors' => $vd['colors'],
            'attributes' => $vd['attributes'],
            'variants' => $vd['variants'],
            // `images` stays a flat URL list for the storefront; `media` carries
            // alt text for the admin editor.
            'images' => array_map(fn($im) => $im['url'], $images),
            'media' => array_map(fn($im) => ['url' => $im['url'], 'alt' => $im['alt']], $images),
        ];
        if ($full) {
            $seo = Database::one("SELECT meta_title, meta_description, og_image_url, canonical_url, keywords FROM product_seo WHERE product_id=?", [$id]);
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
                    'canonical' => $seo['canonical_url'] ?? null,
                    'keywords' => $seo['keywords'] ?? null,
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
            // Match the category itself OR any of its descendants, so a parent
            // link surfaces everything filed under its sub-categories too.
            $ids = self::categoryAndDescendantIds($cat);
            if ($ids) {
                $in = implode(',', array_fill(0, count($ids), '?'));
                $where[] = "EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id=p.id AND pc.category_id IN ($in))";
                $args = array_merge($args, $ids);
            } else {
                $where[] = "0"; // unknown category → empty result rather than all products
            }
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
            "INSERT INTO products (name,slug,sku,brand_id,short_description,description,details,materials,care,dimensions,weight,fit,price,compare_at_price,cost_price,panel_hex,badge,status,is_featured,stock,position)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                $b['name'], $slug, $b['sku'] ?? null, !empty($b['brandId']) ? (int) $b['brandId'] : null,
                $b['shortDescription'] ?? null,
                $b['description'] ?? null, $b['details'] ?? null, $b['materials'] ?? null, $b['care'] ?? null,
                $b['dimensions'] ?? null, $b['weight'] ?? null, $b['fit'] ?? null,
                (float) ($b['price'] ?? 0), isset($b['compareAtPrice']) && $b['compareAtPrice'] !== null && $b['compareAtPrice'] !== '' ? (float) $b['compareAtPrice'] : null,
                isset($b['costPrice']) && $b['costPrice'] !== null && $b['costPrice'] !== '' ? (float) $b['costPrice'] : null,
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
        if (array_key_exists('compareAtPrice', $b)) { $set[] = "compare_at_price=?"; $args[] = ($b['compareAtPrice'] !== null && $b['compareAtPrice'] !== '') ? (float) $b['compareAtPrice'] : null; }
        if (array_key_exists('costPrice', $b)) { $set[] = "cost_price=?"; $args[] = ($b['costPrice'] !== null && $b['costPrice'] !== '') ? (float) $b['costPrice'] : null; }
        if (array_key_exists('brandId', $b)) { $set[] = "brand_id=?"; $args[] = !empty($b['brandId']) ? (int) $b['brandId'] : null; }
        if (array_key_exists('stock', $b)) { $set[] = "stock=?"; $args[] = (int) $b['stock']; }
        if (array_key_exists('isFeatured', $b)) { $set[] = "is_featured=?"; $args[] = !empty($b['isFeatured']) ? 1 : 0; }
        if (array_key_exists('position', $b)) { $set[] = "position=?"; $args[] = (int) $b['position']; }
        // Explicit handle wins; otherwise the slug follows the name (unless kept).
        if (!empty($b['slug'])) { $set[] = "slug=?"; $args[] = self::uniqueSlug(self::slugify($b['slug']), $id); }
        elseif (!empty($b['name']) && empty($b['keepSlug'])) { $set[] = "slug=?"; $args[] = self::uniqueSlug(self::slugify($b['name']), $id); }
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
            foreach (array_values($b['images']) as $i => $im) {
                // Accept either a bare URL string (legacy) or { url, alt }.
                $url = is_array($im) ? ($im['url'] ?? '') : $im;
                $alt = is_array($im) ? ($im['alt'] ?? null) : null;
                if (!$url) continue;
                Database::run("INSERT INTO product_images (product_id,url,alt,position,is_primary) VALUES (?,?,?,?,?)", [$id, $url, $alt, $i, $i === 0 ? 1 : 0]);
            }
        }
        // Preferred path: an explicit variant matrix. Each entry is one
        // purchasable combination — a set of option ids (one per attribute) plus
        // its own sku/price/compare-at/stock/status. We store one product_variants
        // row per combination and link every constituent option.
        if (array_key_exists('variants', $b) && is_array($b['variants'])) {
            Database::run("DELETE FROM product_variants WHERE product_id=?", [$id]);
            $pos = 0;
            foreach (array_values($b['variants']) as $v) {
                if (!is_array($v)) continue;
                $optIds = array_values(array_unique(array_map('intval', $v['optionIds'] ?? [])));
                $labels = []; $hex = null;
                foreach ($optIds as $oid) {
                    $opt = Database::one("SELECT value, meta FROM variant_options WHERE id=?", [$oid]);
                    if (!$opt) continue;
                    $labels[] = $opt['value'];
                    if ($hex === null) $hex = self::hexOf($opt['meta']);
                }
                $price = (isset($v['price']) && $v['price'] !== '' && $v['price'] !== null) ? (float) $v['price'] : null;
                $cmp   = (isset($v['compareAtPrice']) && $v['compareAtPrice'] !== '' && $v['compareAtPrice'] !== null) ? (float) $v['compareAtPrice'] : null;
                // Accept a gallery (`images: []`) or a single `image`.
                $imgs = [];
                if (isset($v['images']) && is_array($v['images'])) $imgs = array_values(array_filter(array_map('strval', $v['images'])));
                elseif (!empty($v['image'])) $imgs = [$v['image']];
                Database::run(
                    "INSERT INTO product_variants (product_id,sku,name,color_hex,price,compare_at_price,stock,image_url,images,position,status)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    [
                        $id, $v['sku'] ?? null, $v['name'] ?? implode(' / ', $labels), $hex,
                        $price, $cmp, (int) ($v['stock'] ?? 0), $imgs[0] ?? null, $imgs ? json_encode($imgs) : null, $pos,
                        ($v['status'] ?? 'active') === 'hidden' ? 'hidden' : 'active',
                    ]
                );
                $vid = Database::lastId();
                foreach ($optIds as $oid) {
                    Database::run("INSERT IGNORE INTO product_variant_options (variant_id,option_id) VALUES (?,?)", [$vid, $oid]);
                }
                $pos++;
            }
        }
        // Legacy path: product picks from the GLOBAL variant options defined in
        // the Variants module. Each selected option becomes a product_variants row
        // (so the storefront keeps reading colors[{name,hex}]) plus a link row in
        // product_variant_options (so the admin form round-trips the exact chips).
        elseif (array_key_exists('variantOptionIds', $b) && is_array($b['variantOptionIds'])) {
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
        // Preferred path: an explicit set of category ids (a product can be filed
        // under several categories / sub-categories at once). Falls back to the
        // legacy single `category` name for older callers.
        if (array_key_exists('categoryIds', $b) && is_array($b['categoryIds'])) {
            Database::run("DELETE FROM product_categories WHERE product_id=?", [$id]);
            foreach (array_unique(array_map('intval', $b['categoryIds'])) as $cid) {
                if ($cid && Database::one("SELECT id FROM categories WHERE id=?", [$cid])) {
                    Database::run("INSERT IGNORE INTO product_categories (product_id,category_id) VALUES (?,?)", [$id, $cid]);
                }
            }
        } elseif (array_key_exists('category', $b)) {
            Database::run("DELETE FROM product_categories WHERE product_id=?", [$id]);
            $cat = Database::one("SELECT id FROM categories WHERE name=? OR slug=?", [$b['category'], $b['category']]);
            if ($cat) Database::run("INSERT INTO product_categories (product_id,category_id) VALUES (?,?)", [$id, $cat['id']]);
        }
        // Tags (many-to-many).
        if (array_key_exists('tagIds', $b) && is_array($b['tagIds'])) {
            Database::run("DELETE FROM product_tags WHERE product_id=?", [$id]);
            foreach (array_unique(array_map('intval', $b['tagIds'])) as $tid) {
                if ($tid && Database::one("SELECT id FROM tags WHERE id=?", [$tid])) {
                    Database::run("INSERT IGNORE INTO product_tags (product_id,tag_id) VALUES (?,?)", [$id, $tid]);
                }
            }
        }
        if (isset($b['seo']) && is_array($b['seo'])) {
            Database::run(
                "INSERT INTO product_seo (product_id,meta_title,meta_description,og_image_url,canonical_url,keywords) VALUES (?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE meta_title=VALUES(meta_title), meta_description=VALUES(meta_description), og_image_url=VALUES(og_image_url), canonical_url=VALUES(canonical_url), keywords=VALUES(keywords)",
                [$id, $b['seo']['metaTitle'] ?? null, $b['seo']['metaDescription'] ?? null, $b['seo']['ogImage'] ?? null, $b['seo']['canonical'] ?? null, $b['seo']['keywords'] ?? null]
            );
        }
    }
}
