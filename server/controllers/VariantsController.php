<?php
class VariantsController
{
    private static function shape(array $a): array
    {
        $opts = Database::all("SELECT id, value, meta, position FROM variant_options WHERE attribute_id=? ORDER BY position, id", [$a['id']]);
        return [
            'id' => (int) $a['id'],
            'name' => $a['name'],
            'slug' => $a['slug'],
            'position' => (int) $a['position'],
            'options' => array_map(fn($o) => [
                'id' => (int) $o['id'], 'value' => $o['value'], 'meta' => $o['meta'], 'position' => (int) $o['position'],
            ], $opts),
        ];
    }

    public static function adminIndex(): void
    {
        Auth::requireAdmin();
        $rows = Database::all("SELECT * FROM variant_attributes ORDER BY position, id");
        Response::ok(array_map([self::class, 'shape'], $rows));
    }

    public static function createAttribute(): void
    {
        Auth::requireAdmin();
        $b = Request::body();
        if (empty($b['name'])) Response::error('Name required', 422);
        $slug = Util::uniqueSlug('variant_attributes', Util::slugify($b['name']));
        Database::run("INSERT INTO variant_attributes (name,slug,position) VALUES (?,?,?)", [$b['name'], $slug, (int) ($b['position'] ?? 0)]);
        $id = Database::lastId();
        // optional inline options
        if (!empty($b['options']) && is_array($b['options'])) {
            foreach (array_values($b['options']) as $i => $o) {
                $val = is_array($o) ? ($o['value'] ?? '') : $o;
                if ($val === '') continue;
                Database::run("INSERT INTO variant_options (attribute_id,value,meta,position) VALUES (?,?,?,?)", [$id, $val, is_array($o) ? ($o['meta'] ?? null) : null, $i]);
            }
        }
        Response::created(self::shape(Database::one("SELECT * FROM variant_attributes WHERE id=?", [$id])));
    }

    public static function updateAttribute(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        $b = Request::body();
        if (empty($b['name'])) Response::error('Name required', 422);
        Database::run("UPDATE variant_attributes SET name=?, slug=? WHERE id=?", [$b['name'], Util::uniqueSlug('variant_attributes', Util::slugify($b['name']), $id), $id]);
        Response::ok(self::shape(Database::one("SELECT * FROM variant_attributes WHERE id=?", [$id])));
    }

    public static function deleteAttribute(array $p): void
    {
        Auth::requireAdmin();
        Database::run("DELETE FROM variant_attributes WHERE id=?", [(int) $p['id']]);
        Response::ok(['deleted' => (int) $p['id']]);
    }

    public static function createOption(array $p): void
    {
        Auth::requireAdmin();
        $attrId = (int) $p['id'];
        $b = Request::body();
        if (empty($b['value'])) Response::error('Value required', 422);
        $pos = (int) (Database::one("SELECT COALESCE(MAX(position),-1)+1 n FROM variant_options WHERE attribute_id=?", [$attrId])['n'] ?? 0);
        Database::run("INSERT INTO variant_options (attribute_id,value,meta,position) VALUES (?,?,?,?)", [$attrId, $b['value'], $b['meta'] ?? null, $pos]);
        Response::created(['id' => Database::lastId()]);
    }

    public static function updateOption(array $p): void
    {
        Auth::requireAdmin();
        $b = Request::body();
        $set = []; $args = [];
        if (array_key_exists('value', $b)) { $set[] = "value=?"; $args[] = $b['value']; }
        if (array_key_exists('meta', $b)) { $set[] = "meta=?"; $args[] = $b['meta']; }
        if ($set) { $args[] = (int) $p['oid']; Database::run("UPDATE variant_options SET " . implode(',', $set) . " WHERE id=?", $args); }
        Response::ok(['id' => (int) $p['oid']]);
    }

    public static function deleteOption(array $p): void
    {
        Auth::requireAdmin();
        Database::run("DELETE FROM variant_options WHERE id=?", [(int) $p['oid']]);
        Response::ok(['deleted' => (int) $p['oid']]);
    }
}
