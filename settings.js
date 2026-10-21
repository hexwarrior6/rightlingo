// 设置的默认值与读取（options 设置页和 background 共用，存 chrome.storage.sync，
// 跟随 Chrome 账号漫游；后台监听 storage.onChanged 即时生效）。

// 根据浏览器当前界面语言智能推导默认翻译目标语言：
// 中文环境默认译为中文，英文/其它环境默认译为对应语言或英文
export function getDefaultTargetLang() {
  try {
    const ui = (chrome.i18n?.getUILanguage?.() || 'zh-CN').toLowerCase();
    if (ui.startsWith('zh-tw') || ui.startsWith('zh-hk')) return 'zh-TW';
    if (ui.startsWith('zh')) return 'zh-CN';
    if (ui.startsWith('ja')) return 'ja';
    if (ui.startsWith('ko')) return 'ko';
    if (ui.startsWith('fr')) return 'fr';
    if (ui.startsWith('de')) return 'de';
    if (ui.startsWith('es')) return 'es';
    if (ui.startsWith('ru')) return 'ru';
    if (ui.startsWith('it')) return 'it';
    if (ui.startsWith('pt')) return 'pt';
    if (ui.startsWith('ar')) return 'ar';
    return 'en';
  } catch {
    return 'zh-CN';
  }
}

export const DEFAULT_SETTINGS = {
  targetLang: getDefaultTargetLang(), // 翻译目标语言
  submenuLines: 5, // 二级菜单行数（1–10）
  dictEnabled: true, // 词典模式（单词显示分词性释义）
  copyMode: 'translation', // 点击复制：'translation' 仅译文 | 'original+translation' 原文+译文
  previewLength: 'medium', // 一级菜单摘要长度：'short' 60 | 'medium' 80 | 'long' 100 显示宽度
  showGoogleItem: true, // 二级菜单是否显示"在 Google 翻译中翻译"
};

export function loadSettings() {
  return chrome.storage.sync.get(DEFAULT_SETTINGS);
}
