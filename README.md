# RightLingo

Chrome 原生右键菜单翻译插件。`Translation, right in your context menu.`

当前进度：**阶段一 —— 扩展骨架与菜单管线**（尚未接入真实翻译，菜单显示的是测试文案）。

## 目录结构

```text
rightlingo/
├── manifest.json    # 扩展清单：声明 MV3、权限、后台、内容脚本
├── background.js    # Service Worker：创建/更新原生右键菜单
├── content.js       # Content Script：监听网页中的文字选择，上报给后台
└── docs/            # PRD 与文档
```

## 数据流（阶段一）

```text
选中文本 → content.js（去抖 300ms）→ chrome.runtime.sendMessage
        → 唤醒 background.js → 更新菜单标题 → 用户右键即可看到
```

## 如何加载扩展

1. 打开 Chrome，地址栏输入 `chrome://extensions`
2. 右上角打开「开发者模式」
3. 点「加载已解压的扩展程序」，选择本项目根目录（`rightlingo/`）
4. 在工具栏拼图图标里把 RightLingo 固定出来，方便管理

## 如何验证阶段一

1. 打开一个普通网页（如 `wikipedia.org`；注意：`chrome://` 页面和 Chrome 商店页**不会**运行内容脚本，无法测试）
2. 选中一个单词或一句话
3. 右键，应看到菜单项：`译文：（测试）xxx…`（最多约 33 个汉字 / 66 个英文字符，超出部分加 `…`）

### 关于菜单能显示多少字

实测（Chrome 141 / macOS）：扩展菜单标题**没有字符数硬上限**——菜单会按内容撑宽（有系统最大宽度，约 550pt），超出才由系统按像素截断加 `…`。
插件自己控制的是"显示宽度上限"，即 `background.js` 里的 `PREVIEW_MAX_WIDTH`（当前 80 ≈ 40 个汉字；CJK/全角按 2 格计，其余按 1 格计）。想显示更多/更少，调这一个数即可。
测试前缀 `译文：（测试）` 本身占 14 格；阶段二换成正式前缀 `译文：`（6 格）后，同样上限还能多显示约 4 个汉字。
4. 不选中任何文字时右键，**不应**出现这一项

### 查看日志（验证管线是否通了）

- **后台日志**：`chrome://extensions` → RightLingo 卡片 → 「Service Worker」→ 看到
  `[RightLingo] 菜单已更新: 译文：（测试）…`
- **页面日志**：在测试网页按 F12 → Console → 看到 `[RightLingo] 已上报选中文本: …`

两边日志都出现，说明选中 → 上报 → 更新菜单整条管线已打通。

## 改代码之后

- 改了扩展文件 → 到 `chrome://extensions` 点 RightLingo 卡片上的**刷新**按钮
- 刷新扩展后，**已打开的旧页面**里的内容脚本会失效（报 "Extension context invalidated"），刷新一下那个页面即可
- 改了 `manifest.json`（权限、脚本声明等）→ 同样只需刷新扩展

## 阶段一验证清单

- [ ] 扩展加载无报错（卡片上没有红色 Errors 按钮）
- [ ] 选中单词 → 右键出现 `译文：（测试）…` 项
- [ ] 选中一段较长文字 → 标题按显示宽度截断并带 `…`
- [ ] 未选中文字 → 右键不出现该项
- [ ] SW 控制台和页面控制台都能看到日志

## 下一阶段预告

阶段二：在 `background.js` 里接入真实翻译（收到选中文本后调用翻译接口，把菜单标题换成真译文）。
