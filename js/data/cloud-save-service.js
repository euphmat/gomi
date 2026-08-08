import { firebaseConfig, isFirebaseConfigured } from '../firebase-config.js';

const FIREBASE_SDK_VERSION = '12.16.0';
const CLOUD_SAVE_COLLECTION = 'cloudSaves';
const CLOUD_SAVE_SCHEMA_VERSION = 1;
const MAX_PAYLOAD_LENGTH = 850_000;

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

export const CloudSaveService = {
  isConfigured: isFirebaseConfigured,
  maxPayloadLength: MAX_PAYLOAD_LENGTH,

  async observeAuthState(callback) {
    if (!isFirebaseConfigured) {
      callback(null);
      return () => {};
    }
    const { auth, authSdk } = await loadServices();
    return authSdk.onAuthStateChanged(auth, callback);
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

  async upload(payload, appVersion) {
    if (typeof payload !== 'string' || payload.length === 0) {
      throw new Error('ローカルセーブデータを作成できませんでした。');
    }
    if (payload.length > MAX_PAYLOAD_LENGTH) {
      throw new Error('セーブデータがクラウド保存可能なサイズを超えています。');
    }

    const { auth, db, firestoreSdk } = await loadServices();
    const user = requireVerifiedUser(auth);
    const savedAt = new Date().toISOString();

    await firestoreSdk.setDoc(firestoreSdk.doc(db, CLOUD_SAVE_COLLECTION, user.uid), {
      schemaVersion: CLOUD_SAVE_SCHEMA_VERSION,
      appVersion: String(appVersion || ''),
      savedAt,
      updatedAt: firestoreSdk.serverTimestamp(),
      payload
    });

    return { savedAt, payloadLength: payload.length };
  },

  async download() {
    const { auth, db, firestoreSdk } = await loadServices();
    const user = requireVerifiedUser(auth);
    const snapshot = await firestoreSdk.getDoc(
      firestoreSdk.doc(db, CLOUD_SAVE_COLLECTION, user.uid)
    );

    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (data.schemaVersion !== CLOUD_SAVE_SCHEMA_VERSION || typeof data.payload !== 'string') {
      throw new Error('クラウドセーブの形式に対応していません。');
    }
    if (data.payload.length > MAX_PAYLOAD_LENGTH) {
      throw new Error('クラウドセーブのサイズが上限を超えています。');
    }

    return {
      payload: data.payload,
      savedAt: data.savedAt,
      appVersion: data.appVersion
    };
  }
};
