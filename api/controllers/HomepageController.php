<?php
class HomepageController
{
    private static function shape(array $s): array
    {
        return [
            'id' => (int) $s['id'], 'key' => $s['section_key'], 'title' => $s['title'],
            'enabled' => (bool) $s['enabled'], 'position' => (int) $s['position'],
            'data' => json_decode($s['data'] ?: '{}', true),
        ];
    }
    /** Public: enabled sections for the storefront. */
    public static function index(): void
    {
        $rows = Database::all("SELECT * FROM homepage_sections WHERE enabled=1 ORDER BY position");
        $out = [];
        foreach ($rows as $r) $out[$r['section_key']] = self::shape($r)['data'];
        Response::ok($out);
    }
    public static function adminIndex(): void
    {
        Auth::requireAdmin();
        Response::ok(array_map([self::class, 'shape'], Database::all("SELECT * FROM homepage_sections ORDER BY position")));
    }
    public static function update(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        $b = Request::body();
        $set = []; $args = [];
        if (array_key_exists('title', $b)) { $set[] = "title=?"; $args[] = $b['title']; }
        if (array_key_exists('enabled', $b)) { $set[] = "enabled=?"; $args[] = $b['enabled'] ? 1 : 0; }
        if (array_key_exists('position', $b)) { $set[] = "position=?"; $args[] = (int) $b['position']; }
        if (array_key_exists('data', $b)) { $set[] = "data=?"; $args[] = json_encode($b['data']); }
        if ($set) { $args[] = $id; Database::run("UPDATE homepage_sections SET " . implode(',', $set) . " WHERE id=?", $args); }
        Response::ok(self::shape(Database::one("SELECT * FROM homepage_sections WHERE id=?", [$id])));
    }
}
