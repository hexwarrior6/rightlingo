// 设置的默认值与读取（options 设置页和 background 共用，存 chrome.storage.sync，
// 跟随 Chrome 账号漫游；后台监听 storage.onChanged 即时生效）。
export const DEFAULT_SETTINGS = {
  targetLang: 'zh-CN', // 翻译目标语言
  submenuLines: 4, // 二级菜单行数（1–6）
  dictEnabled: true, // 词典模式（单词显示分词性释义）
  copyMode: 'translation', // 点击复制：'translation' 仅译文 | 'original+translation' 原文+译文
  previewLength: 'medium', // 一级菜单摘要长度：'short' 60 | 'medium' 80 | 'long' 100 显示宽度
  showGoogleItem: true, // 二级菜单是否显示"在 Google 翻译中翻译"
};

export function loadSettings() {
  return chrome.storage.sync.get(DEFAULT_SETTINGS);
}
