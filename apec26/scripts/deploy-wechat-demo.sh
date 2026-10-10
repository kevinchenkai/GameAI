#!/usr/bin/env bash
set -Eeuo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_HOST=ubuntu@211.159.177.55
REMOTE_DIR=/www/wwwroot/g.ismayday.mobi/apec26
DEMO_URL=https://g.ismayday.mobi/apec26/wechat-demo/
case "${1:---dry-run}" in
  --dry-run) apply=false ;;
  --apply) apply=true ;;
  *) echo 'Usage: deploy-wechat-demo.sh [--dry-run|--apply]' >&2; exit 2 ;;
esac
python3 "$PROJECT_DIR/scripts/check-release.py"
node "$PROJECT_DIR/tools/mp-ci/index.cjs" check
flags=(-avz --checksum --relative --no-owner --no-group --no-perms --chmod=D755,F644 --rsync-path="sudo rsync")
if [[ "$apply" == false ]]; then flags+=(--dry-run); fi
# Explicit single-file upload; no full-site sync, root changes, or deletion.
(cd "$PROJECT_DIR/public"; rsync "${flags[@]}" ./wechat-demo/index.html "$REMOTE_HOST:$REMOTE_DIR/")
if [[ "$apply" == true ]]; then
  ssh "$REMOTE_HOST" "sudo chown -R www:www '$REMOTE_DIR/wechat-demo'; sudo chmod 755 '$REMOTE_DIR/wechat-demo'; sudo chmod 644 '$REMOTE_DIR/wechat-demo/index.html'"
  expected=$(shasum -a 256 "$PROJECT_DIR/public/wechat-demo/index.html" | awk '{print $1}')
  remote=$(ssh "$REMOTE_HOST" "sha256sum '$REMOTE_DIR/wechat-demo/index.html'" | awk '{print $1}')
  response=$(curl --fail --silent --show-error "$DEMO_URL" | shasum -a 256 | awk '{print $1}')
  [[ "$expected" == "$remote" && "$expected" == "$response" ]] || { echo 'Deployed H5 checksum mismatch' >&2; exit 1; }
  echo "PASS: server and HTTPS response match local H5: $DEMO_URL"
fi
