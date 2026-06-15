#!/usr/bin/env bash
set -Eeuo pipefail

LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_HOST="${REMOTE_HOST:-ubuntu@211.159.177.55}"
REMOTE_ROOT="${REMOTE_ROOT:-/www/wwwroot/g.ismayday.mobi}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-$REMOTE_ROOT/soulmate}"
REMOTE_API_DIR="${REMOTE_API_DIR:-$REMOTE_APP_DIR/api}"
REMOTE_NODE="${REMOTE_NODE:-/www/server/nodejs/v24.16.0/bin/node}"
REMOTE_USER="${REMOTE_USER:-www}"
HEALTH_URL="${HEALTH_URL:-https://g.ismayday.mobi/api/health}"
CHAT_URL="${CHAT_URL:-https://g.ismayday.mobi/api/chat}"

echo "==> Deploying SoulMate from $LOCAL_DIR"
echo "==> Target: $REMOTE_HOST:$REMOTE_APP_DIR"

# Sync frontend static assets to app root on server
rsync -avz --delete \
  --rsync-path="sudo rsync" \
  --no-owner --no-group --no-times --no-perms \
  --exclude ".DS_Store" \
  --exclude "Dockerfile" \
  --exclude ".dockerignore" \
  --exclude "nginx.conf" \
  "$LOCAL_DIR/frontend/" "$REMOTE_HOST:$REMOTE_APP_DIR/"

# Sync API directory
rsync -avz --delete \
  --rsync-path="sudo rsync" \
  --no-owner --no-group --no-times --no-perms \
  --exclude "node_modules/" \
  --exclude ".DS_Store" \
  --exclude ".env" \
  --exclude ".checks/" \
  --exclude "Dockerfile" \
  --exclude ".dockerignore" \
  --exclude "package-lock.json" \
  --exclude "*.log" \
  --exclude "data/" \
  --exclude "*.sqlite" \
  --exclude "*.sqlite-wal" \
  --exclude "*.sqlite-shm" \
  "$LOCAL_DIR/api/" "$REMOTE_HOST:$REMOTE_APP_DIR/api/"

ssh "$REMOTE_HOST" bash -s -- "$REMOTE_APP_DIR" "$REMOTE_API_DIR" "$REMOTE_NODE" "$REMOTE_USER" "$HEALTH_URL" "$CHAT_URL" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

APP_DIR="$1"
API_DIR="$2"
NODE_BIN="$3"
RUN_USER="$4"
HEALTH_URL="$5"
CHAT_URL="$6"

if [ ! -x "$NODE_BIN" ]; then
  echo "ERROR: Node binary not found: $NODE_BIN" >&2
  exit 1
fi

if [ ! -f "$API_DIR/.env" ]; then
  echo "ERROR: missing $API_DIR/.env. Keep DeepSeek config on the server before deploy." >&2
  exit 1
fi

sudo chown -R "$RUN_USER:$RUN_USER" "$APP_DIR"
sudo -u "$RUN_USER" mkdir -p "$API_DIR/data/backups"
sudo rm -rf "$APP_DIR/audit" "$APP_DIR/output" "$APP_DIR/roadshow" "$APP_DIR/tmp"

echo "==> Checking frontend syntax"
cd "$APP_DIR"
sudo -u "$RUN_USER" "$NODE_BIN" --check app.js
sudo -u "$RUN_USER" "$NODE_BIN" --check settings.js

echo "==> Checking API syntax"
cd "$API_DIR"
sudo -u "$RUN_USER" "$NODE_BIN" --check src/server.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/config.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/db.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/migrations.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/memoryStore.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/memoryRetrieve.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/prompt.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/deepseek.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/fallback.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/http.js

echo "==> Restarting API"
for pid in $(pgrep -f "$API_DIR.*src/server.js" || true); do
  sudo kill "$pid" || true
done

for pid in $(pgrep -u "$RUN_USER" -f "node src/server.js" || true); do
  cwd="$(sudo readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  if [ "$cwd" = "$API_DIR" ]; then
    sudo kill "$pid" || true
  fi
done

sleep 1

sudo -u "$RUN_USER" sh -c "cd '$API_DIR' && setsid '$NODE_BIN' src/server.js >> '$API_DIR/soulmate-api.log' 2>&1 < /dev/null &" >/dev/null 2>&1

sleep 2

api_pid=""
for pid in $(pgrep -u "$RUN_USER" -f "node src/server.js" || true); do
  cwd="$(sudo readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  if [ "$cwd" = "$API_DIR" ]; then
    api_pid="$pid"
  fi
done

if [ -z "$api_pid" ]; then
  echo "ERROR: API process did not start. Last logs:" >&2
  tail -n 40 "$API_DIR/soulmate-api.log" >&2 || true
  exit 1
fi

echo "==> API running as pid $api_pid"

echo "==> Health check"
curl -fsS "$HEALTH_URL"
echo

echo "==> Chat smoke test"
chat_output="$(curl -N -sS --max-time 20 -X POST "$CHAT_URL" \
  -H 'Content-Type: application/json' \
  -d '{"uid":"deploy-smoke","sessionId":"deploy-smoke","message":"今天好累","mood":"cute","heartScore":120,"intimacy":"close","recentMessages":[]}')"
echo "$chat_output" | sed -n '1,40p'

if ! printf '%s' "$chat_output" | grep -q 'event: done'; then
  echo "ERROR: /api/chat did not return SSE done event." >&2
  exit 1
fi

if ! printf '%s' "$chat_output" | grep -q '"ok":true'; then
  echo "ERROR: /api/chat done payload is not ok." >&2
  exit 1
fi

# Clean up the smoke-test UID so it never accumulates in the production DB.
RESET_URL="${HEALTH_URL%/health}/uid/reset"
curl -fsS --max-time 10 -X POST "$RESET_URL" \
  -H 'Content-Type: application/json' \
  -d '{"uid":"deploy-smoke"}' >/dev/null 2>&1 || echo "WARN: failed to clean deploy-smoke uid" >&2

echo "==> Deployed successfully"
REMOTE_SCRIPT
