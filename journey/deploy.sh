#!/usr/bin/env bash
# Journey Ludo —— Web 一体化部署脚本
#
# 流程：定位 Godot → 校验 Web 导出模板 → 刷新导入缓存 → 导出 Web →
#       pngquant 近无损压缩产物大图 → rsync 增量同步到服务器 journey/ 子目录 →
#       服务器端 chown www:www → curl 验证 200。
#
# 用法：
#   ./deploy.sh                # 完整：导出 + 压缩 + 部署
#   ./deploy.sh --no-deploy    # 只本地导出+压缩，不上传（自检用）
#   ./deploy.sh --skip-export  # 跳过导出，直接部署已有 build/web/
#
# 约束：只写部署路径 /www/wwwroot/g.ismayday.mobi/journey/，--delete 仅限该子目录，
#       绝不波及同级站点（soulmate / tavern / star_fighter）。
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
LOCAL_DIR="$(pwd)"

# ---- 可覆盖配置（环境变量，对齐 tavern/deploy.sh 风格）----
REMOTE_HOST="${REMOTE_HOST:-ubuntu@211.159.177.55}"
REMOTE_ROOT="${REMOTE_ROOT:-/www/wwwroot/g.ismayday.mobi}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-$REMOTE_ROOT/journey}"
REMOTE_USER="${REMOTE_USER:-www}"
PUBLIC_URL="${PUBLIC_URL:-https://g.ismayday.mobi/journey/}"
BUILD_DIR="${BUILD_DIR:-$LOCAL_DIR/build/web}"
PRESET_NAME="${PRESET_NAME:-Web}"
PNG_COMPRESS_MIN_BYTES="${PNG_COMPRESS_MIN_BYTES:-307200}"   # >300KB 的 png 才压
PNGQUANT_QUALITY="${PNGQUANT_QUALITY:-65-90}"                # 近无损区间

# 中文字体子集化（导出前重建，确保新增文案的字也进包）
FONT_SRC_TTF="${FONT_SRC_TTF:-$LOCAL_DIR/assets/fonts/NotoSansSC-Regular-subset.ttf}"
FONT_FULL_TTF="${FONT_FULL_TTF:-}"   # 可选：完整 Noto Sans SC 源（用于重建子集）；空则跳过重建
GZIP_EXTS="${GZIP_EXTS:-wasm pck js}"  # 这些产物预压缩为 .gz，配服务器 gzip_static on

DO_DEPLOY=1
DO_EXPORT=1
for arg in "$@"; do
  case "$arg" in
    --no-deploy)  DO_DEPLOY=0 ;;
    --skip-export) DO_EXPORT=0 ;;
    -h|--help) grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "未知参数：$arg" >&2; exit 2 ;;
  esac
done

log() { printf '\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn] %s\033[0m\n' "$*" >&2; }
die() { printf '\033[1;31m[error] %s\033[0m\n' "$*" >&2; exit 1; }

# ---- 1. 定位 Godot（复用 start.sh 的探测顺序）----
find_godot() {
  command -v godot 2>/dev/null && return 0
  for p in /opt/homebrew/bin/godot /usr/local/bin/godot \
           /Applications/Godot.app/Contents/MacOS/Godot; do
    [ -x "$p" ] && { printf '%s\n' "$p"; return 0; }
  done
  return 1
}

if [ "$DO_EXPORT" -eq 1 ]; then
  GODOT_BIN="$(find_godot || true)"
  [ -n "$GODOT_BIN" ] || die "未找到 Godot。请 brew install godot 或装 Godot 4.7+。"
  log "Godot: $GODOT_BIN"
  GODOT_VER="$("$GODOT_BIN" --version 2>/dev/null | head -1)"
  echo "    version: $GODOT_VER"

  # ---- 2. 校验 Web 导出模板已安装 ----
  TPL_DIR="$HOME/Library/Application Support/Godot/export_templates"
  if ! ls "$TPL_DIR"/*/web_*.zip >/dev/null 2>&1 \
     && ! ls "$TPL_DIR"/*/web_release.zip >/dev/null 2>&1; then
    cat >&2 <<EOF

[error] 未检测到 Web 导出模板，无法导出。
        请安装与引擎匹配的模板（$GODOT_VER），二选一：
        A. Godot 编辑器 → Editor → Manage Export Templates → Download and Install
        B. 命令行下载 .tpz 后解压到：
           $TPL_DIR/<版本>.stable/
        装好后重跑 ./deploy.sh
EOF
    exit 1
  fi

  # ---- 2.5 中文字体子集化（仅当提供完整字体源 FONT_FULL_TTF 时重建）----
  # 扫描 scripts/scenes/data 里实际用到的汉字，重建子集字体，避免新文案漏字成方块。
  # 不提供 FONT_FULL_TTF 时跳过，沿用仓库已有子集（已覆盖当前全部文案）。
  if [ -n "$FONT_FULL_TTF" ] && [ -f "$FONT_FULL_TTF" ] && command -v python3 >/dev/null 2>&1 \
     && python3 -c "import fontTools" >/dev/null 2>&1; then
    log "重建中文字体子集（源：$(basename "$FONT_FULL_TTF")）"
    python3 - "$FONT_FULL_TTF" "$FONT_SRC_TTF" <<'PY'
import sys, re, glob
from fontTools import subset
full_ttf, out_ttf = sys.argv[1], sys.argv[2]
chars = set()
cjk = re.compile(r'[　-〿㐀-鿿＀-￯‘’“”…—·]')
for pat in ("scripts/**/*.gd", "scenes/**/*.tscn", "data/**/*.json"):
    for f in glob.glob(pat, recursive=True):
        try:
            for ch in open(f, encoding="utf-8").read():
                if cjk.match(ch): chars.add(ch)
        except Exception: pass
ascii_printable = "".join(chr(c) for c in range(0x20, 0x7f))
unicodes = sorted({ord(c) for c in ascii_printable + "".join(chars)})
for extra in (0x3000, 0xFF01, 0xFF08, 0xFF09, 0xFF0C, 0xFF1A, 0xFF1B):
    if extra not in unicodes: unicodes.append(extra)
opts = subset.Options(); opts.desubroutinize = True
opts.name_IDs = ['*']; opts.layout_features = ['*']; opts.notdef_outline = True
font = subset.load_font(full_ttf, opts)
ss = subset.Subsetter(options=opts); ss.populate(unicodes=unicodes); ss.subset(font)
subset.save_font(font, out_ttf, opts); font.close()
print(f"    子集字符数 {len(unicodes)} → {out_ttf}")
PY
  else
    [ -z "$FONT_FULL_TTF" ] || warn "字体重建跳过（缺 fontTools 或 FONT_FULL_TTF 不存在），沿用现有子集。"
  fi

  # ---- 3. 刷新导入缓存 ----
  log "刷新 Godot 导入缓存"
  "$GODOT_BIN" --headless --import . >/dev/null 2>&1 || \
    "$GODOT_BIN" --headless --import .

  # ---- 4. 导出 Web ----
  log "导出 Web 预设 '$PRESET_NAME' → $BUILD_DIR"
  rm -rf "$BUILD_DIR"
  mkdir -p "$BUILD_DIR"
  "$GODOT_BIN" --headless --export-release "$PRESET_NAME" "$BUILD_DIR/index.html"
  [ -f "$BUILD_DIR/index.html" ] || die "导出未生成 index.html，检查预设名 '$PRESET_NAME'。"
  [ -f "$BUILD_DIR/index.wasm" ] || warn "未见 index.wasm（可能文件名不同），继续。"
  echo "    导出产物："
  du -h "$BUILD_DIR"/* 2>/dev/null | sort -rh | head -12

  # ---- 5. pngquant 近无损压缩（仅作用于 build 产物，不动仓库原图）----
  if command -v pngquant >/dev/null 2>&1; then
    log "pngquant 压缩 build 产物中 >$((PNG_COMPRESS_MIN_BYTES/1024))KB 的 PNG"
    saved=0
    while IFS= read -r -d '' png; do
      before=$(stat -f%z "$png" 2>/dev/null || stat -c%s "$png")
      if pngquant --quality="$PNGQUANT_QUALITY" --skip-if-larger --strip \
                  --force --output "$png" -- "$png" 2>/dev/null; then
        after=$(stat -f%z "$png" 2>/dev/null || stat -c%s "$png")
        saved=$((saved + before - after))
        printf '    %-40s %6sKB → %6sKB\n' \
          "$(basename "$png")" "$((before/1024))" "$((after/1024))"
      fi
    done < <(find "$BUILD_DIR" -type f -name '*.png' -size +"${PNG_COMPRESS_MIN_BYTES}"c -print0)
    echo "    共省下约 $((saved/1024))KB"
  else
    warn "未装 pngquant（brew install pngquant），跳过压缩。"
  fi
else
  log "--skip-export：使用已有 $BUILD_DIR"
  [ -f "$BUILD_DIR/index.html" ] || die "$BUILD_DIR/index.html 不存在，请先导出。"
fi

# ---- 6. 预压缩 gz（配服务器 gzip_static on，wasm 38M→~10M 传输，零运行时 CPU）----
if command -v gzip >/dev/null 2>&1; then
  log "预压缩 $GZIP_EXTS 为 .gz（gzip_static 直发）"
  for ext in $GZIP_EXTS; do
    for f in "$BUILD_DIR"/*."$ext"; do
      [ -f "$f" ] || continue
      gzip -9 -k -f "$f"
      before=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f")
      after=$(stat -f%z "$f.gz" 2>/dev/null || stat -c%s "$f.gz")
      printf '    %-16s %5sMB → %5sMB (.gz)\n' \
        "$(basename "$f")" "$((before/1048576))" "$((after/1048576))"
    done
  done
else
  warn "无 gzip，跳过预压缩（服务器将传未压缩文件）。"
fi

[ "$DO_DEPLOY" -eq 1 ] || { log "--no-deploy：本地完成，未上传。产物在 $BUILD_DIR"; exit 0; }

# ---- 7. rsync 增量同步（仅 journey/ 子目录；--delete 不波及同级站点）----
log "rsync → $REMOTE_HOST:$REMOTE_APP_DIR/"
ssh -o BatchMode=yes "$REMOTE_HOST" "mkdir -p '$REMOTE_APP_DIR'"
rsync -avz --delete \
  --rsync-path="sudo rsync" \
  --no-owner --no-group --no-perms \
  --exclude ".DS_Store" \
  "$BUILD_DIR/" "$REMOTE_HOST:$REMOTE_APP_DIR/"

# ---- 7. 落地属主对齐为 www:www（同同级站点）----
log "服务器端 chown $REMOTE_USER:$REMOTE_USER"
ssh -o BatchMode=yes "$REMOTE_HOST" \
  "sudo chown -R $REMOTE_USER:$REMOTE_USER '$REMOTE_APP_DIR'"

# ---- 8. 健康验证 ----
log "验证 $PUBLIC_URL"
code="$(curl -s -o /dev/null -w '%{http_code}' -I "$PUBLIC_URL" || echo 000)"
if [ "$code" = "200" ]; then
  printf '\033[1;32m✓ 部署成功：%s （HTTP %s）\033[0m\n' "$PUBLIC_URL" "$code"
else
  warn "首页返回 HTTP $code（可能 CDN 缓存/索引延迟）。请浏览器访问 $PUBLIC_URL 复核。"
fi
