<?php
class CustomersController
{
    public static function adminIndex(): void
    {
        Auth::requireAdmin();
        $q = Request::query('q');
        $where = '1=1'; $args = [];
        if ($q) { $where = "(name LIKE ? OR email LIKE ?)"; $args = ["%$q%", "%$q%"]; }
        $rows = Database::all(
            "SELECT c.*,
               (SELECT COUNT(*) FROM orders o WHERE o.customer_id=c.id) orders_count,
               (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.customer_id=c.id) total_spent
             FROM customers c WHERE $where ORDER BY c.created_at DESC",
            $args
        );
        Response::ok(array_map(fn($c) => [
            'id' => (int) $c['id'],
            'name' => $c['name'],
            'email' => $c['email'],
            'phone' => $c['phone'],
            'status' => $c['status'],
            'ordersCount' => (int) $c['orders_count'],
            'totalSpent' => (float) $c['total_spent'],
            'createdAt' => $c['created_at'],
        ], $rows));
    }

    public static function adminShow(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        $c = Database::one("SELECT * FROM customers WHERE id=?", [$id]);
        if (!$c) Response::error('Customer not found', 404);
        $orders = Database::all("SELECT number,status,total,created_at FROM orders WHERE customer_id=? ORDER BY created_at DESC", [$id]);
        $loyalty = Database::one("SELECT points,lifetime_spend,referral_code FROM loyalty_accounts WHERE customer_id=?", [$id]);
        $addresses = Database::all("SELECT label,full_name,line1,city,postcode,country FROM customer_addresses WHERE customer_id=?", [$id]);
        Response::ok([
            'id' => $id, 'name' => $c['name'], 'email' => $c['email'], 'phone' => $c['phone'],
            'status' => $c['status'], 'createdAt' => $c['created_at'],
            'loyalty' => $loyalty ? ['points' => (int) $loyalty['points'], 'lifetimeSpend' => (float) $loyalty['lifetime_spend'], 'referralCode' => $loyalty['referral_code']] : null,
            'orders' => array_map(fn($o) => ['number' => $o['number'], 'status' => $o['status'], 'total' => (float) $o['total'], 'createdAt' => $o['created_at']], $orders),
            'addresses' => $addresses,
        ]);
    }

    public static function updateStatus(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        $status = Request::input('status');
        if (!in_array($status, ['active','blocked'], true)) Response::error('Invalid status', 422);
        Database::run("UPDATE customers SET status=? WHERE id=?", [$status, $id]);
        Response::ok(['id' => $id, 'status' => $status]);
    }
}
