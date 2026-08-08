/**
 * Firebase Console > Project settings > Your apps > Web app に表示される
 * firebaseConfig の値へ置き換えてください。
 *
 * この設定値はWebクライアントへ公開される識別情報です。セーブデータの
 * アクセス制御は firestore.rules と Firebase Authentication が担当します。
 */
export const firebaseConfig = Object.freeze({
  apiKey: 'AIzaSyBvhlxuf4Z0I1xE3L0eYaSM-IUmqRR0o6Y',
  authDomain: 'gomi-rpg-cloud-save.firebaseapp.com',
  projectId: 'gomi-rpg-cloud-save',
  storageBucket: 'gomi-rpg-cloud-save.firebasestorage.app',
  messagingSenderId: '471214484539',
  appId: '1:471214484539:web:cb0d5699426e62a763401e',
  measurementId: 'G-C0NM647L9H'
});

export const isFirebaseConfigured = ['apiKey', 'authDomain', 'projectId', 'appId']
  .every(key => typeof firebaseConfig[key] === 'string' && firebaseConfig[key].trim().length > 0);
