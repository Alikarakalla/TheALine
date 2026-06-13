<?php
class TagsController
{
    private static function shape(array $t): array
    {
        return ['id' => (int) $t['id'], 'name' => $t['name'], 'slug' => $t['slug'], 'productCount' => (int) ($t['product_count'] ?? 0)];
    }
    public static function adminIndex(): void
    {
        Auth::requireAdmin();
        $rows = Database::all("SELECT t.*, (SELECT COUNT(*) FROM product_tags pt WHERE pt.tag_id=t.id) product_count FROM tags t ORDER BY t.name");
        Response::ok(array_map([self::class, 'shape'], $rows));
    }
    public static function create(): void
    {
        Auth::requireAdmin();
        $b = Request::body();
        if (empty($b['name'])) Response::error('Name required', 422);
        $slug = Util::uniqueSlug('tags', Util::slugify($b['slug'] ?? $b['name']));
        Database::run("INSERT INTO tags (name,slug) VALUES (?,?)", [$b['name'], $slug]);
        Response::created(self::shape(Database::one("SELECT *,0 product_count FROM tags WHERE id=?", [Database::lastId()])));
    }
    public static function update(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        $b = Request::body();
        if (empty($b['name'])) Response::error('Name required', 422);
        Database::run("UPDATE tags SET name=?, slug=? WHERE id=?", [$b['name'], Util::uniqueSlug('tags', Util::slugify($b['name']), $id), $id]);
        Response::ok(self::shape(Database::one("SELECT *,0 product_count FROM tags WHERE id=?", [$id])));
    }
    public static function destroy(array $p): void
    {
        Auth::requireAdmin();
        Database::run("DELETE FROM tags WHERE id=?", [(int) $p['id']]);
        Response::ok(['deleted' => (int) $p['id']]);
    }
}
