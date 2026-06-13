<?php
class FavoritesController
{
    /** Returns the customer's favorite product slugs (the storefront keys products by slug). */
    public static function index(): void
    {
        $cid = Auth::requireCustomer();
        $rows = Database::all(
            "SELECT p.slug FROM customer_favorites f JOIN products p ON p.id=f.product_id WHERE f.customer_id=? ORDER BY f.created_at DESC",
            [$cid]
        );
        Response::ok(array_map(fn($r) => $r['slug'], $rows));
    }

    public static function add(): void
    {
        $cid = Auth::requireCustomer();
        $slug = (string) Request::input('productId', '');
        $p = Database::one("SELECT id FROM products WHERE slug=? OR id=?", [$slug, (int) $slug]);
        if (!$p) Response::error('Product not found', 404);
        Database::run("INSERT IGNORE INTO customer_favorites (customer_id,product_id) VALUES (?,?)", [$cid, $p['id']]);
        Response::ok(['ok' => true]);
    }

    public static function remove(array $params): void
    {
        $cid = Auth::requireCustomer();
        $slug = (string) ($params['id'] ?? '');
        $p = Database::one("SELECT id FROM products WHERE slug=? OR id=?", [$slug, (int) $slug]);
        if ($p) Database::run("DELETE FROM customer_favorites WHERE customer_id=? AND product_id=?", [$cid, $p['id']]);
        Response::ok(['ok' => true]);
    }
}
