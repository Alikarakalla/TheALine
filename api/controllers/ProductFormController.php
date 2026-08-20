<?php
// Lebazone-style admin product form API — 1:1 port of ProductApiController:
//   GET  admin/products/form            → create bootstrap {data, options}
//   GET  admin/products/form/{id}       → edit bootstrap
//   POST admin/products/form            → save (multipart: payload JSON + files)
//   POST admin/products/form/{id}       → update
//   GET  admin/products/subcategories       ?category_ids[]=
//   GET  admin/products/sub-subcategories   ?sub_category_ids[]=
// Validation errors return Laravel-style 422 {message, errors:{key:[msgs]}}
// so the form's error plumbing (alert list + scroll-to-field) works unchanged.
class ProductFormController
{
    private const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB, like lebazone
    private const TARGET_KB = 150; // compression target per stored image

    /** Self-creating columns the lebazone flow needs on our tables. */
    private static function ensure(): void
    {
        static $done = false;
        if ($done) return;
        $done = true;
        Database::run("ALTER TABLE products
            ADD COLUMN IF NOT EXISTS name_ar VARCHAR(200) NULL,
            ADD COLUMN IF NOT EXISTS barcode VARCHAR(80) NULL,
            ADD COLUMN IF NOT EXISTS short_description_ar VARCHAR(500) NULL,
            ADD COLUMN IF NOT EXISTS description_ar LONGTEXT NULL,
            ADD COLUMN IF NOT EXISTS main_image VARCHAR(500) NULL,
            ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NULL,
            ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10) NULL,
            ADD COLUMN IF NOT EXISTS published_at DATETIME NULL,
            ADD COLUMN IF NOT EXISTS track_inventory TINYINT(1) NOT NULL DEFAULT 1,
            ADD COLUMN IF NOT EXISTS preorder_enabled TINYINT(1) NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS preorder_shipping_days INT NULL");
        Database::run("ALTER TABLE product_variants
            ADD COLUMN IF NOT EXISTS barcode VARCHAR(80) NULL,
            ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) NULL,
            ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NULL,
            ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10) NULL");
    }

    /* ================================ helpers ================================ */

    private static function slugify(string $v): string
    {
        $v = strtolower(trim($v));
        $v = preg_replace('/[^a-z0-9]+/', '-', $v);
        return trim($v, '-');
    }

    private static function uniqueSlug(string $base, ?int $ignoreId): string
    {
        $slug = self::slugify($base) ?: 'product';
        $candidate = $slug;
        $n = 2;
        while (true) {
            $row = $ignoreId
                ? Database::one("SELECT id FROM products WHERE slug=? AND id<>?", [$candidate, $ignoreId])
                : Database::one("SELECT id FROM products WHERE slug=?", [$candidate]);
            if (!$row) return $candidate;
            $candidate = $slug . '-' . $n++;
        }
    }

    private static function opt(array $rows, string $valueKey = 'id', string $labelKey = 'name'): array
    {
        return array_map(fn($r) => ['value' => (int) $r[$valueKey], 'label' => (string) ($r[$labelKey] ?? 'Untitled')], $rows);
    }

    private static function childCategories(array $parentIds): array
    {
        $parentIds = array_values(array_filter(array_map('intval', $parentIds)));
        if (!$parentIds) return [];
        $in = implode(',', array_fill(0, count($parentIds), '?'));
        return Database::all(
            "SELECT id, name FROM categories WHERE status='active' AND parent_id IN ($in) ORDER BY position, name",
            $parentIds
        );
    }

    public static function subcategories(): void
    {
        Auth::requireAdmin();
        $ids = (array) ($_GET['category_ids'] ?? []);
        Response::ok(self::opt(self::childCategories($ids)));
    }

    public static function subSubcategories(): void
    {
        Auth::requireAdmin();
        $ids = (array) ($_GET['sub_category_ids'] ?? []);
        Response::ok(self::opt(self::childCategories($ids)));
    }

    /** Depth of a category in the tree (0 = top level). */
    private static function categoryDepth(int $id, array $byId): int
    {
        $depth = 0;
        $cur = $byId[$id] ?? null;
        while ($cur && $cur['parent_id'] !== null && $depth < 6) {
            $depth++;
            $cur = $byId[(int) $cur['parent_id']] ?? null;
        }
        return $depth;
    }

    private static function hexOf(?string $meta): ?string
    {
        if ($meta && preg_match('/^#?[0-9a-fA-F]{3,8}$/', $meta)) {
            return $meta[0] === '#' ? $meta : '#' . $meta;
        }
        return null;
    }

    /* ========================= list page (lebazone-style) ========================= */

    /** Paginated, filterable products listing for the admin table. */
    public static function adminList(): void
    {
        Auth::requireAdmin();
        self::ensure();

        $perPage = min(100, max(1, (int) (Request::query('perPage', '20') ?: 20)));
        $page = max(1, (int) (Request::query('page', '1') ?: 1));
        $search = trim((string) Request::query('search', ''));
        $categoryId = (int) (Request::query('categoryId', '0') ?: 0);
        $brandId = (int) (Request::query('brandId', '0') ?: 0);
        $status = trim((string) Request::query('status', ''));

        $where = [];
        $args = [];
        if ($search !== '') {
            $where[] = "(p.name LIKE ? OR p.sku LIKE ?)";
            $args[] = "%$search%";
            $args[] = "%$search%";
        }
        if ($categoryId > 0) {
            $where[] = "EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = ?)";
            $args[] = $categoryId;
        }
        if ($brandId > 0) {
            $where[] = "p.brand_id = ?";
            $args[] = $brandId;
        }
        if (in_array($status, ['active', 'draft', 'archived'], true)) {
            $where[] = "p.status = ?";
            $args[] = $status;
        }
        $cond = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $total = (int) (Database::one("SELECT COUNT(*) c FROM products p $cond", $args)['c'] ?? 0);
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min($page, $lastPage);
        $offset = ($page - 1) * $perPage;

        $rows = Database::all(
            "SELECT p.id, p.name, p.slug, p.sku, p.price, p.stock, p.status, p.is_featured, p.track_inventory, p.main_image, p.brand_id,
                    b.name brand_name,
                    (SELECT c.name FROM product_categories pc JOIN categories c ON c.id = pc.category_id
                     WHERE pc.product_id = p.id ORDER BY c.position, c.name LIMIT 1) category_name,
                    (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position, pi.id LIMIT 1) first_image,
                    (SELECT pv.image_url FROM product_variants pv WHERE pv.product_id = p.id AND pv.image_url IS NOT NULL
                     ORDER BY pv.position, pv.id LIMIT 1) variant_image
             FROM products p
             LEFT JOIN brands b ON b.id = p.brand_id
             $cond
             ORDER BY p.created_at DESC, p.id DESC
             LIMIT $perPage OFFSET $offset",
            $args
        );

        $data = array_map(fn($r) => [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'slug' => $r['slug'],
            'sku' => $r['sku'],
            'price' => (float) $r['price'],
            'stock' => (int) $r['stock'],
            'status' => $r['status'],
            'isFeatured' => (bool) $r['is_featured'],
            'trackInventory' => (bool) ($r['track_inventory'] ?? 1),
            // Listing image priority: main image → gallery → variant image.
            'image' => $r['main_image'] ?: ($r['first_image'] ?: ($r['variant_image'] ?: null)),
            'category' => $r['category_name'],
            'brand' => $r['brand_name'],
        ], $rows);

        $from = $total ? $offset + 1 : 0;
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'data' => $data,
            'meta' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
                'from' => $from,
                'to' => min($offset + $perPage, $total),
            ],
        ]);
        exit;
    }

    /** Filter dropdown lookups for the products list. */
    public static function adminListMeta(): void
    {
        Auth::requireAdmin();
        $cats = Database::all("SELECT id, name, parent_id FROM categories WHERE status='active' ORDER BY position, name");
        // Present the tree flattened with depth markers so the select reads well.
        $byParent = [];
        foreach ($cats as $c) $byParent[$c['parent_id'] === null ? 0 : (int) $c['parent_id']][] = $c;
        $out = [];
        $walk = function (int $parent, int $depth) use (&$walk, &$out, $byParent) {
            foreach ($byParent[$parent] ?? [] as $c) {
                $out[] = ['value' => (int) $c['id'], 'label' => str_repeat('— ', $depth) . $c['name']];
                $walk((int) $c['id'], $depth + 1);
            }
        };
        $walk(0, 0);
        $brands = self::opt(Database::all("SELECT id, name FROM brands WHERE status='active' ORDER BY name"));
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['categories' => $out, 'brands' => $brands]);
        exit;
    }

    /** Bulk delete. Body: { ids: int[] } */
    public static function bulkDestroy(): void
    {
        Auth::requireAdmin();
        $b = Request::body();
        $ids = array_values(array_filter(array_map('intval', (array) ($b['ids'] ?? []))));
        if (!$ids) Response::error('No IDs provided', 422);
        $in = implode(',', array_fill(0, count($ids), '?'));
        Database::run("DELETE FROM products WHERE id IN ($in)", $ids);
        Response::ok(['deleted' => count($ids)]);
    }

    /* ============================== form bootstrap ============================== */

    public static function formCreate(): void { self::form(null); }
    public static function formEdit(array $p): void { self::form((int) $p['id']); }

    private static function form(?int $id): void
    {
        Auth::requireAdmin();
        self::ensure();

        $product = null;
        if ($id !== null) {
            $product = Database::one("SELECT * FROM products WHERE id=?", [$id]);
            if (!$product) Response::error('Product not found', 404);
        }

        // ---- options ----
        $brands = self::opt(Database::all("SELECT id, name FROM brands WHERE status='active' ORDER BY name"));
        $topCats = self::opt(Database::all("SELECT id, name FROM categories WHERE status='active' AND parent_id IS NULL ORDER BY position, name"));
        $tags = array_map(fn($t) => ['value' => (int) $t['id'], 'label' => $t['name'], 'color' => $t['color']],
            Database::all("SELECT id, name, color FROM tags ORDER BY name"));
        $attrRows = Database::all("SELECT id, name, slug FROM variant_attributes ORDER BY position, name");
        $optRows = Database::all("SELECT id, attribute_id, value, meta FROM variant_options ORDER BY position, id");
        $optsByAttr = [];
        foreach ($optRows as $o) $optsByAttr[(int) $o['attribute_id']][] = $o;
        $variantAttributes = array_map(fn($a) => [
            'id' => (int) $a['id'],
            'slug' => $a['slug'],
            'name' => $a['name'],
            'values' => array_map(fn($o) => [
                'id' => (int) $o['id'],
                'name' => $o['value'],
                'slug' => self::slugify($o['value']),
                'code' => $o['meta'],
            ], $optsByAttr[(int) $a['id']] ?? []),
        ], $attrRows);

        // ---- data ----
        if ($product === null) {
            $data = [
                'id' => null,
                'name_en' => '', 'name_ar' => '', 'slug' => '', 'sku' => '', 'barcode' => '',
                'short_description_en' => '', 'short_description_ar' => '',
                'description_en' => '', 'description_ar' => '',
                'is_visible' => true, 'is_featured' => false, 'track_inventory' => true,
                'stock_quantity' => 0,
                'preorder_enabled' => false, 'preorder_shipping_days' => '',
                'price' => '', 'compare_at_price' => '', 'cost_price' => '',
                'discount_amount' => '', 'discount_type' => '',
                'published_at' => date('Y-m-d\TH:i'),
                'brand_id' => null,
                'selectedCategories' => [], 'selectedSubCategories' => [], 'selectedSubSubCategories' => [],
                'selectedTags' => [],
                'gallery' => [], 'main_image_url' => null,
                'hasVariations' => false, 'variantTableRows' => [], 'multipleVariations' => [],
                // The A Line storefront extras
                'details' => '', 'materials' => '', 'care' => '', 'dimensions' => '', 'weight' => '', 'fit' => '',
                'badge' => '', 'panel' => '#ECE7DE',
                'seo' => ['metaTitle' => '', 'metaDescription' => '', 'ogImage' => '', 'canonical' => '', 'keywords' => ''],
            ];
            $subOptions = [];
            $subSubOptions = [];
        } else {
            $pid = (int) $product['id'];
            $catAll = Database::all("SELECT id, parent_id FROM categories");
            $byId = [];
            foreach ($catAll as $c) $byId[(int) $c['id']] = ['parent_id' => $c['parent_id'] === null ? null : (int) $c['parent_id']];
            $linked = array_map(fn($r) => (int) $r['category_id'],
                Database::all("SELECT category_id FROM product_categories WHERE product_id=?", [$pid]));
            $selCats = []; $selSubs = []; $selSubSubs = [];
            foreach ($linked as $cid) {
                $d = self::categoryDepth($cid, $byId);
                if ($d === 0) $selCats[] = $cid;
                elseif ($d === 1) $selSubs[] = $cid;
                else $selSubSubs[] = $cid;
            }
            $tagIds = array_map(fn($r) => (int) $r['tag_id'],
                Database::all("SELECT tag_id FROM product_tags WHERE product_id=?", [$pid]));
            $gallery = array_map(fn($r) => ['id' => (int) $r['id'], 'path' => $r['url'], 'url' => $r['url']],
                Database::all("SELECT id, url FROM product_images WHERE product_id=? ORDER BY position, id", [$pid]));

            // Variant rows: variants + their option links resolved to combinations.
            $variants = Database::all("SELECT * FROM product_variants WHERE product_id=? ORDER BY position, id", [$pid]);
            $links = Database::all(
                "SELECT pvo.variant_id, o.id opt_id, o.value, a.slug attr_slug
                 FROM product_variant_options pvo
                 JOIN variant_options o ON o.id = pvo.option_id
                 JOIN variant_attributes a ON a.id = o.attribute_id
                 WHERE pvo.variant_id IN (SELECT id FROM product_variants WHERE product_id=?)
                 ORDER BY a.position, o.position", [$pid]);
            $linksByVariant = [];
            foreach ($links as $l) $linksByVariant[(int) $l['variant_id']][] = $l;

            $rows = [];
            $grouped = []; // attribute_slug → set of value ids
            foreach ($variants as $i => $v) {
                $vl = $linksByVariant[(int) $v['id']] ?? [];
                if (!$vl) continue; // legacy option-less rows are not part of the matrix
                $combo = array_map(fn($l) => ['attribute_slug' => $l['attr_slug'], 'value_id' => (int) $l['opt_id']], $vl);
                $parts = array_map(fn($c) => $c['attribute_slug'] . '_' . $c['value_id'], $combo);
                sort($parts);
                $galleryPaths = json_decode((string) ($v['images'] ?? ''), true);
                $galleryPaths = is_array($galleryPaths) ? array_values(array_filter($galleryPaths)) : [];
                $main = $v['image_url'] ?: null;
                // Legacy rows stored the main image as gallery[0] too — de-dupe.
                $galleryPaths = array_values(array_filter($galleryPaths, fn($g) => $g !== $main));
                foreach ($combo as $c) $grouped[$c['attribute_slug']][$c['value_id']] = true;
                $rows[] = [
                    'row_key' => implode('|', $parts) ?: ('row_' . $i),
                    'display_name' => implode(' / ', array_map(fn($l) => $l['value'], $vl)),
                    'combination' => $combo,
                    'sku' => $v['sku'] ?? '',
                    'barcode' => $v['barcode'] ?? '',
                    'price' => $v['price'] !== null ? $v['price'] : '',
                    'compare_at_price' => $v['compare_at_price'] !== null ? $v['compare_at_price'] : '',
                    'cost_price' => $v['cost_price'] !== null ? $v['cost_price'] : '',
                    'discount_amount' => $v['discount_amount'] !== null ? $v['discount_amount'] : '',
                    'discount_type' => $v['discount_type'] ?? '',
                    'stock_quantity' => (int) $v['stock'],
                    'is_visible' => ($v['status'] ?? 'active') !== 'hidden',
                    'image_path' => $main, 'main_image_path' => $main, 'image_url' => $main,
                    'gallery_paths' => $galleryPaths,
                    'sort_order' => $i,
                ];
            }
            $multipleVariations = [];
            foreach ($grouped as $slug => $set) {
                $multipleVariations[] = ['id' => 'var_' . $slug, 'attribute_slug' => $slug, 'selected_values' => array_map('intval', array_keys($set))];
            }
            $seoRow = Database::one("SELECT * FROM product_seo WHERE product_id=?", [$pid]);

            $data = [
                'id' => $pid,
                'name_en' => $product['name'] ?? '',
                'name_ar' => $product['name_ar'] ?? '',
                'slug' => $product['slug'] ?? '',
                'sku' => $product['sku'] ?? '',
                'barcode' => $product['barcode'] ?? '',
                'short_description_en' => $product['short_description'] ?? '',
                'short_description_ar' => $product['short_description_ar'] ?? '',
                'description_en' => $product['description'] ?? '',
                'description_ar' => $product['description_ar'] ?? '',
                'is_visible' => ($product['status'] ?? 'active') === 'active',
                'is_featured' => (bool) $product['is_featured'],
                'track_inventory' => (bool) ($product['track_inventory'] ?? 1),
                'stock_quantity' => (int) $product['stock'],
                'preorder_enabled' => (bool) ($product['preorder_enabled'] ?? 0),
                'preorder_shipping_days' => $product['preorder_shipping_days'] ?? '',
                'price' => $product['price'] !== null ? $product['price'] : '',
                'compare_at_price' => $product['compare_at_price'] !== null ? $product['compare_at_price'] : '',
                'cost_price' => $product['cost_price'] !== null ? $product['cost_price'] : '',
                'discount_amount' => $product['discount_amount'] !== null ? $product['discount_amount'] : '',
                'discount_type' => $product['discount_type'] ?? '',
                'published_at' => !empty($product['published_at']) ? date('Y-m-d\TH:i', strtotime($product['published_at'])) : '',
                'brand_id' => $product['brand_id'] !== null ? (int) $product['brand_id'] : null,
                'selectedCategories' => $selCats,
                'selectedSubCategories' => $selSubs,
                'selectedSubSubCategories' => $selSubSubs,
                'selectedTags' => $tagIds,
                'gallery' => $gallery,
                'main_image_url' => $product['main_image'] ?: null,
                'hasVariations' => count($rows) > 0,
                'variantTableRows' => $rows,
                'multipleVariations' => $multipleVariations,
                'details' => $product['details'] ?? '', 'materials' => $product['materials'] ?? '',
                'care' => $product['care'] ?? '', 'dimensions' => $product['dimensions'] ?? '',
                'weight' => $product['weight'] ?? '', 'fit' => $product['fit'] ?? '',
                'badge' => $product['badge'] ?? '', 'panel' => $product['panel_hex'] ?: '#ECE7DE',
                'seo' => [
                    'metaTitle' => $seoRow['meta_title'] ?? '',
                    'metaDescription' => $seoRow['meta_description'] ?? '',
                    'ogImage' => $seoRow['og_image_url'] ?? '',
                    'canonical' => $seoRow['canonical_url'] ?? '',
                    'keywords' => $seoRow['keywords'] ?? '',
                ],
            ];
            $subOptions = self::opt(self::childCategories($selCats));
            $subSubOptions = self::opt(self::childCategories($selSubs));
        }

        // Raw shape (no ok/data envelope) — matches the lebazone contract.
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'data' => $data,
            'options' => [
                'brands' => $brands,
                'categories' => $topCats,
                'subCategories' => $subOptions,
                'subSubCategories' => $subSubOptions,
                'tags' => $tags,
                'variantAttributes' => $variantAttributes,
            ],
        ]);
        exit;
    }

    /* ================================== save ================================== */

    public static function saveCreate(): void { self::save(null); }
    public static function saveUpdate(array $p): void { self::save((int) $p['id']); }

    private static function fail(array $errors, string $message = 'The given data was invalid.'): void
    {
        http_response_code(422);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['message' => $message, 'errors' => $errors]);
        exit;
    }

    /** $_FILES single entry (or null). */
    private static function fileSingle(string $field): ?array
    {
        $f = $_FILES[$field] ?? null;
        if (!$f || !is_string($f['name'] ?? null) || ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
        return $f;
    }

    /** galleryUploads[] → list of file arrays. */
    private static function fileArray(string $field): array
    {
        $f = $_FILES[$field] ?? null;
        if (!$f || !is_array($f['name'] ?? null)) return [];
        $out = [];
        foreach ($f['name'] as $i => $name) {
            if (!is_string($name) || ($f['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
            $out[] = ['name' => $name, 'type' => $f['type'][$i], 'tmp_name' => $f['tmp_name'][$i], 'error' => $f['error'][$i], 'size' => $f['size'][$i]];
        }
        return $out;
    }

    /** variantImages[rowKey] → map rowKey → file. */
    private static function fileMap(string $field): array
    {
        $f = $_FILES[$field] ?? null;
        if (!$f || !is_array($f['name'] ?? null)) return [];
        $out = [];
        foreach ($f['name'] as $key => $name) {
            if (!is_string($name) || ($f['error'][$key] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
            $out[$key] = ['name' => $name, 'type' => $f['type'][$key], 'tmp_name' => $f['tmp_name'][$key], 'error' => $f['error'][$key], 'size' => $f['size'][$key]];
        }
        return $out;
    }

    /** variantGallery[rowKey][] → map rowKey → list of files. */
    private static function fileMapArray(string $field): array
    {
        $f = $_FILES[$field] ?? null;
        if (!$f || !is_array($f['name'] ?? null)) return [];
        $out = [];
        foreach ($f['name'] as $key => $names) {
            if (!is_array($names)) continue;
            foreach ($names as $i => $name) {
                if (!is_string($name) || ($f['error'][$key][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
                $out[$key][] = ['name' => $name, 'type' => $f['type'][$key][$i], 'tmp_name' => $f['tmp_name'][$key][$i], 'error' => $f['error'][$key][$i], 'size' => $f['size'][$key][$i]];
            }
        }
        return $out;
    }

    private static function fileMime(array $file): string
    {
        $mime = @mime_content_type($file['tmp_name']);
        return $mime ?: (string) ($file['type'] ?? '');
    }

    private static function validFileType(array $file): bool
    {
        return in_array(self::fileMime($file), ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'], true);
    }

    /**
     * Compress + store an uploaded image (lebazone HandlesImageUploads port):
     * scale to ≤2000px, walk JPEG/WEBP quality down toward the size target,
     * converting PNG→JPEG after two attempts; AVIF stored as-is. Registers the
     * file in the media table and returns its public URL.
     */
    private static function storeImage(array $file): string
    {
        $cfg = require dirname(__DIR__) . '/config.php';
        $dir = $cfg['upload_dir'];
        if (!is_dir($dir)) @mkdir($dir, 0777, true);
        $urlBase = rtrim($cfg['upload_url'], '/');

        $mime = self::fileMime($file);
        $unique = fn(string $ext) => date('Ymd') . '-' . bin2hex(random_bytes(6)) . '.' . $ext;

        $finish = function (string $filename) use ($dir, $urlBase) {
            $path = $dir . '/' . $filename;
            [$w, $h] = @getimagesize($path) ?: [null, null];
            Database::run(
                "INSERT INTO media (filename, url, mime, size, width, height) VALUES (?,?,?,?,?,?)",
                [$filename, $urlBase . '/' . $filename, @mime_content_type($path) ?: null, @filesize($path) ?: null, $w, $h]
            );
            return $urlBase . '/' . $filename;
        };

        // AVIF (or no GD): store untouched.
        if ($mime === 'image/avif' || !function_exists('imagecreatetruecolor')) {
            $filename = $unique(['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp', 'image/avif' => 'avif'][$mime] ?? 'jpg');
            move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);
            return $finish($filename);
        }

        $src = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($file['tmp_name']),
            'image/png' => @imagecreatefrompng($file['tmp_name']),
            'image/webp' => @imagecreatefromwebp($file['tmp_name']),
            'image/gif' => @imagecreatefromgif($file['tmp_name']),
            default => null,
        };
        if (!$src) { // undecodable — store raw
            $filename = $unique('jpg');
            move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);
            return $finish($filename);
        }
        imagepalettetotruecolor($src);

        $scaleTo = function ($img, int $max) {
            $w = imagesx($img); $h = imagesy($img);
            if ($w <= $max && $h <= $max) return $img;
            $ratio = min($max / $w, $max / $h);
            $nw = max(1, (int) round($w * $ratio)); $nh = max(1, (int) round($h * $ratio));
            $dst = imagecreatetruecolor($nw, $nh);
            imagecopyresampled($dst, $img, 0, 0, 0, 0, $nw, $nh, imagesx($img), imagesy($img));
            return $dst;
        };
        $img = $scaleTo($src, 2000);

        $format = $mime === 'image/webp' ? 'webp' : ($mime === 'image/png' ? 'png' : 'jpg');
        $quality = 85;
        $maxDim = max(imagesx($img), imagesy($img));
        $target = self::TARGET_KB * 1024;
        $tmpOut = tempnam(sys_get_temp_dir(), 'img');
        for ($attempt = 0; $attempt < 20; $attempt++) {
            if ($format === 'png' && $attempt >= 2) $format = 'jpg'; // PNG stubbornly large → JPEG
            if ($format === 'png') imagepng($img, $tmpOut, 6);
            elseif ($format === 'webp') imagewebp($img, $tmpOut, $quality);
            else imagejpeg($img, $tmpOut, $quality);
            if (filesize($tmpOut) <= $target) break;
            $quality -= 5;
            if ($quality < 40) { // shrink dimensions, reset quality
                $maxDim = max(400, (int) round($maxDim * 0.9));
                $img = $scaleTo($img, $maxDim);
                $quality = 75;
                if ($maxDim <= 400) break;
            }
        }
        $filename = $unique($format === 'jpg' ? 'jpg' : $format);
        rename($tmpOut, $dir . '/' . $filename);
        @chmod($dir . '/' . $filename, 0644);
        return $finish($filename);
    }

    private static function save(?int $id): void
    {
        Auth::requireAdmin();
        self::ensure();

        $product = null;
        if ($id !== null) {
            $product = Database::one("SELECT * FROM products WHERE id=?", [$id]);
            if (!$product) Response::error('Product not found', 404);
        }

        $payload = json_decode((string) ($_POST['payload'] ?? ''), true);
        if (!is_array($payload)) $payload = [];
        $hasVariations = (bool) ($payload['hasVariations'] ?? false);

        // '' → null on numeric row fields (blank table inputs must pass rules).
        $rows = is_array($payload['variantTableRows'] ?? null) ? array_values($payload['variantTableRows']) : [];
        foreach ($rows as $i => $row) {
            foreach (['price', 'compare_at_price', 'cost_price', 'discount_amount', 'stock_quantity'] as $k) {
                if (($row[$k] ?? null) === '') $rows[$i][$k] = null;
            }
        }

        /* ------------------------------ validation ------------------------------ */
        $errors = [];
        $str = fn($k) => trim((string) ($payload[$k] ?? ''));
        $numOk = fn($v) => $v === null || $v === '' || (is_numeric($v) && (float) $v >= 0);

        if ($str('name_en') === '') $errors['name_en'][] = 'The name (English) field is required.';
        elseif (mb_strlen($str('name_en')) > 200) $errors['name_en'][] = 'The name (English) may not be greater than 200 characters.';
        if ($str('name_ar') === '') $errors['name_ar'][] = 'The name (Arabic) field is required.';
        elseif (mb_strlen($str('name_ar')) > 200) $errors['name_ar'][] = 'The name (Arabic) may not be greater than 200 characters.';

        $selCats = array_values(array_filter(array_map('intval', (array) ($payload['selectedCategories'] ?? []))));
        if (!$selCats) $errors['selectedCategories'][] = 'Select at least one category.';
        $selSubs = array_values(array_filter(array_map('intval', (array) ($payload['selectedSubCategories'] ?? []))));
        $selSubSubs = array_values(array_filter(array_map('intval', (array) ($payload['selectedSubSubCategories'] ?? []))));
        $selTags = array_values(array_filter(array_map('intval', (array) ($payload['selectedTags'] ?? []))));

        $slug = $str('slug');
        if ($slug !== '' && !preg_match('/^[A-Za-z0-9_-]+$/', $slug)) $errors['slug'][] = 'The slug may only contain letters, numbers, dashes and underscores.';
        if ($slug !== '') {
            $dupe = $id ? Database::one("SELECT id FROM products WHERE slug=? AND id<>?", [self::slugify($slug), $id])
                        : Database::one("SELECT id FROM products WHERE slug=?", [self::slugify($slug)]);
            if ($dupe) $errors['slug'][] = 'The slug has already been taken.';
        }
        if (mb_strlen($str('sku')) > 80) $errors['sku'][] = 'The SKU may not be greater than 80 characters.';
        if (mb_strlen($str('barcode')) > 80) $errors['barcode'][] = 'The barcode may not be greater than 80 characters.';

        $price = $payload['price'] ?? null;
        if (!$hasVariations && ($price === null || $price === '')) $errors['price'][] = 'The price field is required.';
        elseif (!$numOk($price)) $errors['price'][] = 'The price must be a number of at least 0.';
        foreach (['compare_at_price' => 'compare at price', 'cost_price' => 'cost price', 'discount_amount' => 'discount amount'] as $k => $label) {
            if (!$numOk($payload[$k] ?? null)) $errors[$k][] = "The $label must be a number of at least 0.";
        }
        $discountType = (string) ($payload['discount_type'] ?? '');
        if ($discountType !== '' && !in_array($discountType, ['fixed', 'percent'], true)) $errors['discount_type'][] = 'The selected discount type is invalid.';

        $stockQty = $payload['stock_quantity'] ?? 0;
        if ($stockQty !== null && $stockQty !== '' && (!is_numeric($stockQty) || (int) $stockQty < 0)) $errors['stock_quantity'][] = 'The stock quantity must be an integer of at least 0.';

        $preorder = (bool) ($payload['preorder_enabled'] ?? false);
        $preDays = $payload['preorder_shipping_days'] ?? null;
        if ($preorder) {
            if ($preDays === null || $preDays === '' || !is_numeric($preDays) || (int) $preDays < 1 || (int) $preDays > 365) {
                $errors['preorder_shipping_days'][] = 'Enter the shipping days needed (1–365) for pre-orders.';
            }
        }
        $publishedAt = $str('published_at');
        if ($publishedAt !== '' && strtotime($publishedAt) === false) $errors['published_at'][] = 'The publish at field must be a valid date.';

        foreach ($rows as $i => $row) {
            foreach (['price', 'compare_at_price', 'cost_price', 'discount_amount'] as $k) {
                if (!$numOk($row[$k] ?? null)) $errors["variantTableRows.$i.$k"][] = 'Must be a number of at least 0.';
            }
            $rs = $row['stock_quantity'] ?? null;
            if ($rs !== null && $rs !== '' && (!is_numeric($rs) || (int) $rs < 0)) $errors["variantTableRows.$i.stock_quantity"][] = 'Must be an integer of at least 0.';
            $rt = (string) ($row['discount_type'] ?? '');
            if ($rt !== '' && !in_array($rt, ['fixed', 'percent'], true)) $errors["variantTableRows.$i.discount_type"][] = 'Invalid discount type.';
        }

        // ---- files ----
        $mainImage = self::fileSingle('mainImage');
        $galleryFiles = self::fileArray('galleryUploads');
        $variantMains = self::fileMap('variantImages');
        $variantGalleries = self::fileMapArray('variantGallery');

        $checkFile = function (?array $f, string $key, string $tooBig, string $badType) use (&$errors) {
            if (!$f) return;
            if (($f['error'] ?? 0) !== UPLOAD_ERR_OK) { $errors[$key][] = 'The upload failed — try again.'; return; }
            if (($f['size'] ?? 0) > self::MAX_FILE_BYTES) { $errors[$key][] = $tooBig; return; }
            if (!self::validFileType($f)) $errors[$key][] = $badType;
        };
        $checkFile($mainImage, 'mainImage', 'The main image is too large. Maximum allowed size is 10 MB.', 'The main image must be a JPG, PNG, GIF, WEBP or AVIF file.');
        foreach ($galleryFiles as $i => $f) $checkFile($f, "galleryUploads.$i", 'A gallery image is too large. Maximum allowed size is 10 MB.', 'Gallery images must be JPG, PNG, GIF, WEBP or AVIF files.');
        foreach ($variantMains as $key => $f) $checkFile($f, "variantImages.$key", 'A variant image is too large. Maximum allowed size is 10 MB.', 'Variant images must be JPG, PNG, GIF, WEBP or AVIF files.');
        foreach ($variantGalleries as $key => $list) foreach ($list as $i => $f) $checkFile($f, "variantGallery.$key.$i", 'A variant gallery image is too large. Maximum allowed size is 10 MB.', 'Variant gallery images must be JPG, PNG, GIF, WEBP or AVIF files.');

        if ($errors) self::fail($errors);

        /* --------------------- taxonomy trust filtering --------------------- */
        $existingIds = function (array $ids, ?array $parentPool = null) {
            if (!$ids) return [];
            $in = implode(',', array_fill(0, count($ids), '?'));
            $rows = Database::all("SELECT id, parent_id FROM categories WHERE id IN ($in)", $ids);
            $out = [];
            foreach ($rows as $r) {
                if ($parentPool !== null && !in_array((int) $r['parent_id'], $parentPool, true)) continue;
                $out[] = (int) $r['id'];
            }
            return $out;
        };
        $selCats = $existingIds($selCats);
        if (!$selCats) self::fail(['selectedCategories' => ['Select at least one category.']]);
        $selSubs = $existingIds($selSubs, $selCats);
        $selSubSubs = $selSubs ? $existingIds($selSubSubs, $selSubs) : [];
        if ($selTags) {
            $in = implode(',', array_fill(0, count($selTags), '?'));
            $selTags = array_map(fn($r) => (int) $r['id'], Database::all("SELECT id FROM tags WHERE id IN ($in)", $selTags));
        }

        /* -------------------------- main image (pre-tx) -------------------------- */
        $mainImageUrl = $product['main_image'] ?? null;
        if ($mainImage) $mainImageUrl = self::storeImage($mainImage);
        elseif (!empty($_POST['removeMainImage'])) $mainImageUrl = null;

        /* ------------------------------ assemble row ------------------------------ */
        $nn = fn($v) => ($v === null || $v === '') ? null : $v;
        $badge = (string) ($payload['badge'] ?? '');
        if (!in_array($badge, ['', 'New', 'Bestseller', 'Limited'], true)) $badge = '';
        $row = [
            'name' => $str('name_en'),
            'name_ar' => $str('name_ar'),
            'slug' => self::uniqueSlug($slug !== '' ? $slug : $str('name_en'), $id),
            'sku' => $nn($str('sku')),
            'barcode' => $nn($str('barcode')),
            'brand_id' => !empty($payload['brand_id']) ? (int) $payload['brand_id'] : null,
            'short_description' => $nn((string) ($payload['short_description_en'] ?? '')),
            'short_description_ar' => $nn((string) ($payload['short_description_ar'] ?? '')),
            'description' => $nn((string) ($payload['description_en'] ?? '')),
            'description_ar' => $nn((string) ($payload['description_ar'] ?? '')),
            'status' => !empty($payload['is_visible']) ? 'active' : 'draft',
            'is_featured' => !empty($payload['is_featured']) ? 1 : 0,
            'track_inventory' => !empty($payload['track_inventory']) ? 1 : 0,
            'stock' => (int) ($stockQty ?: 0),
            'preorder_enabled' => $preorder ? 1 : 0,
            'preorder_shipping_days' => $preorder ? max(1, (int) $preDays) : null,
            'price' => (float) ($nn($price) ?? 0),
            'compare_at_price' => $nn($payload['compare_at_price'] ?? null) !== null ? (float) $payload['compare_at_price'] : null,
            'cost_price' => $nn($payload['cost_price'] ?? null) !== null ? (float) $payload['cost_price'] : null,
            'discount_amount' => $nn($payload['discount_amount'] ?? null) !== null ? (float) $payload['discount_amount'] : null,
            'discount_type' => $nn($discountType),
            'published_at' => $publishedAt !== '' ? date('Y-m-d H:i:s', strtotime($publishedAt)) : null,
            'main_image' => $mainImageUrl,
            // The A Line storefront extras
            'details' => $nn((string) ($payload['details'] ?? '')),
            'materials' => $nn((string) ($payload['materials'] ?? '')),
            'care' => $nn((string) ($payload['care'] ?? '')),
            'dimensions' => $nn((string) ($payload['dimensions'] ?? '')),
            'weight' => $nn((string) ($payload['weight'] ?? '')),
            'fit' => $nn((string) ($payload['fit'] ?? '')),
            'badge' => $badge,
            'panel_hex' => $str('panel') !== '' ? $str('panel') : '#ECE7DE',
        ];

        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            if ($id === null) {
                $cols = implode(',', array_keys($row));
                $marks = implode(',', array_fill(0, count($row), '?'));
                Database::run("INSERT INTO products ($cols) VALUES ($marks)", array_values($row));
                $id = Database::lastId();
            } else {
                $sets = implode(',', array_map(fn($k) => "$k=?", array_keys($row)));
                Database::run("UPDATE products SET $sets WHERE id=?", [...array_values($row), $id]);
            }

            // Category links: all three levels, primary (first top category) first.
            Database::run("DELETE FROM product_categories WHERE product_id=?", [$id]);
            foreach (array_values(array_unique([...$selCats, ...$selSubs, ...$selSubSubs])) as $cid) {
                Database::run("INSERT IGNORE INTO product_categories (product_id, category_id) VALUES (?,?)", [$id, $cid]);
            }
            Database::run("DELETE FROM product_tags WHERE product_id=?", [$id]);
            foreach ($selTags as $tid) {
                Database::run("INSERT IGNORE INTO product_tags (product_id, tag_id) VALUES (?,?)", [$id, $tid]);
            }

            // Gallery: removals (scoped), then appended uploads.
            foreach ((array) ($payload['removedGalleryIds'] ?? []) as $gid) {
                Database::run("DELETE FROM product_images WHERE id=? AND product_id=?", [(int) $gid, $id]);
            }
            $count = (int) (Database::one("SELECT COUNT(*) c FROM product_images WHERE product_id=?", [$id])['c'] ?? 0);
            foreach ($galleryFiles as $f) {
                $url = self::storeImage($f);
                Database::run(
                    "INSERT INTO product_images (product_id, url, alt, position, is_primary) VALUES (?,?,?,?,0)",
                    [$id, $url, null, $count++]
                );
            }

            // SEO upsert.
            $seo = is_array($payload['seo'] ?? null) ? $payload['seo'] : [];
            Database::run(
                "INSERT INTO product_seo (product_id, meta_title, meta_description, og_image_url, canonical_url, keywords)
                 VALUES (?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE meta_title=VALUES(meta_title), meta_description=VALUES(meta_description),
                   og_image_url=VALUES(og_image_url), canonical_url=VALUES(canonical_url), keywords=VALUES(keywords)",
                [$id, $nn($seo['metaTitle'] ?? null), $nn($seo['metaDescription'] ?? null), $nn($seo['ogImage'] ?? null), $nn($seo['canonical'] ?? null), $nn($seo['keywords'] ?? null)]
            );

            // Variants: full delete-and-rebuild (lebazone semantics).
            Database::run("DELETE FROM product_variants WHERE product_id=?", [$id]);
            $priceCandidates = [];
            $totalStock = 0;
            if ($hasVariations) {
                // Resolve option values fresh.
                $optionRows = Database::all(
                    "SELECT o.id, o.value, o.meta, a.slug attr_slug FROM variant_options o JOIN variant_attributes a ON a.id = o.attribute_id"
                );
                $optById = [];
                foreach ($optionRows as $o) $optById[(int) $o['id']] = $o;

                foreach ($rows as $index => $vrow) {
                    $rowKey = (string) ($vrow['row_key'] ?? ('row_' . $index));
                    $optIds = [];
                    $labels = [];
                    $colorHex = null;
                    foreach ((array) ($vrow['combination'] ?? []) as $c) {
                        $vid = (int) ($c['value_id'] ?? 0);
                        $o = $optById[$vid] ?? null;
                        if (!$o) continue;
                        $optIds[] = $vid;
                        $labels[] = $o['value'];
                        if ($colorHex === null) $colorHex = self::hexOf($o['meta']);
                    }
                    $vPrice = ($vrow['price'] !== null && $vrow['price'] !== '') ? max(0, (float) $vrow['price']) : (float) $row['price'];
                    $vStock = max(0, (int) ($vrow['stock_quantity'] ?? 0));
                    $visible = !array_key_exists('is_visible', $vrow) || (bool) $vrow['is_visible'];
                    $priceCandidates[] = $vPrice;
                    if ($visible) $totalStock += $vStock;

                    // Main + gallery media: kept paths + fresh uploads.
                    $mainUrl = $vrow['image_path'] ?? $vrow['main_image_path'] ?? null;
                    if (isset($variantMains[$rowKey])) $mainUrl = self::storeImage($variantMains[$rowKey]);
                    $galleryPaths = array_values(array_filter((array) ($vrow['gallery_paths'] ?? [])));
                    foreach ($variantGalleries[$rowKey] ?? [] as $f) $galleryPaths[] = self::storeImage($f);
                    $galleryPaths = array_values(array_unique(array_filter($galleryPaths)));

                    Database::run(
                        "INSERT INTO product_variants
                         (product_id, sku, barcode, name, color_hex, price, compare_at_price, cost_price, discount_amount, discount_type, stock, image_url, images, position, status)
                         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        [
                            $id,
                            $nn(trim((string) ($vrow['sku'] ?? ''))),
                            $nn(trim((string) ($vrow['barcode'] ?? ''))),
                            $labels ? implode(' / ', $labels) : ('Variant ' . ($index + 1)),
                            $colorHex,
                            $vPrice,
                            ($vrow['compare_at_price'] !== null && $vrow['compare_at_price'] !== '') ? max(0, (float) $vrow['compare_at_price']) : null,
                            ($vrow['cost_price'] !== null && $vrow['cost_price'] !== '') ? max(0, (float) $vrow['cost_price']) : null,
                            ($vrow['discount_amount'] !== null && $vrow['discount_amount'] !== '') ? (float) $vrow['discount_amount'] : null,
                            $nn((string) ($vrow['discount_type'] ?? '')),
                            $vStock,
                            $mainUrl ?: null,
                            $galleryPaths ? json_encode($galleryPaths) : null,
                            $index,
                            $visible ? 'active' : 'hidden',
                        ]
                    );
                    $variantId = Database::lastId();
                    foreach (array_unique($optIds) as $oid) {
                        Database::run("INSERT IGNORE INTO product_variant_options (variant_id, option_id) VALUES (?,?)", [$variantId, $oid]);
                    }
                }
                // Roll-ups: price = cheapest variant, stock = sum of visible variants.
                if ($priceCandidates) {
                    Database::run("UPDATE products SET price=?, stock=? WHERE id=?", [min($priceCandidates), $totalStock, $id]);
                } else {
                    Database::run("UPDATE products SET stock=0 WHERE id=?", [$id]);
                }
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            error_log('Product save failed: ' . $e->getMessage());
            self::fail(['form' => ['Unable to save product. Please try again.']], 'Unable to save product.');
        }

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => true, 'redirect_url' => '/admin/products', 'product' => ['id' => (int) $id]]);
        exit;
    }
}
