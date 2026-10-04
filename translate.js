// RightLingo 翻译引擎（阶段二：Google 翻译网页版同款免费端点）
//
// background.js 只依赖 translateText()，以后换引擎（Chrome 内置 AI、DeepL、
// LLM 等）只需改这个文件。
//
// 说明：这是 Google 翻译网页版使用的公开端点（client=gtx），与沉浸式翻译等
// 扩展的做法相同。属非官方接口：无 SLA，理论上可能限流或变更。

const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const TARGET_LANGUAGE = 'zh-CN';
const REQUEST_TIMEOUT_MS = 5000;

// 翻译一段文本，返回 { text, srcLang }；失败时抛错。
export async function translateText(text) {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'auto',
    tl: TARGET_LANGUAGE,
    dt: 't',
    q: text,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${TRANSLATE_ENDPOINT}?${params}`, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`翻译接口返回 ${response.status}`);
  }

  // 响应形如 [[["译文","原文",...],["分段2",...]], null, "en", ...]
  const data = await response.json();
  const segments = data && data[0];
  if (!Array.isArray(segments)) {
    throw new Error('翻译接口返回格式异常');
  }
  const translated = segments
    .map((seg) => (Array.isArray(seg) ? seg[0] : ''))
    .join('');
  if (!translated) {
    throw new Error('翻译结果为空');
  }
  return { text: translated, srcLang: String(data[2] || '').toLowerCase() };
}
