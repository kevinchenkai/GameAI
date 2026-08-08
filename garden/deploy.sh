#!/usr/bin/env bash
#
# Garden Match 部署脚本
#
# ★ 红线（根 CLAUDE.md §1.1）：站点根 /www/wwwroot/g.ismayday.mobi/ 是
#   首页 + tavern / soulmate / star_fighter / journey **以及非本仓库的
#   mimo / mystock** 共用的目录。本脚本带 --delete，因此：
#     - 只同步到 $REMOTE_APP_DIR（garden/ 子目录）
#     - 绝不对站点根执行任何写操作
#   下面有硬性断言拦截误配置，触发即中止。
#
# 用法：
#   ./deploy.sh              # 先看 dry-run，确认后按提示重跑
#   DRY_RUN=0 ./deploy.sh    # 实际执行
#
set -Eeuo pipefail

LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_HOST="${REMOTE_HOST:-ubuntu@211.159.177.55}"
REMOTE_ROOT="${REMOTE_ROOT:-/www/wwwroot/g.ismayday.mobi}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-$REMOTE_ROOT/garden}"
REMOTE_USER="${REMOTE_USER:-www}"
BASE_PATH="${VITE_BASE_PATH:-/garden/}"
SITE_URL="${SITE_URL:-https://g.ismayday.mobi/garden/}"
DRY_RUN="${DRY_RUN:-1}"

# ————————————————————————————————————————————————
# 部署边界断言 ★ 不要删
# ————————————————————————————————————————————————

# 归一化路径（去掉结尾斜杠）后再比对，避免 "…/garden" vs "…/garden/" 绕过检查
norm() { printf '%s' "${1%/}"; }

if [[ "$(norm "$REMOTE_APP_DIR")" == "$(norm "$REMOTE_ROOT")" ]]; then
  echo "❌ 中止：REMOTE_APP_DIR 等于站点根。带 --delete 同步站点根会删掉" >&2
  echo "   首页与其它所有游戏，以及非本仓库的 mimo / mystock。" >&2
  exit 1
fi

if [[ "$(norm "$REMOTE_APP_DIR")" != "$(norm "$REMOTE_ROOT")/garden" ]]; then
  echo "❌ 中止：REMOTE_APP_DIR 必须是 \$REMOTE_ROOT/garden" >&2
  echo "   当前值：$REMOTE_APP_DIR" >&2
  echo "   本项目唯一可写目录是 garden/。要动别处，先问用户。" >&2
  exit 1
fi

echo "==> Garden Match 部署"
echo "    源目录  : $LOCAL_DIR/web/dist"
echo "    目标    : $REMOTE_HOST:$REMOTE_APP_DIR"
echo "    base    : $BASE_PATH"
echo "    DRY_RUN : $DRY_RUN"
echo

# ————————————————————————————————————————————————
# 构建前校验：测试与关卡校验必须通过（子项目 CLAUDE.md §8）
# ————————————————————————————————————————————————

cd "$LOCAL_DIR/web"

echo "==> 安装依赖"
npm install

echo "==> 单元测试 + 关卡 Schema 校验"
npm test
npm run validate-levels

echo "==> 契约 lint"
npm run lint

echo "==> 构建"
VITE_BASE_PATH="$BASE_PATH" NODE_ENV=production npm run build

if [[ ! -f "$LOCAL_DIR/web/dist/index.html" ]]; then
  echo "❌ 中止：dist/index.html 不存在，构建可能失败" >&2
  exit 1
fi

# ————————————————————————————————————————————————
# 同步
# ————————————————————————————————————————————————

RSYNC_FLAGS=(-avz --delete
  --rsync-path="sudo rsync"
  --no-owner --no-group --no-times --no-perms
  --chmod=D755,F644
  --exclude ".DS_Store")

if [[ "$DRY_RUN" == "1" ]]; then
  echo "==> DRY RUN —— 下面是**将要发生**的改动，不会真的写入"
  rsync "${RSYNC_FLAGS[@]}" --dry-run \
    "$LOCAL_DIR/web/dist/" "$REMOTE_HOST:$REMOTE_APP_DIR/"
  echo
  echo "确认影响范围无误后，用以下命令实际执行："
  echo "    DRY_RUN=0 ./deploy.sh"
  exit 0
fi

echo "==> 确保远端目录存在"
ssh "$REMOTE_HOST" "sudo mkdir -p '$REMOTE_APP_DIR'"

echo "==> 同步"
rsync "${RSYNC_FLAGS[@]}" \
  "$LOCAL_DIR/web/dist/" "$REMOTE_HOST:$REMOTE_APP_DIR/"

echo "==> 对齐属主"
ssh "$REMOTE_HOST" "sudo chown -R $REMOTE_USER:$REMOTE_USER '$REMOTE_APP_DIR'"

# ————————————————————————————————————————————————
# 发布后核对
# ————————————————————————————————————————————————

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
CODE="$(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL")"
echo "    $SITE_URL → $CODE"
[[ "$CODE" == "200" ]] || { echo "❌ 页面未返回 200" >&2; exit 1; }

echo
echo "✅ 部署完成：$SITE_URL"
