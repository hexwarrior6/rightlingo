#!/usr/bin/env bash
# 自动化打包脚本：用于构建发布到 Chrome Web Store 的标准 .zip 包
# 提取 manifest.json 中的版本号并打包，排除开发、文档与临时文件
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION=$(grep '"version"' manifest.json | head -1 | sed -E 's/.*"version": "([^"]+)".*/\1/')

if [ -z "$VERSION" ]; then
  echo "❌ 无法从 manifest.json 中读取版本号！"
  exit 1
fi

DIST_DIR="$ROOT/dist"
mkdir -p "$DIST_DIR"

ZIP_NAME="rightlingo-v${VERSION}.zip"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"

# 清理旧包
rm -f "$ZIP_PATH"

echo "📦 正在打包 RightLingo v${VERSION}..."

# 打包必需的运行时文件
# 排除 .git, .DS_Store, docs, tools, dist, *.md 等开发文件
zip -q -r "$ZIP_PATH" \
  manifest.json \
  background.js \
  content.js \
  translate.js \
  display.js \
  settings.js \
  languages.js \
  options.html \
  options.js \
  offscreen.html \
  offscreen.js \
  icons/ \
  -x "*.DS_Store" \
  -x "*__MACOSX*" \
  -x "icons/*.svg"

echo "✅ 打包完成："
echo "   文件路径: $ZIP_PATH"
echo "   文件大小: $(du -h "$ZIP_PATH" | cut -f1)"
echo ""
echo "🔍 压缩包包含的文件列表："
unzip -l "$ZIP_PATH"
