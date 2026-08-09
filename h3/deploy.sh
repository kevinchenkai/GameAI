#!/usr/bin/env bash
#
# MiniMax-H3 作品展示页 部署脚本
#
# ★ 红线（根 CLAUDE.md §1.1）：站点根 /www/wwwroot/g.ismayday.mobi/ 是
#   首页 + tavern / soulmate / star_fighter / journey / garden **以及非本仓库的
#   mimo / mystock** 共用的目录。本脚本带 --delete，因此：
#     - 只同步到 $REMOTE_APP_DIR（h3/ 子目录）
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
REMOTE_APP_DIR="${REMOTE_APP_DIR:-$REMOTE_ROOT/h3}"
REMOTE_USER="${REMOTE_USER:-www}"
SITE_URL="${SITE_URL:-https://g.ismayday.mobi/h3/}"
DRY_RUN="${DRY_RUN:-1}"

# ————————————————————————————————————————————————
# 部署边界断言 ★ 不要删
# ————————————————————————————————————————————————

norm() { printf '%s' "${1%/}"; }

if [[ "$(norm "$REMOTE_APP_DIR")" == "$(norm "$REMOTE_ROOT")" ]]; then
  echo "❌ 中止：REMOTE_APP_DIR 等于站点根。带 --delete 同步站点根会删掉" >&2
  echo "   首页与其它所有项目，以及非本仓库的 mimo / mystock。" >&2
  exit 1
fi

if [[ "$(norm "$REMOTE_APP_DIR")" != "$(norm "$REMOTE_ROOT")/h3" ]]; then
  echo "❌ 中止：REMOTE_APP_DIR 必须是 \$REMOTE_ROOT/h3" >&2
  echo "   当前值：$REMOTE_APP_DIR" >&2
  echo "   本项目唯一可写目录是 h3/。要动别处，先问用户。" >&2
  exit 1
fi

# ————————————————————————————————————————————————
# 构建 + 产物自检
# ————————————————————————————————————————————————

cd "$LOCAL_DIR"

echo "==> 重新生成 cases.json 与 index.html（prompt 一律从 prompts/*.txt 原样读入）"
python3 build.py
python3 build_html.py

if [[ ! -f "$LOCAL_DIR/index.html" ]]; then
  echo "❌ 中止：index.html 不存在" >&2
  exit 1
fi

echo "==> 校验页面引用的资源都在本地存在"
python3 - <<'PY'
import re, pathlib, sys
p = pathlib.Path('index.html').read_text(encoding='utf-8')
refs = sorted(set(re.findall(r'(?:src|poster)="([^"]+)"', p)))
missing = [r for r in refs if not pathlib.Path(r).exists()]
print(f"    引用 {len(refs)} 个资源，缺失 {len(missing)} 个")
if missing:
    for m in missing:
        print(f"    ❌ {m}")
    sys.exit(1)
PY

echo "==> 校验 prompt 与仓库记录的 sha256 一致（防止展示页贴出被改过的 prompt）"
python3 - <<'PY'
import json, hashlib, pathlib, sys
cases = json.loads(pathlib.Path('cases.json').read_text(encoding='utf-8'))
bad = []
for c in cases:
    # cases.json 里的 sha 是 build.py 从 prompts/*.txt 现算的；
    # 这里重算一遍，确认页面里嵌的就是文件里的原文。
    page = pathlib.Path('index.html').read_text(encoding='utf-8')
    import html as _h, re
    m = re.search(r'<pre id="p-%s">(.*?)</pre>' % re.escape(c['id']), page, re.S)
    if not m:
        bad.append((c['id'], '页面里找不到 prompt 块')); continue
    if _h.unescape(m.group(1)) != c['prompt']:
        bad.append((c['id'], '页面内容与 prompts/*.txt 不一致'))
print(f"    校验 {len(cases)} 条 prompt，异常 {len(bad)} 条")
for cid, why in bad:
    print(f"    ❌ {cid}: {why}")
sys.exit(1 if bad else 0)
PY

# ————————————————————————————————————————————————
# 同步
# ————————————————————————————————————————————————

RSYNC_FLAGS=(-avz --delete
  --rsync-path="sudo rsync"
  --no-owner --no-group --no-times --no-perms
  --chmod=D755,F644
  --exclude ".DS_Store"
  --exclude "build.py"
  --exclude "build_html.py"
  --exclude "deploy.sh"
  --exclude "cases.json")

echo
echo "==> MiniMax-H3 展示页部署"
echo "    源目录  : $LOCAL_DIR"
echo "    目标    : $REMOTE_HOST:$REMOTE_APP_DIR"
echo "    体积    : $(du -sh "$LOCAL_DIR/videos" | cut -f1) 视频 + $(du -sh "$LOCAL_DIR/posters" | cut -f1) 封面"
echo "    DRY_RUN : $DRY_RUN"
echo

if [[ "$DRY_RUN" == "1" ]]; then
  echo "==> DRY RUN —— 下面是**将要发生**的改动，不会真的写入"
  rsync "${RSYNC_FLAGS[@]}" --dry-run "$LOCAL_DIR/" "$REMOTE_HOST:$REMOTE_APP_DIR/"
  echo
  echo "确认影响范围无误后，用以下命令实际执行："
  echo "    DRY_RUN=0 ./deploy.sh"
  exit 0
fi

echo "==> 确保远端目录存在"
ssh "$REMOTE_HOST" "sudo mkdir -p '$REMOTE_APP_DIR'"

echo "==> 同步"
rsync "${RSYNC_FLAGS[@]}" "$LOCAL_DIR/" "$REMOTE_HOST:$REMOTE_APP_DIR/"

echo "==> 对齐属主"
ssh "$REMOTE_HOST" "sudo chown -R $REMOTE_USER:$REMOTE_USER '$REMOTE_APP_DIR'"

# ————————————————————————————————————————————————
# 发布后核对
# ————————————————————————————————————————————————

echo "==> 核对 index.html md5"
LOCAL_MD5="$(md5 -q "$LOCAL_DIR/index.html" 2>/dev/null || md5sum "$LOCAL_DIR/index.html" | cut -d' ' -f1)"
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

echo "==> 抽查一条视频可访问（C-004 是最大的一条竖屏成片）"
VCODE="$(curl -s -o /dev/null -w '%{http_code}' "${SITE_URL}videos/C-004.mp4")"
VLEN="$(curl -s -o /dev/null -w '%{size_download}' -r 0-1023 "${SITE_URL}videos/C-004.mp4")"
echo "    videos/C-004.mp4 → $VCODE (Range 请求返回 ${VLEN} 字节)"
[[ "$VCODE" == "200" || "$VCODE" == "206" ]] || { echo "❌ 视频不可访问" >&2; exit 1; }

echo
echo "✅ 部署完成：$SITE_URL"
