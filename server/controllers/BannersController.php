<?php
class BannersController
{
    private static function shape(array $b): array
    {
        return [
            'id' => (int) $b['id'], 'title' => $b['title'], 'subtitle' => $b['subtitle'],
            'image' => $b['image_url'], 'link' => $b['link_url'], 'linkLabel' => $b['link_label'],
            'placement' => $b['placement'], 'position' => (int) $b['position'], 'status' => $b['status'],
        ];
    }
    public static function index(): void
    {
        $place = Request::query('placement');
        $where = "status='active'"; $args = [];
        if ($place) { $where .= " AND placement=?"; $args[] = $place; }
        Response::ok(array_map([self::class, 'shape'], Database::all("SELECT * FROM banners WHERE $where ORDER BY position", $args)));
    }
    public static function adminIndex(): void
    {
        Auth::requireAdmin();
        Response::ok(array_map([self::class, 'shape'], Database::all("SELECT * FROM banners ORDER BY placement, position")));
    }
    public static function create(): void
    {
        Auth::requireAdmin();
        $b = Request::body();
        Database::run("INSERT INTO banners (title,subtitle,image_url,link_url,link_label,placement,position,status) VALUES (?,?,?,?,?,?,?,?)",
            [$b['title'] ?? null, $b['subtitle'] ?? null, $b['image'] ?? null, $b['link'] ?? null, $b['linkLabel'] ?? null, $b['placement'] ?? 'home', (int) ($b['position'] ?? 0), $b['status'] ?? 'active']);
        Response::created(self::shape(Database::one("SELECT * FROM banners WHERE id=?", [Database::lastId()])));
    }
    public static function update(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        $b = Request::body();
        $set = []; $args = [];
        foreach (['title' => 'title', 'subtitle' => 'subtitle', 'image' => 'image_url', 'link' => 'link_url', 'linkLabel' => 'link_label', 'placement' => 'placement', 'status' => 'status'] as $in => $col) {
            if (array_key_exists($in, $b)) { $set[] = "$col=?"; $args[] = $b[$in]; }
        }
        if (array_key_exists('position', $b)) { $set[] = "position=?"; $args[] = (int) $b['position']; }
        if ($set) { $args[] = $id; Database::run("UPDATE banners SET " . implode(',', $set) . " WHERE id=?", $args); }
        Response::ok(self::shape(Database::one("SELECT * FROM banners WHERE id=?", [$id])));
    }
    public static function destroy(array $p): void
    {
        Auth::requireAdmin();
        Database::run("DELETE FROM banners WHERE id=?", [(int) $p['id']]);
        Response::ok(['deleted' => (int) $p['id']]);
    }
}
