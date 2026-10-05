// 接收后台的复制请求：写入 textarea → 全选 → execCommand('copy')。
// 返回 execCommand 的执行结果，让后台能感知复制是否真的成功。
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.target === 'offscreen' && msg.type === 'copy' && typeof msg.text === 'string') {
    const textarea = document.querySelector('textarea');
    textarea.value = msg.text;
    textarea.select();
    sendResponse(document.execCommand('copy'));
  }
});
