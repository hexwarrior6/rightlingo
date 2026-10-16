// RightLingo 设置页：改动即保存到 chrome.storage.sync，后台监听变化即时生效。
// 档位类设置用"分段选择"控件（.segmented 里的 button），开关用自定义 toggle。
import { DEFAULT_SETTINGS, loadSettings } from './settings.js';

const $ = (id) => document.getElementById(id);
const statusEl = $('status');
let statusTimer = null;

$('version').textContent = chrome.runtime.getManifest().version;

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
