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
}
