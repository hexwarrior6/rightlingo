// RightLingo Service Worker（MV3 后台）
// 职责：管理原生右键菜单；接收选中文本，把菜单标题更新为测试文案。
// 阶段一先证明整条管线：选中文字 → content script 上报 → SW 更新菜单 → 右键可见。

const MENU_ROOT_ID = 'rl-root';
const TITLE_PREFIX = '译文：（测试）';
// 一级菜单预览的显示宽度上限：CJK/全角按 2 计、其余按 1 计，80 ≈ 40 个汉字。
// Chrome 对菜单标题没有字符数硬上限，会把菜单撑宽（有系统最大值），超宽才按像素截断；
// 这个上限是为了不让菜单被单个长译文撑成"横幅"（实测菜单最宽约能容纳 80 格）。
const PREVIEW_MAX_WIDTH = 80;

// SW 每次被唤醒都会重新执行顶层代码。
// 菜单注册在浏览器里、跨 SW 重启持久存在，所以重复 create 会报 duplicate id，属预期，忽略即可。
createMenus();

function createMenus() {
  chrome.contextMenus.create(
    {
      id: MENU_ROOT_ID,
      title: 'RightLingo',
      // 只在用户选中了文字时才显示这一项
      contexts: ['selection'],
    },
    () => {
      const err = chrome.runtime.lastError;
      if (err && !/duplicate id/i.test(err.message)) {
        console.error('[RightLingo] 创建菜单失败:', err.message);
      }
    }
  );
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'selection' && typeof msg.text === 'string') {
    updateMenuTitle(msg.text);
  }
});

// 近似的“显示宽度”：中日韩全角字符按 2 格、其余按 1 格。阶段三/四会复用并按实测微调。
function charDisplayWidth(char) {
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

function displayWidth(text) {
  let width = 0;
  for (const char of text) width += charDisplayWidth(char);
  return width;
}

// 按显示宽度截断文本；for...of / Array.from 均按完整字符迭代，emoji 不会被截半
function truncateByWidth(text, maxWidth) {
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

function updateMenuTitle(text) {
  const budget = PREVIEW_MAX_WIDTH - displayWidth(TITLE_PREFIX);
  const { text: preview, truncated } = truncateByWidth(text.trim(), budget);
  const title = `${TITLE_PREFIX}${preview}${truncated ? '…' : ''}`;

  chrome.contextMenus.update(MENU_ROOT_ID, { title }, () => {
    const err = chrome.runtime.lastError;
    if (err) {
      console.error('[RightLingo] 更新菜单失败:', err.message);
      return;
    }
    console.log('[RightLingo] 菜单已更新:', title);
  });
}
