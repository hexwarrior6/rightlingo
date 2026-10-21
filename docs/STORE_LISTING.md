# RightLingo - Chrome 网上应用店上架准备资料包

这份文档整理了发布到 **Chrome Web Store (CWS)** 所需的全部素材、审核填报文案（中英双语）、权限合规理由与步骤指南。

---

## 目录
1. [发布前清单与账号准备](#1-发布前清单与账号准备)
2. [应用商店上架文案 (Store Listing Copy)](#2-应用商店上架文案-store-listing-copy)
3. [隐私合规与权限说明 (必填审核表单)](#3-隐私合规与权限说明-必填审核表单)
4. [图像素材要求与制作建议](#4-图像素材要求与制作建议)
5. [打包与发布流程 (Step by Step)](#5-打包与发布流程-step-by-step)
6. [审核避坑与常见问题 FAQ](#6-审核避坑与常见问题-faq)

---

## 1. 发布前清单与账号准备

- [ ] **Google 账号开启两步验证 (2FA)**：提交扩展前必须开启。
- [ ] **注册 Chrome 网上应用店开发者账号**：
  - 访问：[Chrome 开发者控制台 (Chrome Web Store Developer Dashboard)](https://chrome.google.com/webstore/devconsole)
  - 支付一次性开发者注册费（$5 美元，需支持 Visa/MasterCard 的外币卡）。
- [ ] **准备好隐私政策 URL**：
  - Chrome 强制要求提供公开可访问的隐私政策 URL。
  - 可直接使用 GitHub 仓库中的隐私政策文件链接：
    `https://github.com/hexwarrior6/rightlingo/blob/main/docs/PRIVACY_POLICY.md`
    （或通过 GitHub Pages 托管）。

---

## 2. 应用商店上架文案 (Store Listing Copy)

### 2.1 扩展基本信息

| 字段 | 填报内容 |
| :--- | :--- |
| **扩展名称 (Name)** | `RightLingo - 原生右键翻译` (或 `RightLingo`) |
| **摘要/短描述 (Summary)**<br>*(限制 132 字符以内)* | `选中文本，右键菜单直接看译文与词典释义。零弹窗、零打扰、毫秒级响应的原生沉浸式翻译扩展。` (60字)<br>或英文：`Instant translations right in your context menu. Zero popups, dictionary definitions, and seamless one-click copy.` (108 chars) |
| **分类 (Category)** | **Productivity** (生产力工具) 或 **Workflow & Planning** |
| **主要语言 (Primary Language)** | 中文 (简体) 或 English（根据目标主要受众选择） |

---

### 2.2 详细描述 (Detailed Description)

在商店后台的“详细说明”输入框中粘贴以下内容（支持纯文本或排版清晰的分段）：

```text
RightLingo —— 你的 Chrome 原生右键菜单翻译利器。

无需等待浮窗弹起，不破坏网页排版。选中文本，轻点右键，译文已在菜单第一项等候。

✨ 核心亮点：

1. ⚡ 右键直显，零弹窗打扰
选区变化即在后台预热翻译。当你轻点右键时，主译文已直接呈现在右键菜单首行，阅读流程自然丝滑。

2. 📖 智能词典模式
选中单个英文单词时，二级菜单自动按词性分组展示丰富释义（名、动、形、副等），查词高效深入。

3. 📄 长文本优雅排版
长句子或段落自动在一级菜单生成精炼摘要，二级菜单按系统菜单宽度优美分行折叠，并支持一键跳转 Google 翻译网页版阅读全文。

4. 📋 点按即复制
点击菜单中任意译文项，即可自动将结果复制到系统剪贴板，支持配置一键复制“译文”或“原文 + 译文”，记笔记背单词极度顺手。

5. 🛡️ 纯净透明，保护隐私
• 无任何弹窗与浮动小图标遮挡网页内容。
• 无数据统计 SDK、无跟踪、无广告。
• 选中文本仅直接请求 Google 翻译公开接口，不经任何第三方中转，安全安心。

6. ⚙️ 丰富自定义设置
支持在选项页灵活调整目标语言（简体中文、繁體中文、English、日本語）、摘要长度、二级菜单最大行数及复制偏好等。

---

RightLingo - Translation, right in your native context menu.
Instant, lightweight, and clutter-free.
```

---

## 3. 隐私合规与权限说明 (必填审核表单)

Chrome Web Store 审核非常重视用户数据与权限最小化原则。在开发者后台的 **“Privacy” (隐私权)** 标签页中，需要填写以下内容：

### 3.1 单一用途 (Single Purpose Description)
> **后台问题：** Please explain the single purpose of your extension.  
> **填写英文：**  
> `RightLingo provides instant text translation and dictionary lookup directly inside the browser's native context menu when a user selects text on a web page.`

---

### 3.2 权限正当性说明 (Permissions Justification)

在后台针对每个申请的权限，提供以下理由（直接复制英文填写）：

1. **`contextMenus`**
   > `Required to dynamically display translated text, dictionary definitions, and translation actions directly within the browser's native context menu.`

2. **`storage`**
   > `Required to save user preferences locally (such as target language, dictionary mode, and menu row limits via chrome.storage.sync) and manage active translation session caches.`

3. **`offscreen`**
   > `Required under Manifest V3 to create a minimal offscreen document so the background service worker can reliably execute clipboard write operations when a user clicks to copy a translation.`

4. **`clipboardWrite`**
   > `Used solely when the user explicitly clicks a translated menu item or the "Copy Translation" button to copy the translation result to their system clipboard.`

5. **`host_permissions: https://translate.googleapis.com/*`**
   > `Required to send translation API requests to Google Translate's endpoint in the background without intermediate proxy servers.`

6. **`content_scripts (matches: http/https)`**
   > `Used solely to detect user text selection changes and mouseup events on web pages, enabling the extension to pre-fetch the translation before the context menu is opened. No page content or DOM information other than the actively selected text snippet is accessed.`

---

### 3.3 数据使用声明 (Data Usage)

在数据使用问卷中，如实勾选：
- **Does your extension collect user data?** 选 **No**（不收集用户数据）。
- 如果询问是否处理“用户生成的内容”或“网站内容”，勾选“Yes”，用途选择 **App Functionality (应用功能)**，并补充说明：
  > `Only the text selected by the user is processed transiently to fetch translations from Google Translate. It is never stored on external servers or linked to user identity.`
- 勾选确认遵守 Chrome Web Store 开发者政策。

---

## 4. 图像素材要求与制作建议

Chrome 应用商店提交时要求提供以下素材规格：

### 4.1 必须提供的素材
1. **扩展程序图标 (Extension Icon)**
   - 规格：`128 x 128` 像素，PNG 格式。
   - 文件已有：项目内已存在 `icons/icon128.png`。
2. **屏幕截图 (Screenshots)**
   - 数量：至少 **1 张**（强烈建议准备 **3~4 张**，展现核心卖点）。
   - 规格：**1280 x 800** 像素（或 640 x 400 像素），PNG/JPEG 格式。
   - **截图内容建议：**
     - **截图 1 (单词词典模式)：** 网页上选中英文单词（如 `serendipity`），右键菜单第一行显示“译文：意外发现…”，二级菜单展开展示“名: 意外发现的运气；侥幸发现…”。
     - **截图 2 (长句优雅排版)：** 网页上选中长英文句子，右键菜单一级显示摘要，二级菜单清晰分行展示译文。
     - **截图 3 (设置与个性化)：** 打开 RightLingo 的“选项设置”页面，展示清爽简洁的语言选择与控制选项。
     - **截图 4 (零弹窗对比/场景图)：** 展示干净的原生网页右侧，对比普通插件突兀的悬浮球弹窗，突出“原生沉浸”体验。

### 4.2 可选但强烈推荐的素材 (帮助获得推荐位)
1. **小宣传磁贴 (Small Promo Tile)**
   - 规格：`440 x 280` 像素。
   - 用途：在 Chrome 网上应用店分类列表、搜索卡片中展示。
   - 设计建议：中心放 Logo + “RightLingo 原生右键翻译” 简短大字，背景干净现代。
2. **大型大篷车宣传图 (Marquee Promo Tile)**
   - 规格：`1400 x 560` 像素（用于首页大横幅推荐，可选）。

---

## 5. 打包与发布流程 (Step by Step)

### 步骤 1：生成发布包
在终端项目根目录下运行打包脚本：
```bash
./tools/package.sh
```
该命令会自动检查 `manifest.json`，并将运行所需文件打包输出至 `dist/rightlingo-v<version>.zip`（大小约 30KB+）。

### 步骤 2：登录 Chrome 开发者后台
1. 访问 [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)。
2. 点击右上角 **“+ 新建项目” (New Item)**。
3. 将 `dist/rightlingo-v*.zip` 拖入上传。

### 步骤 3：填写商品信息 (Store Listing)
1. 填写 **Description**（复制上述第 2 节文案）。
2. 上传 **Screenshots**（1280x800 截图）。
3. 上传 **Store Icon**（使用 `icons/icon128.png`）。
4. 上传 **Small Promo Tile**（440x280 宣传图，若有）。
5. 填写 **Category**（Productivity）。

### 步骤 4：填写隐私合规信息 (Privacy)
1. 粘贴 **Privacy Policy URL**（你的隐私政策网页或 GitHub 链接）。
2. 填写 **Single Purpose**（复制上述第 3.1 节）。
3. 依次填写 **Permission Justification**（复制上述第 3.2 节）。
4. 勾选数据收集选项（选无收集 / 仅应用功能）。

### 步骤 5：提交审核
点击右上角 **“提交以供审核” (Submit for Review)**。
通常审核时间为 **1 ~ 3 个工作日**。

---

## 6. 审核避坑与常见问题 FAQ

1. **为什么不需要申请 `<all_urls>`？**
   - 本项目通过 `content_scripts` 匹配 `http://*/*` 和 `https://*/*`，而没有滥用顶层的 `permissions: ["<all_urls>"]` 或 `webRequest`，这大大降低了人工审查的风险，过审速度通常更快。
2. **为什么需要 offscreen？**
   - MV3 的 Service Worker 没有 DOM API 和直接操作剪贴板的权限，使用标准的 `chrome.offscreen` 是 Google 官方推荐的最佳实践，权限理由中如实陈述即可顺利过审。
3. **版本号更新**：
   - 每次提交新版本审核时，必须修改 `manifest.json` 中的 `"version"`（如 `1.0.0` → `1.0.1`），然后重新运行 `./tools/package.sh` 生成新包上传。
