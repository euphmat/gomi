import { APP_VERSION } from '../definitions/update-log.js';
import { GameDB } from '../data/database.js';
import { CloudSaveService } from '../data/cloud-save-service.js';
import {
  getCloudAutoNotice,
  getDailyAutoRecord,
  getLastCloudUpload,
  recordCloudRestore,
  recordCloudUpload,
} from '../data/cloud-save-local-state.js';

export function createCloudSavePanel() {
  return `
    <div id="cloud-save-panel" class="settings-compact-row bg-sky-950/20">
      <div class="flex items-start gap-2.5">
        <div class="settings-compact-icon bg-sky-500/15 border border-sky-500/20 shrink-0">
          <span class="material-symbols-outlined text-base text-sky-400">cloud_upload</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <div class="text-xs font-bold text-gray-200 leading-tight">クラウドセーブ</div>
            <span id="cloud-auth-badge" class="text-[8px] font-bold text-gray-500">確認中</span>
          </div>
          <div id="cloud-save-status" role="status" aria-live="polite"
               class="text-[9px] text-gray-500 mt-1 leading-relaxed">
            アカウント情報を確認しています…
          </div>

          <div id="cloud-config-required" class="hidden mt-2 rounded-lg border border-amber-500/25 bg-amber-950/25 p-2 text-[9px] leading-relaxed text-amber-200/80">
            Firebaseの設定が必要です。管理者向け手順は FIREBASE_SETUP.md を確認してください。
          </div>

          <div id="cloud-signed-out" class="hidden mt-2 space-y-2">
            <input id="cloud-email" type="email" autocomplete="email" placeholder="メールアドレス"
                   class="w-full rounded-lg border border-gray-700 bg-gray-950/70 px-2.5 py-2 text-[10px] text-gray-200 outline-none focus:border-sky-500">
            <input id="cloud-password" type="password" autocomplete="current-password" minlength="6" placeholder="パスワード（6文字以上）"
                   class="w-full rounded-lg border border-gray-700 bg-gray-950/70 px-2.5 py-2 text-[10px] text-gray-200 outline-none focus:border-sky-500">
            <div class="grid grid-cols-2 gap-1.5">
              <button id="cloud-email-login" type="button"
                      class="settings-action-btn rounded-lg border border-sky-600/40 bg-sky-900/40 px-2 py-2 text-[9px] font-bold text-sky-200 cursor-pointer">
                ログイン
              </button>
              <button id="cloud-email-register" type="button"
                      class="settings-action-btn rounded-lg border border-emerald-600/40 bg-emerald-900/35 px-2 py-2 text-[9px] font-bold text-emerald-200 cursor-pointer">
                新規登録
              </button>
            </div>
            <button id="cloud-google-login" type="button"
                    class="settings-action-btn w-full rounded-lg border border-gray-600/50 bg-gray-800/80 px-2 py-2 text-[9px] font-bold text-gray-200 cursor-pointer flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-sm">account_circle</span>
              Googleアカウントでログイン
            </button>
            <button id="cloud-password-reset" type="button"
                    class="w-full text-center text-[8px] text-gray-500 underline underline-offset-2 cursor-pointer">
              パスワードを忘れた場合
            </button>
          </div>

          <div id="cloud-signed-in" class="hidden mt-2 space-y-2">
            <div class="rounded-lg border border-gray-700/60 bg-gray-950/40 px-2.5 py-2">
              <div id="cloud-account-email" class="truncate text-[9px] font-bold text-gray-300"></div>
              <div id="cloud-last-upload" class="mt-0.5 text-[8px] text-gray-500">この端末からの保存履歴はありません</div>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <button id="cloud-upload" type="button"
                      class="settings-action-btn rounded-lg border border-sky-600/40 bg-sky-900/40 px-2 py-2 text-[9px] font-bold text-sky-200 cursor-pointer flex items-center justify-center gap-1">
                <span class="material-symbols-outlined text-xs">cloud_upload</span>
                クラウドへ保存
              </button>
              <button id="cloud-download" type="button"
                      class="settings-action-btn rounded-lg border border-violet-600/40 bg-violet-900/35 px-2 py-2 text-[9px] font-bold text-violet-200 cursor-pointer flex items-center justify-center gap-1">
                <span class="material-symbols-outlined text-xs">cloud_download</span>
                クラウドから復元
              </button>
            </div>
            <div class="flex items-center justify-between gap-2">
              <div id="cloud-verification-actions" class="hidden items-center gap-2">
                <button id="cloud-resend-verification" type="button" class="text-[8px] text-amber-400 underline underline-offset-2 cursor-pointer">
                  確認メールを再送
                </button>
                <button id="cloud-refresh-verification" type="button" class="text-[8px] text-sky-400 underline underline-offset-2 cursor-pointer">
                  確認状態を更新
                </button>
              </div>
              <button id="cloud-logout" type="button" class="ml-auto text-[8px] text-gray-500 underline underline-offset-2 cursor-pointer">
                ログアウト
              </button>
            </div>
          </div>

          <p class="settings-cloud-note mt-2 text-[8px] leading-relaxed text-gray-600">
            通常の進行は端末内へ保存されます。ログイン中はその日の初回起動時に1回だけクラウドへ自動保存し、ボタンからも手動で保存・復元できます。
          </p>
        </div>
      </div>
    </div>
  `;
}

export function getCloudSaveErrorMessage(error) {
  const messages = {
    'auth/email-already-in-use': 'このメールアドレスは登録済みです。',
    'auth/invalid-email': 'メールアドレスの形式を確認してください。',
    'auth/invalid-credential': 'メールアドレスまたはパスワードが違います。',
    'auth/weak-password': 'パスワードは6文字以上にしてください。',
    'auth/popup-blocked': 'ログイン画面がブロックされました。ポップアップを許可してください。',
    'auth/popup-closed-by-user': 'Googleログインがキャンセルされました。',
    'auth/network-request-failed': '通信できませんでした。ネットワークを確認してください。',
    'auth/too-many-requests': '操作回数が多すぎます。時間をおいて再度お試しください。',
    'auth/account-exists-with-different-credential': '同じメールアドレスが別のログイン方法で登録されています。',
    'permission-denied': 'クラウドセーブへのアクセスが拒否されました。管理者に Firebase の設定確認を依頼してください。',
    'firestore/permission-denied': 'クラウドセーブへのアクセスが拒否されました。管理者に Firebase の設定確認を依頼してください。'
  };
  return messages[error?.code] || error?.message || '処理に失敗しました。';
}

function formatSavedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '日時不明';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

export function initCloudSavePanel(root, { onRestored } = {}) {
  const panel = root.querySelector('#cloud-save-panel');
  if (!panel) return () => {};

  const signedOut = panel.querySelector('#cloud-signed-out');
  const signedIn = panel.querySelector('#cloud-signed-in');
  const configRequired = panel.querySelector('#cloud-config-required');
  const status = panel.querySelector('#cloud-save-status');
  const badge = panel.querySelector('#cloud-auth-badge');
  let currentUser = null;
  let disposed = false;
  let unsubscribe = null;

  const updateActionAvailability = () => {
    const dailySaveRunning = getDailyAutoRecord(currentUser?.uid)?.status === 'saving';
    const canUseCloudSave = Boolean(currentUser?.emailVerified) && !dailySaveRunning;
    panel.querySelector('#cloud-upload').disabled = !canUseCloudSave;
    panel.querySelector('#cloud-download').disabled = !canUseCloudSave;
    panel.querySelector('#cloud-upload').classList.toggle('opacity-50', !canUseCloudSave);
    panel.querySelector('#cloud-download').classList.toggle('opacity-50', !canUseCloudSave);
  };

  const setStatus = (message, tone = 'normal') => {
    status.textContent = message;
    status.classList.remove('text-gray-500', 'text-emerald-400', 'text-rose-400', 'text-amber-400');
    status.classList.add({ success: 'text-emerald-400', error: 'text-rose-400', warning: 'text-amber-400' }[tone] || 'text-gray-500');
  };

  const setBusy = (busy, message = '') => {
    panel.querySelectorAll('button, input').forEach(element => { element.disabled = busy; });
    panel.classList.toggle('opacity-70', busy);
    if (!busy) updateActionAvailability();
    if (message) setStatus(message);
  };

  const renderUser = (user) => {
    currentUser = user;
    signedOut.classList.toggle('hidden', Boolean(user));
    signedIn.classList.toggle('hidden', !user);
    configRequired.classList.add('hidden');

    if (!user) {
      badge.textContent = '未ログイン';
      badge.className = 'text-[8px] font-bold text-gray-500';
      setStatus('登録またはログインするとクラウドセーブを利用できます。');
      return;
    }

    badge.textContent = 'ログイン中';
    badge.className = 'text-[8px] font-bold text-emerald-400';
    panel.querySelector('#cloud-account-email').textContent = user.email || 'Googleアカウント';
    const lastUpload = getLastCloudUpload(user.uid);
    panel.querySelector('#cloud-last-upload').textContent = lastUpload
      ? `この端末からの最終保存: ${formatSavedAt(lastUpload)}`
      : 'この端末からの保存履歴はありません';
    const needsVerification = !user.emailVerified
      && user.providerData.some(item => item.providerId === 'password');
    const verificationActions = panel.querySelector('#cloud-verification-actions');
    verificationActions.classList.toggle('hidden', !needsVerification);
    verificationActions.classList.toggle('flex', needsVerification);
    updateActionAvailability();
    const dailyRecord = getDailyAutoRecord(user.uid);
    const autoNotice = getCloudAutoNotice(user.uid);
    if (needsVerification) {
      setStatus('確認メールのリンクを開き、「確認状態を更新」を押してください。', 'warning');
    } else if (dailyRecord?.status === 'saving') {
      setStatus('本日の起動時クラウドセーブを実行しています…');
    } else if (autoNotice?.status === 'conflict') {
      setStatus('別端末で更新されたセーブがあります。復元または手動保存を選んでください。', 'warning');
    } else if (dailyRecord?.status === 'saved') {
      setStatus('本日の起動時クラウドセーブは完了しています。', 'success');
    } else {
      setStatus('1日1回の起動時自動保存と、手動の保存・復元を利用できます。');
    }
  };

  const getCredentials = () => ({
    email: panel.querySelector('#cloud-email').value.trim(),
    password: panel.querySelector('#cloud-password').value
  });

  const run = async (message, task) => {
    try {
      setBusy(true, message);
      await task();
    } catch (error) {
      console.error('[CloudSave]', error);
      setStatus(getCloudSaveErrorMessage(error), 'error');
    } finally {
      if (!disposed) setBusy(false);
    }
  };

  panel.querySelector('#cloud-email-login').addEventListener('click', () => run('ログインしています…', async () => {
    const { email, password } = getCredentials();
    if (!email || !password) throw new Error('メールアドレスとパスワードを入力してください。');
    await CloudSaveService.signInWithEmail(email, password);
    setStatus('ログインしました。', 'success');
  }));

  panel.querySelector('#cloud-email-register').addEventListener('click', () => run('アカウントを登録しています…', async () => {
    const { email, password } = getCredentials();
    if (!email || password.length < 6) throw new Error('メールアドレスと6文字以上のパスワードを入力してください。');
    await CloudSaveService.registerWithEmail(email, password);
    setStatus('登録しました。確認メールも送信しました。', 'success');
  }));

  panel.querySelector('#cloud-google-login').addEventListener('click', () => run('Googleログインを開いています…', async () => {
    await CloudSaveService.signInWithGoogle();
    setStatus('Googleアカウントでログインしました。', 'success');
  }));

  panel.querySelector('#cloud-password-reset').addEventListener('click', () => run('再設定メールを送信しています…', async () => {
    const { email } = getCredentials();
    if (!email) throw new Error('メールアドレスを入力してください。');
    await CloudSaveService.sendPasswordReset(email);
    setStatus('パスワード再設定メールを送信しました。', 'success');
  }));

  panel.querySelector('#cloud-resend-verification').addEventListener('click', () => run('確認メールを送信しています…', async () => {
    await CloudSaveService.resendVerification();
    setStatus('確認メールを再送しました。', 'success');
  }));

  panel.querySelector('#cloud-refresh-verification').addEventListener('click', () => run('確認状態を更新しています…', async () => {
    const user = await CloudSaveService.refreshUser();
    renderUser(user);
    if (!user.emailVerified) throw new Error('メールアドレスはまだ確認されていません。');
    setStatus('メールアドレスを確認しました。クラウドセーブを利用できます。', 'success');
  }));

  panel.querySelector('#cloud-logout').addEventListener('click', () => run('ログアウトしています…', async () => {
    await CloudSaveService.signOut();
  }));

  panel.querySelector('#cloud-upload').addEventListener('click', () => {
    if (!window.confirm('現在の端末内セーブで、クラウド上のセーブを上書きしますか？')) return;
    run('セーブデータを圧縮しています…', async () => {
      const payload = await GameDB.createCloudSnapshot();
      setStatus('クラウドへ保存しています…');
      const result = await CloudSaveService.upload(payload, APP_VERSION);
      recordCloudUpload(currentUser.uid, result.savedAt);
      panel.querySelector('#cloud-last-upload').textContent = `この端末からの最終保存: ${formatSavedAt(result.savedAt)}`;
      setStatus(`クラウドへ保存しました（約${Math.ceil(result.payloadLength / 1024)}KB）。`, 'success');
    });
  });

  panel.querySelector('#cloud-download').addEventListener('click', () => {
    if (!window.confirm('クラウドセーブで現在の端末内セーブを上書きします。元に戻せません。復元しますか？')) return;
    run('クラウドセーブを読み込んでいます…', async () => {
      const cloudSave = await CloudSaveService.download({
        onProgress: ({ completed, total, retrying }) => {
          if (retrying) {
            setStatus('クラウドの更新を検出しました。最新データを読み直しています…');
          } else if (total > 1) {
            setStatus(`クラウドセーブを読み込んでいます… (${completed}/${total})`);
          }
        }
      });
      if (!cloudSave) throw new Error('クラウドセーブがまだありません。先に保存してください。');
      setStatus('端末のセーブデータを安全に置き換えています…');
      await GameDB.restoreCloudSnapshot(cloudSave.payload);
      recordCloudRestore(currentUser.uid, cloudSave.savedAt);
      setStatus(`${formatSavedAt(cloudSave.savedAt)} のセーブを復元しました。`, 'success');
      if (onRestored) onRestored(cloudSave);
    });
  });

  if (!CloudSaveService.isConfigured) {
    badge.textContent = '未設定';
    badge.className = 'text-[8px] font-bold text-amber-400';
    configRequired.classList.remove('hidden');
    setStatus('Firebaseが設定されていないため、現在は利用できません。', 'warning');
    return () => {};
  }

  CloudSaveService.observeAuthState(renderUser)
    .then(stopObserving => {
      if (disposed) stopObserving();
      else unsubscribe = stopObserving;
    })
    .catch(error => {
      console.error('[CloudSave] Initialization failed.', error);
      if (!disposed) setStatus(getCloudSaveErrorMessage(error), 'error');
    });

  const handleDailyCloudSaveStatus = () => {
    if (!disposed && currentUser) renderUser(currentUser);
  };
  window.addEventListener('dailyCloudSaveStatus', handleDailyCloudSaveStatus);

  return () => {
    disposed = true;
    if (unsubscribe) unsubscribe();
    window.removeEventListener('dailyCloudSaveStatus', handleDailyCloudSaveStatus);
  };
}
