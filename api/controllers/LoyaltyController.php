<?php
class LoyaltyController
{
    private static function tier(array $t): array
    {
        return [
            'id' => (int) $t['id'], 'key' => $t['tier_key'], 'name' => $t['name'],
            'minSpend' => (float) $t['min_spend'], 'earnRate' => (float) $t['earn_rate'],
            'freeShipThreshold' => (float) $t['free_ship_threshold'],
            'perks' => json_decode($t['perks'] ?: '[]', true), 'position' => (int) $t['position'],
        ];
    }
    private static function reward(array $r): array
    {
        return [
            'id' => (int) $r['id'], 'key' => $r['reward_key'], 'label' => $r['label'],
            'description' => $r['description'], 'cost' => (int) $r['cost_points'],
            'kind' => $r['kind'], 'value' => $r['value'] !== null ? (float) $r['value'] : null,
            'status' => $r['status'], 'position' => (int) $r['position'],
        ];
    }

    public static function publicConfig(): void
    {
        Response::ok([
            'tiers' => array_map([self::class, 'tier'], Database::all("SELECT * FROM loyalty_tiers ORDER BY position")),
            'rewards' => array_map([self::class, 'reward'], Database::all("SELECT * FROM reward_catalog WHERE status='active' ORDER BY position")),
        ]);
    }
    public static function tiers(): void
    {
        Auth::requireAdmin();
        Response::ok(array_map([self::class, 'tier'], Database::all("SELECT * FROM loyalty_tiers ORDER BY position")));
    }
    public static function updateTier(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        $b = Request::body();
        $set = []; $args = [];
        if (array_key_exists('name', $b)) { $set[] = "name=?"; $args[] = $b['name']; }
        if (array_key_exists('minSpend', $b)) { $set[] = "min_spend=?"; $args[] = (float) $b['minSpend']; }
        if (array_key_exists('earnRate', $b)) { $set[] = "earn_rate=?"; $args[] = (float) $b['earnRate']; }
        if (array_key_exists('freeShipThreshold', $b)) { $set[] = "free_ship_threshold=?"; $args[] = (float) $b['freeShipThreshold']; }
        if (array_key_exists('perks', $b)) { $set[] = "perks=?"; $args[] = json_encode($b['perks']); }
        if ($set) { $args[] = $id; Database::run("UPDATE loyalty_tiers SET " . implode(',', $set) . " WHERE id=?", $args); }
        Response::ok(self::tier(Database::one("SELECT * FROM loyalty_tiers WHERE id=?", [$id])));
    }

    public static function rewards(): void
    {
        Auth::requireAdmin();
        Response::ok(array_map([self::class, 'reward'], Database::all("SELECT * FROM reward_catalog ORDER BY position")));
    }
    public static function createReward(): void
    {
        Auth::requireAdmin();
        $b = Request::body();
        if (empty($b['label'])) Response::error('Label required', 422);
        $key = Util::slugify($b['key'] ?? $b['label']);
        Database::run("INSERT INTO reward_catalog (reward_key,label,description,cost_points,kind,value,status,position) VALUES (?,?,?,?,?,?,?,?)",
            [$key, $b['label'], $b['description'] ?? null, (int) ($b['cost'] ?? 0), $b['kind'] ?? 'discount', isset($b['value']) ? (float) $b['value'] : null, $b['status'] ?? 'active', (int) ($b['position'] ?? 0)]);
        Response::created(self::reward(Database::one("SELECT * FROM reward_catalog WHERE id=?", [Database::lastId()])));
    }
    public static function updateReward(array $p): void
    {
        Auth::requireAdmin();
        $id = (int) $p['id'];
        $b = Request::body();
        $set = []; $args = [];
        foreach (['label' => 'label', 'description' => 'description', 'kind' => 'kind', 'status' => 'status'] as $in => $col) {
            if (array_key_exists($in, $b)) { $set[] = "$col=?"; $args[] = $b[$in]; }
        }
        if (array_key_exists('cost', $b)) { $set[] = "cost_points=?"; $args[] = (int) $b['cost']; }
        if (array_key_exists('value', $b)) { $set[] = "value=?"; $args[] = $b['value'] !== null ? (float) $b['value'] : null; }
        if ($set) { $args[] = $id; Database::run("UPDATE reward_catalog SET " . implode(',', $set) . " WHERE id=?", $args); }
        Response::ok(self::reward(Database::one("SELECT * FROM reward_catalog WHERE id=?", [$id])));
    }
    public static function deleteReward(array $p): void
    {
        Auth::requireAdmin();
        Database::run("DELETE FROM reward_catalog WHERE id=?", [(int) $p['id']]);
        Response::ok(['deleted' => (int) $p['id']]);
    }

    /** Customer: their own loyalty account (points, tier, progress, ledger, redemptions). */
    public static function account(): void
    {
        $cid = Auth::requireCustomer();
        $acc = Database::one("SELECT * FROM loyalty_accounts WHERE customer_id=?", [$cid]);
        if (!$acc) {
            $code = 'LB' . strtoupper(substr(md5($cid . uniqid('', true)), 0, 6));
            Database::run("INSERT INTO loyalty_accounts (customer_id,points,referral_code) VALUES (?,0,?)", [$cid, $code]);
            $acc = Database::one("SELECT * FROM loyalty_accounts WHERE customer_id=?", [$cid]);
        }
        $spend = (float) $acc['lifetime_spend'];
        $tiers = array_map([self::class, 'tier'], Database::all("SELECT * FROM loyalty_tiers ORDER BY min_spend ASC"));
        $current = $tiers[0] ?? null;
        $next = null;
        foreach ($tiers as $i => $t) {
            if ($spend >= $t['minSpend']) { $current = $t; $next = $tiers[$i + 1] ?? null; }
        }
        $progress = 1.0;
        if ($next && $current) {
            $span = $next['minSpend'] - $current['minSpend'];
            $progress = $span > 0 ? max(0, min(1, ($spend - $current['minSpend']) / $span)) : 1.0;
        }
        $ledger = Database::all("SELECT type,points,label,order_number,created_at FROM loyalty_ledger WHERE account_id=? ORDER BY created_at DESC LIMIT 50", [$acc['id']]);
        $redemptions = Database::all("SELECT code,points_cost,used,order_number,created_at FROM reward_redemptions WHERE account_id=? ORDER BY created_at DESC", [$acc['id']]);
        Response::ok([
            'points' => (int) $acc['points'],
            'lifetimeSpend' => $spend,
            'referralCode' => $acc['referral_code'],
            'tier' => $current,
            'nextTier' => $next,
            'progress' => round($progress, 3),
            'ledger' => array_map(fn($l) => [
                'type' => $l['type'], 'points' => (int) $l['points'], 'label' => $l['label'],
                'orderNumber' => $l['order_number'], 'createdAt' => $l['created_at'],
            ], $ledger),
            'redemptions' => array_map(fn($r) => [
                'code' => $r['code'], 'cost' => (int) $r['points_cost'], 'used' => (bool) $r['used'],
                'orderNumber' => $r['order_number'], 'createdAt' => $r['created_at'],
            ], $redemptions),
        ]);
    }

    /** Customer: redeem a reward for a one-time code. */
    public static function redeem(): void
    {
        $cid = Auth::requireCustomer();
        $b = Request::body();
        $reward = Database::one(
            "SELECT * FROM reward_catalog WHERE (id=? OR reward_key=?) AND status='active'",
            [(int) ($b['rewardId'] ?? 0), (string) ($b['rewardKey'] ?? $b['reward'] ?? '')]
        );
        if (!$reward) Response::error('Reward not found', 404);
        $acc = Database::one("SELECT * FROM loyalty_accounts WHERE customer_id=?", [$cid]);
        if (!$acc) Response::error('No loyalty account', 404);
        $cost = (int) $reward['cost_points'];
        if ((int) $acc['points'] < $cost) Response::error('Not enough points', 422);
        $code = strtoupper(substr($reward['reward_key'], 0, 4)) . '-' . strtoupper(substr(md5(uniqid('', true)), 0, 6));
        Database::run("UPDATE loyalty_accounts SET points=points-? WHERE id=?", [$cost, $acc['id']]);
        Database::run("INSERT INTO reward_redemptions (account_id,reward_id,code,points_cost) VALUES (?,?,?,?)", [$acc['id'], $reward['id'], $code, $cost]);
        Database::run("INSERT INTO loyalty_ledger (account_id,type,points,label) VALUES (?,?,?,?)", [$acc['id'], 'redeem', -$cost, 'Redeemed: ' . $reward['label']]);
        Response::created(['code' => $code, 'reward' => self::reward($reward), 'pointsRemaining' => (int) $acc['points'] - $cost]);
    }

    public static function accounts(): void
    {
        Auth::requireAdmin();
        $rows = Database::all(
            "SELECT la.points, la.lifetime_spend, la.referral_code, c.name, c.email
             FROM loyalty_accounts la JOIN customers c ON c.id=la.customer_id ORDER BY la.points DESC"
        );
        Response::ok(array_map(fn($r) => [
            'name' => $r['name'], 'email' => $r['email'],
            'points' => (int) $r['points'], 'lifetimeSpend' => (float) $r['lifetime_spend'], 'referralCode' => $r['referral_code'],
        ], $rows));
    }
}
