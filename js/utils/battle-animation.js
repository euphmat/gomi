const MIN_BATTLE_SPEED = 1;
const MAX_BATTLE_SPEED = 5;

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

/** Keep decorative effects bounded so longer high-speed animations stay cheap. */
export function configureBattleEffectsLayer(layer) {
  if (!layer || layer._effectBudgetObserver) return;

  const trimExcessEffects = () => {
    const battleSpeed = getBattleSpeed();
    const maxActiveEffects = battleSpeed >= 5 ? 72 : battleSpeed >= 3 ? 100 : 140;
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
