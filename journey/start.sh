#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

find_godot() {
  if command -v godot >/dev/null 2>&1; then
    command -v godot
    return 0
  fi

  if [ -x /opt/homebrew/bin/godot ]; then
    printf '%s\n' /opt/homebrew/bin/godot
    return 0
  fi

  if [ -x /usr/local/bin/godot ]; then
    printf '%s\n' /usr/local/bin/godot
    return 0
  fi

  if [ -x /Applications/Godot.app/Contents/MacOS/Godot ]; then
    printf '%s\n' /Applications/Godot.app/Contents/MacOS/Godot
    return 0
  fi

  return 1
}

GODOT_BIN="$(find_godot || true)"

if [ -z "${GODOT_BIN}" ]; then
  cat >&2 <<'EOF'
未找到 Godot。

请先安装 Godot 4.2+，例如：
  brew install godot

或从官网下载 .app：
  https://godotengine.org/download/macos/
EOF
  exit 1
fi

echo "Using Godot: ${GODOT_BIN}"
"${GODOT_BIN}" --version

echo "Refreshing Godot import cache..."
# 用位置参数传项目路径（--path . 配 --import 在部分 Godot 4.x 上会误报 no main scene）
"${GODOT_BIN}" --headless --import .

echo "Starting Journey Ludo..."
exec "${GODOT_BIN}" --path .
