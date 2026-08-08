const LAST_UPLOAD_KEY_PREFIX = 'cloudSaveLastUpload:';
const KNOWN_SAVE_KEY_PREFIX = 'cloudSaveKnownSavedAt:';
const DAILY_AUTO_KEY_PREFIX = 'cloudSaveDailyAuto:';
const AUTO_NOTICE_KEY_PREFIX = 'cloudSaveAutoNotice:';

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch (_) {
    return null;
  }
}

export function getLastCloudUpload(uid) {
  return localStorage.getItem(`${LAST_UPLOAD_KEY_PREFIX}${uid}`);
}

export function getKnownCloudSavedAt(uid) {
  // v0.1.26以前に手動保存した端末では、最終アップロード日時を既知版として引き継ぐ。
  return localStorage.getItem(`${KNOWN_SAVE_KEY_PREFIX}${uid}`)
    || getLastCloudUpload(uid);
}

export function recordCloudUpload(uid, savedAt) {
  localStorage.setItem(`${LAST_UPLOAD_KEY_PREFIX}${uid}`, savedAt);
  localStorage.setItem(`${KNOWN_SAVE_KEY_PREFIX}${uid}`, savedAt);
  localStorage.removeItem(`${AUTO_NOTICE_KEY_PREFIX}${uid}`);
}

export function recordCloudRestore(uid, savedAt) {
  localStorage.setItem(`${KNOWN_SAVE_KEY_PREFIX}${uid}`, savedAt);
  localStorage.removeItem(`${AUTO_NOTICE_KEY_PREFIX}${uid}`);
}

export function getDailyAutoRecord(uid) {
  return readJson(`${DAILY_AUTO_KEY_PREFIX}${uid}`);
}

export function setDailyAutoRecord(uid, record) {
  localStorage.setItem(`${DAILY_AUTO_KEY_PREFIX}${uid}`, JSON.stringify(record));
}

export function clearDailyAutoRecord(uid, token) {
  const key = `${DAILY_AUTO_KEY_PREFIX}${uid}`;
  const current = readJson(key);
  if (!token || current?.token === token) localStorage.removeItem(key);
}

export function getCloudAutoNotice(uid) {
  return readJson(`${AUTO_NOTICE_KEY_PREFIX}${uid}`);
}

export function setCloudAutoNotice(uid, notice) {
  localStorage.setItem(`${AUTO_NOTICE_KEY_PREFIX}${uid}`, JSON.stringify(notice));
}
