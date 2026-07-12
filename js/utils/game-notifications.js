const ENABLED_KEY = 'gameNotificationsEnabled';
let audioContext = null;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  return audioContext;
}

function enableNotificationSound() {
  const context = getAudioContext();
  if (context?.state === 'suspended') context.resume().catch(() => {});
}

export function initGameNotificationSound() {
  if (!areGameNotificationsEnabled()) return;
  const unlock = () => enableNotificationSound();
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function playNotificationSound() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === 'suspended') context.resume().catch(() => {});

  const start = context.currentTime;
  const gain = context.createGain();
  const tone = context.createOscillator();
  const sparkle = context.createOscillator();

  tone.type = 'sine';
  tone.frequency.setValueAtTime(880, start);
  tone.frequency.exponentialRampToValueAtTime(1320, start + 0.16);
  sparkle.type = 'sine';
  sparkle.frequency.setValueAtTime(1760, start);
  sparkle.frequency.exponentialRampToValueAtTime(2200, start + 0.12);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.13, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);

  tone.connect(gain);
  sparkle.connect(gain);
  gain.connect(context.destination);
  tone.start(start);
  sparkle.start(start + 0.035);
  tone.stop(start + 0.42);
  sparkle.stop(start + 0.32);
}

export function areGameNotificationsEnabled() {
  return localStorage.getItem(ENABLED_KEY) === 'true';
}

export async function setGameNotificationsEnabled(enabled) {
  if (!enabled) {
    localStorage.setItem(ENABLED_KEY, 'false');
    return false;
  }
  if (!('Notification' in window)) return false;
  // 設定クリックのユーザー操作中に音声再生も許可しておく。
  enableNotificationSound();
  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission;
  const granted = permission === 'granted';
  localStorage.setItem(ENABLED_KEY, String(granted));
  return granted;
}

export function notifyGameEvent(title, body, tag) {
  if (!areGameNotificationsEnabled() || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    playNotificationSound();
    new Notification(title, { body, tag });
  } catch (error) {
    console.warn('[Notification] Failed to show notification:', error);
  }
}
