// RightLingo Content Script
// 职责：监听网页中的文字选择，把选中文本上报给后台 Service Worker。
// 注入所有 frame（manifest all_frames）：部分页面（如 eventbrite）把正文渲染在
// iframe 里，只注入顶层时这类选区完全不可见，菜单会停留在上一个页面的内容。
//
// 上报时机（防"右键时菜单还停留在上一次内容"的竞态）：
// 1. 选区一变化（selectionchange）→ 先发 selection-reset，让菜单立刻切换到占位符，
//    不再残留上一次的内容（每个选择手势只发一次）
// 2. 鼠标松开（mouseup）→ 选区已完成，立即上报文本，不等去抖
// 3. selectionchange 短去抖兜底（键盘选区等没有 mouseup 的场景）
// 4. 右键（contextmenu）与 tab 切回/页面恢复（visibilitychange/focus/pageshow）→
//    重报当前选区：兜住错过的一次性上报，也把后台切 tab 时重置过的菜单补回来

const SEND_DEBOUNCE_MS = 150; // 键盘选区等场景的去抖；鼠标选区走 mouseup 立即上报
const MAX_SELECTION_LENGTH = 2000; // 超长选文截断，阈值后续再调

let sendTimer = null;
let lastReported = ''; // 上一次成功上报的文本，仅用于判断是否需要发占位符信号
let resetPending = false; // 当前选择手势是否已发过占位符信号
let contextInvalidated = false; // 扩展重载/更新后旧页面脚本成为孤儿，只提示一次

function getSelectedText() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return '';
  return selection.toString().trim();
}

// 发送失败时向上抛（调用方靠是否 resolve 判断是否送达）；
// "Extension context invalidated" 意味着本页永远无法再上报，只提示一次刷新页面。
function sendMessage(payload) {
  try {
    return chrome.runtime.sendMessage(payload).catch((err) => {
      onSendError(err);
      throw err;
    });
  } catch (err) {
    onSendError(err); // 上下文失效时访问 chrome.runtime 也可能同步抛异常
    return Promise.reject(err);
  }
}

function onSendError(err) {
  lastReported = ''; // 发送失败清空，保证同样的选区之后还能重发
  if (contextInvalidated) return;
  if (/Extension context invalidated/i.test(String(err && err.message))) {
    contextInvalidated = true;
    console.error('[RightLingo] 扩展刚重载/更新过，本页的翻译监听已失效——刷新页面即可恢复。');
  }
}

function reportSelection() {
  const text = getSelectedText();
  if (!text) return;
  resetPending = false;
  sendMessage({ type: 'selection', text: text.slice(0, MAX_SELECTION_LENGTH) }).then(() => {
    // 只有当这个选区仍然是当前选区时才记为"已上报"，拖选过程中的中间状态不算
    if (getSelectedText() === text) lastReported = text;
  }).catch(() => {});
}

function reportReset() {
  resetPending = true;
  sendMessage({ type: 'selection-reset' }).catch(() => {});
}

// 重报当前仍存在的选区：内容有变先补占位符信号，再立即上报，不等去抖。
// tab 切回时后台已把菜单重置为空状态，靠这里把当前页面的译文补回来。
function revalidateSelection() {
  const text = getSelectedText();
  if (!text) return;
  clearTimeout(sendTimer);
  if (text !== lastReported) reportReset();
  reportSelection();
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

// 右键兜底：万一 selectionchange/mouseup 都错过了（如选区早于脚本注入），右键瞬间补报
document.addEventListener('contextmenu', revalidateSelection);

// tab 切回 / 窗口重新聚焦 / bfcache 恢复：后台此刻已把菜单重置，重报选区恢复译文
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) revalidateSelection();
});
window.addEventListener('focus', revalidateSelection);
window.addEventListener('pageshow', revalidateSelection);
