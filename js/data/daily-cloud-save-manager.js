import { APP_VERSION } from '../definitions/update-log.js';
import { CloudSaveService } from './cloud-save-service.js';
import {
  canDeviceAutoSave,
  clearDailyAutoRecord,
  getDailyAutoRecord,
  getLastCloudUpload,
  recordCloudUpload,
  setCloudAutoNotice,
  setDailyAutoRecord,
} from './cloud-save-local-state.js';
import { GameDB } from './database.js';
import { getLocalDateKey } from './daily-login-manager.js';

const PENDING_TIMEOUT_MS = 2 * 60 * 1000;
const activeSaves = new Map();

function createToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function withDailySaveLock(uid, dateKey, task) {
  if (navigator.locks?.request) {
    return navigator.locks.request(`cloud-save:${uid}:${dateKey}`, { mode: 'exclusive' }, task);
  }
  return task();
}

async function saveOnceForDate(user, now = new Date()) {
  const dateKey = getLocalDateKey(now);
  const existing = getDailyAutoRecord(user.uid);
  if (existing?.date === dateKey && existing.status !== 'saving') return existing;
  if (existing?.date === dateKey && existing.status === 'saving'
      && Date.now() - Number(existing.startedAt || 0) < PENDING_TIMEOUT_MS) {
    return existing;
  }

  return withDailySaveLock(user.uid, dateKey, async () => {
    const lockedRecord = getDailyAutoRecord(user.uid);
    if (lockedRecord?.date === dateKey && lockedRecord.status !== 'saving') return lockedRecord;
    if (lockedRecord?.date === dateKey && lockedRecord.status === 'saving'
        && Date.now() - Number(lockedRecord.startedAt || 0) < PENDING_TIMEOUT_MS) {
      return lockedRecord;
    }

    const token = createToken();
    setDailyAutoRecord(user.uid, {
      date: dateKey,
      status: 'saving',
      startedAt: Date.now(),
      token,
    });

    try {
      // 先にクラウド側を確認し、別端末の新しいセーブを古いローカルデータで
      // 自動上書きしない。この確認も1日1回だけに抑える。
      // 競合判定に必要なのは更新日時だけ。大容量セーブの全チャンクを
      // 起動のたびにダウンロードしないよう、マニフェストだけを読む。
      const cloudSave = await CloudSaveService.getMetadata();
      // 自動保存できるのは、現在のクラウドセーブを最後にアップロードしたか、
      // 復元時に所有権を取得した端末だけ。所有権取得では savedAt が原子的に
      // 更新されるため、以前の端末は同じ世代を自動上書きできない。
      const lastUpload = getLastCloudUpload(user.uid);
      if (!canDeviceAutoSave(cloudSave, lastUpload)) {
        const result = { date: dateKey, status: 'conflict', checkedAt: new Date().toISOString() };
        setDailyAutoRecord(user.uid, result);
        setCloudAutoNotice(user.uid, result);
        window.dispatchEvent(new CustomEvent('dailyCloudSaveStatus', { detail: result }));
        console.warn('[CloudSave] Daily auto-save skipped because the cloud save changed on another device.');
        return result;
      }

      const payload = await GameDB.createCloudSnapshot();
      // メタデータ確認後に別端末が保存した場合も上書きしないよう、確認した
      // savedAt を条件にしてクラウド側で原子的に保存する。
      const upload = await CloudSaveService.upload(payload, APP_VERSION, {
        expectedSavedAt: cloudSave?.savedAt ?? null,
      });
      recordCloudUpload(user.uid, upload.savedAt);
      const result = { date: dateKey, status: 'saved', savedAt: upload.savedAt };
      setDailyAutoRecord(user.uid, result);
      window.dispatchEvent(new CustomEvent('dailyCloudSaveStatus', { detail: result }));
      console.log('[CloudSave] Daily auto-save completed.');
      return result;
    } catch (error) {
      if (error?.code === 'cloud-save/conflict') {
        const result = { date: dateKey, status: 'conflict', checkedAt: new Date().toISOString() };
        setDailyAutoRecord(user.uid, result);
        setCloudAutoNotice(user.uid, result);
        window.dispatchEvent(new CustomEvent('dailyCloudSaveStatus', { detail: result }));
        console.warn('[CloudSave] Daily auto-save stopped because another device saved first.');
        return result;
      }
      clearDailyAutoRecord(user.uid, token);
      console.warn('[CloudSave] Daily auto-save failed; it will retry on the next launch.', error);
      throw error;
    }
  });
}

export function runDailyCloudSave(user, now = new Date()) {
  if (!user?.emailVerified || !GameDB.db) return Promise.resolve({ status: 'skipped' });
  if (activeSaves.has(user.uid)) return activeSaves.get(user.uid);

  const savePromise = saveOnceForDate(user, now)
    .finally(() => activeSaves.delete(user.uid));
  activeSaves.set(user.uid, savePromise);
  return savePromise;
}

export async function initDailyCloudSave() {
  if (!CloudSaveService.isConfigured) return () => {};
  return CloudSaveService.observeAuthState(user => {
    if (!user?.emailVerified) return;
    runDailyCloudSave(user).catch(() => undefined);
  });
}
