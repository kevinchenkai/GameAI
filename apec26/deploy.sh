#!/usr/bin/env bash
set -Eeuo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$PROJECT_DIR/public"
REMOTE_HOST=ubuntu@211.159.177.55
REMOTE_DIR=/www/wwwroot/g.ismayday.mobi/apec26
[[ "$REMOTE_DIR" == /www/wwwroot/g.ismayday.mobi/apec26 ]] || exit 1
case "${1:---dry-run}" in
  --apply) apply=true ;;
  --dry-run) apply=false ;;
  *) echo 'Usage: deploy.sh [--dry-run|--apply]' >&2; exit 2 ;;
esac
python3 "$PROJECT_DIR/scripts/check-release.py"
resources=()
while IFS= read -r file; do resources+=("./$file"); done < <(
  python3 - "$PROJECT_DIR/release-files.json" <<'PY'
import json,sys
for name in json.load(open(sys.argv[1]))['files']:
    if name!='index.html':print(name)
PY
)
flags=(-avz --checksum --relative --no-owner --no-group --no-perms --chmod=D755,F644 --rsync-path="sudo rsync")
if [[ "$apply" == false ]]; then
  flags+=(--dry-run)
else
  ssh "$REMOTE_HOST" "sudo mkdir -p '$REMOTE_DIR'"
fi
# Paths are relative to public/: backup, data and scripts are never sent.
(cd "$PUBLIC_DIR"; rsync "${flags[@]}" "${resources[@]}" "$REMOTE_HOST:$REMOTE_DIR/")
# Publish the entrypoint after all dependencies.
(cd "$PUBLIC_DIR"; rsync "${flags[@]}" ./index.html "$REMOTE_HOST:$REMOTE_DIR/")
if [[ "$apply" == true ]]; then
  ssh "$REMOTE_HOST" "sudo chown -R www:www '$REMOTE_DIR'; sudo find '$REMOTE_DIR' -type d -exec chmod 755 {} +; sudo find '$REMOTE_DIR' -type f -exec chmod 644 {} +"
  curl --fail --silent --show-error --location --output /dev/null https://g.ismayday.mobi/apec26/
fi
