// RightLingo 设置页：改动即保存到 chrome.storage.sync，后台监听变化即时生效。
// 档位类设置用"分段选择"控件（.segmented 里的 button），开关用自定义 toggle。
import { DEFAULT_SETTINGS, loadSettings } from './settings.js';
import { COMMON_LANGUAGE_CODES, ALL_LANGUAGES, getLanguageMap } from './languages.js';

const $ = (id) => document.getElementById(id);
const statusEl = $('status');
let statusTimer = null;

function applyI18n() {
  if (typeof chrome === 'undefined' || !chrome.i18n) return;
  const pageTitle = chrome.i18n.getMessage('optionsTitle');
  if (pageTitle) document.title = pageTitle;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const msg = chrome.i18n.getMessage(el.dataset.i18n);
    if (msg) el.textContent = msg;
  });
}

$('version').textContent = chrome.runtime.getManifest().version;

function initLanguages() {
  const select = $('targetLang');
  select.textContent = '';

  const langMap = getLanguageMap();
  const commonCodesSet = new Set(COMMON_LANGUAGE_CODES);

  // 1. 常用语言组
  const commonGroup = document.createElement('optgroup');
  commonGroup.label = (typeof chrome !== 'undefined' && chrome.i18n?.getMessage('groupCommon')) || '常用语言';
  for (const code of COMMON_LANGUAGE_CODES) {
    const label = langMap.get(code);
    if (!label) continue;
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = label;
    commonGroup.appendChild(opt);
  }
  select.appendChild(commonGroup);

  // 2. 全部语言组
  const allGroup = document.createElement('optgroup');
  allGroup.label = (typeof chrome !== 'undefined' && chrome.i18n?.getMessage('groupAll')) || '全部语言 (A - Z)';
  const otherLanguages = ALL_LANGUAGES.filter((item) => !commonCodesSet.has(item.code));
  for (const item of otherLanguages) {
    const opt = document.createElement('option');
    opt.value = item.code;
    opt.textContent = item.label;
    allGroup.appendChild(opt);
  }
  select.appendChild(allGroup);
}

applyI18n();
initLanguages();

function showSaved() {
  statusEl.classList.add('show');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => statusEl.classList.remove('show'), 1500);
}

// 分段选择控件：active 类标记当前值
function getSegmented(id) {
  return $(id).querySelector('button.active')?.dataset.value;
}

function setSegmented(id, value) {
  for (const btn of $(id).querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.value === String(value));
  }
}

function fillForm(s) {
  $('targetLang').value = s.targetLang;
  setSegmented('previewLength', s.previewLength);
  setSegmented('submenuLines', s.submenuLines);
  $('dictEnabled').checked = s.dictEnabled;
  $('showGoogleItem').checked = s.showGoogleItem;
  setSegmented('copyMode', s.copyMode);
}

loadSettings().then(fillForm);

async function save() {
  const submenuLines = Math.min(
    10,
    Math.max(1, parseInt(getSegmented('submenuLines'), 10) || DEFAULT_SETTINGS.submenuLines)
  );
  await chrome.storage.sync.set({
    targetLang: $('targetLang').value,
    submenuLines,
    dictEnabled: $('dictEnabled').checked,
    previewLength: getSegmented('previewLength'),
    showGoogleItem: $('showGoogleItem').checked,
    copyMode: getSegmented('copyMode'),
  });
  showSaved();
}

// 分段按钮点击 → 更新 active → 保存
for (const id of ['previewLength', 'submenuLines', 'copyMode']) {
  $(id).addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-value]');
    if (!btn) return;
    setSegmented(id, btn.dataset.value);
    save();
  });
}

for (const id of ['targetLang', 'dictEnabled', 'showGoogleItem']) {
  $(id).addEventListener('change', save);
}

$('reset').addEventListener('click', async () => {
  await chrome.storage.sync.set({ ...DEFAULT_SETTINGS });
  fillForm(DEFAULT_SETTINGS);
  showSaved();
});
