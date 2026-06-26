<?php
/**
 * Apply pending SQL migrations in api/sql/migrations/ — each runs exactly once,
 * tracked in a `schema_migrations` ledger table. Safe to run repeatedly.
 *
 * Uses the application's OWN PDO connection (api/core/Database.php -> config.php
 * -> .env), so it connects exactly like the live API does — no mysql-CLI host /
 * socket / IPv6 mismatch, no shell .env parsing.
 *
 *   php api/sql/migrate.php
 *
 * Invoked automatically at the end of scripts/deploy.ps1 / deploy.sh.
 */

require __DIR__ . '/../core/Database.php';

/** Split a .sql script into individual statements (skips -- and # line comments,
 *  /​* *​/ blocks, and respects '…' / "…" string literals). */
function sql_statements(string $sql): array
{
    $stmts = [];
    $buf = '';
    $len = strlen($sql);
    $inSingle = $inDouble = $inLine = $inBlock = false;
    for ($i = 0; $i < $len; $i++) {
        $c = $sql[$i];
        $n = $i + 1 < $len ? $sql[$i + 1] : '';
        if ($inLine)  { if ($c === "\n") $inLine = false; continue; }
        if ($inBlock) { if ($c === '*' && $n === '/') { $inBlock = false; $i++; } continue; }
        if (!$inSingle && !$inDouble) {
            if (($c === '-' && $n === '-') || $c === '#') { $inLine = true; continue; }
            if ($c === '/' && $n === '*') { $inBlock = true; $i++; continue; }
        }
        if ($c === "'" && !$inDouble) { $inSingle = !$inSingle; $buf .= $c; continue; }
        if ($c === '"' && !$inSingle) { $inDouble = !$inDouble; $buf .= $c; continue; }
        if ($c === ';' && !$inSingle && !$inDouble) {
            $t = trim($buf);
            if ($t !== '') $stmts[] = $t;
            $buf = '';
            continue;
        }
        $buf .= $c;
    }
    $t = trim($buf);
    if ($t !== '') $stmts[] = $t;
    return $stmts;
}

try {
    $pdo = Database::pdo();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            filename   VARCHAR(255) PRIMARY KEY,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $files = glob(__DIR__ . '/migrations/*.sql') ?: [];
    sort($files);

    $applied = 0;
    foreach ($files as $f) {
        $base = basename($f);
        $seen = $pdo->prepare("SELECT 1 FROM schema_migrations WHERE filename = ? LIMIT 1");
        $seen->execute([$base]);
        if ($seen->fetchColumn()) {
            echo "   . $base (already applied)\n";
            continue;
        }
        echo "   > applying $base\n";
        foreach (sql_statements((string) file_get_contents($f)) as $stmt) {
            $pdo->exec($stmt);
        }
        $pdo->prepare("INSERT INTO schema_migrations (filename) VALUES (?)")->execute([$base]);
        $applied++;
    }
    echo "   migrations complete ($applied newly applied)\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "MIGRATION FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
