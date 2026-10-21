# Privacy Policy for RightLingo

**Effective Date:** October 21, 2026  
**Last Updated:** October 21, 2026

RightLingo ("we", "our", or "the Extension") is committed to protecting your privacy. This Privacy Policy explains how information is handled when you use the RightLingo browser extension.

---

### 1. Information Collection and Usage

**RightLingo does not collect, store, sell, or transmit any personally identifiable information (PII) or sensitive browsing history.**

- **Selected Text for Translation:** When you select text on a webpage, the extension transmits this selected snippet to the Google Translate service (`translate.googleapis.com`) to generate translations. This text is never stored on any external servers operated by RightLingo, nor is it linked to your personal identity.
- **Local Settings:** Your configuration preferences (such as target language, dictionary mode, summary length) are stored locally in your browser using `chrome.storage.sync` and `chrome.storage.session`. This data stays within your browser ecosystem and Google account sync, and is never accessed by or sent to us.
- **Clipboard Access:** When you explicitly click a translated menu item to copy the translation, the extension uses `clipboardWrite` via an offscreen document to write the translated text into your system clipboard. RightLingo never reads from your clipboard.

### 2. Third-Party Services

RightLingo utilizes the public Google Translate API endpoint (`translate.googleapis.com`) solely to fetch translations for the text you select. Your interaction with Google Translate is governed by [Google's Privacy Policy](https://policies.google.com/privacy).

RightLingo does **not** include:
- Any analytics or tracking SDKs (e.g., Google Analytics, Mixpanel).
- Any advertising networks.
- Any background data collection services.

### 3. Permissions Justification

- **`contextMenus`**: Used to dynamically display translated text and dictionary definitions directly in the native browser context menu.
- **`storage`**: Used to persist your preferences (such as target language and display row settings) and temporarily hold the active translation session.
- **`offscreen`**: Used in Manifest V3 to host a minimal offscreen document necessary for clipboard write operations from the background service worker.
- **`clipboardWrite`**: Used exclusively when you click a translation entry to copy the translated text to your clipboard.
- **`host_permissions (translate.googleapis.com)`**: Required to send translation requests to the Google Translate translation endpoint.
- **`content_scripts`**: Runs on web pages solely to detect user text selection (`mouseup`/selection changes) to trigger pre-translation for instant context menu rendering. No page content or DOM data is extracted other than the text snippet actively selected by the user.

### 4. Data Retention

RightLingo does not retain your data. Active translations are kept temporarily in in-memory caches or session storage during your browser session and are discarded when no longer needed or when the browser closes.

### 5. Changes to This Privacy Policy

We may update our Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date.

### 6. Contact Us

If you have any questions or suggestions regarding this Privacy Policy, please open an issue on our GitHub repository:  
[https://github.com/hexwarrior6/rightlingo](https://github.com/hexwarrior6/rightlingo)

---

# 隐私政策 (中文版)

**生效日期：** 2026 年 10 月 21 日  
**最后更新：** 2026 年 10 月 21 日

RightLingo（以下简称“本扩展”或“我们”）尊重并高度重视用户隐私。本隐私政策旨在向您说明本扩展如何处理数据。

### 1. 信息收集与使用

**RightLingo 不会收集、存储、出售或传输任何个人身份识别信息 (PII)、敏感信息或用户浏览历史记录。**

- **选中文本：** 当您在网页上选中文字时，本扩展会将该选中文本片段发送至 Google 翻译接口 (`translate.googleapis.com`) 以获取译文。本扩展没有自己的后端服务器，不会存储或留存您的任何文本。
- **配置数据：** 您的个性化设置（例如目标语言、词典模式、菜单行数等）仅通过 `chrome.storage.sync` 存储在您的本地浏览器及绑定的 Google 账号同步服务中，我们无法获取任何数据。
- **剪贴板写入：** 当您主动点击菜单中的翻译结果时，本扩展通过 Manifest V3 标准的 offscreen 文档将译文写入系统剪贴板。本扩展**绝不读取**您的剪贴板内容。

### 2. 第三方服务

本扩展仅使用 Google 翻译公开接口 (`translate.googleapis.com`)。该服务遵守 [Google 隐私政策](https://policies.google.com/privacy)。  
本扩展**不包含**任何数据分析统计 SDK、广告 SDK 或任何第三方跟踪代码。

### 3. 数据保留与安全

所有选中文本及翻译结果仅在本地内存与会话缓存中临时保留，浏览器关闭或选区切换即自动丢弃，绝不长期持久化或上传第三方。

### 4. 联络我们

若您对本隐私政策有任何疑问，欢迎通过 GitHub 提交反馈：  
[https://github.com/hexwarrior6/rightlingo](https://github.com/hexwarrior6/rightlingo)
