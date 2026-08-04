const SOUND_SETTING_KEY = 'soundEffectsEnabled';
const MAX_ACTIVE_SOURCES = 6;

const INTERACTIVE_SELECTOR = [
  'button:not(:disabled)',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="tab"]:not([aria-disabled="true"])',
  'a[href]',
  'input:not([type="hidden"]):not(:disabled)',
  'select:not(:disabled)',
  'label[for]',
  '[onclick]',
  '.cursor-pointer',
].join(',');

const SOUND_RECIPES = {
  tap: { duration: .055, gain: .42, layers: [{ wave: 'sine', from: 720, to: 520, gain: 1 }] },
  tab: { duration: .085, gain: .4, layers: [{ wave: 'triangle', from: 480, to: 760, gain: 1 }] },
  confirm: { duration: .18, gain: .4, layers: [
    { wave: 'sine', from: 590, to: 760, gain: .8, end: .11 },
    { wave: 'sine', from: 850, to: 1040, gain: .65, start: .065 },
  ] },
  cancel: { duration: .14, gain: .36, layers: [{ wave: 'triangle', from: 480, to: 240, gain: 1 }] },
  toggleOn: { duration: .13, gain: .38, layers: [{ wave: 'sine', from: 520, to: 940, gain: 1 }] },
  toggleOff: { duration: .13, gain: .34, layers: [{ wave: 'sine', from: 720, to: 360, gain: 1 }] },
  danger: { duration: .2, gain: .38, layers: [
    { wave: 'square', from: 180, to: 120, gain: .32 },
    { wave: 'noise', from: 1, to: 1, gain: .22 },
  ] },
  battleStart: { duration: .24, gain: .34, layers: [
    { wave: 'triangle', from: 220, to: 520, gain: .7 },
    { wave: 'sine', from: 440, to: 880, gain: .45, start: .06 },
  ] },
  battleAttack: { duration: .12, gain: .38, layers: [
    { wave: 'noise', from: 1, to: 1, gain: .42 },
    { wave: 'saw', from: 260, to: 90, gain: .36 },
  ] },
  battleMagic: { duration: .19, gain: .33, layers: [
    { wave: 'sine', from: 280, to: 980, gain: .72 },
    { wave: 'triangle', from: 720, to: 1280, gain: .35, start: .035 },
  ] },
  battleSkill: { duration: .16, gain: .3, layers: [
    { wave: 'triangle', from: 360, to: 700, gain: .65 },
    { wave: 'sine', from: 760, to: 560, gain: .4, start: .04 },
  ] },
  battleHit: { duration: .09, gain: .36, layers: [
    { wave: 'noise', from: 1, to: 1, gain: .55 },
    { wave: 'sine', from: 150, to: 75, gain: .7 },
  ] },
  heal: { duration: .22, gain: .32, layers: [
    { wave: 'sine', from: 520, to: 980, gain: .62 },
    { wave: 'sine', from: 780, to: 1320, gain: .35, start: .07 },
  ] },
  enemyDown: { duration: .22, gain: .36, layers: [
    { wave: 'saw', from: 240, to: 55, gain: .3 },
    { wave: 'noise', from: 1, to: 1, gain: .32, end: .14 },
  ] },
  victory: { duration: .48, gain: .32, layers: [
    { wave: 'triangle', from: 523, to: 523, gain: .55, end: .16 },
    { wave: 'triangle', from: 659, to: 659, gain: .55, start: .13, end: .3 },
    { wave: 'triangle', from: 784, to: 784, gain: .62, start: .27 },
  ] },
  defeat: { duration: .52, gain: .32, layers: [
    { wave: 'triangle', from: 360, to: 260, gain: .65, end: .28 },
    { wave: 'sine', from: 250, to: 105, gain: .7, start: .2 },
  ] },
  fishBite: { duration: .2, gain: .34, layers: [
    { wave: 'sine', from: 180, to: 540, gain: .7, end: .13 },
    { wave: 'sine', from: 420, to: 820, gain: .5, start: .07 },
    { wave: 'noise', from: 1, to: 1, gain: .16 },
  ] },
  catch: { duration: .38, gain: .32, layers: [
    { wave: 'sine', from: 520, to: 680, gain: .55, end: .16 },
    { wave: 'sine', from: 700, to: 900, gain: .55, start: .11, end: .27 },
    { wave: 'sine', from: 920, to: 1260, gain: .58, start: .23 },
  ] },
};

const COOLDOWNS = {
  tap: 35,
  tab: 55,
  battleStart: 600,
  battleAttack: 75,
  battleMagic: 100,
  battleSkill: 110,
  battleHit: 85,
  heal: 130,
  enemyDown: 180,
  victory: 700,
  defeat: 700,
  fishBite: 500,
  catch: 500,
};

let initialized = false;
let hasUserInteracted = false;
let audioContext = null;
let masterGain = null;
let buffers = null;
let audioUnavailable = false;
let suspendTimer = 0;
let lastPointerTarget = null;
let lastPointerAt = 0;
let lastAutomaticPlayedAt = 0;
const lastPlayedAt = new Map();
const activeSources = new Set();

export function areSoundEffectsEnabled() {
  // Missing values intentionally mean off.
  return localStorage.getItem(SOUND_SETTING_KEY) === 'true';
}

function getAudioContext() {
  if (audioUnavailable) return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext || audioContext.state === 'closed') {
    try {
      try {
        audioContext = new AudioContextClass({ latencyHint: 'interactive' });
      } catch (_) {
        audioContext = new AudioContextClass();
      }
      masterGain = audioContext.createGain();
      masterGain.gain.value = .32;
      masterGain.connect(audioContext.destination);
      buffers = new Map();
    } catch (error) {
      console.warn('[SoundEffects] Web Audio is unavailable.', error);
      audioUnavailable = true;
      audioContext = null;
      masterGain = null;
      buffers = null;
      return null;
    }
  }
  return audioContext;
}

function waveform(type, phase, noiseValue) {
  if (type === 'noise') return noiseValue;
  if (type === 'square') return Math.sin(phase) >= 0 ? 1 : -1;
  if (type === 'saw') return 2 * ((phase / (Math.PI * 2)) % 1) - 1;
  if (type === 'triangle') return 2 * Math.asin(Math.sin(phase)) / Math.PI;
  return Math.sin(phase);
}

function createSoundBuffer(context, recipe) {
  const length = Math.max(1, Math.ceil(recipe.duration * context.sampleRate));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let noiseState = 0x6d2b79f5;

  for (let i = 0; i < length; i++) {
    const time = i / context.sampleRate;
    let sample = 0;
    noiseState = (Math.imul(noiseState, 1664525) + 1013904223) | 0;
    const noiseValue = ((noiseState >>> 0) / 0xffffffff) * 2 - 1;

    for (const layer of recipe.layers) {
      const start = layer.start || 0;
      const end = layer.end || recipe.duration;
      if (time < start || time >= end) continue;
      const duration = Math.max(.001, end - start);
      const localTime = time - start;
      const progress = localTime / duration;
      const frequency = layer.from + (layer.to - layer.from) * progress;
      const attack = Math.min(1, localTime / Math.min(.012, duration * .2));
      const release = Math.min(1, (end - time) / Math.min(.055, duration * .45));
      const envelope = attack * release;
      const phase = Math.PI * 2 * frequency * localTime;
      sample += waveform(layer.wave, phase, noiseValue) * (layer.gain || 1) * envelope;
    }

    // Soft clipping prevents layered effects from producing harsh peaks.
    data[i] = Math.tanh(sample * (recipe.gain || .35));
  }
  return buffer;
}

function getSoundBuffer(name) {
  const recipe = SOUND_RECIPES[name];
  if (!recipe) return null;
  const context = getAudioContext();
  if (!context || !recipe) return null;
  if (!buffers.has(name)) buffers.set(name, createSoundBuffer(context, recipe));
  return buffers.get(name);
}

export function playSoundEffect(name, options = {}) {
  if ((!areSoundEffectsEnabled() && !options.force) || document.hidden) return false;
  if (options.automatic && document.body?.classList.contains('screen-lock-active')) return false;
  // Do not queue autoplay sounds on a suspended context after a direct reload.
  if (!audioContext && !hasUserInteracted && !options.force) return false;

  const now = performance.now();
  const baseCooldown = options.cooldown ?? COOLDOWNS[name] ?? 45;
  // Fast automatic loops keep audio sparse, bounded, and pleasant at 5x speed.
  const cooldown = options.automatic ? Math.max(baseCooldown, 180) : baseCooldown;
  if (now - (lastPlayedAt.get(name) || 0) < cooldown) return false;
  // A shared gate prevents different combat sounds from bypassing per-sound
  // throttles during dense 5x battles.
  const isOutcomeSound = name === 'victory' || name === 'defeat' || name === 'catch';
  if (options.automatic && !isOutcomeSound && now - lastAutomaticPlayedAt < 110) return false;
  if (activeSources.size >= MAX_ACTIVE_SOURCES) return false;

  const context = getAudioContext();
  const buffer = getSoundBuffer(name);
  if (!context || !buffer) return false;
  window.clearTimeout(suspendTimer);
  if (context.state === 'suspended') context.resume().catch(() => {});

  try {
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = options.rate || 1;
    gain.gain.value = Math.max(0, Math.min(1, options.volume ?? 1));
    source.connect(gain);
    gain.connect(masterGain);
    source.onended = () => {
      activeSources.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    activeSources.add(source);
    lastPlayedAt.set(name, now);
    if (options.automatic) lastAutomaticPlayedAt = now;
    source.start();
    return true;
  } catch (error) {
    console.warn('[SoundEffects] Playback failed.', error);
    return false;
  }
}

export function setSoundEffectsEnabled(enabled, { preview = false } = {}) {
  const nextEnabled = Boolean(enabled);
  window.clearTimeout(suspendTimer);

  if (nextEnabled) {
    localStorage.setItem(SOUND_SETTING_KEY, 'true');
    const context = getAudioContext();
    if (context?.state === 'suspended') context.resume().catch(() => {});
    if (preview) playSoundEffect('toggleOn', { force: true });
  } else {
    if (preview && areSoundEffectsEnabled()) playSoundEffect('toggleOff', { force: true });
    localStorage.setItem(SOUND_SETTING_KEY, 'false');
    suspendTimer = window.setTimeout(() => audioContext?.suspend().catch(() => {}), 220);
  }

  window.dispatchEvent(new CustomEvent('soundeffectschange', { detail: { enabled: nextEnabled } }));
  return nextEnabled;
}

function inferControlSound(control) {
  const explicit = control.dataset.sound;
  if (explicit === 'none' || control.closest('[data-sound="none"]')) return null;
  if (explicit && SOUND_RECIPES[explicit]) return explicit;

  const text = `${control.id || ''} ${control.getAttribute('aria-label') || ''} ${control.textContent || ''}`.toLowerCase();
  if (control.matches('[role="tab"], [data-nav-path]') || /tab|page-prev|page-next/.test(text)) return 'tab';
  if (/delete|reset|discard|廃棄|削除|リセット/.test(text)) return 'danger';
  if (/close|cancel|back|戻る|閉じる|中止|撤退/.test(text)) return 'cancel';
  if (/confirm|submit|claim|equip|craft|buy|draw|unlock|決定|確認|購入|装備|作成|強化|転職|習得|受取|受け取/.test(text)) return 'confirm';
  if (/toggle|setting-row/.test(text) || control.getAttribute('role') === 'switch') {
    return control.classList.contains('active') || control.getAttribute('aria-checked') === 'true' ? 'toggleOff' : 'toggleOn';
  }
  return 'tap';
}

function findInteractiveTarget(event) {
  if (!(event.target instanceof Element)) return null;
  const target = event.target.closest(INTERACTIVE_SELECTOR);
  if (!target || target.matches(':disabled') || target.getAttribute('aria-disabled') === 'true') return null;
  return target;
}

/**
 * One delegated listener covers controls rendered later by pages and modals.
 * Pointerdown supports battle controls; click remains as the keyboard fallback.
 */
export function initSoundEffects() {
  if (initialized) return;
  initialized = true;

  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.isTrusted) hasUserInteracted = true;
    const target = findInteractiveTarget(event);
    if (!target || target.matches('input[type="range"]')) return;
    lastPointerTarget = target;
    lastPointerAt = performance.now();
    const sound = inferControlSound(target);
    if (sound) playSoundEffect(sound);
  }, { capture: true, passive: true });

  document.addEventListener('click', event => {
    if (event.isTrusted) hasUserInteracted = true;
    const target = findInteractiveTarget(event);
    if (!target) return;
    if (target === lastPointerTarget && performance.now() - lastPointerAt < 600) return;
    const sound = inferControlSound(target);
    if (sound) playSoundEffect(sound);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.isTrusted) hasUserInteracted = true;
  }, { capture: true, passive: true });

  document.addEventListener('input', event => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'range') {
      playSoundEffect('tab', { cooldown: 65, volume: .65 });
    }
  }, true);
}
