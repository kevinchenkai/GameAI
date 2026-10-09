#!/usr/bin/env bash
set -Eeuo pipefail
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_HOST=ubuntu@211.159.177.55
REMOTE_DIR=/www/wwwroot/g.ismayday.mobi/apec26
[[ "$REMOTE_DIR" == /www/wwwroot/g.ismayday.mobi/apec26 ]] || exit 1
for script in app.js data-v2.js v2.js contacts-v3.js routes-v3.js restaurants-v3.js v3.js gifts-v4.js restaurants-v4.js media-v4.js scenes-v4.js v4.js gifts-v5.js reviews-v5.js guides-v5.js v5.js; do
  node --check "$LOCAL_DIR/$script"
done
flags=(-avz --no-owner --no-group --no-perms --chmod=D755,F644 --rsync-path="sudo rsync")
if [[ "${1:-}" != --apply ]]; then
  flags+=(--dry-run)
else
  ssh "$REMOTE_HOST" "sudo mkdir -p '$REMOTE_DIR'"
fi
# Explicit allowlist: only the web entrypoint, CSS, JS and generated assets.
rsync "${flags[@]}" "$LOCAL_DIR/style.css" "$LOCAL_DIR/app.js" "$LOCAL_DIR/data-v2.js" "$LOCAL_DIR/v2.js" "$LOCAL_DIR/v3.css" "$LOCAL_DIR/contacts-v3.js" "$LOCAL_DIR/routes-v3.js" "$LOCAL_DIR/restaurants-v3.js" "$LOCAL_DIR/v3.js" "$LOCAL_DIR/gifts-v4.js" "$LOCAL_DIR/restaurants-v4.js" "$LOCAL_DIR/media-v4.js" "$LOCAL_DIR/scenes-v4.js" "$LOCAL_DIR/v4.js" "$LOCAL_DIR/v4.css" "$LOCAL_DIR/gifts-v5.js" "$LOCAL_DIR/reviews-v5.js" "$LOCAL_DIR/guides-v5.js" "$LOCAL_DIR/v5.js" "$LOCAL_DIR/v5.css" "$LOCAL_DIR/assets" "$REMOTE_HOST:$REMOTE_DIR/"
# Publish the entrypoint last, after every referenced asset is present.
rsync "${flags[@]}" "$LOCAL_DIR/index.html" "$REMOTE_HOST:$REMOTE_DIR/"
if [[ "${1:-}" == --apply ]]; then
  ssh "$REMOTE_HOST" "sudo chown -R www:www '$REMOTE_DIR'; sudo find '$REMOTE_DIR' -type d -exec chmod 755 {} +; sudo find '$REMOTE_DIR' -type f -exec chmod 644 {} +"
  curl --fail --silent --show-error --location --output /dev/null https://g.ismayday.mobi/apec26
fi
