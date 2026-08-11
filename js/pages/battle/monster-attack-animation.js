import {
  beginBattleEffectBatch,
  canCreateBattleEffect,
  getBattleAnimationDuration,
  shouldSkipBattleAnimations
} from '../../utils/battle-animation.js';

const EMPTY_TIMING = Object.freeze({
  impactDelay: 0,
  cadenceDelay: 0,
  completionDelay: 0
});

const centerOf = rect => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2
});

const addEffect = (layer, className, cssText, keyframes, timing, text = '') => {
  if (!canCreateBattleEffect(layer)) return null;
  const effect = document.createElement('div');
  effect.setAttribute('aria-hidden', 'true');
  effect.className = className;
  effect.style.cssText = `${cssText};pointer-events:none;z-index:9999;opacity:0;`;
  effect.textContent = text;
  layer.appendChild(effect);

  const animation = effect.animate(keyframes, { fill: 'both', ...timing });
  animation.onfinish = () => effect.remove();
  animation.oncancel = () => effect.remove();
  return effect;
};

/**
 * Shows a readable monster-to-party attack path before the damage lands.
 * The target frame is intentionally card-sized: with four compact party cards,
 * an impact effect at the centre alone is too easy to attribute to a neighbour.
 */
export function playMonsterAttackAnimation(attacker, defender) {
  if (shouldSkipBattleAnimations()) return EMPTY_TIMING;

  const attackerEl = document.getElementById(attacker?.elementId);
  const defenderEl = document.getElementById(defender?.elementId);
  if (!attackerEl || !defenderEl) return EMPTY_TIMING;

  const attackerVisual = attackerEl.querySelector?.('img') || attackerEl;
  const originRect = attackerVisual.getBoundingClientRect();
  const targetRect = defenderEl.getBoundingClientRect();
  if (originRect.width < 1 || originRect.height < 1 || targetRect.width < 1 || targetRect.height < 1) {
    return EMPTY_TIMING;
  }

  const layer = document.getElementById('battle-effects-layer') || document.body;
  beginBattleEffectBatch(layer);
  const origin = centerOf(originRect);
  const target = centerOf(targetRect);
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const actionDuration = getBattleAnimationDuration(500, 270);
  const impactDuration = getBattleAnimationDuration(300, 170);
  const impactDelay = reducedMotion ? 0 : Math.round(actionDuration * .58);
  const totalDuration = reducedMotion ? impactDuration : impactDelay + impactDuration;
  const targetInset = 2;

  // A labelled frame removes ambiguity even when several damage values and
  // status effects overlap. It appears before the travelling strike.
  const marker = addEffect(
    layer,
    'battle-monster-target-marker',
    `position:fixed;left:${targetRect.left - targetInset}px;top:${targetRect.top - targetInset}px;width:${targetRect.width + targetInset * 2}px;height:${targetRect.height + targetInset * 2}px;border:2px solid #fb7185;border-radius:8px;background:linear-gradient(135deg,rgba(244,63,94,.18),transparent 48%,rgba(251,146,60,.13));box-shadow:0 0 0 1px rgba(255,255,255,.65),0 0 16px rgba(244,63,94,.9),inset 0 0 12px rgba(244,63,94,.28)`,
    reducedMotion ? [
      { opacity: 0 },
      { opacity: 1, offset: .15 },
      { opacity: 0 }
    ] : [
      { transform: 'scale(1.08)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1, offset: .16 },
      { transform: 'scale(1.025)', opacity: .85, offset: .52 },
      { transform: 'scale(.99)', opacity: 1, offset: .64 },
      { transform: 'scale(1.04)', opacity: 0 }
    ],
    { duration: totalDuration, easing: 'cubic-bezier(.2,.7,.2,1)' }
  );

  const label = document.createElement('span');
  label.style.cssText = 'position:absolute;left:50%;top:-2px;transform:translate(-50%,-100%);padding:1px 5px;border-radius:999px;background:rgba(136,19,55,.96);border:1px solid rgba(253,164,175,.9);color:#fff1f2;font:900 9px/14px sans-serif;letter-spacing:.08em;white-space:nowrap;text-shadow:0 1px 2px #000;box-shadow:0 0 8px rgba(244,63,94,.75)';
  label.textContent = '攻撃対象';
  marker?.appendChild(label);

  if (!reducedMotion) {
    // The enemy image leans toward the chosen card, while the card-sized frame
    // and tracer carry the eye all the way to the exact recipient.
    const lungeDistance = Math.min(22, distance * .12);
    attackerVisual.animate([
      { transform: 'translate3d(0,0,0) scale(1)' },
      { transform: 'translate3d(0,0,0) scale(.94)', offset: .2 },
      { transform: `translate3d(${dx / distance * lungeDistance}px,${dy / distance * lungeDistance}px,0) scale(1.1)`, offset: .58 },
      { transform: 'translate3d(0,0,0) scale(1)' }
    ], { duration: actionDuration, easing: 'cubic-bezier(.25,.7,.25,1)' });

    addEffect(
      layer,
      'battle-monster-attack-tracer',
      `position:fixed;left:${origin.x}px;top:${origin.y - 3}px;width:${distance}px;height:6px;transform-origin:0 50%;transform:rotate(${angle}rad) scaleX(.02);border-radius:999px;background:linear-gradient(90deg,rgba(127,29,29,.15),#fb7185 30%,#fff 76%,#fb923c);clip-path:polygon(0 35%,88% 35%,88% 0,100% 50%,88% 100%,88% 65%,0 65%);box-shadow:0 0 6px #fb7185,0 0 14px rgba(239,68,68,.75);mix-blend-mode:screen`,
      [
        { transform: `rotate(${angle}rad) scaleX(.02)`, opacity: 0 },
        { transform: `rotate(${angle}rad) scaleX(.15)`, opacity: .9, offset: .2 },
        { transform: `rotate(${angle}rad) scaleX(1)`, opacity: 1, offset: .82 },
        { transform: `rotate(${angle}rad) scaleX(1)`, opacity: 0 }
      ],
      { duration: impactDelay * .72, delay: actionDuration * .16, easing: 'cubic-bezier(.16,.72,.2,1)' }
    );
  }

  // The common impact language is deliberately warm/red so it cannot be
  // confused with the blue selection outline or green recovery feedback.
  addEffect(
    layer,
    'battle-monster-impact-ring',
    `position:fixed;left:${target.x - 34}px;top:${target.y - 34}px;width:68px;height:68px;border:4px solid #fff1f2;border-radius:50%;box-shadow:0 0 8px #fff,0 0 20px #ef4444,inset 0 0 12px #fb923c;mix-blend-mode:screen`,
    [
      { transform: 'scale(.08)', opacity: 0 },
      { transform: 'scale(.34)', opacity: 1, offset: .16 },
      { transform: 'scale(1.45)', opacity: 0 }
    ],
    { duration: impactDuration, delay: impactDelay, easing: 'cubic-bezier(.12,.72,.2,1)' }
  );

  [-34, 34].forEach((rotation, index) => {
    addEffect(
      layer,
      'battle-monster-impact-slash',
      `position:fixed;left:${target.x - 43}px;top:${target.y - 4}px;width:86px;height:8px;border-radius:100%;background:linear-gradient(90deg,transparent,#fb7185,#fff,#fb923c,transparent);box-shadow:0 0 10px #ef4444;mix-blend-mode:screen`,
      [
        { transform: `rotate(${rotation}deg) scaleX(.05)`, opacity: 0 },
        { transform: `rotate(${rotation}deg) scaleX(1.12)`, opacity: 1, offset: .28 },
        { transform: `rotate(${rotation}deg) scaleX(1.42)`, opacity: 0 }
      ],
      { duration: impactDuration * .72, delay: impactDelay + index * 28, easing: 'ease-out' }
    );
  });

  if (!reducedMotion) {
    const impactOffset = Math.min(.82, impactDelay / totalDuration);
    defenderEl.animate([
      { transform: 'translate3d(0,0,0)', filter: 'brightness(1)', boxShadow: '0 0 0 rgba(244,63,94,0)' },
      { transform: 'translate3d(0,0,0)', filter: 'brightness(1)', boxShadow: '0 0 0 rgba(244,63,94,0)', offset: impactOffset },
      { transform: 'translate3d(-4px,0,0)', filter: 'brightness(1.7)', boxShadow: '0 0 18px rgba(244,63,94,.95)', offset: Math.min(.9, impactOffset + .06) },
      { transform: 'translate3d(4px,0,0)', filter: 'brightness(1.25)', boxShadow: '0 0 10px rgba(244,63,94,.65)', offset: Math.min(.96, impactOffset + .13) },
      { transform: 'translate3d(0,0,0)', filter: 'brightness(1)', boxShadow: '0 0 0 rgba(244,63,94,0)' }
    ], { duration: totalDuration, easing: 'ease-out' });
  }

  return {
    impactDelay,
    cadenceDelay: impactDelay,
    completionDelay: Math.ceil(totalDuration + 34)
  };
}
