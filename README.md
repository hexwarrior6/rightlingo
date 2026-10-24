<div align="center"><a name="readme-top"></a>

<img height="110" src="./icons/icon128.png" alt="RightLingo Logo">

<h1>RightLingo</h1>

Instant translations right in your native context menu. Zero popups, zero clutter.

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?logo=github)](https://github.com/hexwarrior6/rightlingo)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](manifest.json)
[![Version](https://img.shields.io/badge/Version-0.8.3-orange.svg)](manifest.json)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?logo=javascript&logoColor=black)](background.js)
[![i18n](https://img.shields.io/badge/i18n-130%2B%20Languages-success)](languages.js)

English · [简体中文](README_zh.md)

</div>

---

## 🌟 Overview

**RightLingo** is a lightweight, distraction-free Chrome translation extension designed to give you instant translations right where you need them — in the **browser's native context menu**.

Traditional translation extensions often clutter web pages with floating action buttons, intrusive pop-up bubbles, or delayed overlay windows that break page layouts. **RightLingo eliminates all the noise**:

* ⚡ **Zero Popups & Zero Clutter**: No floating balloons or injected overlay widgets on web pages.
* ⏱️ **Pre-fetched Speed**: Translates in the background the moment you select text. When you right-click, the translation is already waiting in the top menu item.
* 📖 **Built-in Dictionary**: Select a single word to see definitions neatly categorized by parts of speech.
* 📋 **One-Click Copy**: Click any translation menu item to copy the result instantly to your clipboard.

---

## 📸 Screenshots & Demo

### 1. Smart Dictionary Mode
> Select any word to instantly view part-of-speech definitions (`noun`, `verb`, `adj`, etc.) directly inside the native submenu.

<p align="center">
  <img src="docs/assets/preview-dictionary.svg" alt="RightLingo Dictionary Mode" width="820">
</p>

### 2. Sentence & Long Text Flow
> Long sentences show a concise top-level summary, expanding into clean multi-line folded items sized perfectly for system menus, complete with a quick link to Google Translate.

<p align="center">
  <img src="docs/assets/preview-sentence.svg" alt="RightLingo Sentence Translation" width="820">
</p>

### 3. Clean & Instant Settings
> Modern card-based options interface. Changes sync across Chrome accounts and take effect immediately without reloading pages.

<p align="center">
  <img src="docs/assets/preview-settings.svg" alt="RightLingo Settings Page" width="820">
</p>

---

## 🚀 Key Features

* **⚡ Native Context Menu Integration**  
  Lives entirely inside Chrome's native right-click menu. Leaves the web page completely untouched and pristine.
* **⚡ Pre-fetched Speed (Zero Waiting)**  
  Listens to text selection signals to pre-fetch translations in the background. Right-click and read immediately.
* **📖 Smart POS Dictionary Mode**  
  Automatically identifies individual vocabulary words and organizes rich definitions by parts of speech (noun, verb, adjective, etc.).
* **📄 Graceful Multi-line Folding**  
  Intelligently slices text at natural word boundaries and fits lines within system menu limits (~52 characters) to prevent awkward ellipsis cutting.
* **📋 One-Click Copy to Clipboard**  
  Clicking any translation item copies it immediately. Configurable to copy **"Translation only"** or **"Original + Translation"** (ideal for language learners and note-taking).
* **🌍 130+ Languages Supported**  
  Supports all Google Translate languages with auto-detection, native endonyms, and Simplified/Traditional Chinese conversion.
* **🔒 Privacy-First & Pure MV3**  
  No tracking SDKs, no telemetry, no intermediate proxy servers, and no advertisements. Operates strictly under Manifest V3 standards.

---

## ⚙️ Getting Started

### Install via Chrome Web Store
> *Chrome Web Store listing is currently in preparation.*

### Install Manually (Developer Mode)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/hexwarrior6/rightlingo.git
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **Load unpacked** and select the project root directory (`rightlingo/`).
5. *(Recommended)* Pin the RightLingo icon to your browser toolbar for quick access to the Options page.

---

## 🛠️ Configuration

Right-click the RightLingo toolbar icon and select **Options** (or go to Extension details → Extension options):

| Setting | Default | Description |
| :--- | :--- | :--- |
| **Target Language** | Simplified Chinese | Choose from 130+ supported languages. |
| **Dictionary Mode** | Enabled | Shows grouped definitions by parts of speech when selecting words. |
| **Submenu Rows** | 5 lines (1–10) | Controls how many lines are shown for long translations. |
| **Summary Length** | Medium (Short / Medium / Long) | Adjusts the character threshold before generating submenus. |
| **Google Translate Link** | Show | Toggles the quick link to open Google Translate in a new tab. |
| **Click to Copy** | Translation only | Choose between copying "Translation only" or "Original + Translation". |

---

## 📦 Project Structure

```text
rightlingo/
├── manifest.json       # Chrome Manifest V3 configuration
├── background.js       # Service worker: context menu management & translation dispatcher
├── content.js          # Lightweight content script for text selection detection
├── translate.js        # Independent translation engine module
├── display.js          # Pure formatting functions for width calculation and word wrapping
├── settings.js         # Settings schema & chrome.storage.sync helper
├── languages.js        # 130+ language definitions with native endonyms
├── options.html / js   # Options & settings interface
├── offscreen.html / js # MV3 offscreen document for reliable clipboard write
├── _locales/           # Internationalization (i18n) strings (en, zh_CN, zh_TW)
├── icons/              # Extension icons (SVG source & PNG exports)
└── docs/               # Screenshots, PRD, and development documentation
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
