#!/bin/sh
# 从 icons/icon.svg 导出 manifest 需要的四种尺寸 PNG（16/32/48/128）。
# 用本机无头 Chrome 渲染，保证透明背景和矢量缩放质量。
# 用法：sh tools/export-icons.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVG="$ROOT/icons/icon.svg"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

[ -f "$SVG" ] || { echo "找不到 $SVG"; exit 1; }
[ -x "$CHROME" ] || { echo "找不到 Chrome，请修改脚本里的 CHROME 路径"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for size in 16 32 48 128; do
  cat > "$TMP/page.html" <<EOF
<!DOCTYPE html>
<body style="margin:0"><img src="file://$SVG" width="$size" height="$size"></body>
EOF
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --screenshot="$ROOT/icons/icon${size}.png" \
    --window-size=${size},${size} \
    --default-background-color=00000000 \
    "file://$TMP/page.html" 2>/dev/null
  echo "icon${size}.png ✓"
done
