// RightLingo Content Script
// 职责：监听网页中的文字选择，把选中文本上报给后台 Service Worker。
//
// 上报时机（防"右键时菜单还停留在上一次内容"的竞态）：
// 1. 选区一变化（selectionchange）→ 先发 selection-reset，让菜单立刻切换到占位符，
//    不再残留上一次的内容（每个选择手势只发一次）
// 2. 鼠标松开（mouseup）→ 选区已完成，立即上报文本，不等去抖
// 3. selectionchange 短去抖兜底（键盘选区等没有 mouseup 的场景）

const SEND_DEBOUNCE_MS = 150; // 键盘选区等场景的去抖；鼠标选区走 mouseup 立即上报
const MAX_SELECTION_LENGTH = 2000; // 超长选文截断，阈值后续再调

let sendTimer = null;
let lastReported = ''; // 上一次成功上报的文本，仅用于判断是否需要发占位符信号
let resetPending = false; // 当前选择手势是否已发过占位符信号

function getSelectedText() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return '';
  return selection.toString().trim();
}

function sendMessage(payload) {
  // 页面跳转 / 扩展刚重载时 context 可能失效，静默忽略；
  // 发送失败时清空 lastReported，保证同样的选区之后还能重发。
  return chrome.runtime.sendMessage(payload).catch(() => {
    lastReported = '';
  });
}

function reportSelection() {
  const text = getSelectedText();
  if (!text) return;
  resetPending = false;
    sendMessage({ type: 'selection', text: text.slice(0, MAX_SELECTION_LENGTH) }).then(() => {
      // 只有当这个选区仍然是当前选区时才记为"已上报"，拖选过程中的中间状态不算
      if (getSelectedText() === text) lastReported = text;
    });
  }

function reportReset() {
  resetPending = true;
  sendMessage({ type: 'selection-reset' });
}

document.addEventListener('selectionchange', () => {
  const text = getSelectedText();
  // 内容与上次上报的不同 = 新的选择手势开始了 → 先让菜单切到占位符
  if (text && text !== lastReported && !resetPending) {
    reportReset();
  }
  clearTimeout(sendTimer);
  sendTimer = setTimeout(reportSelection, SEND_DEBOUNCE_MS);
});

// 鼠标松开通常意味着选区手势结束：立即上报，把"选中 → 右键"的竞态窗口压到最小
document.addEventListener('mouseup', (event) => {
  if (event.button !== 0) return;
  clearTimeout(sendTimer);
  resetPending = false;
  reportSelection();
});
