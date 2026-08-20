<?php
// Admin dashboard — lebazone-style operational overview. One request returns
// every section: KPIs, gross-profit trend vs the prior period, breakdowns,
// operational status, customers, catalog, recent activity and alerts.
// All amounts are in (and formatted with) the store's base currency.
class DashboardController
{
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

    private static function money($n, bool $round = false): string
    {
        $c = self::baseCurrency();
        $amount = number_format((float) $n, $round ? 0 : (int) $c['decimals']);
        $sym = (string) $c['symbol'];
        $len = function_exists('mb_strlen') ? mb_strlen($sym, 'UTF-8') : strlen($sym);
        return $len === 1 ? $sym . $amount : $amount . ' ' . $sym;
    }

    /** "↑ 12.3% vs prior" / "↓ …" / "no prior data". */
    private static function deltaSub(float $now, float $before, string $suffix = 'vs prior'): string
    {
        if ($before <= 0) return $now > 0 ? "new this period" : "no prior data";
        $pct = round((($now - $before) / $before) * 100, 1);
        $arrow = $pct >= 0 ? '↑' : '↓';
        return "$arrow " . abs($pct) . "% $suffix";
    }

    /** Resolve from/to (inclusive Y-m-d) with a 30-day default window. */
    private static function range(): array
    {
        $to = Request::query('to', '');
        $from = Request::query('from', '');
        $re = '/^\d{4}-\d{2}-\d{2}$/';
        if (!preg_match($re, (string) $to)) $to = date('Y-m-d');
        if (!preg_match($re, (string) $from)) $from = date('Y-m-d', strtotime($to . ' -29 days'));
        if ($from > $to) [$from, $to] = [$to, $from];
        return [$from, $to];
    }

    private static function relTime(string $ts): string
    {
        $diff = time() - strtotime($ts);
        if ($diff < 60) return 'just now';
        if ($diff < 3600) return floor($diff / 60) . 'm ago';
        if ($diff < 86400) return floor($diff / 3600) . 'h ago';
        if ($diff < 86400 * 7) return floor($diff / 86400) . 'd ago';
        return date('M j', strtotime($ts));
    }

    public static function index(): void
    {
        Auth::requireAdmin();
        [$from, $to] = self::range();
        $status = trim((string) Request::query('status', ''));
        $allowed = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
        if (!in_array($status, $allowed, true)) $status = '';

        $start = $from . ' 00:00:00';
        $endEx = date('Y-m-d 00:00:00', strtotime($to . ' +1 day'));
        $days = max(1, (int) ((strtotime($to) - strtotime($from)) / 86400) + 1);
        $prevStart = date('Y-m-d 00:00:00', strtotime($from . " -{$days} days"));

        // Revenue-bearing orders: not cancelled/refunded — unless the admin
        // filtered on exactly those statuses.
        $statusCond = $status !== '' ? "o.status = " . Database::pdo()->quote($status)
                                     : "o.status NOT IN ('cancelled','refunded')";
        $win  = "o.created_at >= '$start' AND o.created_at < '$endEx'";
        $prevWin = "o.created_at >= '$prevStart' AND o.created_at < '$start'";

        // ---- headline windows (revenue, gross profit, orders) ----
        // Gross profit = item sales minus product cost; shipping/tax excluded.
        $head = function (string $windowCond) use ($statusCond) {
            $o = Database::one(
                "SELECT COALESCE(SUM(o.total),0) rev, COUNT(*) cnt FROM orders o WHERE $windowCond AND $statusCond"
            );
            $p = Database::one(
                "SELECT COALESCE(SUM(oi.line_total - COALESCE(pr.cost_price,0) * oi.qty),0) profit
                 FROM order_items oi
                 JOIN orders o ON o.id = oi.order_id
                 LEFT JOIN products pr ON pr.id = oi.product_id
                 WHERE $windowCond AND $statusCond"
            );
            return [
                'rev' => (float) ($o['rev'] ?? 0),
                'cnt' => (int) ($o['cnt'] ?? 0),
                'profit' => (float) ($p['profit'] ?? 0),
            ];
        };
        $cur = $head($win);
        $prev = $head($prevWin);
        $aov = $cur['cnt'] ? $cur['rev'] / $cur['cnt'] : 0.0;
        $aovPrev = $prev['cnt'] ? $prev['rev'] / $prev['cnt'] : 0.0;

        $one = fn(string $sql, array $args = []) => Database::one($sql, $args) ?: [];
        $int = fn($v) => (int) ($v ?? 0);

        $custTotal = $int($one("SELECT COUNT(*) c FROM customers")['c'] ?? 0);
        $custNew = $int($one("SELECT COUNT(*) c FROM customers WHERE created_at >= ? AND created_at < ?", [$start, $endEx])['c'] ?? 0);
        $pendingAll = $int($one("SELECT COUNT(*) c FROM orders WHERE status = 'pending'")['c'] ?? 0);
        $prodTotal = $int($one("SELECT COUNT(*) c FROM products")['c'] ?? 0);
        $prodWeek = $int($one("SELECT COUNT(*) c FROM products WHERE created_at >= ?", [date('Y-m-d 00:00:00', strtotime('-6 days'))])['c'] ?? 0);
        $lowStock = $int($one("SELECT COUNT(*) c FROM products WHERE stock > 0 AND stock <= 5")['c'] ?? 0);
        $outStock = $int($one("SELECT COUNT(*) c FROM products WHERE stock <= 0")['c'] ?? 0);

        $aovDiff = $aov - $aovPrev;
        $kpis = [
            ['label' => 'Gross profit', 'val' => self::money($cur['profit']), 'sub' => self::deltaSub($cur['profit'], $prev['profit']), 'icon' => 'coins', 'color' => '#16a34a'],
            ['label' => 'Orders', 'val' => number_format($cur['cnt']), 'sub' => self::deltaSub($cur['cnt'], $prev['cnt']), 'icon' => 'package', 'color' => '#2563eb'],
            ['label' => 'Avg order value', 'val' => self::money($aov), 'sub' => ($aovPrev > 0 ? ($aovDiff >= 0 ? '↑ ' : '↓ ') . self::money(abs($aovDiff)) . ' vs prior' : 'no prior data'), 'icon' => 'tag', 'color' => '#8b5cf6'],
            ['label' => 'Customers', 'val' => number_format($custTotal), 'sub' => "$custNew new this period", 'icon' => 'users', 'color' => '#2563eb'],
            ['label' => 'Revenue', 'val' => self::money($cur['rev']), 'sub' => self::deltaSub($cur['rev'], $prev['rev']), 'icon' => 'chart', 'color' => '#16a34a'],
            ['label' => 'Pending orders', 'val' => number_format($pendingAll), 'sub' => 'awaiting confirmation', 'icon' => 'clock', 'color' => '#d97706'],
            ['label' => 'Products', 'val' => number_format($prodTotal), 'sub' => "$prodWeek added this week", 'icon' => 'box', 'color' => '#2563eb'],
            ['label' => 'Low stock', 'val' => number_format($lowStock + $outStock), 'sub' => "$outStock out of stock", 'icon' => 'alert', 'color' => '#dc2626', 'alert' => ($lowStock + $outStock) > 0],
        ];

        // ---- gross profit trend (daily, current vs aligned prior period) ----
        $profitByDay = function (string $windowCond) use ($statusCond) {
            $rows = Database::all(
                "SELECT DATE(o.created_at) d,
                        COALESCE(SUM(oi.line_total - COALESCE(pr.cost_price,0) * oi.qty),0) profit
                 FROM order_items oi
                 JOIN orders o ON o.id = oi.order_id
                 LEFT JOIN products pr ON pr.id = oi.product_id
                 WHERE $windowCond AND $statusCond GROUP BY DATE(o.created_at)"
            );
            $map = [];
            foreach ($rows as $r) $map[$r['d']] = (float) $r['profit'];
            return $map;
        };
        $curMap = $profitByDay($win);
        $prevMap = $profitByDay($prevWin);
        $ordersByDay = [];
        foreach (Database::all("SELECT DATE(o.created_at) d, COUNT(*) c FROM orders o WHERE $win AND $statusCond GROUP BY DATE(o.created_at)") as $r) {
            $ordersByDay[$r['d']] = (int) $r['c'];
        }

        $labels = [];
        $current = [];
        $previous = [];
        $peak = ['label' => '—', 'v' => 0.0];
        $totalOrdersTrend = 0;
        for ($i = 0; $i < $days; $i++) {
            $d = date('Y-m-d', strtotime($from . " +{$i} days"));
            $pd = date('Y-m-d', strtotime($d . " -{$days} days"));
            $labels[] = date('M j', strtotime($d));
            $v = $curMap[$d] ?? 0.0;
            $current[] = round($v, 2);
            $previous[] = round($prevMap[$pd] ?? 0.0, 2);
            $totalOrdersTrend += $ordersByDay[$d] ?? 0;
            if ($v > $peak['v']) $peak = ['label' => date('M j', strtotime($d)), 'v' => $v];
        }
        $avgDay = $cur['profit'] / $days;
        $avgDayPrev = $prev['profit'] / $days;
        $refunds = $one(
            "SELECT COALESCE(SUM(total),0) v, COUNT(*) c FROM orders o
             WHERE $win AND o.status IN ('cancelled','refunded')"
        );
        $refundVal = (float) ($refunds['v'] ?? 0);
        $summary = [
            ['l' => 'Peak day', 'v' => $peak['label'], 's' => self::money($peak['v'])],
            ['l' => 'Avg/day', 'v' => self::money($avgDay), 's' => ($avgDayPrev > 0 ? ($avgDay >= $avgDayPrev ? '↑ ' : '↓ ') . self::money(abs($avgDay - $avgDayPrev)) . ' vs prior' : '—')],
            ['l' => 'Orders/day', 'v' => number_format($totalOrdersTrend / $days, 1), 's' => number_format($prev['cnt'] / $days, 1) . ' prior'],
            ['l' => 'Refunds', 'v' => self::money($refundVal), 's' => ($cur['rev'] > 0 ? number_format($refundVal / $cur['rev'] * 100, 1) : '0.0') . '% of sales'],
        ];

        // ---- breakdowns: top products / profit by category ----
        $bar = function (array $rows, float $total) {
            return array_map(fn($r) => [
                'l' => $r['l'],
                'v' => self::money((float) $r['v'], true),
                'pct' => $total > 0 ? round((float) $r['v'] / $total * 100) : 0,
            ], $rows);
        };
        $topProductRows = Database::all(
            "SELECT oi.name l, COALESCE(SUM(oi.line_total),0) v
             FROM order_items oi JOIN orders o ON o.id = oi.order_id
             WHERE $win AND $statusCond GROUP BY oi.name ORDER BY v DESC LIMIT 5"
        );
        $catRows = Database::all(
            "SELECT c.name l, COALESCE(SUM(oi.line_total - COALESCE(pr.cost_price,0) * oi.qty),0) v
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             LEFT JOIN products pr ON pr.id = oi.product_id
             LEFT JOIN product_categories pc ON pc.product_id = pr.id
             LEFT JOIN categories c ON c.id = pc.category_id
             WHERE $win AND $statusCond AND c.name IS NOT NULL
             GROUP BY c.name ORDER BY v DESC LIMIT 5"
        );

        // ---- operational status ----
        $statusColors = [
            'pending' => '#d97706', 'paid' => '#2563eb', 'processing' => '#8b5cf6',
            'shipped' => '#0d9488', 'delivered' => '#16a34a', 'cancelled' => '#dc2626', 'refunded' => '#6b7280',
        ];
        $mixRows = Database::all("SELECT o.status, COUNT(*) c FROM orders o WHERE $win GROUP BY o.status ORDER BY c DESC");
        $mixTotal = array_sum(array_map(fn($r) => (int) $r['c'], $mixRows));
        $orderStatuses = array_map(fn($r) => [
            'label' => ucfirst($r['status']),
            'count' => (int) $r['c'],
            'pct' => $mixTotal > 0 ? round((int) $r['c'] / $mixTotal * 100) : 0,
            'color' => $statusColors[$r['status']] ?? '#6b7280',
        ], $mixRows);

        // COD money: collected once delivered; outstanding while in flight.
        $collected = $one("SELECT COALESCE(SUM(total),0) v, COUNT(*) c FROM orders o WHERE $win AND o.status='delivered'");
        $toCollect = $one("SELECT COALESCE(SUM(total),0) v, COUNT(*) c FROM orders o WHERE $win AND o.status NOT IN ('delivered','cancelled','refunded')");
        $cancelled = $one("SELECT COALESCE(SUM(total),0) v, COUNT(*) c FROM orders o WHERE $win AND o.status IN ('cancelled','refunded')");
        $paymentStatuses = [
            ['label' => 'Collected (delivered)', 'count' => $int($collected['c'] ?? 0), 'amount' => self::money((float) ($collected['v'] ?? 0)), 'color' => '#16a34a'],
            ['label' => 'To collect — COD', 'count' => $int($toCollect['c'] ?? 0), 'amount' => self::money((float) ($toCollect['v'] ?? 0)), 'color' => '#d97706'],
            ['label' => 'Cancelled / refunded', 'count' => $int($cancelled['c'] ?? 0), 'amount' => self::money((float) ($cancelled['v'] ?? 0)), 'color' => '#6b7280'],
        ];

        $await = $int($one("SELECT COUNT(*) c FROM orders o WHERE $win AND o.status IN ('pending','paid','processing')")['c'] ?? 0);
        $shipped = $int($one("SELECT COUNT(*) c FROM orders o WHERE $win AND o.status='shipped'")['c'] ?? 0);
        $deliveredCnt = $int($collected['c'] ?? 0);
        $delayed = $int($one("SELECT COUNT(*) c FROM orders WHERE status='pending' AND created_at < ?", [date('Y-m-d H:i:s', strtotime('-48 hours'))])['c'] ?? 0);
        $fulfillment = [
            ['l' => 'Awaiting fulfillment', 'v' => $await, 'warn' => $await > 0],
            ['l' => 'Shipped — in transit', 'v' => $shipped],
            ['l' => 'Delivered', 'v' => $deliveredCnt],
            ['l' => 'Pending > 48h', 'v' => $delayed, 'alert' => $delayed > 0],
        ];
        $returns = [
            ['l' => 'Cancelled orders', 'v' => (string) $int($cancelled['c'] ?? 0)],
            ['l' => 'Refund value', 'v' => self::money((float) ($cancelled['v'] ?? 0))],
        ];

        // ---- customers ----
        $returning = $int($one(
            "SELECT COUNT(*) c FROM (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL GROUP BY customer_id HAVING COUNT(*) >= 2) t"
        )['c'] ?? 0);
        $guestOrders = $int($one("SELECT COUNT(*) c FROM orders o WHERE $win AND o.customer_id IS NULL")['c'] ?? 0);
        $custOverview = [
            ['l' => 'Total customers', 'v' => number_format($custTotal)],
            ['l' => 'New this period', 'v' => number_format($custNew)],
            ['l' => 'Returning buyers', 'v' => number_format($returning), 'sub' => '2+ lifetime orders'],
            ['l' => 'Guest checkouts', 'v' => number_format($guestOrders), 'sub' => 'this period'],
        ];
        $topCustomers = array_map(fn($r) => [
            'name' => $r['name'] ?: $r['email'],
            'email' => $r['email'],
            'orders' => (int) $r['cnt'],
            'spent' => self::money((float) $r['v']),
        ], Database::all(
            "SELECT COALESCE(NULLIF(o.name,''), o.email) name, o.email, COUNT(*) cnt, COALESCE(SUM(o.total),0) v
             FROM orders o WHERE $win AND $statusCond
             GROUP BY o.email, COALESCE(NULLIF(o.name,''), o.email) ORDER BY v DESC LIMIT 5"
        ));
        $signups = array_map(fn($r) => [
            'name' => trim((string) $r['name']) ?: $r['email'],
            'email' => $r['email'],
            'time' => self::relTime($r['created_at']),
        ], Database::all("SELECT name, email, created_at FROM customers ORDER BY created_at DESC LIMIT 6"));

        // ---- products & catalog ----
        $bestSellers = array_map(fn($r) => [
            'name' => $r['name'],
            'sku' => $r['sku'] ?: '—',
            'rev' => self::money((float) $r['v'], true),
            'sold' => (int) $r['qty'],
        ], Database::all(
            "SELECT oi.name, MAX(pr.sku) sku, SUM(oi.qty) qty, COALESCE(SUM(oi.line_total),0) v
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             LEFT JOIN products pr ON pr.id = oi.product_id
             WHERE $win AND $statusCond GROUP BY oi.name ORDER BY v DESC LIMIT 5"
        ));
        $lowStockList = array_map(fn($r) => [
            'name' => $r['name'],
            'sku' => $r['sku'] ?: '—',
            'stock' => (int) $r['stock'],
            'out' => (int) $r['stock'] <= 0,
        ], Database::all("SELECT name, sku, stock FROM products WHERE stock <= 5 ORDER BY stock ASC, name LIMIT 6"));
        $recentProducts = array_map(fn($r) => [
            'name' => $r['name'],
            'sku' => $r['sku'] ?: '—',
            'added' => self::relTime($r['created_at']),
        ], Database::all("SELECT name, sku, created_at FROM products ORDER BY created_at DESC LIMIT 5"));

        // ---- recent activity ----
        $recentWhere = $status !== '' ? "WHERE o.status = " . Database::pdo()->quote($status) : '';
        $recentOrders = array_map(fn($o) => [
            'id' => $o['number'],
            'cust' => $o['name'] ?: ($o['email'] ?: '—'),
            'items' => (int) $o['items'],
            'total' => self::money((float) $o['total']),
            'status' => $o['status'],
            'time' => self::relTime($o['created_at']),
        ], Database::all(
            "SELECT o.number, o.name, o.email, o.total, o.status, o.created_at,
                    (SELECT COALESCE(SUM(qty),0) FROM order_items WHERE order_id = o.id) items
             FROM orders o $recentWhere ORDER BY o.created_at DESC LIMIT 8"
        ));

        // ---- alerts ----
        $immediate = [];
        $reviewSoon = [];
        $informational = [];
        if ($outStock > 0) $immediate[] = ['icon' => 'alert', 'text' => "$outStock products out of stock", 'meta' => 'Shoppers cannot buy these right now', 'level' => 'error', 'url' => '/admin/inventory'];
        if ($delayed > 0) $immediate[] = ['icon' => 'clock', 'text' => "$delayed orders pending for over 48h", 'meta' => 'Confirm or cancel to keep delivery times honest', 'level' => 'error', 'url' => '/admin/orders'];
        if ($lowStock > 0) $reviewSoon[] = ['icon' => 'alert', 'text' => "$lowStock products low on stock", 'meta' => '5 or fewer units left', 'level' => 'warn', 'url' => '/admin/inventory'];
        if ($await > 0) $reviewSoon[] = ['icon' => 'package', 'text' => "$await orders awaiting fulfillment", 'meta' => 'In the selected period', 'level' => 'warn', 'url' => '/admin/orders'];
        try {
            $pendingReviews = $int($one("SELECT COUNT(*) c FROM reviews WHERE status = 'pending'")['c'] ?? 0);
            if ($pendingReviews > 0) $reviewSoon[] = ['icon' => 'star', 'text' => "$pendingReviews reviews awaiting approval", 'meta' => 'Approve or reject customer reviews', 'level' => 'warn', 'url' => '/admin/products'];
        } catch (Throwable $e) { /* reviews table optional */ }
        if ($custNew > 0) $informational[] = ['icon' => 'users', 'text' => "$custNew new customers this period", 'meta' => 'Welcome them with their first order', 'level' => 'info', 'url' => '/admin/customers'];
        $informational[] = ['icon' => 'coins', 'text' => 'Gross profit ' . self::money($cur['profit']) . ' this period', 'meta' => 'Sales minus product cost, excluding delivery', 'level' => 'info', 'url' => '/admin/orders'];
        if (empty($immediate)) $immediate[] = ['icon' => 'info', 'text' => 'Nothing needs immediate action', 'meta' => 'All clear right now', 'level' => 'info', 'url' => null];

        Response::ok([
            'kpis' => $kpis,
            'salesPerformance' => [
                'revenueTrend' => ['labels' => $labels, 'current' => $current, 'previous' => $previous],
                'summary' => $summary,
                'topProducts' => $bar($topProductRows, array_sum(array_map(fn($r) => (float) $r['v'], $topProductRows))),
                'categoryRevenue' => $bar($catRows, array_sum(array_map(fn($r) => (float) $r['v'], $catRows))),
            ],
            'operationalStatus' => [
                'orderStatuses' => $orderStatuses,
                'paymentStatuses' => $paymentStatuses,
                'fulfillment' => $fulfillment,
                'returns' => $returns,
            ],
            'customers' => [
                'overview' => $custOverview,
                'top' => $topCustomers,
                'signups' => $signups,
            ],
            'products' => [
                'bestSellers' => $bestSellers,
                'lowStock' => $lowStockList,
                'recentProducts' => $recentProducts,
            ],
            'recentActivity' => ['orders' => $recentOrders],
            'alerts' => ['immediate' => $immediate, 'reviewSoon' => $reviewSoon, 'informational' => $informational],
            'meta' => [
                'storeName' => 'The A Line',
                'store' => 'Lebanon',
                'currency' => self::baseCurrency()['code'],
                'currencySymbol' => self::baseCurrency()['symbol'],
                'from' => $from,
                'to' => $to,
                'status' => $status,
                'lowStockCount' => $lowStock + $outStock,
            ],
        ]);
    }

    /** CSV of the filtered orders — downloaded from the dashboard's Export. */
    public static function export(): void
    {
        Auth::requireAdmin();
        [$from, $to] = self::range();
        $status = trim((string) Request::query('status', ''));
        $start = $from . ' 00:00:00';
        $endEx = date('Y-m-d 00:00:00', strtotime($to . ' +1 day'));

        $cond = "created_at >= ? AND created_at < ?";
        $args = [$start, $endEx];
        if ($status !== '') {
            $cond .= " AND status = ?";
            $args[] = $status;
        }
        $rows = Database::all(
            "SELECT number, name, email, status, subtotal, discount, shipping, total, currency, payment_method, created_at
             FROM orders WHERE $cond ORDER BY created_at DESC",
            $args
        );

        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="orders-' . $from . '-to-' . $to . '.csv"');
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF"); // BOM so Excel reads UTF-8
        fputcsv($out, ['Order', 'Customer', 'Email', 'Status', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Currency', 'Payment', 'Placed at']);
        foreach ($rows as $r) {
            fputcsv($out, [
                $r['number'], $r['name'], $r['email'], $r['status'],
                $r['subtotal'], $r['discount'], $r['shipping'], $r['total'],
                $r['currency'], $r['payment_method'], $r['created_at'],
            ]);
        }
        fclose($out);
        exit;
    }
}
