const UID_STORAGE_KEY = 'soulmate.uid';
const UID_MOVE_API = '/api/uid/move';
const UID_RESET_API = '/api/uid/reset';
const RESET_LOCAL_KEYS = [
  'soulmate.messages',
  'soulmate.heart',
  'soulmate.imageIndex',
  'soulmate.dailySign',
  'soulmate.stageCeremonies'
];

const els = {};

document.addEventListener('DOMContentLoaded', initSettings);

function initSettings() {
  Object.assign(els, {
    currentUid: document.getElementById('currentUid'),
    uidForm: document.getElementById('uidForm'),
    uidInput: document.getElementById('uidInput'),
    saveUidButton: document.getElementById('saveUidButton'),
    copyUidButton: document.getElementById('copyUidButton'),
    resetUidButton: document.getElementById('resetUidButton'),
    status: document.getElementById('settingsStatus')
  });

  const uid = ensureClientUid();
  renderUid(uid);
  els.uidInput.value = uid;
  els.uidForm.addEventListener('submit', handleUidSubmit);
  els.copyUidButton.addEventListener('click', copyCurrentUid);
  els.resetUidButton.addEventListener('click', resetCurrentUidData);
}

async function handleUidSubmit(event) {
  event.preventDefault();

  const fromUid = ensureClientUid();
  const toUid = normalizeUid(els.uidInput.value);
  if (!toUid) {
    showStatus('UID 格式不对，先检查一下字母和长度。', 'error');
    return;
  }
  if (fromUid === toUid) {
    showStatus('已经绑定这个 UID 了。', 'ok');
    return;
  }

  setSaving(true);
  try {
    const response = await fetch(UID_MOVE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUid, toUid })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      if (response.status === 409) {
        throw new Error('这个 UID 已经有数据了，换一个更专属的名字吧。');
      }
      throw new Error(data.error || `UID 保存失败：${response.status}`);
    }

    localStorage.setItem(UID_STORAGE_KEY, toUid);
    renderUid(toUid);
    showStatus('UID 已保存，之后这个终端就绑定它了。', 'ok');
  } catch (error) {
    showStatus(error.message || 'UID 保存失败，稍后再试。', 'error');
  } finally {
    setSaving(false);
  }
}

async function copyCurrentUid() {
  const uid = ensureClientUid();
  try {
    await navigator.clipboard.writeText(uid);
    showStatus('已复制当前 UID。', 'ok');
  } catch {
    showStatus('复制失败，可以手动选中 UID。', 'error');
  }
}

async function resetCurrentUidData() {
  const uid = ensureClientUid();
  const confirmed = window.confirm(`确定清空 ${uid} 的历史数据吗？聊天、心动值和专属记忆都会初始化。`);
  if (!confirmed) return;

  setResetting(true);
  try {
    const response = await fetch(UID_RESET_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      throw new Error(data.error || `初始化失败：${response.status}`);
    }

    clearLocalUidData();
    showStatus('已清空当前 UID 数据，回到游戏后会重新开始。', 'ok');
  } catch (error) {
    showStatus(error.message || '初始化失败，稍后再试。', 'error');
  } finally {
    setResetting(false);
  }
}

function renderUid(uid) {
  els.currentUid.textContent = uid;
}

function setSaving(isSaving) {
  els.saveUidButton.disabled = isSaving;
  els.saveUidButton.textContent = isSaving ? '保存中' : '保存 UID';
}

function setResetting(isResetting) {
  els.resetUidButton.disabled = isResetting;
  els.resetUidButton.textContent = isResetting ? '清空中' : '清空当前 UID 数据';
}

function showStatus(message, type) {
  els.status.textContent = message;
  els.status.dataset.type = type;
}

function clearLocalUidData() {
  for (const key of RESET_LOCAL_KEYS) {
    localStorage.removeItem(key);
  }
}

function ensureClientUid() {
  const existing = normalizeUid(localStorage.getItem(UID_STORAGE_KEY));
  if (existing) return existing;

  const uid = generateUid();
  localStorage.setItem(UID_STORAGE_KEY, uid);
  return uid;
}

function generateUid() {
  if (window.crypto?.randomUUID) {
    return `u_${window.crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  }

  const randomPart = Math.random().toString(36).slice(2, 14);
  const timePart = Date.now().toString(36).slice(-8);
  return normalizeUid(`u_${timePart}${randomPart}`) || 'u_local0000000000000000';
}

function normalizeUid(value) {
  const uid = String(value || '').trim().toLowerCase();
  return /^[a-z][a-z0-9_-]{2,31}$/.test(uid) ? uid : '';
}
