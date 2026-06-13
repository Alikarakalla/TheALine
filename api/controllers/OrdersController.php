<?php
class OrdersController
{
    private static function shapeRow(array $o): array
    {
        return [
            'id' => (int) $o['id'],
            'number' => $o['number'],
            'email' => $o['email'],
            'name' => $o['name'],
            'status' => $o['status'],
            'subtotal' => (float) $o['subtotal'],
            'discount' => (float) $o['discount'],
            'shipping' => (float) $o['shipping'],
            'total' => (float) $o['total'],
            'currency' => $o['currency'],
            'pointsEarned' => (int) $o['points_earned'],
            'pointsRedeemed' => (int) $o['points_redeemed'],
            'trackingNumber' => $o['tracking_number'],
            'createdAt' => $o['created_at'],
            'itemCount' => (int) ($o['item_count'] ?? 0),
        ];
    }

    public static function adminIndex(): void
    {
        Auth::requireAdmin();
        $where = ['1=1']; $args = [];
        if ($s = Request::query('status')) { $where[] = "o.status=?"; $args[] = $s; }
        if ($q = Request::query('q')) { $where[] = "(o.number LIKE ? OR o.email LIKE ? OR o.name LIKE ?)"; $args[] = "%$q%"; $args[] = "%$q%"; $args[] = "%$q%"; }
        $rows = Database::all(
            "SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id=o.id) item_count
             FROM orders o WHERE " . implode(' AND ', $where) . " ORDER BY o.created_at DESC",
            $args
        );
        Response::ok(array_map([self::class, 'shapeRow'], $rows));
    }

    /** Full order detail (items + history), shared by admin and customer views. */
    private static function detail(array $o): array
    {
        $items = Database::all(
            "SELECT oi.id, oi.name, oi.color_name, oi.color_hex, oi.unit_price, oi.qty, oi.line_total, oi.image_url, p.slug AS product_slug
             FROM order_items oi LEFT JOIN products p ON p.id=oi.product_id WHERE oi.order_id=?",
            [$o['id']]
        );
        $history = Database::all("SELECT status,note,created_at FROM order_status_history WHERE order_id=? ORDER BY created_at ASC", [$o['id']]);
        $out = self::shapeRow($o);
        $out['shippingMethod'] = $o['shipping_method'];
        $out['shippingAddress'] = $o['shipping_address'] ? json_decode($o['shipping_address'], true) : null;
        $out['gift'] = $o['gift_is'] ? ['note' => $o['gift_note'], 'wrap' => (bool) $o['gift_wrap']] : null;
        $out['items'] = array_map(fn($i) => [
            'id' => (int) $i['id'], 'productId' => $i['product_slug'], 'name' => $i['name'],
            'colorName' => $i['color_name'], 'colorHex' => $i['color_hex'],
            'unitPrice' => (float) $i['unit_price'], 'qty' => (int) $i['qty'], 'lineTotal' => (float) $i['line_total'], 'image' => $i['image_url'],
        ], $items);
        $out['history'] = $history;
        return $out;
    }

    public static function adminShow(array $p): void
    {
        Auth::requireAdmin();
        $o = Database::one("SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id=o.id) item_count FROM orders o WHERE o.id=?", [(int) $p['id']]);
        if (!$o) Response::error('Order not found', 404);
        Response::ok(self::detail($o));
    }

    /** Customer: their own order history (with items, for the account page). */
    public static function customerIndex(): void
    {
        $cid = Auth::requireCustomer();
        $rows = Database::all(
            "SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id=o.id) item_count
             FROM orders o WHERE o.customer_id=? ORDER BY o.created_at DESC",
            [$cid]
        );
        Response::ok(array_map([self::class, 'detail'], $rows));
    }

    /** Customer: a single order by number (must belong to them). */
    public static function customerShow(array $p): void
    {
        $cid = Auth::requireCustomer();
        $o = Database::one("SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id=o.id) item_count FROM orders o WHERE o.number=? AND o.customer_id=?", [(string) $p['number'], $cid]);
        if (!$o) Response::error('Order not found', 404);
        Response::ok(self::detail($o));
    }

    public static function updateStatus(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        $status = Request::input('status');
        $allowed = ['pending','paid','processing','shipped','delivered','cancelled','refunded'];
        if (!in_array($status, $allowed, true)) Response::error('Invalid status', 422);
        $o = Database::one("SELECT id FROM orders WHERE id=?", [$id]);
        if (!$o) Response::error('Order not found', 404);
        Database::run("UPDATE orders SET status=? WHERE id=?", [$status, $id]);
        Database::run("INSERT INTO order_status_history (order_id,status,note) VALUES (?,?,?)", [$id, $status, Request::input('note')]);
        Response::ok(['id' => $id, 'status' => $status]);
    }

    /** Public: create an order (checkout). Links to the signed-in customer when present. */
    public static function create(): void
    {
        $b = Request::body();
        $items = $b['items'] ?? [];
        if (!is_array($items) || count($items) === 0) Response::error('No items', 422);

        // Prefer the authenticated customer; otherwise link/create by email.
        $auth = Auth::customer();
        $customerId = null;
        if ($auth) {
            $customerId = (int) $auth['sub'];
            $email = $b['email'] ?? $auth['email'] ?? '';
        } else {
            $email = $b['email'] ?? '';
            if (!$email) Response::error('Email required', 422);
            $cust = Database::one("SELECT id FROM customers WHERE email=?", [$email]);
            $customerId = $cust['id'] ?? null;
            if (!$customerId) {
                Database::run("INSERT INTO customers (name,email) VALUES (?,?)", [$b['name'] ?? '', $email]);
                $customerId = Database::lastId();
            }
        }

        $number = $b['number'] ?? ('LB-' . strtoupper(substr(md5(uniqid('', true)), 0, 6)));
        Database::run(
            "INSERT INTO orders (number,customer_id,email,name,status,subtotal,discount,shipping,tax,total,currency,coupon_code,points_earned,points_redeemed,gift_is,gift_note,gift_wrap,shipping_method,shipping_address,tracking_number)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                $number, $customerId, $email, $b['name'] ?? '', $b['status'] ?? 'paid',
                (float) ($b['subtotal'] ?? 0), (float) ($b['discount'] ?? 0), (float) ($b['shipping'] ?? 0), (float) ($b['tax'] ?? 0), (float) ($b['total'] ?? 0),
                $b['currency'] ?? 'EUR', $b['couponCode'] ?? null, (int) ($b['pointsEarned'] ?? 0), (int) ($b['pointsRedeemed'] ?? 0),
                !empty($b['gift']) ? 1 : 0, $b['gift']['note'] ?? null, !empty($b['gift']['wrap']) ? 1 : 0,
                $b['shippingMethod'] ?? null, isset($b['shippingAddress']) ? json_encode($b['shippingAddress']) : null,
                $b['trackingNumber'] ?? null,
            ]
        );
        $oid = Database::lastId();
        foreach ($items as $it) {
            $qty = (int) ($it['qty'] ?? 1);
            $price = (float) ($it['price'] ?? $it['unitPrice'] ?? 0);
            // Cart items carry the product slug; resolve it to the DB id for the FK.
            $pid = null;
            if (!empty($it['productId'])) {
                $row = Database::one("SELECT id FROM products WHERE slug=? OR id=?", [$it['productId'], (int) $it['productId']]);
                $pid = $row['id'] ?? null;
            }
            Database::run(
                "INSERT INTO order_items (order_id,product_id,name,color_name,color_hex,unit_price,qty,line_total,image_url) VALUES (?,?,?,?,?,?,?,?,?)",
                [$oid, $pid, $it['name'] ?? '', $it['colorName'] ?? null, $it['colorHex'] ?? null, $price, $qty, $price * $qty, $it['image'] ?? null]
            );
        }
        Database::run("INSERT INTO order_status_history (order_id,status,note) VALUES (?,?, 'Order placed')", [$oid, $b['status'] ?? 'paid']);

        // Loyalty: accrue points + lifetime spend for registered customers.
        $pointsEarned = (int) ($b['pointsEarned'] ?? 0);
        $pointsRedeemed = (int) ($b['pointsRedeemed'] ?? 0);
        if ($customerId) {
            $acc = Database::one("SELECT * FROM loyalty_accounts WHERE customer_id=?", [$customerId]);
            if (!$acc) {
                $code = 'LB' . strtoupper(substr(md5($customerId . uniqid('', true)), 0, 6));
                Database::run("INSERT INTO loyalty_accounts (customer_id,points,referral_code) VALUES (?,0,?)", [$customerId, $code]);
                $acc = Database::one("SELECT * FROM loyalty_accounts WHERE customer_id=?", [$customerId]);
            }
            $total = (float) ($b['total'] ?? 0);
            // Earn rate from the customer's current tier (by lifetime spend); default 1pt/€1.
            $tier = Database::one("SELECT earn_rate FROM loyalty_tiers WHERE min_spend<=? ORDER BY min_spend DESC LIMIT 1", [(float) $acc['lifetime_spend']]);
            $rate = $tier ? (float) $tier['earn_rate'] : 1.0;
            if ($pointsEarned <= 0) $pointsEarned = (int) floor($total * $rate);
            $net = $pointsEarned - $pointsRedeemed;
            Database::run("UPDATE loyalty_accounts SET points=points+?, lifetime_spend=lifetime_spend+? WHERE id=?", [$net, $total, $acc['id']]);
            if ($pointsEarned > 0)
                Database::run("INSERT INTO loyalty_ledger (account_id,type,points,label,order_number) VALUES (?,?,?,?,?)", [$acc['id'], 'earn', $pointsEarned, 'Order ' . $number, $number]);
            if ($pointsRedeemed > 0)
                Database::run("INSERT INTO loyalty_ledger (account_id,type,points,label,order_number) VALUES (?,?,?,?,?)", [$acc['id'], 'redeem', -$pointsRedeemed, 'Redeemed on ' . $number, $number]);
            Database::run("UPDATE orders SET points_earned=?, points_redeemed=? WHERE id=?", [$pointsEarned, $pointsRedeemed, $oid]);
        }
        Response::created(['number' => $number, 'id' => $oid, 'pointsEarned' => $pointsEarned]);
    }
}
