// RightLingo Content Script
// 职责：监听用户在网页中的文字选择，把选中文本上报给后台 Service Worker。
// 这样用户右键之前，后台就已经拿到了文本（阶段二起会在这里触发预翻译）。

const SEND_DEBOUNCE_MS = 300; // 拖动选择会连续触发 selectionchange，等停下来再上报
const MAX_SELECTION_LENGTH = 2000; // 阶段一只做长文本兜底截断，阈值后续再调

let sendTimer = null;
let lastSentText = '';

function getSelectedText() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return '';
  return selection.toString().trim();
}

function scheduleSend() {
  clearTimeout(sendTimer);
  sendTimer = setTimeout(sendSelection, SEND_DEBOUNCE_MS);
}

function sendSelection() {
  const text = getSelectedText();
  if (!text || text === lastSentText) return;
  lastSentText = text;

  // sendMessage 会唤醒 Service Worker（即使它已经休眠也没问题）。
  // 页面跳转 / 扩展刚重载时 context 可能失效，静默忽略即可。
  chrome.runtime
    .sendMessage({
      type: 'selection',
      text: text.slice(0, MAX_SELECTION_LENGTH),
    })
    .catch(() => {});

  console.log('[RightLingo] 已上报选中文本:', text.slice(0, 50));
}

document.addEventListener('selectionchange', scheduleSend);
