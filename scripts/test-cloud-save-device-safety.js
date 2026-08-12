import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};

const {
  canDeviceAutoSave,
  getKnownCloudSavedAt,
  getLastCloudUpload,
  recordCloudRestore,
  recordCloudUpload,
} = await import('../js/data/cloud-save-local-state.js');

const uid = 'device-safety-test';
recordCloudUpload(uid, 'save-1');
assert.equal(getLastCloudUpload(uid), 'save-1');
assert.equal(getKnownCloudSavedAt(uid), 'save-1');

// A local restore alone does not claim ownership. The cloud transaction must
// succeed first and return a fresh savedAt before this device records it.
recordCloudRestore(uid, 'save-2');
assert.equal(getKnownCloudSavedAt(uid), 'save-2');
assert.equal(getLastCloudUpload(uid), 'save-1');
recordCloudUpload(uid, 'save-3');
assert.equal(getKnownCloudSavedAt(uid), 'save-3');
assert.equal(getLastCloudUpload(uid), 'save-3');

assert.equal(canDeviceAutoSave(null, null), true, 'the first cloud save may be created');
assert.equal(canDeviceAutoSave({ savedAt: 'save-1' }, null), false);
assert.equal(canDeviceAutoSave({ savedAt: 'save-1' }, 'save-1'), true);
assert.equal(canDeviceAutoSave({ savedAt: 'save-2' }, 'save-1'), false);

const dailyManager = readFileSync(
  new URL('../js/data/daily-cloud-save-manager.js', import.meta.url),
  'utf8',
);
const cloudService = readFileSync(
  new URL('../js/data/cloud-save-service.js', import.meta.url),
  'utf8',
);
const cloudPanel = readFileSync(
  new URL('../js/components/cloud-save-panel.js', import.meta.url),
  'utf8',
);
assert.match(dailyManager, /expectedSavedAt:\s*cloudSave\?\.savedAt \?\? null/);
assert.match(cloudService, /runTransaction\(db/);
assert.match(cloudService, /cloud-save\/conflict/);
assert.match(cloudService, /async claimOwnership\(expectedSavedAt\)/);
assert.match(cloudService, /async downloadAndClaimOwnership\(/);
assert.match(cloudPanel, /自動セーブ：有効/);
assert.match(cloudPanel, /自動セーブ：無効/);
assert.match(cloudPanel, /canDeviceAutoSave\(cloudSave, getLastCloudUpload\(user\.uid\)\)/);

console.log('Cloud-save multi-device safety tests passed.');
