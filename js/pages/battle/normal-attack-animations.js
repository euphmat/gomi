import {
  getBattleAnimationDuration,
  shouldSkipBattleAnimations
} from '../../utils/battle-animation.js';

/**
 * Visual identity for every playable job's normal attack.
 *
 * Keep this map in sync with js/jobs/index.js. The profiles deliberately use
 * CSS shapes instead of images so normal attacks do not cause asset downloads
 * in the middle of combat.
 */
export const NORMAL_ATTACK_ANIMATION_PROFILES = Object.freeze({
  norvice:      { kind: 'slash',       primary: '#f8fafc', secondary: '#f59e0b', particles: 3 },
  knight:       { kind: 'shield',      primary: '#e0f2fe', secondary: '#3b82f6', particles: 4 },
  mage:         { kind: 'arcane',      primary: '#f5d0fe', secondary: '#a855f7', particles: 5 },
  priest:       { kind: 'holy',        primary: '#fff7cc', secondary: '#facc15', particles: 5 },
  ranger:       { kind: 'arrow',       primary: '#ecfccb', secondary: '#84cc16', particles: 3 },
  magic_knight: { kind: 'spellblade',  primary: '#cffafe', secondary: '#06b6d4', particles: 5 },
  slime_master: { kind: 'slime',       primary: '#d9f99d', secondary: '#22c55e', particles: 5 },
  dancer:       { kind: 'ribbon',      primary: '#fce7f3', secondary: '#ec4899', particles: 5 },
  bird:         { kind: 'melody',      primary: '#e0e7ff', secondary: '#818cf8', particles: 4 },
  black_knight: { kind: 'dark_blade',  primary: '#fda4af', secondary: '#7e22ce', particles: 6 },
  paladin:      { kind: 'holy_blade',  primary: '#ffffff', secondary: '#fbbf24', particles: 6 },
  poseidon:     { kind: 'trident',     primary: '#a5f3fc', secondary: '#0284c7', particles: 6 },
  pyromancer:   { kind: 'fireball',    primary: '#fef3c7', secondary: '#f97316', particles: 6 },
  assassin:     { kind: 'twin_blade',  primary: '#e9d5ff', secondary: '#8b5cf6', particles: 5 }
});

const DEFAULT_PROFILE = NORMAL_ATTACK_ANIMATION_PROFILES.norvice;

const centerOf = rect => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2
});

const addEffect = (layer, cssText, keyframes, timing) => {
  const effect = document.createElement('div');
  effect.setAttribute('aria-hidden', 'true');
  effect.className = 'battle-normal-attack-effect';
  effect.style.cssText = `${cssText};pointer-events:none;z-index:9999;opacity:0;`;
  layer.appendChild(effect);
  // `fill: both` makes delayed effects use their first (invisible) keyframe
  // before they begin. This avoids a one-frame flash on WebKit while still
  // letting the animation override the inline fallback opacity.
  const animation = effect.animate(keyframes, { fill: 'both', ...timing });
  animation.onfinish = () => effect.remove();
  animation.oncancel = () => effect.remove();
  return effect;
};

const addParticles = (layer, point, profile, duration, count = profile.particles, delay = 0) => {
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const actualCount = reducedMotion ? Math.min(2, count) : count;
  for (let i = 0; i < actualCount; i += 1) {
    const angle = (Math.PI * 2 * i / actualCount) + (Math.random() - .5) * .55;
    const distance = 20 + Math.random() * 35;
    const size = 2 + Math.random() * 4;
    addEffect(
      layer,
      `position:fixed;left:${point.x - size / 2}px;top:${point.y - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:${profile.primary};box-shadow:0 0 7px ${profile.secondary};mix-blend-mode:screen`,
      [
        { transform: 'translate(0,0) scale(.2)', opacity: 0 },
        { transform: 'translate(0,0) scale(1.25)', opacity: 1, offset: .12 },
        { transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px) scale(.1)`, opacity: 0 }
      ],
      { duration, delay, easing: 'ease-out' }
    );
  }
};

const addImpactRing = (layer, point, profile, duration, shape = '50%', delay = 0) => {
  const size = 64;
  addEffect(
    layer,
    `position:fixed;left:${point.x - size / 2}px;top:${point.y - size / 2}px;width:${size}px;height:${size}px;border:3px solid ${profile.primary};border-radius:${shape};box-shadow:0 0 12px ${profile.secondary},inset 0 0 8px ${profile.secondary};mix-blend-mode:screen`,
    [
      { transform: 'scale(.08) rotate(-18deg)', opacity: 0 },
      { transform: 'scale(.22) rotate(-12deg)', opacity: 1, offset: .12 },
      { transform: 'scale(1.35) rotate(20deg)', opacity: 0 }
    ],
    { duration, delay, easing: 'cubic-bezier(.12,.72,.2,1)' }
  );
};

const addSlash = (layer, point, profile, duration, angle = -35, delay = 0, width = 92) => {
  addEffect(
    layer,
    `position:fixed;left:${point.x - width / 2}px;top:${point.y - 4}px;width:${width}px;height:8px;border-radius:999px;background:linear-gradient(90deg,transparent,${profile.secondary},${profile.primary},white,transparent);box-shadow:0 0 9px ${profile.secondary};mix-blend-mode:screen;transform:rotate(${angle}deg) scaleX(.05)`,
    [
      { transform: `rotate(${angle}deg) scaleX(.05)`, opacity: 0 },
      { transform: `rotate(${angle}deg) scaleX(1.2)`, opacity: 1, offset: .38 },
      { transform: `rotate(${angle}deg) scaleX(1.5)`, opacity: 0 }
    ],
    { duration, delay, easing: 'cubic-bezier(.12,.72,.2,1)' }
  );
};

const addProjectile = (layer, origin, target, profile, duration, variant) => {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const angle = Math.atan2(dy, dx);
  const distance = Math.hypot(dx, dy);
  let css;

  if (variant === 'arrow') {
    css = `width:88px;height:14px;background:linear-gradient(90deg,${profile.secondary},#fff 58%,${profile.primary});clip-path:polygon(0 38%,68% 38%,68% 8%,100% 50%,68% 92%,68% 62%,0 62%);filter:drop-shadow(0 0 4px #fff) drop-shadow(0 0 9px ${profile.secondary})`;
  } else if (variant === 'trident') {
    css = `width:84px;height:18px;background:linear-gradient(90deg,${profile.secondary},#fff 64%,${profile.primary});clip-path:polygon(0 42%,66% 42%,80% 0,84% 34%,100% 12%,91% 50%,100% 88%,84% 66%,80% 100%,66% 58%,0 58%);filter:drop-shadow(0 0 5px #fff) drop-shadow(0 0 10px ${profile.secondary})`;
  } else if (variant === 'shield') {
    css = `width:40px;height:48px;background:radial-gradient(circle at 45% 35%,#fff,${profile.primary} 28%,${profile.secondary} 68%,#1e3a8a);clip-path:polygon(50% 0,94% 18%,84% 72%,50% 100%,16% 72%,6% 18%);filter:drop-shadow(0 0 10px ${profile.secondary})`;
  } else if (variant === 'slime') {
    css = `width:38px;height:34px;border-radius:55% 55% 48% 48%;background:radial-gradient(circle at 35% 25%,white,${profile.primary} 18%,${profile.secondary} 70%);box-shadow:0 0 12px ${profile.secondary}`;
  } else if (variant === 'fireball') {
    css = `width:38px;height:38px;border-radius:50%;background:radial-gradient(circle at 35% 35%,white,${profile.primary} 20%,${profile.secondary} 58%,#dc2626 78%,transparent 80%);box-shadow:0 0 14px ${profile.secondary},0 0 26px #dc2626`;
  } else {
    css = `width:34px;height:34px;border-radius:50%;background:radial-gradient(circle,white,${profile.primary} 28%,${profile.secondary} 62%,transparent 70%);box-shadow:0 0 14px ${profile.secondary},0 0 24px ${profile.secondary}`;
  }

  // A luminous wake makes fast, mostly vertical shots readable against both
  // bright and dark dungeon backgrounds. It also communicates the launch
  // direction before the projectile reaches the enemy.
  addEffect(
    layer,
    `position:fixed;left:${origin.x}px;top:${origin.y - 2}px;width:${distance}px;height:${variant === 'arrow' || variant === 'trident' ? 4 : 7}px;border-radius:999px;background:linear-gradient(90deg,${profile.secondary},${profile.primary} 42%,transparent 100%);box-shadow:0 0 9px ${profile.secondary};transform-origin:0 50%;mix-blend-mode:screen`,
    [
      { transform: `rotate(${angle}rad) scaleX(0)`, opacity: 0 },
      { transform: `rotate(${angle}rad) scaleX(.7)`, opacity: .85, offset: .46 },
      { transform: `rotate(${angle}rad) scaleX(1)`, opacity: .5, offset: .78 },
      { transform: `rotate(${angle}rad) scaleX(1)`, opacity: 0 }
    ],
    { duration, easing: 'ease-out' }
  );

  addEffect(
    layer,
    `position:fixed;left:${origin.x - 12}px;top:${origin.y - 12}px;${css};transform-origin:12px 50%;mix-blend-mode:screen`,
    [
      { transform: `rotate(${angle}rad) translateX(0) scale(.45)`, opacity: 0 },
      { transform: `rotate(${angle}rad) translateX(${distance * .08}px) scale(1)`, opacity: 1, offset: .12 },
      { transform: `rotate(${angle}rad) translateX(${Math.max(0, distance - 14)}px) scale(1.1)`, opacity: 1, offset: .82 },
      { transform: `rotate(${angle}rad) translateX(${distance}px) scale(.75)`, opacity: 0 }
    ],
    { duration, easing: 'cubic-bezier(.28,.72,.24,1)' }
  );
};

const addGlyph = (layer, point, profile, duration, glyph, delay = 0) => {
  const effect = addEffect(
    layer,
    `position:fixed;left:${point.x - 30}px;top:${point.y - 38}px;width:60px;height:60px;color:${profile.primary};font:900 48px/60px serif;text-align:center;text-shadow:0 0 7px white,0 0 15px ${profile.secondary};mix-blend-mode:screen`,
    [
      { transform: 'translateY(12px) scale(.2) rotate(-18deg)', opacity: 0 },
      { transform: 'translateY(0) scale(1.15) rotate(0)', opacity: 1, offset: .4 },
      { transform: 'translateY(-15px) scale(.75) rotate(12deg)', opacity: 0 }
    ],
    { duration, delay, easing: 'cubic-bezier(.16,.75,.25,1)' }
  );
  effect.textContent = glyph;
};

/**
 * Plays a job-specific normal attack and returns the popup's impact delay.
 * Damage calculation remains synchronous; only its floating number is delayed.
 */
export function playNormalAttackAnimation(attacker, defender) {
  if (shouldSkipBattleAnimations()) return 0;

  const attackerEl = document.getElementById(attacker?.elementId);
  const defenderEl = document.getElementById(defender?.elementId);
  if (!attackerEl || !defenderEl) return 0;

  const layer = document.getElementById('battle-effects-layer') || document.body;
  const origin = centerOf(attackerEl.getBoundingClientRect());
  const target = centerOf(defenderEl.getBoundingClientRect());
  const profile = NORMAL_ATTACK_ANIMATION_PROFILES[attacker.jobId || attacker.job] || DEFAULT_PROFILE;
  const travelDuration = getBattleAnimationDuration(420, 240);
  const impactDuration = getBattleAnimationDuration(340, 190);
  const impactDelay = Math.round(travelDuration * .82);

  attackerEl.animate([
    { transform: 'translateY(0) scale(1)', filter: 'brightness(1)' },
    { transform: 'translateY(-4px) scale(1.02)', filter: `brightness(1.35) drop-shadow(0 0 5px ${profile.secondary})`, offset: .38 },
    { transform: 'translateY(0) scale(1)', filter: 'brightness(1)' }
  ], { duration: travelDuration, easing: 'ease-out' });

  switch (profile.kind) {
    case 'shield':
      addProjectile(layer, origin, target, profile, travelDuration, 'shield');
      addImpactRing(layer, target, profile, impactDuration, '24%', impactDelay);
      break;
    case 'arcane':
      addProjectile(layer, origin, target, profile, travelDuration, 'orb');
      addGlyph(layer, target, profile, impactDuration, '✦', impactDelay * .35);
      break;
    case 'holy':
      addProjectile(layer, origin, target, profile, travelDuration, 'orb');
      addGlyph(layer, target, profile, impactDuration, '✝', impactDelay * .35);
      break;
    case 'arrow':
      addProjectile(layer, origin, target, profile, travelDuration, 'arrow');
      addSlash(layer, target, profile, impactDuration, -8, impactDelay * .7, 65);
      break;
    case 'spellblade':
      addProjectile(layer, origin, target, profile, travelDuration, 'orb');
      addSlash(layer, target, profile, impactDuration, -42, impactDelay * .55, 105);
      addImpactRing(layer, target, profile, impactDuration, '50%', impactDelay);
      break;
    case 'slime':
      addProjectile(layer, origin, target, profile, travelDuration, 'slime');
      addImpactRing(layer, target, profile, impactDuration, '45% 55% 50% 46%', impactDelay);
      break;
    case 'ribbon':
      addSlash(layer, target, profile, impactDuration, -24, impactDelay * .35, 110);
      addSlash(layer, target, profile, impactDuration, 24, impactDelay * .58, 110);
      addGlyph(layer, target, profile, impactDuration, '✶', impactDelay * .25);
      break;
    case 'melody':
      addProjectile(layer, origin, target, profile, travelDuration, 'orb');
      addGlyph(layer, target, profile, impactDuration, '♫');
      break;
    case 'dark_blade':
      addSlash(layer, target, profile, impactDuration * 1.15, -48, impactDelay * .25, 132);
      addSlash(layer, target, { ...profile, primary: '#111827' }, impactDuration, -42, impactDelay * .38, 116);
      addImpactRing(layer, target, profile, impactDuration, '50%', impactDelay);
      break;
    case 'holy_blade':
      addSlash(layer, target, profile, impactDuration, -48, impactDelay * .32, 125);
      addGlyph(layer, target, profile, impactDuration, '✝', impactDelay * .15);
      addImpactRing(layer, target, profile, impactDuration, '50%', impactDelay);
      break;
    case 'trident':
      addProjectile(layer, origin, target, profile, travelDuration, 'trident');
      addImpactRing(layer, target, profile, impactDuration, '50%', impactDelay);
      addGlyph(layer, target, profile, impactDuration, '♆', impactDelay * .25);
      break;
    case 'fireball':
      addProjectile(layer, origin, target, profile, travelDuration, 'fireball');
      addImpactRing(layer, target, profile, impactDuration, '50%', impactDelay);
      break;
    case 'twin_blade':
      addSlash(layer, target, profile, impactDuration, -42, impactDelay * .28, 105);
      addSlash(layer, target, profile, impactDuration, 42, impactDelay * .48, 105);
      break;
    case 'slash':
    default:
      addSlash(layer, target, profile, impactDuration, -38, impactDelay * .35);
      break;
  }

  addParticles(layer, target, profile, impactDuration, profile.particles, impactDelay);
  defenderEl.animate([
    { transform: 'translateX(0)', filter: 'brightness(1)' },
    { transform: 'translateX(0)', filter: 'brightness(1)', offset: .54 },
    { transform: 'translateX(7px)', filter: `brightness(1.8) drop-shadow(0 0 4px ${profile.secondary})`, offset: .6 },
    { transform: 'translateX(-5px)', filter: 'brightness(1.3)', offset: .72 },
    { transform: 'translateX(0)', filter: 'brightness(1)' }
  ], { duration: travelDuration + impactDuration * .45, easing: 'ease-out' });

  return impactDelay;
}
