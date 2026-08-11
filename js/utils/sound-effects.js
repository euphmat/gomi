const SOUND_SETTING_KEY = 'soundEffectsEnabled';
const MAX_ACTIVE_SOURCES = 8;

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

// Effects are generated once and cached as tiny audio buffers.  Transient noise,
// low impacts and metallic partials keep actions readable without downloading
// assets or turning every interaction into the same rounded sine-wave "pop".
const SOUND_RECIPES = {
  tap: { duration: .04, gain: .5, highpass: .22, layers: [
    { wave: 'noise', gain: .55, decay: 12 },
    { wave: 'triangle', from: 920, to: 610, gain: .22, decay: 10 },
  ] },
  tab: { duration: .075, gain: .42, layers: [
    { wave: 'noise', gain: .22, decay: 15 },
    { wave: 'triangle', from: 620, to: 880, gain: .58, decay: 7 },
  ] },
  confirm: { duration: .17, gain: .38, layers: [
    { wave: 'noise', gain: .28, end: .035, decay: 12 },
    { wave: 'triangle', from: 660, to: 660, gain: .55, end: .085, decay: 5 },
    { wave: 'triangle', from: 990, to: 990, gain: .52, start: .072, decay: 6 },
  ] },
  cancel: { duration: .13, gain: .42, layers: [
    { wave: 'noise', gain: .25, end: .035, decay: 13 },
    { wave: 'triangle', from: 520, to: 190, gain: .68, decay: 6 },
  ] },
  toggleOn: { duration: .105, gain: .4, layers: [
    { wave: 'noise', gain: .48, end: .025, decay: 15 },
    { wave: 'square', from: 240, to: 380, gain: .18, start: .012, end: .07, decay: 8 },
    { wave: 'triangle', from: 760, to: 1040, gain: .35, start: .04, decay: 8 },
  ] },
  toggleOff: { duration: .09, gain: .4, layers: [
    { wave: 'noise', gain: .48, end: .025, decay: 15 },
    { wave: 'square', from: 300, to: 145, gain: .18, start: .012, decay: 9 },
  ] },
  danger: { duration: .26, gain: .42, lowpass: .18, layers: [
    { wave: 'square', from: 145, to: 105, gain: .38, decay: 3 },
    { wave: 'noise', gain: .42, noiseColor: .055, decay: 7 },
    { wave: 'square', from: 120, to: 90, gain: .24, start: .12, decay: 5 },
  ] },

  battleStart: { duration: .38, gain: .38, layers: [
    { wave: 'noise', gain: .55, noiseColor: .16, end: .09, decay: 10 },
    { wave: 'saw', from: 92, to: 155, gain: .38, decay: 3 },
    { wave: 'metal', from: 310, to: 520, gain: .26, start: .075, decay: 4 },
  ] },
  // Weapon swing / spell release. The corresponding impact is played when the
  // damage popup appears, so the two halves of an attack have distinct timing.
  battleAttack: { duration: .15, gain: .5, highpass: .12, layers: [
    { wave: 'noise', gain: .82, noiseColor: .58, attack: .008, decay: 7 },
    { wave: 'saw', from: 310, to: 72, gain: .25, decay: 8 },
  ] },
  battleMagic: { duration: .26, gain: .36, layers: [
    { wave: 'sine', from: 190, to: 820, gain: .48, attack: .018, decay: 2.4, pitchCurve: 'exp' },
    { wave: 'metal', from: 480, to: 1240, gain: .28, start: .035, attack: .015, decay: 4 },
    { wave: 'noise', gain: .18, noiseColor: .2, start: .08, decay: 5 },
  ] },
  battleSkill: { duration: .22, gain: .36, layers: [
    { wave: 'saw', from: 145, to: 390, gain: .34, attack: .02, decay: 3, pitchCurve: 'exp' },
    { wave: 'metal', from: 360, to: 760, gain: .24, start: .035, decay: 4 },
    { wave: 'noise', gain: .2, noiseColor: .12, end: .13, decay: 7 },
  ] },
  battleHit: { duration: .12, gain: .54, lowpass: .32, layers: [
    { wave: 'noise', gain: .72, noiseColor: .2, decay: 12 },
    { wave: 'sine', from: 145, to: 48, gain: .82, decay: 9, pitchCurve: 'exp' },
  ] },
  playerHit: { duration: .18, gain: .58, lowpass: .23, layers: [
    { wave: 'noise', gain: .88, noiseColor: .075, decay: 10 },
    { wave: 'square', from: 105, to: 43, gain: .24, decay: 8, pitchCurve: 'exp' },
    { wave: 'sine', from: 72, to: 38, gain: .62, decay: 7 },
  ] },
  criticalHit: { duration: .2, gain: .48, layers: [
    { wave: 'noise', gain: .8, noiseColor: .16, end: .1, decay: 13 },
    { wave: 'sine', from: 170, to: 52, gain: .72, decay: 10, pitchCurve: 'exp' },
    { wave: 'metal', from: 1120, to: 460, gain: .38, start: .008, decay: 7 },
  ] },
  weaknessHit: { duration: .16, gain: .52, layers: [
    { wave: 'noise', gain: .96, noiseColor: .28, end: .085, decay: 15 },
    { wave: 'square', from: 210, to: 62, gain: .2, decay: 11, pitchCurve: 'exp' },
    { wave: 'metal', from: 720, to: 310, gain: .25, start: .018, decay: 9 },
  ] },
  resistedHit: { duration: .14, gain: .38, highpass: .18, layers: [
    { wave: 'noise', gain: .32, end: .045, decay: 14 },
    { wave: 'metal', from: 960, to: 730, gain: .44, decay: 9 },
  ] },
  poisonTick: { duration: .16, gain: .34, lowpass: .16, layers: [
    { wave: 'noise', gain: .48, noiseColor: .035, decay: 5 },
    { wave: 'saw', from: 105, to: 62, gain: .25, decay: 5 },
  ] },
  burnTick: { duration: .15, gain: .38, highpass: .09, layers: [
    { wave: 'noise', gain: .62, noiseColor: .4, decay: 6 },
    { wave: 'noise', gain: .36, start: .045, end: .1, decay: 10 },
  ] },
  hpCost: { duration: .12, gain: .42, lowpass: .22, layers: [
    { wave: 'noise', gain: .55, noiseColor: .08, decay: 10 },
    { wave: 'sine', from: 125, to: 55, gain: .6, decay: 9 },
  ] },
  mpDrain: { duration: .18, gain: .34, layers: [
    { wave: 'sine', from: 570, to: 150, gain: .46, decay: 4, pitchCurve: 'exp' },
    { wave: 'noise', gain: .18, noiseColor: .14, decay: 6 },
  ] },
  heal: { duration: .34, gain: .32, layers: [
    { wave: 'noise', gain: .16, noiseColor: .22, attack: .035, decay: 4 },
    { wave: 'triangle', from: 523, to: 523, gain: .38, end: .14, decay: 4 },
    { wave: 'triangle', from: 659, to: 659, gain: .34, start: .09, end: .23, decay: 4 },
    { wave: 'triangle', from: 988, to: 988, gain: .34, start: .19, decay: 5 },
  ] },
  barrier: { duration: .19, gain: .34, highpass: .08, layers: [
    { wave: 'noise', gain: .35, end: .055, decay: 13 },
    { wave: 'metal', from: 740, to: 920, gain: .42, decay: 7 },
  ] },
  enemyDown: { duration: .34, gain: .52, lowpass: .28, layers: [
    { wave: 'noise', gain: .85, noiseColor: .09, decay: 5 },
    { wave: 'saw', from: 150, to: 34, gain: .34, decay: 5, pitchCurve: 'exp' },
    { wave: 'noise', gain: .42, noiseColor: .04, start: .12, decay: 8 },
  ] },
  allyDown: { duration: .48, gain: .44, lowpass: .22, layers: [
    { wave: 'sine', from: 92, to: 48, gain: .72, end: .22, decay: 4 },
    { wave: 'noise', gain: .42, noiseColor: .05, start: .11, decay: 6 },
    { wave: 'sine', from: 62, to: 31, gain: .46, start: .2, decay: 5 },
  ] },
  victory: { duration: .62, gain: .34, layers: [
    { wave: 'noise', gain: .28, end: .055, decay: 12 },
    { wave: 'triangle', from: 523, to: 523, gain: .5, end: .18, decay: 3 },
    { wave: 'triangle', from: 659, to: 659, gain: .5, start: .15, end: .34, decay: 3 },
    { wave: 'triangle', from: 784, to: 784, gain: .54, start: .31, end: .5, decay: 3 },
    { wave: 'metal', from: 1047, to: 1047, gain: .26, start: .45, decay: 5 },
  ] },
  defeat: { duration: .68, gain: .38, lowpass: .28, layers: [
    { wave: 'metal', from: 330, to: 250, gain: .27, end: .28, decay: 3 },
    { wave: 'saw', from: 185, to: 58, gain: .32, start: .16, decay: 3, pitchCurve: 'exp' },
    { wave: 'noise', gain: .32, noiseColor: .045, start: .3, decay: 4 },
  ] },
  fishBite: { duration: .25, gain: .43, layers: [
    { wave: 'noise', gain: .7, noiseColor: .24, end: .07, decay: 12 },
    { wave: 'triangle', from: 310, to: 820, gain: .38, start: .025, end: .16, decay: 5 },
    { wave: 'noise', gain: .38, noiseColor: .08, start: .12, decay: 6 },
  ] },
  catch: { duration: .5, gain: .34, layers: [
    { wave: 'noise', gain: .38, noiseColor: .16, end: .09, decay: 9 },
    { wave: 'triangle', from: 440, to: 440, gain: .45, end: .17, decay: 4 },
    { wave: 'triangle', from: 659, to: 659, gain: .46, start: .13, end: .31, decay: 4 },
    { wave: 'metal', from: 880, to: 1100, gain: .3, start: .27, decay: 5 },
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
  playerHit: 120,
  criticalHit: 120,
  weaknessHit: 105,
  resistedHit: 110,
  poisonTick: 180,
  burnTick: 160,
  hpCost: 130,
  mpDrain: 150,
  heal: 130,
  barrier: 140,
  enemyDown: 180,
  allyDown: 240,
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
const lastAutomaticPlayedAt = new Map();
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
  if (type === 'metal') {
    return Math.sin(phase) * .5
      + Math.sin(phase * 1.4142) * .3
      + Math.sin(phase * 2.417) * .2;
  }
  return Math.sin(phase);
}

function createSoundBuffer(context, recipe) {
  const length = Math.max(1, Math.ceil(recipe.duration * context.sampleRate));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let noiseState = 0x6d2b79f5;
  let lowpassState = 0;
  let highpassLowState = 0;
  const layerStates = recipe.layers.map(() => ({ phase: 0, noise: 0 }));

  for (let i = 0; i < length; i++) {
    const time = i / context.sampleRate;
    let sample = 0;

    for (let layerIndex = 0; layerIndex < recipe.layers.length; layerIndex++) {
      const layer = recipe.layers[layerIndex];
      const start = layer.start || 0;
      const end = layer.end || recipe.duration;
      if (time < start || time >= end) continue;
      const duration = Math.max(.001, end - start);
      const localTime = time - start;
      const progress = localTime / duration;
      const from = layer.from || 1;
      const to = layer.to ?? from;
      const frequency = layer.pitchCurve === 'exp' && from > 0 && to > 0
        ? from * ((to / from) ** progress)
        : from + (to - from) * progress;
      const attackDuration = Math.max(.001, Math.min(layer.attack ?? .006, duration * .35));
      const attack = Math.min(1, localTime / attackDuration);
      const releaseDuration = Math.max(.002, Math.min(layer.release ?? .045, duration * .5));
      const release = Math.min(1, (end - time) / releaseDuration);
      const decay = layer.decay ? Math.exp(-layer.decay * progress) : 1;
      const envelope = attack * release * decay;
      const state = layerStates[layerIndex];
      state.phase += Math.PI * 2 * frequency / context.sampleRate;

      noiseState = (Math.imul(noiseState, 1664525) + 1013904223) | 0;
      const whiteNoise = ((noiseState >>> 0) / 0xffffffff) * 2 - 1;
      const noiseColor = layer.noiseColor;
      const noiseValue = noiseColor
        ? (state.noise += (whiteNoise - state.noise) * noiseColor)
        : whiteNoise;
      sample += waveform(layer.wave, state.phase, noiseValue) * (layer.gain || 1) * envelope;
    }

    // Optional one-pole filters shape whole effects without requiring live Web
    // Audio nodes for every source. Values are normalized coefficients (0..1).
    if (recipe.lowpass) {
      lowpassState += (sample - lowpassState) * recipe.lowpass;
      sample = lowpassState;
    }
    if (recipe.highpass) {
      highpassLowState += (sample - highpassLowState) * recipe.highpass;
      sample -= highpassLowState;
    }

    // Soft clipping prevents layered effects from producing harsh peaks.
    data[i] = Math.tanh(sample * (recipe.gain || .35));
  }
  return buffer;
}

function getAutomaticSoundGroup(name) {
  if (['battleAttack', 'battleMagic', 'battleSkill'].includes(name)) return 'action';
  if (['battleHit', 'playerHit', 'criticalHit', 'weaknessHit', 'resistedHit'].includes(name)) return 'impact';
  if (['poisonTick', 'burnTick', 'hpCost', 'mpDrain'].includes(name)) return 'damage-over-time';
  if (['heal', 'barrier'].includes(name)) return 'recovery';
  if (['enemyDown', 'allyDown', 'victory', 'defeat', 'catch'].includes(name)) return 'outcome';
  return 'ambient';
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
  const cooldown = options.automatic ? Math.max(baseCooldown, 130) : baseCooldown;
  if (now - (lastPlayedAt.get(name) || 0) < cooldown) return false;
  // Separate action and impact gates let a swing be followed by contact while
  // still keeping dense 5x auto battles sparse and bounded.
  const isOutcomeSound = name === 'victory' || name === 'defeat' || name === 'catch';
  const automaticGroup = getAutomaticSoundGroup(name);
  const automaticGroupCooldown = automaticGroup === 'impact' ? 100 : 130;
  if (options.automatic && !isOutcomeSound
    && now - (lastAutomaticPlayedAt.get(automaticGroup) || 0) < automaticGroupCooldown) return false;
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
    if (options.automatic) lastAutomaticPlayedAt.set(automaticGroup, now);
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
