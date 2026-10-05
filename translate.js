// RightLingo 翻译引擎（Google 翻译网页版同款免费端点）
//
// background.js 只依赖 translateText()，以后换引擎（Chrome 内置 AI、DeepL、
// LLM 等）只需改这个文件。
//
// 说明：这是 Google 翻译网页版使用的公开端点（client=gtx），与沉浸式翻译等
// 扩展的做法相同。属非官方接口：无 SLA，理论上可能限流或变更。

const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const TARGET_LANGUAGE = 'zh-CN';
const REQUEST_TIMEOUT_MS = 5000;

// 翻译一段文本到目标语言，返回 { text, srcLang, dict }；失败时抛错。
// dict：单词的词典释义（按词性分组），接口没返回词典数据时为 null，形如
//       [{ pos: 'adjective', senses: ['标志性的', ...] }, ...]
export async function translateText(text, targetLang = TARGET_LANGUAGE) {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'auto',
    tl: targetLang,
    dt: 't',
    q: text,
  });
  params.append('dt', 'bd'); // 词典数据（网页版翻译"词典"标签的同源数据）

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

  // 响应形如 [[["译文","原文",...],...], [词典条目...], "en", ...]
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
  return {
    text: translated,
    srcLang: String(data[2] || '').toLowerCase(),
    dict: parseDictionary(data),
  };
}

// 词典区（仅单词会返回）：data[1] = [["adjective", ["释义1", ...], ...], ...]
// 解析失败或没有词典数据时返回 null，调用方回退普通句子翻译展示。
function parseDictionary(data) {
  const entries = Array.isArray(data && data[1]) ? data[1] : null;
  if (!entries) return null;
  const dict = entries
    .map((entry) => ({
      pos: typeof entry?.[0] === 'string' ? entry[0] : '',
      senses: Array.isArray(entry?.[1])
        ? entry[1].filter((sense) => typeof sense === 'string' && sense)
        : [],
    }))
    .filter((entry) => entry.senses.length > 0);
  return dict.length > 0 ? dict : null;
}
