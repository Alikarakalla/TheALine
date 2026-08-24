<?php
class Util
{
    public static function slugify(string $s): string
    {
        $s = strtolower(trim($s));
        $s = preg_replace('/[^a-z0-9]+/', '-', $s);
        return trim($s, '-') ?: 'item';
    }

    public static function uniqueSlug(string $table, string $base, ?int $ignoreId = null): string
    {
        $slug = $base; $i = 2;
        while (Database::one(
            "SELECT id FROM `$table` WHERE slug=?" . ($ignoreId ? " AND id<>?" : ""),
            $ignoreId ? [$slug, $ignoreId] : [$slug]
        )) {
            $slug = $base . '-' . $i++;
        }
        return $slug;
    }

    /**
     * Repair a stored media URL that was written with a stale absolute host.
     *
     * Rows created while UPLOAD_URL still pointed at a dev machine kept that
     * host verbatim (e.g. http://localhost/lovebag/api/uploads/x.webp), which
     * is unreachable — and mixed content — for every visitor. Any URL whose
     * path contains an uploads segment is re-pointed at the configured
     * upload_url; everything else (external CDN images) is left untouched.
     */
    public static function mediaUrl(?string $url): ?string
    {
        $u = trim((string) $url);
        if ($u === '') return $url;
        if (!preg_match('~^https?://~i', $u)) return $u;   // already relative

        $path = parse_url($u, PHP_URL_PATH) ?: '';
        if (!preg_match('~/uploads/(.+)$~', $path, $m)) return $u;  // not ours

        static $base = null;
        if ($base === null) {
            $cfg = require dirname(__DIR__) . '/config.php';
            $base = rtrim($cfg['upload_url'], '/');
        }
        // Same base already? Leave it alone rather than rewriting every row.
        if (str_starts_with($u, $base . '/')) return $u;
        return $base . '/' . ltrim($m[1], '/');
    }

    /** mediaUrl() across a list, dropping empties. */
    public static function mediaUrls(array $urls): array
    {
        return array_values(array_filter(array_map(
            fn($u) => self::mediaUrl($u),
            $urls
        )));
    }
}
