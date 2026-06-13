<?php
class SeoController
{
    public static function adminGet(): void
    {
        Auth::requireAdmin();
        $rows = Database::all("SELECT item_key, item_value FROM settings WHERE group_key='seo'");
        $seo = [];
        foreach ($rows as $r) $seo[$r['item_key']] = $r['item_value'];
        $redirects = Database::all("SELECT id, from_path, to_path, code FROM seo_redirects ORDER BY id DESC");
        $pages = Database::all("SELECT id, slug, title, meta_title, meta_description, status FROM pages ORDER BY slug");
        Response::ok(['seo' => $seo, 'redirects' => $redirects, 'pages' => $pages]);
    }
    public static function update(): void
    {
        Auth::requireAdmin();
        $seo = Request::input('seo', []);
        foreach ((array) $seo as $k => $v) {
            Database::run("INSERT INTO settings (group_key,item_key,item_value) VALUES ('seo',?,?) ON DUPLICATE KEY UPDATE item_value=VALUES(item_value)", [$k, (string) $v]);
        }
        Response::ok(['updated' => count((array) $seo)]);
    }
    public static function createRedirect(): void
    {
        Auth::requireAdmin();
        $b = Request::body();
        if (empty($b['from']) || empty($b['to'])) Response::error('From and to required', 422);
        Database::run("INSERT INTO seo_redirects (from_path,to_path,code) VALUES (?,?,?)", [$b['from'], $b['to'], (int) ($b['code'] ?? 301)]);
        Response::created(['id' => Database::lastId()]);
    }
    public static function deleteRedirect(array $p): void
    {
        Auth::requireAdmin();
        Database::run("DELETE FROM seo_redirects WHERE id=?", [(int) $p['id']]);
        Response::ok(['deleted' => (int) $p['id']]);
    }
    /** Pages content (FAQ/About/Shipping). */
    public static function updatePage(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        $b = Request::body();
        $set = []; $args = [];
        foreach (['title' => 'title', 'content' => 'content', 'status' => 'status', 'metaTitle' => 'meta_title', 'metaDescription' => 'meta_description'] as $in => $col) {
            if (array_key_exists($in, $b)) { $set[] = "$col=?"; $args[] = $b[$in]; }
        }
        if ($set) { $args[] = $id; Database::run("UPDATE pages SET " . implode(',', $set) . " WHERE id=?", $args); }
        Response::ok(['id' => $id]);
    }
}
