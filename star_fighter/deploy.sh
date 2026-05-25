#!/usr/bin/env bash
set -Eeuo pipefail

LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="${PROJECT_NAME:-star_fighter}"
REMOTE_HOST="${REMOTE_HOST:-ubuntu@211.159.177.55}"
REMOTE_ROOT="${REMOTE_ROOT:-/www/wwwroot/g.ismayday.mobi}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-$REMOTE_ROOT/$PROJECT_NAME}"
REMOTE_RSYNC_PATH="${REMOTE_RSYNC_PATH:-sudo rsync}"
REMOTE_MKDIR="${REMOTE_MKDIR:-sudo mkdir -p}"
CHECK_ONLY="${CHECK_ONLY:-0}"
DRY_RUN="${DRY_RUN:-0}"

echo "==> Deploying Star Fighter from $LOCAL_DIR"
echo "==> Target: $REMOTE_HOST:$REMOTE_APP_DIR"

echo "==> Cleaning local check artifacts"
rm -rf \
  "$LOCAL_DIR/.checks" \
  "$LOCAL_DIR/.tmp" \
  "$LOCAL_DIR/tmp" \
  "$LOCAL_DIR/playwright-report" \
  "$LOCAL_DIR/test-results"
find "$LOCAL_DIR" -maxdepth 2 -type f \
  \( -name "*.tmp" -o -name "v2-screenshot*.png" \) \
  -print -delete

for required_file in index.html prompt.txt images/space-background.png images/player.png; do
  if [ ! -e "$LOCAL_DIR/$required_file" ]; then
    echo "ERROR: missing required file: $LOCAL_DIR/$required_file" >&2
    exit 1
  fi
done

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

if ! command -v rsync >/dev/null 2>&1; then
  echo "ERROR: rsync not found." >&2
  exit 1
fi

if [ "$CHECK_ONLY" = "1" ]; then
  echo "==> CHECK_ONLY=1, local deploy checks passed. No remote connection was made."
  exit 0
fi

if [ "$DRY_RUN" = "1" ]; then
  echo "==> DRY_RUN=1, previewing rsync changes only"
else
  remote_mkdir_cmd="$(printf '%s %q' "$REMOTE_MKDIR" "$REMOTE_APP_DIR")"
  ssh "$REMOTE_HOST" "$remote_mkdir_cmd"
fi

rsync_args=(
  -avz
  --delete
  --rsync-path="$REMOTE_RSYNC_PATH"
  --no-owner
  --no-group
  --chmod=Du=rwx,Dg=rwx,Do=rx,Fu=rw,Fg=rw,Fo=r
  --exclude ".git/"
  --exclude "node_modules/"
  --exclude ".DS_Store"
  --exclude ".env"
  --exclude ".checks/"
  --exclude ".tmp/"
  --exclude "tmp/"
  --exclude "*.tmp"
  --exclude "*.log"
  --exclude "v2-screenshot*.png"
  --exclude "playwright-report/"
  --exclude "test-results/"
  --exclude "images/*source.png"
)

if [ "$DRY_RUN" = "1" ]; then
  rsync_args+=(--dry-run)
fi

rsync "${rsync_args[@]}" "$LOCAL_DIR/" "$REMOTE_HOST:$REMOTE_APP_DIR/"

if [ "$DRY_RUN" = "1" ]; then
  echo "==> Dry run completed. No remote files were changed."
else
  echo "==> Deployed successfully. Nginx will serve the static files automatically."
fi
