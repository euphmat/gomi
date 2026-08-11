const MIN_BATTLE_SPEED = 1;
const MAX_BATTLE_SPEED = 5;

function getBattleEffectLimit(battleSpeed = getBattleSpeed()) {
  if (battleSpeed >= 5) return 40;
  if (battleSpeed >= 3) return 72;
  return 120;
}

/**
 * Battle effects are purely presentational. Skip constructing their DOM while
 * the page cannot be seen so auto battle only pays for the simulation itself.
 */
export function shouldSkipBattleAnimations() {
  return document.hidden
    || document.body?.classList.contains('screen-lock-active')
    || localStorage.getItem('disableBattleAnimations') === 'true';
}

export function getBattleSpeed() {
  const storedSpeed = Number.parseInt(localStorage.getItem('autoBattleSpeed') || '1', 10);
  if (!Number.isFinite(storedSpeed)) return MIN_BATTLE_SPEED;
  return Math.min(MAX_BATTLE_SPEED, Math.max(MIN_BATTLE_SPEED, storedSpeed));
}

/**
 * Keep the combat simulation fast without compressing visual effects down to
 * only one or two frames.  At 5x combat speed, animations play at 2x speed.
 * The Web Animations API can then interpolate the remaining frames on the
 * compositor instead of requiring a faster JavaScript update loop.
 */
export function getBattleAnimationSpeed(battleSpeed = getBattleSpeed()) {
  const clampedSpeed = Math.min(MAX_BATTLE_SPEED, Math.max(MIN_BATTLE_SPEED, battleSpeed));
  return 1 + (clampedSpeed - 1) * 0.25;
}

export function getBattleAnimationDuration(baseDuration, minimumDuration = 80) {
  return Math.max(minimumDuration, baseDuration / getBattleAnimationSpeed());
}

/**
 * Refresh the effect budget once per attack. Effect factories can then reject
 * excess decorations before creating DOM nodes or Web Animations, instead of
 * constructing everything and removing it in a later MutationObserver turn.
 */
export function beginBattleEffectBatch(layer) {
  if (!layer) return;
  layer._battleEffectLimit = getBattleEffectLimit();
}

export function canCreateBattleEffect(layer) {
  if (!layer) return false;
  const limit = layer._battleEffectLimit || getBattleEffectLimit();
  const activeEffects = Number(layer.childElementCount) || 0;
  return activeEffects < limit;
}

/** Keep decorative effects bounded so longer high-speed animations stay cheap. */
export function configureBattleEffectsLayer(layer) {
  if (!layer || layer._effectBudgetObserver) return;

  const trimExcessEffects = () => {
    const maxActiveEffects = getBattleEffectLimit();
    layer._battleEffectLimit = maxActiveEffects;
    while (layer.childElementCount > maxActiveEffects) {
      const oldest = layer.firstElementChild;
      if (!oldest) break;
      oldest.getAnimations?.().forEach(animation => animation.cancel());
      oldest.remove();
    }
  };

  layer._effectBudgetObserver = new MutationObserver(trimExcessEffects);
  layer._effectBudgetObserver.observe(layer, { childList: true });
}
