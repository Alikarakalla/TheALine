<?php
class ReviewsController
{
    private static function resolveProduct(string $idOrSlug): ?array
    {
        return Database::one("SELECT id, name FROM products WHERE slug=? OR id=?", [$idOrSlug, (int) $idOrSlug]);
    }

    private static function shape(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'author' => $r['author'],
            'rating' => (int) $r['rating'],
            'title' => $r['title'],
            'body' => $r['body'],
            'createdAt' => $r['created_at'],
        ];
    }

    /** Public: approved reviews for a product, plus the aggregate summary. */
    public static function index(array $params): void
    {
        $p = self::resolveProduct((string) $params['id']);
        if (!$p) Response::error('Product not found', 404);
        $rows = Database::all(
            "SELECT * FROM reviews WHERE product_id=? AND status='approved' ORDER BY created_at DESC",
            [$p['id']]
        );
        $count = count($rows);
        $avg = $count ? round(array_sum(array_map(fn($r) => (int) $r['rating'], $rows)) / $count, 2) : 0;
        Response::ok([
            'summary' => ['count' => $count, 'average' => $avg],
            'reviews' => array_map([self::class, 'shape'], $rows),
        ]);
    }

    /** Submit a review. Customers post under their account name; guests must supply one. */
    public static function create(array $params): void
    {
        $p = self::resolveProduct((string) $params['id']);
        if (!$p) Response::error('Product not found', 404);
        $b = Request::body();
        $rating = max(1, min(5, (int) ($b['rating'] ?? 5)));
        $customer = Auth::customer();
        $customerId = $customer ? (int) $customer['sub'] : null;
        $author = $customer ? ($customer['name'] ?? 'Customer') : trim((string) ($b['author'] ?? ''));
        if ($author === '') Response::error('Please add your name', 422);
        Database::run(
            "INSERT INTO reviews (product_id,customer_id,author,rating,title,body,status) VALUES (?,?,?,?,?,?, 'approved')",
            [$p['id'], $customerId, $author, $rating, $b['title'] ?? null, $b['body'] ?? ($b['text'] ?? null)]
        );
        $rid = Database::lastId();
        // Keep the product's denormalised rating/review_count in sync.
        $agg = Database::one("SELECT COUNT(*) c, AVG(rating) a FROM reviews WHERE product_id=? AND status='approved'", [$p['id']]);
        Database::run("UPDATE products SET rating=?, review_count=? WHERE id=?", [round((float) $agg['a'], 2), (int) $agg['c'], $p['id']]);
        Response::created(self::shape(Database::one("SELECT * FROM reviews WHERE id=?", [$rid])));
    }
}
