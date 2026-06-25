<?php
// Admin dashboard summary — KPIs, sales trend, recent orders and attention
// counts, aggregated in SQL so the panel loads in a single request.
class DashboardController
{
    public static function index(): void
    {
        Auth::requireAdmin();

        $period = Request::query('period', '7d');
        $days = $period === 'today' ? 1 : ($period === '30d' ? 30 : 7);

        $curStart  = date('Y-m-d 00:00:00', strtotime('-' . ($days - 1) . ' days'));
        $prevStart = date('Y-m-d 00:00:00', strtotime('-' . (2 * $days - 1) . ' days'));

        // Revenue counts only orders that actually stand (not cancelled/refunded).
        $valid = "status NOT IN ('cancelled','refunded')";

        $window = function (string $start, ?string $end) use ($valid) {
            $cond = 'created_at >= ?';
            $args = [$start];
            if ($end !== null) {
                $cond .= ' AND created_at < ?';
                $args[] = $end;
            }
            $row = Database::one(
                "SELECT COALESCE(SUM(total),0) rev, COUNT(*) cnt FROM orders WHERE $cond AND $valid",
                $args
            );
            return ['rev' => (float) ($row['rev'] ?? 0), 'cnt' => (int) ($row['cnt'] ?? 0)];
        };

        $cur  = $window($curStart, null);
        $prev = $window($prevStart, $curStart);

        $custCur = (int) (Database::one(
            'SELECT COUNT(*) c FROM customers WHERE created_at >= ?',
            [$curStart]
        )['c'] ?? 0);
        $custPrev = (int) (Database::one(
            'SELECT COUNT(*) c FROM customers WHERE created_at >= ? AND created_at < ?',
            [$prevStart, $curStart]
        )['c'] ?? 0);

        $aovCur  = $cur['cnt']  ? $cur['rev']  / $cur['cnt']  : 0;
        $aovPrev = $prev['cnt'] ? $prev['rev'] / $prev['cnt'] : 0;

        // Percent change vs the previous equal-length window. Null when there is
        // no baseline (so the UI can show "new" instead of a fake +100%).
        $delta = function (float $now, float $before): ?float {
            if ($before <= 0) {
                return null;
            }
            return round((($now - $before) / $before) * 100, 1);
        };

        // Daily revenue series for the chart (min 7 bars so "today" still reads).
        $trendDays = $days < 7 ? 7 : $days;
        $trendStart = date('Y-m-d 00:00:00', strtotime('-' . ($trendDays - 1) . ' days'));
        $rows = Database::all(
            "SELECT DATE(created_at) d, COALESCE(SUM(total),0) rev
             FROM orders WHERE created_at >= ? AND $valid GROUP BY DATE(created_at)",
            [$trendStart]
        );
        $byDay = [];
        foreach ($rows as $r) {
            $byDay[$r['d']] = (float) $r['rev'];
        }
        $trend = [];
        for ($i = $trendDays - 1; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-$i days"));
            $trend[] = ['date' => $d, 'revenue' => $byDay[$d] ?? 0];
        }

        $recent = array_map(fn($o) => [
            'number' => $o['number'],
            'name' => $o['name'] ?: ($o['email'] ?: '—'),
            'total' => (float) $o['total'],
            'status' => $o['status'],
            'createdAt' => $o['created_at'],
        ], Database::all(
            'SELECT number, name, email, total, status, created_at
             FROM orders ORDER BY created_at DESC LIMIT 6'
        ));

        $count = fn(string $sql) => (int) (Database::one($sql)['c'] ?? 0);

        Response::ok([
            'period' => $period,
            'kpis' => [
                'revenue'      => ['value' => round($cur['rev'], 2), 'delta' => $delta($cur['rev'], $prev['rev'])],
                'orders'       => ['value' => $cur['cnt'],           'delta' => $delta($cur['cnt'], $prev['cnt'])],
                'newCustomers' => ['value' => $custCur,              'delta' => $delta($custCur, $custPrev)],
                'avgOrder'     => ['value' => round($aovCur, 2),     'delta' => $delta($aovCur, $aovPrev)],
            ],
            'trend' => $trend,
            'recentOrders' => $recent,
            'attention' => [
                'pendingOrders' => $count("SELECT COUNT(*) c FROM orders WHERE status NOT IN ('delivered','cancelled','refunded')"),
                'lowStock' => $count('SELECT COUNT(*) c FROM products WHERE stock > 0 AND stock <= 5'),
                'soldOut' => $count('SELECT COUNT(*) c FROM products WHERE stock <= 0'),
            ],
        ]);
    }
}
