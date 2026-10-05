# RightLingo

Chrome 原生右键菜单翻译插件。`Translation, right in your context menu.`

当前进度：**阶段三 —— 长文本"一级摘要 + 二级菜单分行显示"**（短译文一级直显不变）。

## 目录结构

```text
rightlingo/
├── manifest.json    # 扩展清单：MV3、权限、后台（module）、内容脚本
├── background.js    # Service Worker：菜单管理 + 翻译调度（缓存/去重/过期丢弃）
├── content.js       # Content Script：监听选区，mouseup 立即上报 + 占位符信号
├── translate.js     # 翻译引擎（独立模块，以后换引擎只改这里）
├── display.js       # 菜单显示规则（纯函数：显示宽度、截断、断行，可用 node 单独验证）
└── docs/            # PRD 与文档
```

## 数据流

```text
选区开始变化 → content.js 发 selection-reset → 菜单立即切到"译文：正在翻译…"（防旧内容残留）
选区结束（mouseup 立即 / 键盘 150ms 去抖）→ content.js 发选中文本
        → background.js 查缓存 / 调 translate.js（Google gtx 端点，auto → zh-CN）
        → 菜单标题更新为"译文：xxx"；失败显示"译文：（翻译失败）"
用户右键 → 菜单三种状态：当前译文（正常）/ 正在翻译…（在途）/ 上一次内容（异常信号）
```

## 翻译引擎说明

- 使用 `translate.googleapis.com/translate_a/single`（`client=gtx`），即 Google 翻译网页版
  所用的公开端点，与沉浸式翻译等扩展的做法相同；非官方、无 SLA，但已被广泛使用多年。
- 域名在 manifest 中以 `host_permissions` 声明，后台可直接跨域调用。
- `translate.js` 是独立模块：以后换 Chrome 内置 AI / DeepL / LLM 只改这一个文件。
- 源语言自动识别；检测结果为中文时显示"（原文已是中文）"，暂不做中→英（PRD §9）。
- 送翻译的文本上限 500 字符（菜单最多显示约 40 个汉字，"复制完整译文"是后续能力）。

## 长文本显示规则（阶段三）

- 译文宽度 ≤ 74 格（一级上限 80 − 前缀 6）：**一级菜单直显完整译文**，无子菜单
- 超过则一级显示摘要（自动带 `…` 和子菜单箭头 ▶，箭头由 Chrome 根据可见子项自动添加），
  完整译文分行进二级菜单：
  - 每行一个菜单项（菜单标题不支持换行，这是唯一的多行方式），行宽 ≤ 72 格，最多 8 行
  - 断行优先在空格处（英文单词不切半）；连续中文/长 URL 按宽度硬切
  - 显示不完的部分以 `… 查看完整译文` 提示（点击行为属阶段五的复制功能）
- 常量都在 `background.js` 顶部（`PREVIEW_MAX_WIDTH` / `SUBMENU_MAX_LINES` / `SUBMENU_LINE_WIDTH`），可调
- `display.js` 是纯函数，可用 node 单独验证断行效果（不依赖 Chrome）

## 如何加载扩展

1. 打开 Chrome，地址栏输入 `chrome://extensions`
2. 右上角打开「开发者模式」
3. 点「加载已解压的扩展程序」，选择本项目根目录（`rightlingo/`）
4. 在工具栏拼图图标里把 RightLingo 固定出来，方便管理

## 如何验证阶段二

1. `chrome://extensions` 刷新 RightLingo（这次改了 manifest，必须刷新），确认无报错
2. 打开普通网页（`chrome://` 页面和商店页不运行内容脚本），选中英文单词如 `iconic`
3. 右键 → 菜单显示 `译文：标志性的`（短译文一级直显）
4. 选中一段中文 → 右键 → `译文：（原文已是中文）`
5. 断网后选中新文本 → 右键 → `译文：（翻译失败）`
6. 老场景仍要过：快速"选中 A → 右键 → 选中 B → 立刻右键"，菜单应为 B 或"正在翻译…"，绝不应是 A

### 查看日志

- 后台：`chrome://extensions` → RightLingo → 「Service Worker」→ inspect
  （翻译请求、结果、失败都会打 `[RightLingo]` 日志）
- 页面：网页 F12 → Console → `[RightLingo] 已上报选中文本: …`

## 关于菜单能显示多少字

实测（Chrome 141 / macOS）：扩展菜单标题**没有字符数硬上限**——菜单按内容撑宽（系统有最大宽度），超出才按像素截断加 `…`。
插件自己控制"显示宽度上限"：`background.js` 里 `PREVIEW_MAX_WIDTH`（当前 80 ≈ 40 个汉字；CJK/全角按 2 格计，其余按 1 格计）。想调就改这一个数。
正式前缀 `译文：` 占 6 格。

## 改代码之后

- 改了扩展文件 → `chrome://extensions` 点 RightLingo 卡片上的**刷新**按钮
- 刷新扩展后，**已打开的旧页面**里的内容脚本会失效（"Extension context invalidated"），刷新该页面即可
- 改了 `manifest.json`（权限、脚本声明等）→ 同样只需刷新扩展

## 阶段三验证清单

- [ ] 选中英文单词 → 菜单显示中文译文（阶段二功能回归）
- [ ] 选中中文 → 显示"（原文已是中文）"（回归）
- [ ] 短译文（词/短语/短句）→ 一级直显，**没有**子菜单箭头
- [ ] 选中一段长文 → 一级显示摘要 + ▶，二级菜单分行显示完整译文
- [ ] 超长文本 → 二级最多 8 行，末尾出现"… 查看完整译文"
- [ ] 英文单词不从中间切开（断行发生在空格处）
- [ ] 中文跳过、翻译失败、"正在翻译…"状态下 → 二级菜单无残留
- [ ] 快速连选不同文本 → 二级菜单内容始终对应最新选区

## 下一阶段预告

阶段五：点击译文/复制项 = 复制到剪贴板（offscreen document 方案），同时把"复制完整译文"和分隔线补进二级菜单。
阶段六：SW 休眠后菜单状态回填（storage.session）、`&` 转义等打磨。
