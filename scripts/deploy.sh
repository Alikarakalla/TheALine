#!/usr/bin/env bash
#
# Deploy The A Line to Hostinger shared hosting from your computer over SSH.
# Builds the storefront locally, then streams the runtime files to the server.
#
# Usage (Git Bash on Windows, or any bash):
#     bash scripts/deploy.sh
# Config lives in scripts/deploy.env (copy scripts/deploy.env.example first).
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ---- Load SSH config (scripts/deploy.env, gitignored) -----------------------
CONF="$ROOT/scripts/deploy.env"
if [ -f "$CONF" ]; then
  set -a; . "$CONF"; set +a
fi
: "${SSH_HOST:?Set SSH_HOST in scripts/deploy.env (see scripts/deploy.env.example)}"
: "${SSH_USER:?Set SSH_USER in scripts/deploy.env}"
SSH_PORT="${SSH_PORT:-65002}"          # Hostinger shared hosting default SSH port
REMOTE_PATH="${REMOTE_PATH:-public_html}"
TARGET="$SSH_USER@$SSH_HOST"

# ---- 1. Build locally -------------------------------------------------------
echo "==> Building (npm run build)"
npm run build

# ---- 2. Ship runtime files over SSH ----------------------------------------
# Sent: public/ (web root), api/ (backend code), .htaccess (root router).
# NOT sent: .env (server-only), node_modules, src — and api/uploads on the
# server is preserved (tar overwrites code, never deletes the uploaded images).
echo "==> Deploying to $TARGET:$REMOTE_PATH (port $SSH_PORT)"
tar czf - public api .htaccess \
  | ssh -p "$SSH_PORT" "$TARGET" \
      "set -e; mkdir -p '$REMOTE_PATH'; cd '$REMOTE_PATH'; rm -rf public; tar xzf -; echo '   files extracted on server'"

# ---- 3. Apply pending DB migrations on the server --------------------------
# Runs api/sql/migrations/*.sql that haven't been applied yet (tracked in the
# schema_migrations table). Keeps the production DB in sync with the code.
echo "==> Running database migrations"
ssh -p "$SSH_PORT" "$TARGET" "cd '$REMOTE_PATH' && bash api/sql/run-migrations.sh"

echo "==> Done."
echo "    Verify:  https://<your-domain>/api/health   (expects status: up)"
echo "    First time? See README 'Deploy from the terminal' for the one-time DB + .env setup."
