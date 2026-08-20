<?php
class OrdersController
{
    /** The store's base currency (Admin → Currencies). Amounts on orders are
     *  stored — and emailed — in this currency. */
    private static function baseCurrency(): array
    {
        static $cached = null;
        if ($cached !== null) return $cached;
        try {
            $row = Database::one("SELECT code, symbol, decimals FROM currencies WHERE is_base=1 LIMIT 1");
        } catch (Throwable $e) {
            $row = null;
        }
        return $cached = $row ?: ['code' => 'EUR', 'symbol' => '€', 'decimals' => 2];
    }

    /** "€12.50" / "$12.50" / "1,200,000 LBP" — single-character symbols read
     *  as prefixes, letter codes as suffixes (same rule as the storefront). */
    private static function money($n): string
    {
        $c = self::baseCurrency();
        $amount = number_format((float) $n, (int) $c['decimals']);
        $sym = (string) $c['symbol'];
        $len = function_exists('mb_strlen') ? mb_strlen($sym, 'UTF-8') : strlen($sym);
        return $len === 1 ? $sym . $amount : $amount . ' ' . $sym;
    }

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
        $out['paymentMethod'] = $o['payment_method'] ?? null;
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

    /**
     * Sequential order number from admin-controlled settings:
     *   orders.number_prefix  — e.g. "ORDER-" (default "LB-")
     *   orders.last_number    — last assigned sequence (next = last + 1)
     * The counter bump is a single atomic UPDATE (LAST_INSERT_ID trick), so
     * two simultaneous checkouts can't get the same number; a uniqueness
     * check guards against the admin rewinding the counter into used range.
     */
    private static function nextOrderNumber(): string
    {
        $prefix = 'LB-';
        $row = Database::one("SELECT item_value FROM settings WHERE group_key='orders' AND item_key='number_prefix'");
        if ($row && trim((string) $row['item_value']) !== '') $prefix = trim((string) $row['item_value']);
        Database::run("INSERT IGNORE INTO settings (group_key,item_key,item_value) VALUES ('orders','last_number','0')");
        for ($i = 0; $i < 500; $i++) {
            Database::run("UPDATE settings SET item_value = LAST_INSERT_ID(item_value + 1) WHERE group_key='orders' AND item_key='last_number'");
            $n = (int) (Database::one("SELECT LAST_INSERT_ID() AS n")['n'] ?? 0);
            $candidate = $prefix . str_pad((string) $n, 4, '0', STR_PAD_LEFT);
            if (!Database::one("SELECT id FROM orders WHERE number=?", [$candidate])) {
                return $candidate;
            }
        }
        // Practically unreachable — 500 consecutive collisions.
        return $prefix . strtoupper(substr(md5(uniqid('', true)), 0, 6));
    }

    /** Operational new-order email for the store: customer, items, the cash
     *  amount to collect, and the delivery address with a map-pin link. */
    private static function adminNotificationEmail(string $number, array $b, array $items): string
    {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $origin = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'thealine.shop');
        $e = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
        $money = fn($n) => htmlspecialchars(self::money($n), ENT_QUOTES, 'UTF-8');

        $rows = '';
        foreach ($items as $it) {
            $qty = (int) ($it['qty'] ?? 1);
            $price = (float) ($it['price'] ?? $it['unitPrice'] ?? 0);
            $variant = trim((string) ($it['colorName'] ?? ''));
            $rows .= '<tr>'
                . '<td style="padding:8px 0;border-bottom:1px solid #eeece7;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:#141414;">'
                . $qty . ' &times; <b>' . $e($it['name'] ?? '') . '</b>'
                . ($variant !== '' ? ' <span style="color:#8b8a86;">(' . $e($variant) . ')</span>' : '')
                . '</td>'
                . '<td align="right" style="padding:8px 0;border-bottom:1px solid #eeece7;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;font-weight:bold;color:#141414;white-space:nowrap;">'
                . $money($price * $qty) . '</td></tr>';
        }

        $addr = is_array($b['shippingAddress'] ?? null) ? $b['shippingAddress'] : [];
        $addrLines = array_filter([
            $e(trim(($addr['line1'] ?? '') . (!empty($addr['line2']) ? ', ' . $addr['line2'] : ''))),
            $e(trim(($addr['city'] ?? '') . (!empty($addr['postcode']) ? ', ' . $addr['postcode'] : ''))),
        ]);
        $mapLink = (isset($addr['lat'], $addr['lng']) && is_numeric($addr['lat']) && is_numeric($addr['lng']))
            ? 'https://maps.google.com/?q=' . $addr['lat'] . ',' . $addr['lng']
            : '';

        $total = (float) ($b['total'] ?? 0);
        return '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head>'
            . '<body style="margin:0;padding:0;background:#f4f4f3;">'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:18px 12px;">'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #eceae5;overflow:hidden;">'

            . '<tr><td style="background:#141414;padding:16px 22px;font-family:Arial,Helvetica,sans-serif;">'
            . '<span style="font-size:13px;font-weight:bold;letter-spacing:2px;color:#ffffff;">THE A LINE &middot; NEW ORDER</span>'
            . '</td></tr>'

            . '<tr><td style="padding:22px 22px 4px;font-family:Arial,Helvetica,sans-serif;">'
            . '<div style="font-size:19px;font-weight:bold;color:#141414;">' . $e($number) . ' &middot; ' . $money($total) . '</div>'
            . '<div style="font-size:12.5px;color:#8b8a86;padding-top:5px;">' . date('j F Y, H:i') . ' &middot; Cash on delivery &mdash; collect ' . $money($total) . '</div>'
            . '</td></tr>'

            . '<tr><td style="padding:14px 22px 0;font-family:Arial,Helvetica,sans-serif;">'
            . '<div style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#8b8a86;">CUSTOMER</div>'
            . '<div style="font-size:13.5px;line-height:1.7;color:#141414;padding-top:5px;">'
            . '<b>' . $e($b['name'] ?? '') . '</b><br/>' . $e($b['email'] ?? '')
            . (!empty($addr['phone']) ? '<br/>' . $e($addr['phone']) : '')
            . '</div></td></tr>'

            . '<tr><td style="padding:14px 22px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $rows . '</table></td></tr>'

            . (count($addrLines) ? '<tr><td style="padding:16px 22px 0;font-family:Arial,Helvetica,sans-serif;">'
                . '<div style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#8b8a86;">DELIVER TO</div>'
                . '<div style="font-size:13.5px;line-height:1.7;color:#141414;padding-top:5px;">' . implode('<br/>', $addrLines) . '</div>'
                . ($mapLink !== '' ? '<div style="padding-top:6px;"><a href="' . $e($mapLink) . '" style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#141414;font-weight:bold;">Open delivery pin in Maps &rarr;</a></div>' : '')
                . '</td></tr>' : '')

            . '<tr><td style="padding:20px 22px 24px;">'
            . '<a href="' . $e($origin . '/admin/orders') . '" style="display:block;text-align:center;background:#141414;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;font-weight:bold;padding:13px 10px;border-radius:999px;">Open in admin</a>'
            . '</td></tr>'

            . '</table></td></tr></table></body></html>';
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

        // Payment method column (COD etc.) — idempotent for older databases.
        Database::run("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) NULL");

        $number = $b['number'] ?? self::nextOrderNumber();
        Database::run(
            "INSERT INTO orders (number,customer_id,email,name,status,subtotal,discount,shipping,tax,total,currency,coupon_code,points_earned,points_redeemed,gift_is,gift_note,gift_wrap,shipping_method,shipping_address,tracking_number,payment_method)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                $number, $customerId, $email, $b['name'] ?? '', $b['status'] ?? 'paid',
                (float) ($b['subtotal'] ?? 0), (float) ($b['discount'] ?? 0), (float) ($b['shipping'] ?? 0), (float) ($b['tax'] ?? 0), (float) ($b['total'] ?? 0),
                self::baseCurrency()['code'], $b['couponCode'] ?? null, (int) ($b['pointsEarned'] ?? 0), (int) ($b['pointsRedeemed'] ?? 0),
                !empty($b['gift']) ? 1 : 0, $b['gift']['note'] ?? null, !empty($b['gift']['wrap']) ? 1 : 0,
                $b['shippingMethod'] ?? null, isset($b['shippingAddress']) ? json_encode($b['shippingAddress']) : null,
                $b['trackingNumber'] ?? null, $b['paymentMethod'] ?? null,
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
        // Branded confirmation email — a failure here must never fail the order.
        try {
            if (!empty($email)) {
                $logoPath = dirname(__DIR__) . '/uploads/brand-logo.png';
                Mailer::send(
                    $email,
                    "Order {$number} confirmed — The A Line",
                    self::confirmationEmail($number, $b, $items),
                    is_file($logoPath) ? [['cid' => 'brandlogo', 'path' => $logoPath, 'type' => 'image/png']] : []
                );
            }
        } catch (Throwable $e) {
            error_log('Order confirmation email failed: ' . $e->getMessage());
        }

        // Notify the store: orders.notify_email setting, else the store mailbox.
        try {
            $cfgN = require dirname(__DIR__) . '/config.php';
            $row = Database::one("SELECT item_value FROM settings WHERE group_key='orders' AND item_key='notify_email'");
            $notify = trim((string) ($row['item_value'] ?? ''));
            if ($notify === '') $notify = (string) ($cfgN['mail_from'] ?: ($cfgN['smtp']['user'] ?? ''));
            if ($notify !== '' && strcasecmp($notify, (string) $email) !== 0) {
                Mailer::send(
                    $notify,
                    "New order {$number} — " . self::money($b['total'] ?? 0),
                    self::adminNotificationEmail($number, $b, $items)
                );
            }
        } catch (Throwable $e) {
            error_log('Admin order notification failed: ' . $e->getMessage());
        }

        Response::created(['number' => $number, 'id' => $oid, 'pointsEarned' => $pointsEarned]);
    }

    /** Order-confirmation email — the storefront's language in email-safe,
     *  mobile-first HTML: fluid card, the real wordmark (logo embedded via
     *  cid:), product thumbnails, hairlines, ink CTA, one gold accent. */
    private static function confirmationEmail(string $number, array $b, array $items): string
    {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $origin = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'thealine.shop');
        $orderUrl = $origin . '/orders/' . rawurlencode($number);

        $e = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
        $money = fn($n) => htmlspecialchars(self::money($n), ENT_QUOTES, 'UTF-8');
        $abs = fn($u) => $u === '' ? '' : (preg_match('#^https?://#', $u) ? $u : $origin . '/' . ltrim($u, '/'));
        $first = $e(trim(explode(' ', trim((string) ($b['name'] ?? '')))[0] ?: 'there'));

        $rows = '';
        foreach ($items as $it) {
            $qty = (int) ($it['qty'] ?? 1);
            $price = (float) ($it['price'] ?? $it['unitPrice'] ?? 0);
            $variant = trim((string) ($it['colorName'] ?? ''));
            $img = $abs(trim((string) ($it['image'] ?? '')));
            $thumb = $img !== ''
                ? '<img src="' . $e($img) . '" width="54" height="62" alt="" style="display:block;width:54px;height:62px;border-radius:10px;background:#ececec;object-fit:cover;" />'
                : '<div style="width:54px;height:62px;border-radius:10px;background:#ececec;"></div>';
            $rows .= '<tr>'
                . '<td width="66" style="padding:11px 0;border-bottom:1px solid #eeece7;vertical-align:middle;">' . $thumb . '</td>'
                . '<td style="padding:11px 10px 11px 2px;border-bottom:1px solid #eeece7;font-family:Arial,Helvetica,sans-serif;vertical-align:middle;">'
                . '<div style="font-size:14px;font-weight:bold;color:#141414;">' . $e($it['name'] ?? '') . '</div>'
                . '<div style="font-size:12px;color:#8b8a86;padding-top:3px;">' . ($variant !== '' ? $e($variant) . ' &middot; ' : '') . 'Qty ' . $qty . '</div>'
                . '</td>'
                . '<td align="right" style="padding:11px 0;border-bottom:1px solid #eeece7;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#141414;white-space:nowrap;vertical-align:middle;">'
                . $money($price * $qty) . '</td></tr>';
        }

        $addr = is_array($b['shippingAddress'] ?? null) ? $b['shippingAddress'] : [];
        $addrLines = array_filter([
            $e($addr['fullName'] ?? ''),
            $e(trim(($addr['line1'] ?? '') . (!empty($addr['line2']) ? ', ' . $addr['line2'] : ''))),
            $e(trim(($addr['city'] ?? '') . (!empty($addr['postcode']) ? ', ' . $addr['postcode'] : ''))),
            $e($addr['country'] ?? ''),
            !empty($addr['phone']) ? $e($addr['phone']) : null,
        ]);

        $subtotal = (float) ($b['subtotal'] ?? 0);
        $shipping = (float) ($b['shipping'] ?? 0);
        $total = (float) ($b['total'] ?? 0);
        $line = fn($label, $value, $bold = false) =>
            '<tr><td style="padding:5px 0;font-family:Arial,Helvetica,sans-serif;font-size:' . ($bold ? '15px;font-weight:bold;' : '13px;') . 'color:' . ($bold ? '#141414' : '#8b8a86') . ';">' . $label . '</td>'
            . '<td align="right" style="padding:5px 0;font-family:Arial,Helvetica,sans-serif;font-size:' . ($bold ? '19px;font-weight:bold;' : '13px;') . 'color:#141414;">' . $value . '</td></tr>';

        return '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head>'
            . '<body style="margin:0;padding:0;background:#f4f4f3;">'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f3;"><tr><td align="center" style="padding:18px 12px;">'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;border:1px solid #eceae5;overflow:hidden;">'

            // wordmark header — the logo travels inside the email (cid:)
            . '<tr><td align="center" style="padding:26px 20px 20px;border-bottom:2px solid #D9C49A;">'
            . '<span style="font-family:Georgia,\'Times New Roman\',serif;font-size:24px;color:#141414;vertical-align:middle;">The&nbsp;&nbsp;</span>'
            . '<img src="cid:brandlogo" width="27" height="24" alt="A" style="vertical-align:middle;display:inline-block;border:0;" />'
            . '<span style="font-family:Georgia,\'Times New Roman\',serif;font-size:24px;color:#141414;vertical-align:middle;">&nbsp;&nbsp;Line</span>'
            . '</td></tr>'

            . '<tr><td style="padding:28px 24px 6px;font-family:Arial,Helvetica,sans-serif;">'
            . '<div style="font-size:23px;font-weight:bold;color:#141414;">Order <span style="font-family:Georgia,\'Times New Roman\',serif;font-style:italic;font-weight:normal;">confirmed</span></div>'
            . '<div style="font-size:14px;line-height:1.65;color:#6b6a66;padding-top:10px;">Hi ' . $first . ', thank you for your order &mdash; it&rsquo;s on its way to being crafted. Here&rsquo;s everything at a glance.</div>'
            . '<div style="font-size:12px;color:#8b8a86;padding-top:14px;">Order <span style="color:#141414;font-weight:bold;">' . $e($number) . '</span> &middot; ' . date('j F Y') . '</div>'
            . '</td></tr>'

            . '<tr><td style="padding:12px 24px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $rows . '</table></td></tr>'

            . '<tr><td style="padding:14px 24px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
            . $line('Subtotal', $money($subtotal))
            . $line('Delivery', $shipping <= 0 ? 'Free' : $money($shipping))
            . $line('Total', $money($total), true)
            . '</table></td></tr>'

            // COD notice
            . '<tr><td style="padding:18px 24px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
            . '<td style="background:#faf9f6;border:1px solid #eeece7;border-radius:12px;padding:13px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#54534f;">'
            . '<span style="font-weight:bold;color:#141414;">Cash on delivery</span> &mdash; please have ' . $money($total) . ' ready when your order arrives.'
            . '</td></tr></table></td></tr>'

            // deliver-to
            . (count($addrLines) ? '<tr><td style="padding:18px 24px 0;font-family:Arial,Helvetica,sans-serif;">'
                . '<div style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#8b8a86;">DELIVERING TO</div>'
                . '<div style="font-size:13.5px;line-height:1.7;color:#54534f;padding-top:6px;">' . implode('<br/>', $addrLines) . '</div>'
                . '</td></tr>' : '')

            // CTA — full-width for easy thumb reach on phones
            . '<tr><td style="padding:24px 24px 28px;">'
            . '<a href="' . $e($orderUrl) . '" style="display:block;text-align:center;background:#141414;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;font-weight:bold;padding:15px 10px;border-radius:999px;">View your order</a>'
            . '</td></tr>'

            . '<tr><td align="center" style="background:#faf9f6;padding:16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8b8a86;">'
            . 'Questions? Just reply to this email.<br/>&copy; ' . date('Y') . ' The A Line &mdash; Crafted to move with your story.'
            . '</td></tr>'

            . '</table></td></tr></table></body></html>';
    }
}
