// RightLingo 设置页：改动即保存到 chrome.storage.sync，后台监听变化即时生效。
import { DEFAULT_SETTINGS, loadSettings } from './settings.js';

const $ = (id) => document.getElementById(id);
const statusEl = $('status');
let statusTimer = null;

function showSaved() {
  statusEl.textContent = '已保存';
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (statusEl.textContent = ''), 1500);
}

function fillForm(s) {
  $('targetLang').value = s.targetLang;
  $('submenuLines').value = s.submenuLines;
  $('dictEnabled').checked = s.dictEnabled;
  $('copyMode').value = s.copyMode;
}

loadSettings().then(fillForm);

for (const id of ['targetLang', 'submenuLines', 'dictEnabled', 'copyMode']) {
  $(id).addEventListener('change', save);
}

async function save() {
  // 行数夹紧到 1–6
  const submenuLines = Math.min(
    6,
    Math.max(1, parseInt($('submenuLines').value, 10) || DEFAULT_SETTINGS.submenuLines)
  );
  $('submenuLines').value = submenuLines;

  await chrome.storage.sync.set({
    targetLang: $('targetLang').value,
    submenuLines,
    dictEnabled: $('dictEnabled').checked,
    copyMode: $('copyMode').value,
  });
  showSaved();
}

$('reset').addEventListener('click', async () => {
  await chrome.storage.sync.set({ ...DEFAULT_SETTINGS });
  fillForm(DEFAULT_SETTINGS);
  showSaved();
});
