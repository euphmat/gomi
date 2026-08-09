import {
  getBattleAnimationDuration,
  shouldSkipBattleAnimations
} from '../../utils/battle-animation.js';

/**
 * Magic Missile is a follow-up skill, so its animation deliberately lives
 * outside normal-attack-animations.js. This keeps the mage's arcane strike
 * and the passive projectile independently callable and independently timed.
 */
export const MAGIC_MISSILE_ANIMATION_PROFILE = Object.freeze({
  primary: '#f5d0fe',
  secondary: '#c026d3',
  core: '#ffffff'
});

const emptyTiming = () => ({ impactDelay: 0, cadenceDelay: 0, completionDelay: 0 });

export function getMagicMissileAnimationTiming() {
  const actionDuration = getBattleAnimationDuration(520, 280);
  const launchDelay = Math.round(actionDuration * .2);
  const impactDelay = Math.round(launchDelay + actionDuration * .7);
  const impactDuration = getBattleAnimationDuration(300, 170);
  const totalDuration = impactDelay + impactDuration;

  return {
    actionDuration,
    launchDelay,
    impactDelay,
    impactDuration,
    cadenceDelay: impactDelay,
    completionDelay: Math.ceil(totalDuration + 34),
    totalDuration
  };
}

const centerOf = rect => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2
});

const addEffect = (layer, cssText, keyframes, timing) => {
  const effect = document.createElement('div');
  effect.setAttribute('aria-hidden', 'true');
  effect.className = 'battle-magic-missile-effect';
  effect.style.cssText = `${cssText};pointer-events:none;z-index:9999;opacity:0;`;
  layer.appendChild(effect);

  const animation = effect.animate(keyframes, { fill: 'both', ...timing });
  animation.onfinish = () => effect.remove();
  animation.oncancel = () => effect.remove();
  return effect;
};

const addCastingSeal = (layer, origin, angle, duration, profile) => {
  [54, 34].forEach((size, index) => {
    addEffect(
      layer,
      `position:fixed;left:${origin.x - size / 2}px;top:${origin.y - size / 2}px;width:${size}px;height:${size}px;border:${index === 0 ? 3 : 2}px solid ${index === 0 ? profile.secondary : profile.primary};border-radius:50%;box-shadow:0 0 12px ${profile.secondary},inset 0 0 8px ${profile.primary};mix-blend-mode:screen`,
      [
        { transform: `rotate(${index ? 70 : -55}deg) scale(.12)`, opacity: 0 },
        { transform: `rotate(${index ? -30 : 35}deg) scale(1)`, opacity: 1, offset: .34 },
        { transform: `rotate(${index ? -150 : 175}deg) scale(.45)`, opacity: 0 }
      ],
      { duration: duration * .58, delay: index * duration * .04, easing: 'cubic-bezier(.2,.7,.2,1)' }
    );
  });

  addEffect(
    layer,
    `position:fixed;left:${origin.x - 18}px;top:${origin.y - 3}px;width:36px;height:6px;border-radius:999px;background:linear-gradient(90deg,transparent,${profile.core},${profile.secondary},transparent);box-shadow:0 0 10px ${profile.secondary};mix-blend-mode:screen`,
    [
      { transform: `rotate(${angle}rad) scaleX(.1)`, opacity: 0 },
      { transform: `rotate(${angle}rad) scaleX(1.35)`, opacity: 1, offset: .45 },
      { transform: `rotate(${angle}rad) scaleX(.2)`, opacity: 0 }
    ],
    { duration: duration * .58, easing: 'ease-out' }
  );
};

const addProjectile = (layer, origin, dx, dy, angle, duration, launchDelay, profile) => {
  // A bright core plus two orbiting sparks gives the passive its own readable
  // silhouette instead of reusing the mage normal attack's vertical strike.
  addEffect(
    layer,
    `position:fixed;left:${origin.x - 19}px;top:${origin.y - 10}px;width:38px;height:20px;border-radius:50%;background:radial-gradient(circle at 68% 50%,${profile.core} 0 12%,${profile.primary} 26%,${profile.secondary} 54%,transparent 72%);box-shadow:0 0 8px ${profile.core},0 0 18px ${profile.secondary};filter:saturate(1.35);mix-blend-mode:screen`,
    [
      { transform: `translate(0,0) rotate(${angle}rad) scale(.2)`, opacity: 0 },
      { transform: `translate(${dx * .06}px,${dy * .06}px) rotate(${angle}rad) scale(1.12)`, opacity: 1, offset: .08 },
      { transform: `translate(${dx * .9}px,${dy * .9}px) rotate(${angle + Math.PI * 2}rad) scale(.92)`, opacity: 1, offset: .84 },
      { transform: `translate(${dx}px,${dy}px) rotate(${angle + Math.PI * 2.2}rad) scale(.25)`, opacity: 0 }
    ],
    { duration: duration * .7, delay: launchDelay, easing: 'cubic-bezier(.24,.65,.24,1)' }
  );

  [-1, 1].forEach(side => {
    addEffect(
      layer,
      `position:fixed;left:${origin.x - 4}px;top:${origin.y - 4}px;width:8px;height:8px;border-radius:50%;background:${side > 0 ? profile.primary : profile.core};box-shadow:0 0 8px ${profile.secondary};mix-blend-mode:screen`,
      [
        { transform: `translate(0,${side * 12}px) scale(.2)`, opacity: 0 },
        { transform: `translate(${dx * .08}px,${dy * .08 + side * 14}px) scale(1)`, opacity: .9, offset: .1 },
        { transform: `translate(${dx * .5 - side * 13}px,${dy * .5 + side * 14}px) scale(.75)`, opacity: .8, offset: .5 },
        { transform: `translate(${dx}px,${dy}px) scale(.1)`, opacity: 0 }
      ],
      { duration: duration * .7, delay: launchDelay, easing: 'cubic-bezier(.24,.65,.24,1)' }
    );
  });
};

const addImpact = (layer, target, duration, delay, profile) => {
  [52, 76].forEach((size, index) => {
    addEffect(
      layer,
      `position:fixed;left:${target.x - size / 2}px;top:${target.y - size / 2}px;width:${size}px;height:${size}px;border:${index ? 2 : 4}px solid ${index ? profile.secondary : profile.primary};border-radius:50%;box-shadow:0 0 14px ${profile.secondary},inset 0 0 10px ${profile.primary};mix-blend-mode:screen`,
      [
        { transform: `rotate(${index ? 35 : -25}deg) scale(.08)`, opacity: 0 },
        { transform: `rotate(${index ? 105 : 45}deg) scale(.5)`, opacity: 1, offset: .18 },
        { transform: `rotate(${index ? 210 : 135}deg) scale(${index ? 1.45 : 1.7})`, opacity: 0 }
      ],
      { duration, delay: delay + index * 18, easing: 'cubic-bezier(.12,.72,.2,1)' }
    );
  });

  for (let index = 0; index < 7; index += 1) {
    const particleAngle = Math.PI * 2 * index / 7;
    const distance = 34 + (index % 3) * 9;
    addEffect(
      layer,
      `position:fixed;left:${target.x - 3}px;top:${target.y - 3}px;width:6px;height:6px;border-radius:50%;background:${index % 2 ? profile.primary : profile.core};box-shadow:0 0 8px ${profile.secondary};mix-blend-mode:screen`,
      [
        { transform: 'translate(0,0) scale(.2)', opacity: 0 },
        { transform: 'translate(0,0) scale(1.2)', opacity: 1, offset: .12 },
        { transform: `translate(${Math.cos(particleAngle) * distance}px,${Math.sin(particleAngle) * distance}px) scale(.1)`, opacity: 0 }
      ],
      { duration: duration * .85, delay, easing: 'ease-out' }
    );
  }
};

/**
 * Plays only the Magic Missile follow-up. It is never used for a mage's
 * regular attack, which remains owned by playNormalAttackAnimation().
 */
export function playMagicMissileAnimation(attacker, defender) {
  if (shouldSkipBattleAnimations()) return emptyTiming();

  const attackerEl = document.getElementById(attacker?.elementId);
  const defenderEl = document.getElementById(defender?.elementId);
  if (!attackerEl || !defenderEl) return emptyTiming();

  const layer = document.getElementById('battle-effects-layer') || document.body;
  const origin = centerOf(attackerEl.getBoundingClientRect());
  const target = centerOf(defenderEl.getBoundingClientRect());
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const angle = Math.atan2(dy, dx);
  const profile = MAGIC_MISSILE_ANIMATION_PROFILE;
  const {
    actionDuration,
    launchDelay,
    impactDelay,
    impactDuration,
    completionDelay
  } = getMagicMissileAnimationTiming();

  addCastingSeal(layer, origin, angle, actionDuration, profile);
  addProjectile(layer, origin, dx, dy, angle, actionDuration, launchDelay, profile);
  addImpact(layer, target, impactDuration, impactDelay, profile);

  return {
    impactDelay,
    cadenceDelay: impactDelay,
    completionDelay
  };
}
