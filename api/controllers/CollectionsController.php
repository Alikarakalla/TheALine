<?php
class CollectionsController
{
    private static function slugify(string $s): string
    {
        $s = strtolower(trim($s));
        $s = preg_replace('/[^a-z0-9]+/', '-', $s);
        return trim($s, '-') ?: 'collection';
    }
    private static function uniqueSlug(string $base, ?int $ignore = null): string
    {
        $slug = $base; $i = 2;
        while (Database::one("SELECT id FROM collections WHERE slug=?" . ($ignore ? " AND id<>?" : ""), $ignore ? [$slug, $ignore] : [$slug])) {
            $slug = $base . '-' . $i++;
        }
        return $slug;
    }

    private static function decodeRules($raw): array
    {
        if (!$raw) return [];
        $r = json_decode($raw, true);
        return is_array($r) ? $r : [];
    }

    /* ---- smart-rule → SQL ---- */
    private static function textClause(string $col, string $op, string $v): array
    {
        switch ($op) {
            case 'neq': return ["$col<>?", [$v]];
            case 'contains': return ["$col LIKE ?", ["%$v%"]];
            case 'starts': return ["$col LIKE ?", ["$v%"]];
            case 'ends': return ["$col LIKE ?", ["%$v"]];
            default: return ["$col=?", [$v]];
        }
    }
    private static function numClause(string $col, string $op, $v): array
    {
        $n = (float) $v;
        switch ($op) {
            case 'neq': return ["$col<>?", [$n]];
            case 'gt': return ["$col>?", [$n]];
            case 'lt': return ["$col<?", [$n]];
            default: return ["$col=?", [$n]];
        }
    }
    /** [whereClause, args] for smart rules — '1=0' when smart with no usable rules. */
    private static function smartWhere(array $rules, string $matchType): array
    {
        $clauses = []; $args = [];
        foreach ($rules as $rule) {
            if (!is_array($rule)) continue;
            $field = $rule['field'] ?? ''; $op = $rule['op'] ?? 'eq'; $val = (string) ($rule['value'] ?? '');
            if ($val === '' && !in_array($field, ['price', 'stock'], true)) continue;
            $c = null; $a = [];
            if ($field === 'title')      { [$c, $a] = self::textClause('p.name', $op, $val); }
            elseif ($field === 'price')  { [$c, $a] = self::numClause('p.price', $op, $val); }
            elseif ($field === 'stock')  { [$c, $a] = self::numClause('p.stock', $op, $val); }
            elseif ($field === 'brand')  { $e = "EXISTS (SELECT 1 FROM brands b WHERE b.id=p.brand_id AND b.name=?)"; $c = $op === 'neq' ? "NOT $e" : $e; $a = [$val]; }
            elseif ($field === 'tag')    { $e = "EXISTS (SELECT 1 FROM product_tags pt JOIN tags t ON t.id=pt.tag_id WHERE pt.product_id=p.id AND t.name=?)"; $c = $op === 'neq' ? "NOT $e" : $e; $a = [$val]; }
            elseif ($field === 'category') { $e = "EXISTS (SELECT 1 FROM product_categories pc JOIN categories c ON c.id=pc.category_id WHERE pc.product_id=p.id AND (c.name=? OR c.slug=?))"; $c = $op === 'neq' ? "NOT $e" : $e; $a = [$val, $val]; }
            if ($c) { $clauses[] = $c; $args = array_merge($args, $a); }
        }
        if (!$clauses) return ['1=0', []];
        return ['(' . implode($matchType === 'any' ? ' OR ' : ' AND ', $clauses) . ')', $args];
    }

    /** Resolve product rows for a collection (active products only by default). */
    private static function resolve(array $c, bool $activeOnly = true): array
    {
        if ($c['type'] === 'smart') {
            [$w, $args] = self::smartWhere(self::decodeRules($c['rules']), $c['match_type']);
            $base = $activeOnly ? "p.status='active' AND " : "";
            return Database::all("SELECT p.id, p.slug, p.name FROM products p WHERE $base$w ORDER BY p.position, p.id", $args);
        }
        $base = $activeOnly ? " AND p.status='active'" : "";
        return Database::all(
            "SELECT p.id, p.slug, p.name FROM product_collections pc JOIN products p ON p.id=pc.product_id
             WHERE pc.collection_id=?$base ORDER BY p.position, p.id",
            [(int) $c['id']]
        );
    }

    private static function shape(array $c, bool $heavy = true): array
    {
        $out = [
            'id' => (int) $c['id'],
            'title' => $c['title'],
            'slug' => $c['slug'],
            'description' => $c['description'],
            'image' => $c['image_url'],
            'type' => $c['type'],
            'matchType' => $c['match_type'],
            'rules' => self::decodeRules($c['rules'] ?? null),
            'status' => $c['status'],
            'position' => (int) $c['position'],
        ];
        if ($heavy) {
            $out['productCount'] = count(self::resolve($c, false));
            $out['productIds'] = array_map(
                fn($r) => (int) $r['product_id'],
                Database::all("SELECT product_id FROM product_collections WHERE collection_id=?", [(int) $c['id']])
            );
        }
        return $out;
    }

    /** Public: active collections (for nav / index). */
    public static function index(): void
    {
        $rows = Database::all("SELECT * FROM collections WHERE status='active' ORDER BY position, title");
        Response::ok(array_map(fn($c) => self::shape($c), $rows));
    }

    /** Public: one collection + its resolved (active) product slugs. */
    public static function show(array $p): void
    {
        $c = Database::one("SELECT * FROM collections WHERE slug=?", [$p['slug']]);
        if (!$c || $c['status'] !== 'active') Response::error('Collection not found', 404);
        $prods = self::resolve($c, true);
        $out = self::shape($c, false);
        $out['productSlugs'] = array_map(fn($r) => $r['slug'], $prods);
        $out['productCount'] = count($prods);
        Response::ok($out);
    }

    public static function adminIndex(): void
    {
        Auth::requireAdmin();
        Response::ok(array_map(fn($c) => self::shape($c), Database::all("SELECT * FROM collections ORDER BY position, title")));
    }

    public static function create(): void
    {
        Auth::requireAdmin();
        $b = Request::body();
        if (empty($b['title'])) Response::error('Title is required', 422);
        $slug = self::uniqueSlug(self::slugify($b['slug'] ?? $b['title']));
        $type = ($b['type'] ?? 'manual') === 'smart' ? 'smart' : 'manual';
        Database::run(
            "INSERT INTO collections (title,slug,description,image_url,type,match_type,rules,status,position) VALUES (?,?,?,?,?,?,?,?,?)",
            [
                $b['title'], $slug, $b['description'] ?? null, $b['image'] ?? null, $type,
                ($b['matchType'] ?? 'all') === 'any' ? 'any' : 'all',
                isset($b['rules']) ? json_encode($b['rules']) : null,
                $b['status'] ?? 'active', (int) ($b['position'] ?? 0),
            ]
        );
        $id = Database::lastId();
        self::syncManual($id, $type, $b);
        Response::created(self::shape(Database::one("SELECT * FROM collections WHERE id=?", [$id])));
    }

    public static function update(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        $c = Database::one("SELECT * FROM collections WHERE id=?", [$id]);
        if (!$c) Response::error('Not found', 404);
        $b = Request::body();
        $set = []; $args = [];
        if (array_key_exists('title', $b)) { $set[] = "title=?"; $args[] = $b['title']; }
        if (array_key_exists('description', $b)) { $set[] = "description=?"; $args[] = $b['description']; }
        if (array_key_exists('image', $b)) { $set[] = "image_url=?"; $args[] = $b['image']; }
        if (array_key_exists('type', $b)) { $set[] = "type=?"; $args[] = $b['type'] === 'smart' ? 'smart' : 'manual'; }
        if (array_key_exists('matchType', $b)) { $set[] = "match_type=?"; $args[] = $b['matchType'] === 'any' ? 'any' : 'all'; }
        if (array_key_exists('rules', $b)) { $set[] = "rules=?"; $args[] = json_encode($b['rules']); }
        if (array_key_exists('status', $b)) { $set[] = "status=?"; $args[] = $b['status']; }
        if (array_key_exists('position', $b)) { $set[] = "position=?"; $args[] = (int) $b['position']; }
        if (!empty($b['slug'])) { $set[] = "slug=?"; $args[] = self::uniqueSlug(self::slugify($b['slug']), $id); }
        if ($set) { $args[] = $id; Database::run("UPDATE collections SET " . implode(',', $set) . " WHERE id=?", $args); }
        $type = ($b['type'] ?? $c['type']) === 'smart' ? 'smart' : 'manual';
        self::syncManual($id, $type, $b);
        Response::ok(self::shape(Database::one("SELECT * FROM collections WHERE id=?", [$id])));
    }

    public static function destroy(array $p): void
    {
        Auth::requireAdmin();
        Database::run("DELETE FROM collections WHERE id=?", [(int) $p['id']]);
        Response::ok(['deleted' => (int) $p['id']]);
    }

    /** Manual membership sync. Smart collections never store manual links. */
    private static function syncManual(int $id, string $type, array $b): void
    {
        if ($type === 'smart') { Database::run("DELETE FROM product_collections WHERE collection_id=?", [$id]); return; }
        if (array_key_exists('productIds', $b) && is_array($b['productIds'])) {
            Database::run("DELETE FROM product_collections WHERE collection_id=?", [$id]);
            foreach (array_unique(array_map('intval', $b['productIds'])) as $pid) {
                if ($pid && Database::one("SELECT id FROM products WHERE id=?", [$pid])) {
                    Database::run("INSERT IGNORE INTO product_collections (product_id,collection_id) VALUES (?,?)", [$pid, $id]);
                }
            }
        }
    }
}
