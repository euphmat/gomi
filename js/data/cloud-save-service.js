import { firebaseConfig, isFirebaseConfigured } from '../firebase-config.js';

const FIREBASE_SDK_VERSION = '12.16.0';
const CLOUD_SAVE_COLLECTION = 'cloudSaves';
const LEGACY_SCHEMA_VERSION = 1;
const CHUNKED_SCHEMA_VERSION = 2;
const MAX_LEGACY_PAYLOAD_LENGTH = 850_000;
const CHUNK_LENGTH = 700_000;
const MAX_CHUNK_COUNT = 64;
const MAX_PAYLOAD_LENGTH = CHUNK_LENGTH * MAX_CHUNK_COUNT;
const CHUNK_WRITE_CONCURRENCY = 4;
const DOWNLOAD_ATTEMPTS = 3;
const RETRYABLE_READ_CODES = new Set([
  'aborted',
  'cancelled',
  'deadline-exceeded',
  'internal',
  'network-request-failed',
  'unavailable',
  'unknown'
]);

let servicesPromise = null;

function requireConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebaseが未設定です。');
  }
}

async function loadServices() {
  requireConfigured();
  if (servicesPromise) return servicesPromise;

  servicesPromise = (async () => {
    const baseUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
    const [appSdk, authSdk, firestoreSdk] = await Promise.all([
      import(`${baseUrl}/firebase-app.js`),
      import(`${baseUrl}/firebase-auth.js`),
      import(`${baseUrl}/firebase-firestore.js`)
    ]);

    const app = appSdk.initializeApp(firebaseConfig);
    const auth = authSdk.getAuth(app);
    const db = firestoreSdk.getFirestore(app);
    await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
    await auth.authStateReady();

    return { auth, db, authSdk, firestoreSdk };
  })().catch(error => {
    servicesPromise = null;
    throw error;
  });

  return servicesPromise;
}

function requireUser(auth) {
  if (!auth.currentUser) {
    throw new Error('クラウドセーブを利用するにはログインしてください。');
  }
  return auth.currentUser;
}

function requireVerifiedUser(auth) {
  const user = requireUser(auth);
  if (!user.emailVerified) {
    throw new Error('メールアドレスの確認後、確認状態を更新してください。');
  }
  return user;
}

function createGenerationId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replaceAll('-', '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

async function createChecksum(payload) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('このブラウザでは大容量クラウドセーブを安全に作成できません。');
  }

  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payload)
  );
  return [...new Uint8Array(digest)]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');
}

function splitPayload(payload) {
  const chunks = [];
  for (let offset = 0; offset < payload.length; offset += CHUNK_LENGTH) {
    chunks.push(payload.slice(offset, offset + CHUNK_LENGTH));
  }
  return chunks;
}

async function runWithConcurrency(items, task) {
  for (let offset = 0; offset < items.length; offset += CHUNK_WRITE_CONCURRENCY) {
    await Promise.all(
      items
        .slice(offset, offset + CHUNK_WRITE_CONCURRENCY)
        .map((item, batchIndex) => task(item, offset + batchIndex))
    );
  }
}

function getErrorCode(error) {
  return String(error?.code || '')
    .replace(/^firestore\//, '')
    .replace(/^auth\//, '');
}

function createSaveConflictError() {
  const error = new Error('別端末でクラウドセーブが更新されたため、自動保存を中止しました。');
  error.code = 'cloud-save/conflict';
  return error;
}

function matchesExpectedSave(snapshot, expectedSavedAt) {
  if (expectedSavedAt === null) return !snapshot.exists();
  return snapshot.exists() && snapshot.data()?.savedAt === expectedSavedAt;
}

function createNextSavedAt(previousSavedAt) {
  const previousTime = Date.parse(previousSavedAt);
  const nextTime = Number.isFinite(previousTime)
    ? Math.max(Date.now(), previousTime + 1)
    : Date.now();
  return new Date(nextTime).toISOString();
}

async function commitSaveDocument(firestoreSdk, db, saveRef, data, expectedSavedAt) {
  if (expectedSavedAt === undefined) {
    await firestoreSdk.setDoc(saveRef, data);
    return;
  }

  await firestoreSdk.runTransaction(db, async transaction => {
    const currentSnapshot = await transaction.get(saveRef);
    if (!matchesExpectedSave(currentSnapshot, expectedSavedAt)) {
      throw createSaveConflictError();
    }
    transaction.set(saveRef, data);
  });
}

export function mapPermissionError(error, target = 'save') {
  if (getErrorCode(error) !== 'permission-denied') return error;

  const isChunkAccess = target === 'chunks';
  const message = isChunkAccess
    ? '大容量クラウドセーブ用の権限がサーバーに反映されていません。管理者は最新の firestore.rules を Firebase に公開してください。'
    : 'クラウドセーブへのアクセスが拒否されました。管理者は Firebase プロジェクトと firestore.rules の公開状態を確認してください。';
  const mappedError = new Error(message, { cause: error });
  mappedError.code = isChunkAccess
    ? 'cloud-save/chunk-permission-denied'
    : 'cloud-save/permission-denied';
  return mappedError;
}

async function runFirestoreOperation(operation, target = 'save') {
  try {
    return await operation();
  } catch (error) {
    throw mapPermissionError(error, target);
  }
}

function isRetryableReadError(error) {
  const message = String(error?.message || error || '');
  return RETRYABLE_READ_CODES.has(getErrorCode(error))
    || /network|offline|timed? out|connection|failed to fetch/i.test(message);
}

function waitBeforeRetry(attempt) {
  return new Promise(resolve => setTimeout(resolve, 300 * (2 ** attempt)));
}

async function readDocumentWithRetry(read, attempts = DOWNLOAD_ATTEMPTS) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      lastError = error;
      if (!isRetryableReadError(error) || attempt === attempts - 1) throw error;
      await waitBeforeRetry(attempt);
    }
  }
  throw lastError;
}

function isChunkedManifest(data) {
  return data?.schemaVersion === CHUNKED_SCHEMA_VERSION
    && typeof data.generation === 'string'
    && /^[a-z0-9]+$/i.test(data.generation)
    && Number.isInteger(data.chunkCount)
    && data.chunkCount > 0
    && data.chunkCount <= MAX_CHUNK_COUNT
    && Number.isInteger(data.payloadLength)
    && data.payloadLength > MAX_LEGACY_PAYLOAD_LENGTH
    && data.payloadLength <= MAX_PAYLOAD_LENGTH
    && data.payloadLength > (data.chunkCount - 1) * CHUNK_LENGTH
    && data.payloadLength <= data.chunkCount * CHUNK_LENGTH
    && typeof data.checksum === 'string'
    && /^[a-f0-9]{64}$/.test(data.checksum);
}

function getChunkRef(firestoreSdk, db, uid, generation, index) {
  return firestoreSdk.doc(
    db,
    CLOUD_SAVE_COLLECTION,
    uid,
    'chunks',
    `${generation}_${index}`
  );
}

async function deleteGeneration(firestoreSdk, db, uid, generation, chunkCount) {
  const indexes = Array.from({ length: chunkCount }, (_, index) => index);
  await runWithConcurrency(indexes, index => firestoreSdk.deleteDoc(
    getChunkRef(firestoreSdk, db, uid, generation, index)
  ));
}

export const CloudSaveService = {
  isConfigured: isFirebaseConfigured,
  maxPayloadLength: MAX_PAYLOAD_LENGTH,

  async observeAuthState(callback) {
    if (!isFirebaseConfigured) {
      callback(null);
      return () => {};
    }
    const { auth, authSdk } = await loadServices();
    // onIdTokenChanged also fires after an email-verification token refresh.
    return authSdk.onIdTokenChanged(auth, callback);
  },

  async registerWithEmail(email, password) {
    const { auth, authSdk } = await loadServices();
    const credential = await authSdk.createUserWithEmailAndPassword(auth, email, password);
    await authSdk.sendEmailVerification(credential.user);
    return credential.user;
  },

  async signInWithEmail(email, password) {
    const { auth, authSdk } = await loadServices();
    const credential = await authSdk.signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  },

  async signInWithGoogle() {
    const { auth, authSdk } = await loadServices();
    const provider = new authSdk.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await authSdk.signInWithPopup(auth, provider);
    return credential.user;
  },

  async sendPasswordReset(email) {
    const { auth, authSdk } = await loadServices();
    await authSdk.sendPasswordResetEmail(auth, email);
  },

  async resendVerification() {
    const { auth, authSdk } = await loadServices();
    const user = requireUser(auth);
    await authSdk.sendEmailVerification(user);
  },

  async refreshUser() {
    const { auth } = await loadServices();
    const user = requireUser(auth);
    await user.reload();
    await user.getIdToken(true);
    return auth.currentUser;
  },

  async signOut() {
    const { auth, authSdk } = await loadServices();
    await authSdk.signOut(auth);
  },

  async upload(payload, appVersion, { expectedSavedAt } = {}) {
    if (typeof payload !== 'string' || payload.length === 0) {
      throw new Error('ローカルセーブデータを作成できませんでした。');
    }
    if (payload.length > MAX_PAYLOAD_LENGTH) {
      throw new Error(`セーブデータがクラウド保存可能なサイズ（約${Math.floor(MAX_PAYLOAD_LENGTH / 1_000_000)}MB）を超えています。`);
    }

    const { auth, db, firestoreSdk } = await loadServices();
    const user = requireVerifiedUser(auth);
    const savedAt = new Date().toISOString();
    const saveRef = firestoreSdk.doc(db, CLOUD_SAVE_COLLECTION, user.uid);

    if (payload.length <= MAX_LEGACY_PAYLOAD_LENGTH) {
      await runFirestoreOperation(() => commitSaveDocument(firestoreSdk, db, saveRef, {
        schemaVersion: LEGACY_SCHEMA_VERSION,
        appVersion: String(appVersion || ''),
        savedAt,
        updatedAt: firestoreSdk.serverTimestamp(),
        payload
      }, expectedSavedAt));
      return { savedAt, payloadLength: payload.length, chunkCount: 1 };
    }

    const previousSnapshot = await runFirestoreOperation(() => firestoreSdk.getDoc(saveRef));
    if (expectedSavedAt !== undefined && !matchesExpectedSave(previousSnapshot, expectedSavedAt)) {
      throw createSaveConflictError();
    }
    const previousManifest = previousSnapshot.exists() ? previousSnapshot.data() : null;
    const generation = createGenerationId();
    const chunks = splitPayload(payload);
    const checksum = await createChecksum(payload);

    // A unique generation keeps an interrupted or concurrent upload from
    // overwriting chunks referenced by the currently valid cloud save.
    try {
      await runWithConcurrency(chunks, (data, index) => firestoreSdk.setDoc(
        getChunkRef(firestoreSdk, db, user.uid, generation, index),
        { generation, index, data }
      ));
    } catch (error) {
      // The manifest still points at the previous save, so partially uploaded
      // chunks from this new generation can be removed safely.
      try {
        await deleteGeneration(firestoreSdk, db, user.uid, generation, chunks.length);
      } catch (cleanupError) {
        console.warn('[CloudSave] Could not clean up an incomplete upload.', cleanupError);
      }
      throw mapPermissionError(error, 'chunks');
    }

    // Switch the manifest only after every chunk has been written. Readers see
    // either the complete previous generation or the complete new generation.
    try {
      await commitSaveDocument(firestoreSdk, db, saveRef, {
        schemaVersion: CHUNKED_SCHEMA_VERSION,
        appVersion: String(appVersion || ''),
        savedAt,
        updatedAt: firestoreSdk.serverTimestamp(),
        generation,
        chunkCount: chunks.length,
        payloadLength: payload.length,
        checksum
      }, expectedSavedAt);
    } catch (error) {
      // A rejected manifest must not leave a complete but unreachable
      // generation behind. The previous manifest is still intact.
      try {
        await deleteGeneration(firestoreSdk, db, user.uid, generation, chunks.length);
      } catch (cleanupError) {
        console.warn('[CloudSave] Could not clean up an uncommitted upload.', cleanupError);
      }
      throw mapPermissionError(error);
    }

    // Cleanup is best-effort: the new save is already committed and must not be
    // reported as failed merely because obsolete chunks could not be removed.
    if (isChunkedManifest(previousManifest) && previousManifest.generation !== generation) {
      try {
        await deleteGeneration(
          firestoreSdk,
          db,
          user.uid,
          previousManifest.generation,
          previousManifest.chunkCount
        );
      } catch (error) {
        console.warn('[CloudSave] Could not remove obsolete save chunks.', error);
      }
    }

    return { savedAt, payloadLength: payload.length, chunkCount: chunks.length };
  },

  /**
   * Move automatic-save ownership to the device that just restored this exact
   * cloud generation. Only manifest metadata changes; the payload/chunks are
   * not uploaded again.
   */
  async claimOwnership(expectedSavedAt) {
    if (typeof expectedSavedAt !== 'string' || !expectedSavedAt) {
      throw new Error('所有権を取得するクラウドセーブを確認できませんでした。');
    }

    const { auth, db, firestoreSdk } = await loadServices();
    const user = requireVerifiedUser(auth);
    const saveRef = firestoreSdk.doc(db, CLOUD_SAVE_COLLECTION, user.uid);
    const savedAt = createNextSavedAt(expectedSavedAt);
    let payloadLength = 0;

    await runFirestoreOperation(() => firestoreSdk.runTransaction(db, async transaction => {
      const snapshot = await transaction.get(saveRef);
      if (!matchesExpectedSave(snapshot, expectedSavedAt)) {
        throw createSaveConflictError();
      }

      const data = snapshot.data();
      const isLegacySave = data.schemaVersion === LEGACY_SCHEMA_VERSION
        && typeof data.payload === 'string'
        && data.payload.length > 0
        && data.payload.length <= MAX_LEGACY_PAYLOAD_LENGTH;
      if (!isLegacySave && !isChunkedManifest(data)) {
        throw new Error('クラウドセーブの形式に対応していません。');
      }

      payloadLength = isLegacySave ? data.payload.length : data.payloadLength;
      transaction.set(saveRef, {
        ...data,
        savedAt,
        updatedAt: firestoreSdk.serverTimestamp(),
      });
    }));

    return { savedAt, payloadLength };
  },

  async getMetadata() {
    const { auth, db, firestoreSdk } = await loadServices();
    const user = requireVerifiedUser(auth);
    const snapshot = await runFirestoreOperation(() => firestoreSdk.getDoc(
      firestoreSdk.doc(db, CLOUD_SAVE_COLLECTION, user.uid)
    ));

    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    const isLegacySave = data.schemaVersion === LEGACY_SCHEMA_VERSION
      && typeof data.payload === 'string'
      && data.payload.length > 0
      && data.payload.length <= MAX_LEGACY_PAYLOAD_LENGTH;
    if (!isLegacySave && !isChunkedManifest(data)) {
      throw new Error('クラウドセーブの形式に対応していません。');
    }

    return {
      savedAt: data.savedAt,
      appVersion: data.appVersion,
      payloadLength: isLegacySave ? data.payload.length : data.payloadLength
    };
  },

  async download({ onProgress } = {}) {
    const { auth, db, firestoreSdk } = await loadServices();
    const user = requireVerifiedUser(auth);
    const saveRef = firestoreSdk.doc(db, CLOUD_SAVE_COLLECTION, user.uid);

    // A concurrent upload can replace the manifest and remove the generation
    // that this download started reading. Re-read the latest manifest and retry
    // the complete download so restore remains reliable across devices.
    for (let downloadAttempt = 0; downloadAttempt < DOWNLOAD_ATTEMPTS; downloadAttempt += 1) {
      try {
        const snapshot = await readDocumentWithRetry(() => runFirestoreOperation(
          () => firestoreSdk.getDoc(saveRef)
        ));

        if (!snapshot.exists()) return null;
        const data = snapshot.data();

        if (data.schemaVersion === LEGACY_SCHEMA_VERSION && typeof data.payload === 'string') {
          if (data.payload.length === 0 || data.payload.length > MAX_LEGACY_PAYLOAD_LENGTH) {
            throw new Error('クラウドセーブのサイズが上限を超えています。');
          }
          onProgress?.({ completed: 1, total: 1 });
          return {
            payload: data.payload,
            savedAt: data.savedAt,
            appVersion: data.appVersion
          };
        }

        if (!isChunkedManifest(data)) {
          throw new Error('クラウドセーブの形式に対応していません。');
        }

        const indexes = Array.from({ length: data.chunkCount }, (_, index) => index);
        const chunks = [];
        for (let offset = 0; offset < indexes.length; offset += CHUNK_WRITE_CONCURRENCY) {
          const batch = indexes.slice(offset, offset + CHUNK_WRITE_CONCURRENCY);
          chunks.push(...await Promise.all(batch.map(async index => {
            const chunkSnapshot = await readDocumentWithRetry(() => runFirestoreOperation(
              () => firestoreSdk.getDoc(
                getChunkRef(firestoreSdk, db, user.uid, data.generation, index)
              ),
              'chunks'
            ));
            const chunk = chunkSnapshot.exists() ? chunkSnapshot.data() : null;
            if (!chunk || chunk.generation !== data.generation || chunk.index !== index
                || typeof chunk.data !== 'string' || chunk.data.length === 0 || chunk.data.length > CHUNK_LENGTH) {
              const error = new Error('クラウドセーブの読み込み中に新しい保存が行われました。');
              error.code = 'cloud-save/generation-changed';
              throw error;
            }
            return chunk.data;
          })));
          onProgress?.({ completed: Math.min(offset + batch.length, indexes.length), total: indexes.length });
        }
        const payload = chunks.join('');
        if (payload.length !== data.payloadLength || await createChecksum(payload) !== data.checksum) {
          throw new Error('クラウドセーブの整合性を確認できませんでした。');
        }

        return {
          payload,
          savedAt: data.savedAt,
          appVersion: data.appVersion
        };
      } catch (error) {
        const generationChanged = error?.code === 'cloud-save/generation-changed';
        if (!generationChanged || downloadAttempt === DOWNLOAD_ATTEMPTS - 1) throw error;
        onProgress?.({ completed: 0, total: 0, retrying: true });
        await waitBeforeRetry(downloadAttempt);
      }
    }

    throw new Error('クラウドセーブを読み込めませんでした。');
  },

  /** Download the latest payload and atomically make this restoring device the owner. */
  async downloadAndClaimOwnership({ onProgress } = {}) {
    for (let attempt = 0; attempt < DOWNLOAD_ATTEMPTS; attempt += 1) {
      const cloudSave = await this.download({ onProgress });
      if (!cloudSave) return null;

      try {
        const ownership = await this.claimOwnership(cloudSave.savedAt);
        return {
          ...cloudSave,
          sourceSavedAt: cloudSave.savedAt,
          savedAt: ownership.savedAt,
        };
      } catch (error) {
        if (error?.code !== 'cloud-save/conflict' || attempt === DOWNLOAD_ATTEMPTS - 1) {
          throw error;
        }
        onProgress?.({ completed: 0, total: 0, retrying: true, claimingOwnership: true });
        await waitBeforeRetry(attempt);
      }
    }

    throw new Error('最新クラウドセーブの所有権を取得できませんでした。');
  }
};
