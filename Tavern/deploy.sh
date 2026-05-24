#!/usr/bin/env bash
set -Eeuo pipefail

LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_HOST="${REMOTE_HOST:-ubuntu@211.159.177.55}"
REMOTE_ROOT="${REMOTE_ROOT:-/www/wwwroot/g.ismayday.mobi}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-$REMOTE_ROOT/tavern}"
REMOTE_API_DIR="${REMOTE_API_DIR:-$REMOTE_APP_DIR/api}"
REMOTE_NODE="${REMOTE_NODE:-/www/server/nodejs/v24.16.0/bin/node}"
REMOTE_USER="${REMOTE_USER:-www}"
HEALTH_URL="${HEALTH_URL:-https://g.ismayday.mobi/tavern-api/health}"
CHAT_URL="${CHAT_URL:-https://g.ismayday.mobi/tavern-api/chat}"
VITE_TAVERN_API_URL="${VITE_TAVERN_API_URL:-https://g.ismayday.mobi/tavern-api}"
ASSET_VERSION="${ASSET_VERSION:-art-v6-qiaofeng-nameplate-20260524}"

echo "==> Deploying Wulin Tavern from $LOCAL_DIR"
echo "==> Target: $REMOTE_HOST:$REMOTE_APP_DIR"
echo "==> API URL: $VITE_TAVERN_API_URL"
echo "==> Asset version: $ASSET_VERSION"

echo "==> Installing web dependencies"
cd "$LOCAL_DIR/web"
npm install

echo "==> Building web"
VITE_TAVERN_API_URL="$VITE_TAVERN_API_URL" VITE_ASSET_VERSION="$ASSET_VERSION" VITE_BASE_PATH="${VITE_BASE_PATH:-/tavern/}" npm run build

echo "==> Checking API syntax locally"
cd "$LOCAL_DIR/api"
node --check src/server.js
node --check src/config.js
node --check src/prompt.js
node --check src/deepseek.js
node --check src/fallback.js
node --check src/http.js
node --check src/npcs.js

echo "==> Syncing files"
rsync -avz --delete \
  --rsync-path="sudo rsync" \
  --no-owner --no-group --no-times --no-perms \
  --exclude ".git/" \
  --exclude "node_modules/" \
  --exclude ".DS_Store" \
  --exclude ".env" \
  --exclude ".checks/" \
  --exclude ".chrome-tavern-profile/" \
  --exclude "tavern-v1-cdp-shot.png" \
  --exclude ".htaccess" \
  --exclude "*.log" \
  --exclude "api/.env" \
  "$LOCAL_DIR/" "$REMOTE_HOST:$REMOTE_APP_DIR/"

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

sudo chown -R "$RUN_USER:$RUN_USER" "$APP_DIR"

if [ ! -f "$API_DIR/.env" ]; then
  echo "WARN: missing $API_DIR/.env. Initializing from .env.example; set DEEPSEEK_API_KEY on the server for live AI replies." >&2
  sudo -u "$RUN_USER" cp "$API_DIR/.env.example" "$API_DIR/.env"
fi

echo "==> Checking API syntax on server"
cd "$API_DIR"
sudo -u "$RUN_USER" "$NODE_BIN" --check src/server.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/config.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/prompt.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/deepseek.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/fallback.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/http.js
sudo -u "$RUN_USER" "$NODE_BIN" --check src/npcs.js

echo "==> Publishing web dist to $APP_DIR"
sudo rm -rf "$APP_DIR/assets" "$APP_DIR/index.html"
sudo -u "$RUN_USER" cp -R "$APP_DIR/web/dist/." "$APP_DIR/"

echo "==> Restarting API"
for pid in $(pgrep -u "$RUN_USER" -f "node src/server.js" || true); do
  cwd="$(sudo readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  if [ "$cwd" = "$API_DIR" ]; then
    sudo kill "$pid" || true
  fi
done

sleep 1

sudo -u "$RUN_USER" sh -c "cd '$API_DIR' && exec '$NODE_BIN' src/server.js >> tavern-api.log 2>&1 < /dev/null" &

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
  tail -n 40 "$API_DIR/tavern-api.log" >&2 || true
  exit 1
fi

echo "==> API running as pid $api_pid"

echo "==> Health check"
curl -fsS "$HEALTH_URL"
echo

echo "==> Chat smoke test"
chat_output="$(curl -N -sS --max-time 20 -X POST "$CHAT_URL" \
  -H 'Content-Type: application/json' \
  -d '{"npcId":"huangrong","npcName":"黄蓉","message":"今天有什么好吃的？","topic":"free","tableId":"A","tablemates":[{"id":"guojing","name":"郭靖","title":"大漠憨憨"}],"eventId":"guojing_huangrong_food","eventName":"大漠金牌饲养员","eventDescription":"黄蓉疯狂夹菜，郭靖憨笑吃饭。","recentMessages":[],"clientTime":"2026-05-24T12:00:00.000Z"}')"
echo "$chat_output" | sed -n '1,60p'

if ! printf '%s' "$chat_output" | grep -q 'event: done'; then
  echo "ERROR: /chat did not return SSE done event." >&2
  exit 1
fi

if ! printf '%s' "$chat_output" | grep -q '"ok":true'; then
  echo "ERROR: /chat done payload is not ok." >&2
  exit 1
fi

echo "==> Deployed successfully"
REMOTE_SCRIPT
