<?php
class InventoryController
{
    public static function adminIndex(): void
    {
        Auth::requireAdmin();
        $rows = Database::all("SELECT id,name,sku,stock,status FROM products ORDER BY name");
        $out = array_map(function ($p) {
            $variants = Database::all("SELECT id,name,stock FROM product_variants WHERE product_id=? ORDER BY position", [$p['id']]);
            $img = Database::one("SELECT url FROM product_images WHERE product_id=? ORDER BY position LIMIT 1", [$p['id']]);
            return [
                'id' => (int) $p['id'], 'name' => $p['name'], 'sku' => $p['sku'],
                'stock' => (int) $p['stock'], 'status' => $p['status'],
                'image' => $img['url'] ?? null,
                'variants' => array_map(fn($v) => ['id' => (int) $v['id'], 'name' => $v['name'], 'stock' => (int) $v['stock']], $variants),
            ];
        }, $rows);
        Response::ok($out);
    }

    /** PUT /admin/inventory/{id} { stock, reason } — sets product stock + logs movement. */
    public static function adjust(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        $row = Database::one("SELECT stock FROM products WHERE id=?", [$id]);
        if (!$row) Response::error('Product not found', 404);
        $newStock = (int) Request::input('stock', $row['stock']);
        $delta = $newStock - (int) $row['stock'];
        Database::run("UPDATE products SET stock=? WHERE id=?", [$newStock, $id]);
        if ($delta !== 0) {
            Database::run("INSERT INTO stock_movements (product_id,change_qty,reason,reference) VALUES (?,?,?,?)",
                [$id, $delta, Request::input('reason', 'Manual adjustment'), 'admin']);
        }
        Response::ok(['id' => $id, 'stock' => $newStock]);
    }

    public static function movements(array $p): void
    {
        Auth::requireAdmin();
        $rows = Database::all("SELECT change_qty,reason,reference,created_at FROM stock_movements WHERE product_id=? ORDER BY created_at DESC LIMIT 50", [(int) $p['id']]);
        Response::ok($rows);
    }
}
