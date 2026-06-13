<?php
// Sample customers + orders for admin demos. Run: php sql/seed-sample.php
require_once __DIR__ . '/../core/Database.php';

Database::run("DELETE FROM orders");          // cascades items + history
Database::run("DELETE FROM loyalty_ledger");
Database::run("DELETE FROM loyalty_accounts");
Database::run("DELETE FROM customers");

$ASSET = 'https://qclay.design/lovable/bags';
$customers = [
    ['Ava Moreau', 'ava@example.com', '+33 6 12 34 56 78'],
    ['Noah Bennett', 'noah@example.com', '+44 7700 900123'],
    ['Lena Vogel', 'lena@example.com', null],
];
$custIds = [];
foreach ($customers as [$name, $email, $phone]) {
    Database::run("INSERT INTO customers (name,email,phone,birthday) VALUES (?,?,?,?)", [$name, $email, $phone, null]);
    $cid = Database::lastId();
    $custIds[$email] = ['id' => $cid, 'name' => $name];
    // loyalty account
    $code = 'LOVE-' . strtoupper(substr(md5($email), 0, 6));
    Database::run("INSERT INTO loyalty_accounts (customer_id,points,lifetime_spend,referral_code,signup_bonus_given) VALUES (?,?,?,?,1)", [$cid, 0, 0, $code]);
}

// orders: [email, status, daysAgo, items[[name,color,hex,price,qty,baggyN]]]
$orders = [
    ['ava@example.com', 'delivered', 8, [['Terra','Cognac','#9c5a2d',129.9,1,1], ['Belle','Bordeaux','#6e2230',159.9,2,4]]],
    ['noah@example.com', 'shipped', 3, [['Amélie','Black','#1a1a1a',139.9,1,3]]],
    ['ava@example.com', 'processing', 1, [['Adele','Blush','#e7c4c0',134.9,1,6]]],
    ['lena@example.com', 'paid', 0, [['Love Bag','Blush','#e7c4c0',149.9,1,2], ['Mira','Cream','#e8e2d2',124.9,1,5]]],
];

$n = 1000;
foreach ($orders as [$email, $status, $daysAgo, $items]) {
    $c = $custIds[$email];
    $subtotal = 0;
    foreach ($items as $it) $subtotal += $it[3] * $it[4];
    $shipping = $subtotal >= 100 ? 0 : 5.9;
    $total = $subtotal + $shipping;
    $pts = (int) floor($subtotal);
    $number = 'LB-' . str_pad((string) $n++, 4, '0', STR_PAD_LEFT);
    $createdAt = date('Y-m-d H:i:s', time() - $daysAgo * 86400);
    Database::run(
        "INSERT INTO orders (number,customer_id,email,name,status,subtotal,shipping,total,points_earned,shipping_method,tracking_number,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [$number, $c['id'], $email, $c['name'], $status, $subtotal, $shipping, $total, $pts, 'Standard', 'LBX' . $n, $createdAt]
    );
    $oid = Database::lastId();
    foreach ($items as [$nm, $col, $hex, $price, $qty, $bn]) {
        Database::run("INSERT INTO order_items (order_id,name,color_name,color_hex,unit_price,qty,line_total,image_url) VALUES (?,?,?,?,?,?,?,?)",
            [$oid, $nm, $col, $hex, $price, $qty, $price * $qty, "$ASSET/baggy-$bn.png"]);
    }
    Database::run("INSERT INTO order_status_history (order_id,status,note,created_at) VALUES (?,?, 'Order placed', ?)", [$oid, 'paid', $createdAt]);
    if ($status !== 'paid') {
        Database::run("INSERT INTO order_status_history (order_id,status,created_at) VALUES (?,?,?)", [$oid, $status, date('Y-m-d H:i:s', time() - ($daysAgo > 1 ? ($daysAgo - 1) : 0) * 86400)]);
    }
    // accrue loyalty
    Database::run("UPDATE loyalty_accounts SET points=points+?, lifetime_spend=lifetime_spend+? WHERE customer_id=?", [$pts, $subtotal, $c['id']]);
    $acct = Database::one("SELECT id FROM loyalty_accounts WHERE customer_id=?", [$c['id']]);
    Database::run("INSERT INTO loyalty_ledger (account_id,type,points,label,order_number) VALUES (?,?,?,?,?)", [$acct['id'], 'purchase', $pts, "Order $number", $number]);
}

echo "Customers: " . Database::one("SELECT COUNT(*) c FROM customers")['c'] . "\n";
echo "Orders: " . Database::one("SELECT COUNT(*) c FROM orders")['c'] . "\n";
echo "Items: " . Database::one("SELECT COUNT(*) c FROM order_items")['c'] . "\n";
