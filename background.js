// RightLingo Service Worker（MV3 后台）
// 职责：管理原生右键菜单；接收选中文本，翻译后按长度分流：
// 短译文一级直显，长译文"一级摘要 + 二级菜单分行显示"。

import { translateText } from './translate.js';
import { displayWidth, truncateByWidth, splitIntoLines } from './display.js';
import { DEFAULT_SETTINGS, loadSettings } from './settings.js';

const MENU_ROOT_ID = 'rl-root';
const TITLE_PREFIX = '译文：';
// 一级菜单预览的显示宽度上限：CJK/全角按 2 计、其余按 1 计。
// Chrome 对菜单标题没有字符数硬上限，会把菜单撑宽（有系统最大值），超宽才按像素截断；
// 上限是为了不让菜单被单个长译文撑成"横幅"（实测菜单最宽约能容纳 80 格）。
// 具体档位由设置 previewLength 控制（短/中/长）。
const PREVIEW_WIDTH_BY_LEVEL = { short: 60, medium: 80, long: 100 };

// 二级菜单：固定行槽位（最后一行行末带 "…" 表示截断）+ 分隔线 + 操作项（Google 翻译 / 复制完整译文）。
// 菜单标题不支持换行，"每行一个菜单项"是多行译文的唯一显示方式（PRD §3.3）。
// 行数刻意偏少：长文本阅读交给"在 Google 翻译中翻译"跳网页，菜单里只管预览。
// 槽位池固定为设置允许的最大行数，实际显示行数由设置 submenuLines 控制。
const SUBMENU_MAX_SLOTS = 10;
// 二级行宽上限（显示宽度）。不能设太大：macOS 的系统菜单（NSMenu）会按屏幕可用宽度
// 对过宽的菜单项标题做「中间省略」——把标题中间一段换成 "…"（Chromium 对超 ~400px 的
// 菜单项即启用该行为）。行宽一旦越线，每行译文都会被从中间抠掉一块，看着像串行/被截断。
// 控制在约 28 个汉字（52 格 ≈ 400px 以内）可稳定避开该阈值。
const SUBMENU_LINE_WIDTH = 52;
const SUBMENU_LINE_IDS = Array.from({ length: SUBMENU_MAX_SLOTS }, (_, i) => `rl-line-${i}`);
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
  SUBMENU_COPY_ID,
]);

// 词典模式：单词查询时按词性分组展示多个释义（接口 dt=bd 词典区，网页版"词典"标签同源）。
// 与译文行共用同一组行槽位，每个词性占一行。
const POS_LABELS = {
  noun: '名',
  verb: '动',
  adjective: '形',
  adverb: '副',
  preposition: '介',
  conjunction: '连',
  pronoun: '代',
  interjection: '叹',
  phrase: '短语',
  numeral: '数',
};

// 状态文案：新选区手势开始时的占位符（兼作"正在翻译"提示）、失败、与目标语言相同
const PLACEHOLDER_TITLE = '译文：正在翻译…';
const FAILED_TITLE = '译文：（翻译失败）';
const SAME_LANG_TITLE = '译文：（选中文本已是目标语言）';

// 原文（source）上限：content.js 上报整段（上限 2000，与 MAX_SELECTION_LENGTH 对齐），
// 用于"在 Google 翻译中翻译"打开完整原文 + storage.session 缓存；
// 注意：真正送去翻译的只是 translationBudget() 算出的、够填满菜单的部分，长选文不整段翻译（见下）。
const MAX_SOURCE_CHARS = 2000;
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
  // 菜单项按创建顺序显示：译文行（最后一行行末带 "…" 表示截断）→ 分隔线 → Google 翻译 → 复制
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

// ---------- 设置 ----------
// 默认值见 settings.js，存 chrome.storage.sync（跟随账号漫游）。
// settingsReady：SW 冷启动时设置是异步加载的，入口处 await 它避免拿到默认值误判。
let settings = { ...DEFAULT_SETTINGS };
const settingsReady = loadSettings().then((stored) => {
  settings = stored;
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key in settings) settings[key] = newValue;
  }
});

function previewMaxWidth() {
  return PREVIEW_WIDTH_BY_LEVEL[settings.previewLength] || PREVIEW_WIDTH_BY_LEVEL.medium;
}

// 实际送翻译的字符数随"二级菜单行数"变化：每行约能显示 SUBMENU_LINE_WIDTH 格，
// 只翻译够填满菜单的量（长选文余下的留给"在 Google 翻译中翻译"看全文），避免整段翻译拖慢响应。
function translationBudget() {
  return settings.submenuLines * SUBMENU_LINE_WIDTH;
}

// 按预算截断原文，但只在词边界处切：直接 slice 会把英文单词切一半，
// 残词会被逐字翻译成离谱结果（"after" 被切成 "aft" → 译成"船尾"）。
// 做法：若切点两侧都不是空白，就回退到最近一个空格；回退太靠前（超长词/无空格文本，如中文）
// 则放弃回退、硬切，避免把整段预算砍掉。
function budgetSlice(text, limit) {
  if (text.length <= limit) return text;
  const head = text.slice(0, limit);
  const atWordBoundary = /\s/.test(head.slice(-1)) || /\s/.test(text.charAt(limit));
  if (atWordBoundary) return head;
  const lastSpace = head.lastIndexOf(' ');
  return lastSpace > limit * 0.6 ? head.slice(0, lastSpace) : head;
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
  await settingsReady;
  const trimmed = text.trim().slice(0, MAX_SOURCE_CHARS); // 全文（存储 + Google 跳转用），上限 2000
  if (!trimmed) return;
  // 实际送翻译的字数随行数变化：只翻译够填满菜单的量，长选文剩下的走 Google 看全文
  const budget = translationBudget();
  // 只在词边界处截断：直接 slice 会把英文单词切一半（如 "after"→"aft"），
  // 残词会被逐字翻译成离谱结果（"aft"→"船尾"）。见 budgetSlice。
  const toTranslate = budgetSlice(trimmed, budget);
  const sourceTruncated = trimmed.length > budget;
  const seq = ++requestSeq;

  let result;
  try {
    result = await getTranslation(toTranslate, settings.targetLang);
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
  // original 存完整原文（供"在 Google 翻译中翻译"打开全文），translation 只是预算内的部分译文
  chrome.storage.session
    .set({ last: { original: trimmed, translation: result.text, srcLang: result.srcLang } })
    .catch(() => {});

  // 选中文本本身就是目标语言时跳过翻译（目标语言为中文时即"中文跳过"）
  if (result.srcLang.startsWith(settings.targetLang.split('-')[0])) {
    hideSubmenu();
    setMenuTitle(SAME_LANG_TITLE);
    return;
  }
  showTranslation(result, sourceTruncated);
}

async function getTranslation(text, targetLang) {
  const cacheKey = `${targetLang}:${text}`; // 缓存键带目标语言，切换语言后不会命中旧结果
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;
  const result = await translateText(text, targetLang);
  if (translationCache.size >= CACHE_MAX_ENTRIES) translationCache.clear();
  translationCache.set(cacheKey, result);
  return result;
}

// ---------- 点击复制（阶段五） ----------

// 点击任何译文相关菜单项 = 复制菜单里显示的译文（PRD §6：点击译文即复制，省一个"复制"菜单项）。
// 长选文只翻译了填满菜单的前缀，故复制的也是这部分；要看/复制完整原文走"在 Google 翻译中翻译"。
// 复制无视觉反馈（菜单已随点击关闭），粘贴即可验证。
chrome.contextMenus.onClicked.addListener((info) => {
  handleMenuClick(info).catch((err) => {
    console.error('[RightLingo] 复制失败:', err.message);
  });
});

// 取当前选区的原文：优先用 Chrome 右键菜单自带的 info.selectionText；
// 长选区时它常为空/被截断（Chrome 对 contextMenus 选区的限制），退而用
// 最近一次翻译缓存里的原文（菜单里正在显示的正是它）。
async function currentSelectionText(info) {
  const sel = (info.selectionText || '').trim();
  if (sel) return sel;
  const { last } = await chrome.storage.session.get('last');
  return (last && last.original) || '';
}

async function handleMenuClick(info) {
  await settingsReady;
  if (info.menuItemId === SUBMENU_GOOGLE_ID) {
    await openInGoogleTranslate(info);
    return;
  }
  if (!COPYABLE_IDS.has(info.menuItemId)) return;

  const { last } = await chrome.storage.session.get('last');
  const sel = (await currentSelectionText(info)).trim();

  // 匹配到最近一次翻译 → 直接用缓存；长选文 selectionText 取不到时也用缓存；
  // 都没对上（如浏览器重启过、缓存是别的选区）→ 用 selectionText 现场重翻。
  let result;
  if (last && sel && last.original === sel.slice(0, MAX_SOURCE_CHARS)) {
    result = last;
  } else if (last && !sel) {
    result = last;
  } else if (sel) {
    // 缓存未命中（如浏览器重启过、缓存是别的选区）才现场重翻；同样只翻够填满菜单的量
    // 用 budgetSlice 只在词边界处截断，避免把单词切一半翻出离谱结果
    result = await getTranslation(budgetSlice(sel, translationBudget()), settings.targetLang);
  } else {
    return; // 既无选区也无缓存，放弃
  }

  const baseLang = settings.targetLang.split('-')[0];
  const sourceText = result.original || sel;
  const textToCopy = result.srcLang.startsWith(baseLang) ? sourceText : result.translation;
  // 设置为"原文 + 译文"时拼两行（原文与译文相同时不重复）
  const copyText =
    settings.copyMode === 'original+translation' && textToCopy !== sourceText
      ? `${sourceText}\n${textToCopy}`
      : textToCopy;
  await copyToClipboard(copyText);
}

// 在 Google 翻译网页版中打开选中的原文（长文本的完整阅读出口）
async function openInGoogleTranslate(info) {
  const text = (await currentSelectionText(info)).trim().slice(0, GOOGLE_TRANSLATE_MAX_CHARS);
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

// 短译文一级直显；长译文一级显示摘要（子菜单箭头由 Chrome 根据可见子项自动添加）；
// 单词且接口带词典数据时进入词典模式（按词性分组展示多个释义）
function showTranslation(result, sourceTruncated = false) {
  // 菜单标题不支持换行，多句译文统一压成一行
  const text = String(result.text).replace(/\s*\n+\s*/g, ' ').trim();

  if (Array.isArray(result.dict) && settings.dictEnabled) {
    showDictionaryMenu(text, result.dict, sourceTruncated);
    return;
  }

  const budget = previewMaxWidth() - displayWidth(TITLE_PREFIX);
  const { text: preview, truncated } = truncateByWidth(text.trim(), budget);
  // 译文本身放不下、或原文被截断（只翻译了前缀）都要加 "…"
  const titleTruncated = truncated || sourceTruncated;
  setMenuTitle(`${TITLE_PREFIX}${preview}${titleTruncated ? '…' : ''}`);

  if (!titleTruncated) {
    hideSubmenu();
    return;
  }

  const { lines, remainder } = splitIntoLines(text, SUBMENU_LINE_WIDTH, settings.submenuLines);
  // 原文被截断时强制显示 "…"（即便译文本身没超出显示行数）
  showSubmenu(lines, sourceTruncated || remainder !== null);
}

// 词典模式：一级仍显示主译文；二级每个词性一行（名: 偶像；偶像形象），最多与 submenuLines 一致（默认 5，最多 10 行）。
// 更多词性不再展开——"在 Google 翻译中翻译"就是看完整词典和例句的出口。
function showDictionaryMenu(text, dict, sourceTruncated = false) {
  const budget = previewMaxWidth() - displayWidth(TITLE_PREFIX);
  const { text: preview, truncated } = truncateByWidth(text.trim(), budget);
  setMenuTitle(`${TITLE_PREFIX}${preview}${truncated || sourceTruncated ? '…' : ''}`);
  const lines = [];
  for (const entry of dict) {
    if (lines.length >= settings.submenuLines) break;
    const pos = POS_LABELS[entry.pos.toLowerCase()] || entry.pos;
    const raw = `${pos ? pos + '：' : ''}${entry.senses.join('；')}`;
    const { text: line, truncated } = truncateByWidth(raw, SUBMENU_LINE_WIDTH);
    lines.push(truncated ? `${line}…` : line);
  }
  showSubmenu(lines, sourceTruncated);
}

function showSubmenu(lines, hasOverflow = false) {
  const lastIdx = lines.length - 1;
  SUBMENU_LINE_IDS.forEach((id, i) => {
    if (i < lines.length) {
      // 截断时给最后一行行末追加 "…"，作为"还有更多"的提示（不另起一行；
      // 若该行已以 "…" 结尾——如词典模式宽度截断——则不重复追加）
      const title = hasOverflow && i === lastIdx && !lines[i].endsWith('…')
        ? `${lines[i]}…`
        : lines[i];
      updateMenuItem(id, { title, visible: true });
    } else {
      updateMenuItem(id, { visible: false });
    }
  });
  updateMenuItem(SUBMENU_SEPARATOR_ID, { visible: true });
  updateMenuItem(SUBMENU_GOOGLE_ID, {
    title: GOOGLE_ITEM_TITLE,
    visible: settings.showGoogleItem,
  });
  updateMenuItem(SUBMENU_COPY_ID, { title: COPY_TITLE, visible: true });
}

function hideSubmenu() {
  for (const id of [
    ...SUBMENU_LINE_IDS,
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
    }
  });
}
