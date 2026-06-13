<?php
class MediaController
{
    private static array $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'image/svg+xml' => 'svg',
    ];

    /** POST /admin/media/upload — multipart "file". Returns { id, url }. */
    public static function upload(): void
    {
        Auth::requireAdmin();
        if (empty($_FILES['file']) || ($_FILES['file']['error'] ?? 1) !== UPLOAD_ERR_OK) {
            Response::error('No file uploaded', 422);
        }
        $f = $_FILES['file'];
        $mime = function_exists('mime_content_type') ? mime_content_type($f['tmp_name']) : ($f['type'] ?? '');
        if (!isset(self::$allowed[$mime])) {
            Response::error('Unsupported file type', 422);
        }
        if ($f['size'] > 5 * 1024 * 1024) {
            Response::error('File too large (max 5MB)', 422);
        }
        $cfg = require dirname(__DIR__) . '/config.php';
        $dir = $cfg['upload_dir'];
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        $name = date('Ymd') . '-' . bin2hex(random_bytes(6)) . '.' . self::$allowed[$mime];
        $dest = $dir . DIRECTORY_SEPARATOR . $name;
        if (!move_uploaded_file($f['tmp_name'], $dest)) {
            Response::error('Could not store the file', 500);
        }
        [$w, $h] = @getimagesize($dest) ?: [null, null];
        $url = $cfg['upload_url'] . '/' . $name;
        Database::run(
            "INSERT INTO media (filename,url,mime,size,width,height) VALUES (?,?,?,?,?,?)",
            [$name, $url, $mime, (int) $f['size'], $w, $h]
        );
        Response::created(['id' => Database::lastId(), 'url' => $url]);
    }

    public static function index(): void
    {
        Auth::requireAdmin();
        $rows = Database::all("SELECT id, url, alt, mime, created_at FROM media ORDER BY id DESC LIMIT 100");
        Response::ok($rows);
    }
}
