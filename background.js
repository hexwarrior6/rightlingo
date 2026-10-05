// RightLingo Service Worker（MV3 后台）
// 职责：管理原生右键菜单；接收选中文本，翻译后按长度分流：
// 短译文一级直显，长译文"一级摘要 + 二级菜单分行显示"。

import { translateText } from './translate.js';
import { displayWidth, truncateByWidth, splitIntoLines } from './display.js';

const MENU_ROOT_ID = 'rl-root';
const TITLE_PREFIX = '译文：';
// 一级菜单预览的显示宽度上限：CJK/全角按 2 计、其余按 1 计，80 ≈ 40 个汉字。
// Chrome 对菜单标题没有字符数硬上限，会把菜单撑宽（有系统最大值），超宽才按像素截断；
// 这个上限是为了不让菜单被单个长译文撑成"横幅"（实测菜单最宽约能容纳 80 格）。
const PREVIEW_MAX_WIDTH = 80;

// 二级菜单：固定行槽位 + 溢出提示 + 分隔线 + 操作项。
// 菜单标题不支持换行，"每行一个菜单项"是多行译文的唯一显示方式（PRD §3.3）。
// 行数刻意偏少：长文本阅读交给"在 Google 翻译中翻译"跳网页，菜单里只管预览。
const SUBMENU_MAX_LINES = 4;
const SUBMENU_LINE_WIDTH = 72; // 二级行宽上限（显示宽度），比一级略窄，给子菜单缩进留余量
const SUBMENU_LINE_IDS = Array.from({ length: SUBMENU_MAX_LINES }, (_, i) => `rl-line-${i}`);
const SUBMENU_OVERFLOW_ID = 'rl-line-more';
const OVERFLOW_TITLE = '… 查看完整译文'; // 点击 = 复制完整译文
const SUBMENU_SEPARATOR_ID = 'rl-sep';
const SUBMENU_GOOGLE_ID = 'rl-gtranslate';
const GOOGLE_ITEM_TITLE = '在 Google 翻译中翻译';
const GOOGLE_TRANSLATE_URL = 'https://translate.google.com/';
const GOOGLE_TRANSLATE_MAX_CHARS = 2000; // 跳转 URL 里带原文，超长截断
const SUBMENU_COPY_ID = 'rl-copy';
const COPY_TITLE = '复制完整译文';
// 点击这些项都复制完整译文（一级对长文本只显示摘要，但复制的是全文）
const COPYABLE_IDS = new Set([
  MENU_ROOT_ID,
  ...SUBMENU_LINE_IDS,
  SUBMENU_OVERFLOW_ID,
  SUBMENU_COPY_ID,
]);

// 状态文案：新选区手势开始时的占位符（兼作"正在翻译"提示）、失败、中文源
const PLACEHOLDER_TITLE = '译文：正在翻译…';
const FAILED_TITLE = '译文：（翻译失败）';
const ZH_SOURCE_TITLE = '译文：（原文已是中文）';

// 菜单最多能显示约 40 个汉字，超出部分翻译了也显示不了
// （"复制完整译文"是阶段五的能力），先对送翻译的文本设上限。
const MAX_TRANSLATION_CHARS = 500;
const CACHE_MAX_ENTRIES = 100;

// SW 每次被唤醒都会重新执行顶层代码。
// 菜单注册在浏览器里、跨 SW 重启持久存在：先用空 update 探测是否已存在，
// 不存在（首次安装/扩展重载/浏览器重启后）才创建，避免每次唤醒都产生 duplicate id。
probeMenusThenCreate();

function probeMenusThenCreate() {
  chrome.contextMenus.update(MENU_ROOT_ID, {}, () => {
    if (!chrome.runtime.lastError) return; // 菜单还在，什么都不用做（标题也得以保留）
    createMenus();
  });
}

// 扩展安装/更新时强制重建菜单（新增菜单项只改 create 的话，已有安装探测到菜单存在会跳过创建）
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => createMenus());
});

function createMenus() {
  // 固定槽位结构：只在缺失时创建一次，之后所有变化都走 update（改标题/可见性）
  createItem({ id: MENU_ROOT_ID, title: 'RightLingo', contexts: ['selection'] });
  for (const id of SUBMENU_LINE_IDS) {
    createItem({
      id,
      parentId: MENU_ROOT_ID,
      title: '…', // title 必填（只有分隔线可省略）；槽位默认隐藏，标题随后由 update 覆盖
      contexts: ['selection'],
      visible: false,
    });
  }
  createItem({
    id: SUBMENU_OVERFLOW_ID,
    parentId: MENU_ROOT_ID,
    title: OVERFLOW_TITLE,
    contexts: ['selection'],
    visible: false,
  });
  // 菜单项按创建顺序显示：译文行 → 溢出提示 → 分隔线 → Google 翻译 → 复制
  createItem({
    id: SUBMENU_SEPARATOR_ID,
    parentId: MENU_ROOT_ID,
    type: 'separator',
    contexts: ['selection'],
    visible: false,
  });
  createItem({
    id: SUBMENU_GOOGLE_ID,
    parentId: MENU_ROOT_ID,
    title: GOOGLE_ITEM_TITLE,
    contexts: ['selection'],
    visible: false,
  });
  createItem({
    id: SUBMENU_COPY_ID,
    parentId: MENU_ROOT_ID,
    title: COPY_TITLE,
    contexts: ['selection'],
    visible: false,
  });
}

function createItem(props) {
  chrome.contextMenus.create(props, () => {
    const err = chrome.runtime.lastError;
    if (err) {
      console.error('[RightLingo] 创建菜单失败:', err.message);
    }
  });
}

// 请求序号：拖选会连续触发多次翻译，响应到达顺序不保证，
// 只认最新一次请求的结果，过期的直接丢弃。
let requestSeq = 0;
const translationCache = new Map(); // 原文 -> { text, srcLang }

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'selection-reset') {
    // 新的选择手势开始：先把菜单重置为占位符并收起二级菜单，避免残留上一次的内容
    hideSubmenu();
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
    if (seq === requestSeq) {
      hideSubmenu();
      setMenuTitle(FAILED_TITLE);
    }
    return;
  }

  if (seq !== requestSeq) return; // 已有更新的选区，这份结果过期了

  // 存一份最近译文到 storage.session（SW 被点击唤醒后内存缓存已空，点击复制要用）
  chrome.storage.session
    .set({ last: { original: trimmed, translation: result.text, srcLang: result.srcLang } })
    .catch(() => {});

  if (result.srcLang.startsWith('zh')) {
    hideSubmenu();
    setMenuTitle(ZH_SOURCE_TITLE);
    return;
  }
  showTranslation(result.text);
}

async function getTranslation(text) {
  const cached = translationCache.get(text);
  if (cached) return cached;
  const result = await translateText(text);
  if (translationCache.size >= CACHE_MAX_ENTRIES) translationCache.clear();
  translationCache.set(text, result);
  return result;
}

// ---------- 点击复制（阶段五） ----------

// 点击任何译文相关菜单项 = 复制完整译文（PRD §6：点击译文即复制，省一个"复制"菜单项）。
// 复制无视觉反馈（菜单已随点击关闭），粘贴即可验证。
chrome.contextMenus.onClicked.addListener((info) => {
  handleMenuClick(info).catch((err) => {
    console.error('[RightLingo] 复制失败:', err.message);
  });
});

async function handleMenuClick(info) {
  if (info.menuItemId === SUBMENU_GOOGLE_ID) {
    await openInGoogleTranslate(info);
    return;
  }
  if (!COPYABLE_IDS.has(info.menuItemId)) return;
  console.log('[RightLingo] 菜单点击:', info.menuItemId);
  const original = (info.selectionText || '').trim().slice(0, MAX_TRANSLATION_CHARS);
  if (!original) return;

  // 点击会唤醒 SW（内存缓存清空），优先用 storage.session 里的最近一次译文；
  // 对不上（比如浏览器重启过）就现场重翻一次。
  const { last } = await chrome.storage.session.get('last');
  let result;
  if (last && last.original === original) {
    result = last;
  } else {
    result = await getTranslation(original);
  }

  const textToCopy = result.srcLang.startsWith('zh') ? original : result.translation;
  await copyToClipboard(textToCopy);
  console.log('[RightLingo] 已复制译文到剪贴板');
}

// 在 Google 翻译网页版中打开选中的原文（长文本的完整阅读出口）
async function openInGoogleTranslate(info) {
  console.log('[RightLingo] 菜单点击:', SUBMENU_GOOGLE_ID);
  const text = (info.selectionText || '').trim().slice(0, GOOGLE_TRANSLATE_MAX_CHARS);
  if (!text) return;
  const params = new URLSearchParams({ sl: 'auto', tl: 'zh-CN', text, op: 'translate' });
  await chrome.tabs.create({ url: `${GOOGLE_TRANSLATE_URL}?${params}` });
}

async function copyToClipboard(text) {
  // MV3 SW 无法直接写剪贴板（无焦点），由 offscreen 文档代劳
  if (!(await chrome.offscreen.hasDocument())) {
    await createOffscreenDocument();
  }
  try {
    await sendCopyMessage(text);
  } catch (err) {
    // 文档在但监听器不在（如扩展更新前遗留的旧文档）：关掉重建再试一次
    console.warn('[RightLingo] offscreen 首次投递失败，重建文档重试:', err.message);
    await chrome.offscreen.closeDocument();
    await createOffscreenDocument();
    await sendCopyMessage(text);
  }
}

async function createOffscreenDocument() {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['CLIPBOARD'],
    justification: '响应右键菜单的"复制译文"操作',
  });
}

async function sendCopyMessage(text) {
  // 刚创建的文档监听器可能尚未就绪，投递失败就短暂等待重试
  for (let attempt = 1; ; attempt++) {
    try {
      const ok = await chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'copy',
        text,
      });
      if (ok !== true) {
        throw new Error('offscreen 页 execCommand("copy") 返回 false');
      }
      return;
    } catch (err) {
      // 只对"投递失败"重试；execCommand 失败直接抛给上层
      if (attempt >= 3 || !/Receiving end does not exist/i.test(err.message)) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
}

// ---------- 菜单显示 ----------

// 短译文一级直显；长译文一级显示摘要（子菜单箭头由 Chrome 根据可见子项自动添加）
function showTranslation(translation) {
  // 菜单标题不支持换行，多句译文统一压成一行
  const text = translation.replace(/\s*\n+\s*/g, ' ').trim();
  const budget = PREVIEW_MAX_WIDTH - displayWidth(TITLE_PREFIX);
  const { truncated } = truncateByWidth(text, budget);

  if (!truncated) {
    setMenuTitle(TITLE_PREFIX + text);
    hideSubmenu();
    return;
  }

  setMenuTitle(buildSummaryTitle(text));
  const { lines, remainder } = splitIntoLines(text, SUBMENU_LINE_WIDTH, SUBMENU_MAX_LINES);
  showSubmenu(lines, remainder !== null);
  console.log('[RightLingo] 长译文进入二级菜单:', lines.length, '行, 溢出:', remainder !== null);
}

function buildSummaryTitle(text) {
  const budget = PREVIEW_MAX_WIDTH - displayWidth(TITLE_PREFIX);
  const { text: preview } = truncateByWidth(text, budget);
  return `${TITLE_PREFIX}${preview}…`;
}

function showSubmenu(lines, hasOverflow) {
  SUBMENU_LINE_IDS.forEach((id, i) => {
    updateMenuItem(
      id,
      i < lines.length ? { title: lines[i], visible: true } : { visible: false }
    );
  });
  updateMenuItem(SUBMENU_OVERFLOW_ID, { title: OVERFLOW_TITLE, visible: hasOverflow });
  updateMenuItem(SUBMENU_SEPARATOR_ID, { visible: true });
  updateMenuItem(SUBMENU_GOOGLE_ID, { title: GOOGLE_ITEM_TITLE, visible: true });
  updateMenuItem(SUBMENU_COPY_ID, { title: COPY_TITLE, visible: true });
}

function hideSubmenu() {
  for (const id of [
    ...SUBMENU_LINE_IDS,
    SUBMENU_OVERFLOW_ID,
    SUBMENU_SEPARATOR_ID,
    SUBMENU_GOOGLE_ID,
    SUBMENU_COPY_ID,
  ]) {
    updateMenuItem(id, { visible: false });
  }
}

function updateMenuItem(id, props) {
  // 若 update 早于槽位 create 到达会报"not found"，静默忽略即可
  chrome.contextMenus.update(id, props, () => void chrome.runtime.lastError);
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
