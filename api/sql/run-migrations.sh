#!/usr/bin/env bash
#
# Apply any pending SQL migrations in api/sql/migrations/ — each runs exactly
# once, tracked in a `schema_migrations` ledger table. Safe to run repeatedly.
#
# Reads DB credentials from the server .env (DB_HOST DB_PORT DB_NAME DB_USER
# DB_PASS). Run from anywhere; it locates the project root itself:
#     bash api/sql/run-migrations.sh
#
# This is invoked automatically at the end of scripts/deploy.sh / deploy.ps1,
# so a normal deploy keeps the production database in sync. You can also run it
# by hand over SSH if you ever need to.
set -euo pipefail

# ---- locate project root (two levels up from api/sql/) ----------------------
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# ---- load DB credentials from .env (root) or api/.env -----------------------
ENVFILE=".env"
[ -f "$ENVFILE" ] || ENVFILE="api/.env"
if [ ! -f "$ENVFILE" ]; then
  echo "!! no .env found (looked for ./.env and ./api/.env) — cannot migrate" >&2
  exit 1
fi
# tr -d '\r' guards against a .env saved with Windows (CRLF) line endings.
# shellcheck disable=SC2046
export $(grep -E '^DB_(HOST|PORT|NAME|USER|PASS)=' "$ENVFILE" | tr -d '\r' | xargs)
: "${DB_NAME:?DB_NAME missing from $ENVFILE}"
: "${DB_USER:?DB_USER missing from $ENVFILE}"

MYSQL=(mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"${DB_PASS:-}" "$DB_NAME")

# ---- ledger of applied migrations -------------------------------------------
"${MYSQL[@]}" -e "CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   VARCHAR(255) PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"

# ---- apply pending migrations in filename order -----------------------------
DIR="api/sql/migrations"
shopt -s nullglob
applied=0
for f in "$DIR"/*.sql; do
  base="$(basename "$f")"
  if [ -n "$("${MYSQL[@]}" -N -B -e "SELECT 1 FROM schema_migrations WHERE filename='$base' LIMIT 1")" ]; then
    echo "   . $base (already applied)"
    continue
  fi
  echo "   > applying $base"
  "${MYSQL[@]}" < "$f"
  "${MYSQL[@]}" -e "INSERT INTO schema_migrations (filename) VALUES ('$base')"
  applied=$((applied + 1))
done
echo "   migrations complete ($applied newly applied)"
