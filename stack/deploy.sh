#!/usr/bin/env bash
#
# StackPop 部署脚本
#
# 红线：站点根 /www/wwwroot/g.ismayday.mobi/ 由多个游戏及其它项目共用。
# 本脚本带 --delete，因此只允许同步到 stack/ 子目录，绝不写站点根。
#
# 用法：
#   ./deploy.sh              # 默认 dry-run，只展示影响范围
#   DRY_RUN=0 ./deploy.sh    # 实际部署
#
set -Eeuo pipefail

LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_HOST="${REMOTE_HOST:-ubuntu@211.159.177.55}"
REMOTE_ROOT="${REMOTE_ROOT:-/www/wwwroot/g.ismayday.mobi}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-$REMOTE_ROOT/stack}"
REMOTE_USER="${REMOTE_USER:-www}"
BASE_PATH="${VITE_BASE_PATH:-/stack/}"
SITE_URL="${SITE_URL:-https://g.ismayday.mobi/stack/}"
DRY_RUN="${DRY_RUN:-1}"

# 部署边界断言：不要删除。
norm() { printf '%s' "${1%/}"; }

if [[ "$(norm "$REMOTE_APP_DIR")" == "$(norm "$REMOTE_ROOT")" ]]; then
  echo "❌ 中止：REMOTE_APP_DIR 等于站点根。带 --delete 同步站点根会影响其它项目。" >&2
  exit 1
fi

if [[ "$(norm "$REMOTE_APP_DIR")" != "$(norm "$REMOTE_ROOT")/stack" ]]; then
  echo "❌ 中止：REMOTE_APP_DIR 必须是 \$REMOTE_ROOT/stack" >&2
  echo "   当前值：$REMOTE_APP_DIR" >&2
  echo "   StackPop 唯一可写目录是 stack/。" >&2
  exit 1
fi

if [[ "$BASE_PATH" != "/stack/" ]]; then
  echo "❌ 中止：VITE_BASE_PATH 必须是 /stack/，当前值：$BASE_PATH" >&2
  exit 1
fi

if [[ "$DRY_RUN" != "0" && "$DRY_RUN" != "1" ]]; then
  echo "❌ 中止：DRY_RUN 只能是 0 或 1，当前值：$DRY_RUN" >&2
  exit 1
fi

echo "==> StackPop 部署"
echo "    源目录  : $LOCAL_DIR/web/dist"
echo "    目标    : $REMOTE_HOST:$REMOTE_APP_DIR"
echo "    base    : $BASE_PATH"
echo "    DRY_RUN : $DRY_RUN"
echo

cd "$LOCAL_DIR/web"

echo "==> 安装依赖"
npm install

echo "==> 单元测试 + 关卡校验"
npm test
npm run validate-levels

echo "==> Simulator 分级验证"
npm run simulate

echo "==> 契约 lint"
npm run lint

echo "==> 构建"
VITE_BASE_PATH="$BASE_PATH" NODE_ENV=production npm run build

if [[ ! -f "$LOCAL_DIR/web/dist/index.html" ]]; then
  echo "❌ 中止：dist/index.html 不存在，构建可能失败" >&2
  exit 1
fi

RSYNC_FLAGS=(-avz --delete
  --rsync-path="sudo rsync"
  --no-owner --no-group --no-times --no-perms
  --chmod=D755,F644
  --exclude ".DS_Store")

if [[ "$DRY_RUN" == "1" ]]; then
  echo "==> DRY RUN —— 下面是将要发生的改动，不会写入远端"
  rsync "${RSYNC_FLAGS[@]}" --dry-run \
    "$LOCAL_DIR/web/dist/" "$REMOTE_HOST:$REMOTE_APP_DIR/"
  echo
  echo "确认影响范围无误后执行："
  echo "    DRY_RUN=0 ./deploy.sh"
  exit 0
fi

echo "==> 确保远端目录存在"
ssh "$REMOTE_HOST" "sudo mkdir -p '$REMOTE_APP_DIR'"

echo "==> 同步"
rsync "${RSYNC_FLAGS[@]}" \
  "$LOCAL_DIR/web/dist/" "$REMOTE_HOST:$REMOTE_APP_DIR/"

echo "==> 对齐属主"
ssh "$REMOTE_HOST" "sudo chown -R '$REMOTE_USER:$REMOTE_USER' '$REMOTE_APP_DIR'"

echo "==> 核对 index.html md5"
LOCAL_MD5="$(md5 -q "$LOCAL_DIR/web/dist/index.html" 2>/dev/null || md5sum "$LOCAL_DIR/web/dist/index.html" | cut -d' ' -f1)"
REMOTE_MD5="$(ssh "$REMOTE_HOST" "md5sum '$REMOTE_APP_DIR/index.html' | cut -d' ' -f1")"
echo "    local : $LOCAL_MD5"
echo "    remote: $REMOTE_MD5"
if [[ "$LOCAL_MD5" != "$REMOTE_MD5" ]]; then
  echo "❌ md5 不一致，部署可能未完全生效" >&2
  exit 1
fi

echo "==> 检查 HTTP 状态"
CODE="$(curl -sS -o /dev/null -w '%{http_code}' "$SITE_URL")"
echo "    $SITE_URL → $CODE"
[[ "$CODE" == "200" ]] || { echo "❌ 页面未返回 200" >&2; exit 1; }

echo
echo "✅ 部署完成：$SITE_URL"
