<?php
class SettingsController
{
    /** Public: grouped settings used to theme + configure the storefront. */
    public static function publicGet(): void
    {
        Response::ok(self::grouped());
    }

    public static function adminGet(): void
    {
        Auth::requireAdmin();
        Response::ok(self::grouped());
    }

    /** Admin: PUT body = { theme:{...}, site:{...}, seo:{...} } */
    public static function update(): void
    {
        Auth::requireAdmin();
        $body = Request::body();
        $count = 0;
        foreach ($body as $group => $items) {
            if (!is_array($items)) {
                continue;
            }
            foreach ($items as $key => $value) {
                Database::run(
                    "INSERT INTO settings (group_key,item_key,item_value) VALUES (?,?,?)
                     ON DUPLICATE KEY UPDATE item_value=VALUES(item_value)",
                    [$group, $key, is_scalar($value) ? (string) $value : json_encode($value)]
                );
                $count++;
            }
        }
        Response::ok(['updated' => $count, 'settings' => self::grouped()]);
    }

    private static function grouped(): array
    {
        $rows = Database::all("SELECT group_key, item_key, item_value, value_type FROM settings");
        $out = [];
        foreach ($rows as $r) {
            $v = $r['item_value'];
            if ($r['value_type'] === 'number') {
                $v = is_numeric($v) ? $v + 0 : $v;
            } elseif ($r['value_type'] === 'bool') {
                $v = $v === '1' || $v === 'true';
            } elseif ($r['value_type'] === 'json') {
                $v = json_decode((string) $v, true);
            }
            $out[$r['group_key']][$r['item_key']] = $v;
        }
        return $out;
    }
}
