// RightLingo Service Worker（MV3 后台）
// 职责：管理原生右键菜单；接收选中文本，翻译后把译文写进菜单标题。
// 管线：选中文字 → content script 上报 → SW 翻译并更新菜单 → 右键即可看到。

import { translateText } from './translate.js';

const MENU_ROOT_ID = 'rl-root';
const TITLE_PREFIX = '译文：';
// 一级菜单预览的显示宽度上限：CJK/全角按 2 计、其余按 1 计，80 ≈ 40 个汉字。
// Chrome 对菜单标题没有字符数硬上限，会把菜单撑宽（有系统最大值），超宽才按像素截断；
// 这个上限是为了不让菜单被单个长译文撑成"横幅"（实测菜单最宽约能容纳 80 格）。
const PREVIEW_MAX_WIDTH = 80;

// 新选区手势开始时先显示的占位符：保证菜单不残留上一次的内容，兼作"正在翻译"提示。
const PLACEHOLDER_TITLE = '译文：正在翻译…';
const FAILED_TITLE = '译文：（翻译失败）';
const ZH_SOURCE_TITLE = '译文：（原文已是中文）';

// 菜单最多只能显示约 40 个汉字，超过这个长度的部分翻译了也显示不了
// （"复制完整译文"是后续阶段的能力），先对送翻译的文本设上限。
const MAX_TRANSLATION_CHARS = 500;
const CACHE_MAX_ENTRIES = 100;

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

// 请求序号：拖选会连续触发多次翻译，响应到达顺序不保证，
// 只认最新一次请求的结果，过期的直接丢弃。
let requestSeq = 0;
const translationCache = new Map(); // 原文 -> { text, srcLang }

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'selection-reset') {
    // 新的选择手势开始：先把菜单重置为占位符，避免右键时残留上一次的内容
    setMenuTitle(PLACEHOLDER_TITLE);
  } else if (msg.type === 'selection' && typeof msg.text === 'string') {
    translateSelection(msg.text);
  }
});

async function translateSelection(text) {
  const trimmed = text.trim().slice(0, MAX_TRANSLATION_CHARS);
  if (!trimmed) return;
  const seq = ++requestSeq;

  let result;
  try {
    result = await getTranslation(trimmed);
  } catch (err) {
    console.error('[RightLingo] 翻译失败:', err.message);
    if (seq === requestSeq) setMenuTitle(FAILED_TITLE);
    return;
  }

  if (seq !== requestSeq) return; // 已有更新的选区，这份结果过期了

  if (result.srcLang.startsWith('zh')) {
    setMenuTitle(ZH_SOURCE_TITLE);
    return;
  }
  setMenuTitle(buildPreviewTitle(result.text));
}

async function getTranslation(text) {
  const cached = translationCache.get(text);
  if (cached) return cached;
  const result = await translateText(text);
  if (translationCache.size >= CACHE_MAX_ENTRIES) translationCache.clear();
  translationCache.set(text, result);
  return result;
}

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

function buildPreviewTitle(text) {
  const budget = PREVIEW_MAX_WIDTH - displayWidth(TITLE_PREFIX);
  const { text: preview, truncated } = truncateByWidth(text.trim(), budget);
  return `${TITLE_PREFIX}${preview}${truncated ? '…' : ''}`;
}

function setMenuTitle(title) {

  chrome.contextMenus.update(MENU_ROOT_ID, { title }, () => {
    const err = chrome.runtime.lastError;
    if (err) {
      console.error('[RightLingo] 更新菜单失败:', err.message);
      return;
    }
    console.log('[RightLingo] 菜单已更新:', title);
  });
}
