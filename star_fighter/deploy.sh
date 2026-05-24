#!/usr/bin/env bash
set -Eeuo pipefail

LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_HOST="${REMOTE_HOST:-ubuntu@211.159.177.55}"
REMOTE_ROOT="${REMOTE_ROOT:-/www/wwwroot/g.ismayday.mobi}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-$REMOTE_ROOT/$(basename "$LOCAL_DIR")}"

echo "==> Deploying Star Fighter from $LOCAL_DIR"
echo "==> Target: $REMOTE_HOST:$REMOTE_APP_DIR"

echo "==> Cleaning local check artifacts"
find "$LOCAL_DIR" -maxdepth 2 \
  \( -name ".checks" -o -name ".tmp" -o -name "tmp" -o -name "*.tmp" -o -name "v2-screenshot*.png" -o -name "playwright-report" -o -name "test-results" \) \
  -print -exec rm -rf {} +

if command -v node >/dev/null 2>&1; then
  echo "==> Checking inline JavaScript syntax"
  node - "$LOCAL_DIR/index.html" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const html = fs.readFileSync(file, "utf8");
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
scripts.forEach((script) => new Function(script));
console.log(`Parsed ${scripts.length} script block(s) successfully.`);
NODE
else
  echo "WARN: node not found, skipping inline JavaScript syntax check." >&2
fi

rsync -avz --delete \
  --no-owner --no-group \
  --chmod=Du=rwx,Dg=rwx,Do=rx,Fu=rw,Fg=rw,Fo=r \
  --exclude ".git/" \
  --exclude "node_modules/" \
  --exclude ".DS_Store" \
  --exclude ".env" \
  --exclude ".checks/" \
  --exclude ".tmp/" \
  --exclude "tmp/" \
  --exclude "*.tmp" \
  --exclude "*.log" \
  --exclude "v2-screenshot*.png" \
  --exclude "playwright-report/" \
  --exclude "test-results/" \
  --exclude "images/*source.png" \
  "$LOCAL_DIR" "$REMOTE_HOST:$REMOTE_ROOT/"

echo "==> Deployed successfully. Nginx will serve the static files automatically."
