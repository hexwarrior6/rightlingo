// RightLingo 菜单显示规则（纯函数，不依赖任何 Chrome API，可单独用 node 验证）
//
// "显示宽度"：CJK/全角字符按 2 格、其余按 1 格 —— 用于决定一级直显还是摘要 + 二级菜单。

// 近似的字符显示宽度
export function charDisplayWidth(char) {
  const code = char.codePointAt(0);
  const isWide =
    (code >= 0x1100 && code <= 0x115f) || // 谚文字母
    (code >= 0x2e80 && code <= 0xa4cf) || // CJK 部首/标点/假名/汉字等
    (code >= 0xac00 && code <= 0xd7a3) || // 谚文音节
    (code >= 0xf900 && code <= 0xfaff) || // CJK 兼容表意文字
    (code >= 0xfe30 && code <= 0xfe6f) || // CJK 兼容形式
    (code >= 0xff00 && code <= 0xff60) || // 全角字符
    (code >= 0xffe0 && code <= 0xffe6); // 全角符号补充
  return isWide ? 2 : 1;
}

export function displayWidth(text) {
  let width = 0;
  for (const char of text) width += charDisplayWidth(char);
  return width;
}

// 按显示宽度截断文本；Array.from 按完整字符迭代，emoji 不会被截半
export function truncateByWidth(text, maxWidth) {
  let width = 0;
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    width += charDisplayWidth(chars[i]);
    if (width > maxWidth) {
      return { text: chars.slice(0, i).join('').trimEnd(), truncated: true };
    }
  }
  return { text, truncated: false };
}

// 把长译文拆成若干显示行（用于二级菜单，每行一个菜单项）：
// - 优先在空格处断行，不把英文单词切半；没有空格可用时（连续中文、长 URL）按宽度硬切
// - 最多 maxLines 行；没显示完的部分经 remainder 返回，由调用方显示"… 查看完整译文"
export function splitIntoLines(text, lineWidth, maxLines) {
  const lines = [];
  let remaining = text;

  while (remaining && lines.length < maxLines) {
    const { text: cut, truncated } = truncateByWidth(remaining, lineWidth);
    if (!truncated) {
      lines.push(cut);
      remaining = '';
      break;
    }
    // 回退到断点前的最近空格；回退位置太靠前（不足行宽 60%）说明是长单词/URL，直接硬切
    const lastSpace = cut.lastIndexOf(' ');
    const breakAt = lastSpace > lineWidth * 0.6 ? lastSpace : cut.length;
    lines.push(cut.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }

  return { lines, remainder: remaining || null };
}
