const ENABLED_KEY = 'gameNotificationsEnabled';

export function areGameNotificationsEnabled() {
  return localStorage.getItem(ENABLED_KEY) === 'true';
}

export async function setGameNotificationsEnabled(enabled) {
  if (!enabled) {
    localStorage.setItem(ENABLED_KEY, 'false');
    return false;
  }
  if (!('Notification' in window)) return false;
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
    new Notification(title, { body, tag });
  } catch (error) {
    console.warn('[Notification] Failed to show notification:', error);
  }
}
