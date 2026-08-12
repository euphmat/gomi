import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCloudSaveErrorMessage } from '../js/components/cloud-save-panel.js';
import { mapPermissionError } from '../js/data/cloud-save-service.js';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const service = readFileSync(new URL('../js/data/cloud-save-service.js', import.meta.url), 'utf8');

const rawPermissionError = Object.assign(new Error('Missing or insufficient permissions.'), {
  code: 'permission-denied',
});
const chunkPermissionError = mapPermissionError(rawPermissionError, 'chunks');
assert.equal(chunkPermissionError.code, 'cloud-save/chunk-permission-denied');
assert.match(chunkPermissionError.message, /大容量クラウドセーブ用の権限/);
assert.equal(chunkPermissionError.cause, rawPermissionError);

const savePermissionError = mapPermissionError(rawPermissionError);
assert.equal(savePermissionError.code, 'cloud-save/permission-denied');
assert.match(savePermissionError.message, /firestore\.rules/);
assert.equal(savePermissionError.cause, rawPermissionError);

const unrelatedError = Object.assign(new Error('offline'), { code: 'unavailable' });
assert.equal(mapPermissionError(unrelatedError, 'chunks'), unrelatedError);
assert.match(
  getCloudSaveErrorMessage(rawPermissionError),
  /Firebase の設定確認/,
);

// Keep the client-side chunking contract and the deployed rules source aligned.
for (const expectedRule of [
  'match /cloudSaves/{userId}/chunks/{chunkId}',
  "request.auth.uid == userId",
  "request.auth.token.email_verified == true",
  'allow create, update: if isOwner() && isValidChunk()',
  'allow delete: if isOwner()',
]) {
  assert.ok(rules.includes(expectedRule), `Missing Firestore rule: ${expectedRule}`);
}

for (const expectedLimit of [
  ['MAX_LEGACY_PAYLOAD_LENGTH', '850_000', '850000'],
  ['CHUNK_LENGTH', '700_000', '700000'],
  ['MAX_CHUNK_COUNT', '64', '64'],
]) {
  const [name, clientValue, ruleValue] = expectedLimit;
  assert.ok(service.includes(`const ${name} = ${clientValue};`), `Missing client limit: ${name}`);
  assert.ok(rules.includes(ruleValue), `Missing Firestore limit for: ${name}`);
}

console.log('Cloud-save permission contract tests passed.');
