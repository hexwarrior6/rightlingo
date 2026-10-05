// 接收后台的复制请求：写入 textarea → 全选 → execCommand('copy')。
// 由 background.js 在点击译文菜单项时通过 runtime.sendMessage 调用。
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.target === 'offscreen' && msg.type === 'copy' && typeof msg.text === 'string') {
    const textarea = document.querySelector('textarea');
    textarea.value = msg.text;
    textarea.select();
    document.execCommand('copy');
    sendResponse(true);
  }
});
