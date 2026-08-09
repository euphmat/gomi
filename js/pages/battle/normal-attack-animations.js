import {
  getBattleAnimationDuration,
  shouldSkipBattleAnimations
} from '../../utils/battle-animation.js';

/**
 * The normal attack is a short piece of job acting, not a recoloured bullet.
 * Keep this list in sync with js/jobs/index.js so every playable job owns a
 * silhouette, movement and impact language of its own.
 */
export const NORMAL_ATTACK_ANIMATION_PROFILES = Object.freeze({
  norvice:        { kind: 'sword_draw',     primary: '#f8fafc', secondary: '#f59e0b', particles: 3 },
  knight:         { kind: 'shield_bash',    primary: '#e0f2fe', secondary: '#3b82f6', particles: 5 },
  mage:           { kind: 'arcane_cast',    primary: '#f5d0fe', secondary: '#a855f7', particles: 6 },
  priest:         { kind: 'prayer',         primary: '#fff7cc', secondary: '#facc15', particles: 6 },
  ranger:         { kind: 'bow_shot',       primary: '#ecfccb', secondary: '#84cc16', particles: 4 },
  magic_knight:   { kind: 'runic_blade',    primary: '#cffafe', secondary: '#06b6d4', particles: 6 },
  slime_master:   { kind: 'slime_command',  primary: '#d9f99d', secondary: '#22c55e', particles: 7 },
  dancer:         { kind: 'ribbon_dance',   primary: '#fce7f3', secondary: '#ec4899', particles: 7 },
  bird:           { kind: 'harp_strum',     primary: '#e0e7ff', secondary: '#818cf8', particles: 5 },
  black_knight:   { kind: 'abyss_cleave',   primary: '#fda4af', secondary: '#7e22ce', particles: 7 },
  paladin:        { kind: 'sacred_verdict', primary: '#ffffff', secondary: '#fbbf24', particles: 7 },
  poseidon:       { kind: 'tide_thrust',     primary: '#a5f3fc', secondary: '#0284c7', particles: 8 },
  pyromancer:     { kind: 'flame_eruption', primary: '#fef3c7', secondary: '#f97316', particles: 8 },
  assassin:       { kind: 'shadow_step',    primary: '#e9d5ff', secondary: '#8b5cf6', particles: 6 },
  mana_conductor: { kind: 'mana_crescendo', primary: '#cffafe', secondary: '#8b5cf6', particles: 8 },
  entertainer:    { kind: 'stage_spectacle', primary: '#fef3c7', secondary: '#d946ef', particles: 9 },
  guardian:       { kind: 'guardian_rampart', primary: '#ecfeff', secondary: '#0ea5e9', particles: 9 },
  cryomancer:     { kind: 'frost_nova', primary: '#ecfeff', secondary: '#38bdf8', particles: 9 }
});

const DEFAULT_PROFILE = NORMAL_ATTACK_ANIMATION_PROFILES.norvice;

const centerOf = rect => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2
});

const directionBetween = (origin, target) => {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  return { dx, dy, distance, ux: dx / distance, uy: dy / distance, angle: Math.atan2(dy, dx) };
};

const addEffect = (layer, cssText, keyframes, timing) => {
  const effect = document.createElement('div');
  effect.setAttribute('aria-hidden', 'true');
  effect.className = 'battle-normal-attack-effect';
  effect.style.cssText = `${cssText};pointer-events:none;z-index:9999;opacity:0;`;
  layer.appendChild(effect);
  const animation = effect.animate(keyframes, { fill: 'both', ...timing });
  animation.onfinish = () => effect.remove();
  animation.oncancel = () => effect.remove();
  return effect;
};

const animateActor = (element, profile, duration, direction, style = 'cast') => {
  const lungeX = direction.ux * 32;
  const lungeY = direction.uy * 32;
  const recoilX = -direction.ux * 5;
  const recoilY = -direction.uy * 5;
  let keyframes;

  switch (style) {
    case 'melee':
      keyframes = [
        { transform: 'translate(0,0) rotate(0) scale(1)', filter: 'brightness(1)' },
        { transform: `translate(${recoilX}px,${recoilY}px) rotate(-2deg) scale(.98)`, filter: `brightness(1.25) drop-shadow(0 0 5px ${profile.secondary})`, offset: .25 },
        { transform: `translate(${lungeX}px,${lungeY}px) rotate(2deg) scale(1.04)`, filter: `brightness(1.65) drop-shadow(0 0 8px ${profile.secondary})`, offset: .62 },
        { transform: 'translate(0,0) rotate(0) scale(1)', filter: 'brightness(1)' }
      ];
      break;
    case 'heavy':
      keyframes = [
        { transform: 'translate(0,0) rotate(0) scale(1)', filter: 'brightness(1)' },
        { transform: `translate(${recoilX * 1.4}px,${recoilY * 1.4}px) rotate(3deg) scale(1.03)`, filter: `brightness(.8) drop-shadow(0 0 8px ${profile.secondary})`, offset: .38 },
        { transform: `translate(${lungeX * .82}px,${lungeY * .82}px) rotate(-3deg) scale(1.06)`, filter: `brightness(1.55) drop-shadow(0 0 11px ${profile.secondary})`, offset: .7 },
        { transform: 'translate(0,0) rotate(0) scale(1)', filter: 'brightness(1)' }
      ];
      break;
    case 'dance':
      keyframes = [
        { transform: 'translate(0,0) rotate(0) scale(1)', filter: 'brightness(1)' },
        { transform: 'translateY(-3px) rotate(-7deg) scale(.98)', filter: `brightness(1.35) drop-shadow(0 0 6px ${profile.secondary})`, offset: .25 },
        { transform: 'translateY(-7px) rotate(8deg) scale(1.06)', filter: `brightness(1.65) drop-shadow(0 0 10px ${profile.secondary})`, offset: .58 },
        { transform: 'translate(0,0) rotate(0) scale(1)', filter: 'brightness(1)' }
      ];
      break;
    case 'vanish':
      keyframes = [
        { transform: 'translate(0,0) scale(1)', filter: 'brightness(1)', opacity: 1 },
        { transform: `translate(${recoilX}px,${recoilY}px) scale(.94)`, filter: `brightness(.35) drop-shadow(0 0 9px ${profile.secondary})`, opacity: .18, offset: .3 },
        { transform: `translate(${lungeX}px,${lungeY}px) scale(1.04)`, filter: `brightness(1.8) drop-shadow(0 0 8px ${profile.secondary})`, opacity: .7, offset: .68 },
        { transform: 'translate(0,0) scale(1)', filter: 'brightness(1)', opacity: 1 }
      ];
      break;
    case 'cast':
    default:
      keyframes = [
        { transform: 'translateY(0) scale(1)', filter: 'brightness(1)' },
        { transform: 'translateY(3px) scale(.98)', filter: `brightness(1.2) drop-shadow(0 0 5px ${profile.secondary})`, offset: .24 },
        { transform: 'translateY(-6px) scale(1.035)', filter: `brightness(1.65) drop-shadow(0 0 10px ${profile.secondary})`, offset: .58 },
        { transform: 'translateY(0) scale(1)', filter: 'brightness(1)' }
      ];
  }

  element.animate(keyframes, { duration, easing: 'cubic-bezier(.2,.68,.25,1)' });
};

const addParticles = (layer, point, profile, duration, count = profile.particles, delay = 0, spread = 48) => {
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const actualCount = reducedMotion ? Math.min(3, count) : count;
  for (let i = 0; i < actualCount; i += 1) {
    const angle = (Math.PI * 2 * i / actualCount) + (Math.random() - .5) * .5;
    const distance = spread * (.55 + Math.random() * .55);
    const size = 2 + Math.random() * 4;
    addEffect(
      layer,
      `position:fixed;left:${point.x - size / 2}px;top:${point.y - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:${i % 3 === 0 ? '#fff' : profile.primary};box-shadow:0 0 8px ${profile.secondary};mix-blend-mode:screen`,
      [
        { transform: 'translate(0,0) scale(.2)', opacity: 0 },
        { transform: 'translate(0,0) scale(1.3)', opacity: 1, offset: .12 },
        { transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px) scale(.1)`, opacity: 0 }
      ],
      { duration, delay, easing: 'ease-out' }
    );
  }
};

const addRing = (layer, point, profile, duration, delay = 0, options = {}) => {
  const size = options.size || 72;
  addEffect(
    layer,
    `position:fixed;left:${point.x - size / 2}px;top:${point.y - size / 2}px;width:${size}px;height:${size}px;border:${options.width || 3}px solid ${options.color || profile.primary};border-radius:${options.radius || '50%'};box-shadow:0 0 13px ${profile.secondary},inset 0 0 9px ${profile.secondary};mix-blend-mode:screen`,
    [
      { transform: `scale(.08) rotate(${options.startAngle || -18}deg)`, opacity: 0 },
      { transform: 'scale(.28) rotate(-8deg)', opacity: 1, offset: .14 },
      { transform: `scale(${options.scale || 1.35}) rotate(${options.endAngle || 26}deg)`, opacity: 0 }
    ],
    { duration, delay, easing: 'cubic-bezier(.12,.72,.2,1)' }
  );
};

const addSlash = (layer, point, profile, duration, angle = -38, delay = 0, width = 110, thickness = 9) => {
  addEffect(
    layer,
    `position:fixed;left:${point.x - width / 2}px;top:${point.y - thickness / 2}px;width:${width}px;height:${thickness}px;border-radius:100% 0 100% 0;background:linear-gradient(90deg,transparent,${profile.secondary},${profile.primary},#fff,transparent);box-shadow:0 0 10px ${profile.secondary};mix-blend-mode:screen;transform:rotate(${angle}deg) scaleX(.05)`,
    [
      { transform: `rotate(${angle}deg) scaleX(.04) translateX(-12px)`, opacity: 0 },
      { transform: `rotate(${angle}deg) scaleX(1.15) translateX(0)`, opacity: 1, offset: .34 },
      { transform: `rotate(${angle}deg) scaleX(1.5) translateX(8px)`, opacity: 0 }
    ],
    { duration, delay, easing: 'cubic-bezier(.12,.72,.2,1)' }
  );
};

const addGlyph = (layer, point, profile, duration, glyph, delay = 0, options = {}) => {
  const size = options.size || 48;
  const effect = addEffect(
    layer,
    `position:fixed;left:${point.x - size / 2}px;top:${point.y - size / 2}px;width:${size}px;height:${size}px;color:${options.color || profile.primary};font:${options.weight || 900} ${size * .78}px/${size}px ${options.font || 'serif'};text-align:center;text-shadow:0 0 7px #fff,0 0 16px ${profile.secondary};mix-blend-mode:screen`,
    options.keyframes || [
      { transform: 'translateY(10px) scale(.2) rotate(-18deg)', opacity: 0 },
      { transform: 'translateY(0) scale(1.12) rotate(0)', opacity: 1, offset: .38 },
      { transform: 'translateY(-14px) scale(.78) rotate(12deg)', opacity: 0 }
    ],
    { duration, delay, easing: 'cubic-bezier(.16,.75,.25,1)' }
  );
  effect.textContent = glyph;
};

const addMagicCircle = (layer, point, profile, duration, delay = 0, glyph = '✦') => {
  addRing(layer, point, profile, duration, delay, { size: 68, width: 2, scale: 1.08, endAngle: 145 });
  addRing(layer, point, profile, duration, delay + duration * .05, { size: 46, width: 1, scale: 1.1, startAngle: 40, endAngle: -130 });
  addGlyph(layer, point, profile, duration * .92, glyph, delay, { size: 34 });
};

const addWeapon = (layer, point, direction, profile, duration, delay = 0, type = 'sword') => {
  const angle = direction.angle * 180 / Math.PI;
  let css;
  if (type === 'shield') {
    css = `width:42px;height:50px;background:radial-gradient(circle at 42% 32%,#fff,${profile.primary} 30%,${profile.secondary} 72%,#172554);clip-path:polygon(50% 0,94% 18%,84% 72%,50% 100%,16% 72%,6% 18%);filter:drop-shadow(0 0 9px ${profile.secondary})`;
  } else if (type === 'trident') {
    css = `width:94px;height:20px;background:linear-gradient(90deg,${profile.secondary},#fff 68%,${profile.primary});clip-path:polygon(0 43%,68% 43%,81% 0,85% 34%,100% 12%,92% 50%,100% 88%,85% 66%,81% 100%,68% 57%,0 57%);filter:drop-shadow(0 0 8px ${profile.secondary})`;
  } else if (type === 'dagger') {
    css = `width:72px;height:14px;background:linear-gradient(90deg,#312e81 0 18%,${profile.secondary} 19% 32%,#fff 62%,${profile.primary});clip-path:polygon(0 30%,25% 30%,31% 0,38% 28%,100% 50%,38% 72%,31% 100%,25% 70%,0 70%);filter:drop-shadow(0 0 7px ${profile.secondary})`;
  } else if (type === 'baton') {
    css = `width:86px;height:10px;background:linear-gradient(90deg,${profile.secondary},#fff 20% 76%,${profile.primary});clip-path:polygon(0 25%,9% 25%,13% 0,18% 25%,84% 25%,90% 0,95% 25%,100% 50%,95% 75%,90% 100%,84% 75%,18% 75%,13% 100%,9% 75%,0 75%);filter:drop-shadow(0 0 8px ${profile.secondary})`;
  } else {
    css = `width:90px;height:16px;background:linear-gradient(90deg,#78350f 0 18%,${profile.secondary} 19% 31%,#fff 62%,${profile.primary});clip-path:polygon(0 35%,23% 35%,28% 8%,34% 36%,90% 36%,100% 50%,90% 64%,34% 64%,28% 92%,23% 65%,0 65%);filter:drop-shadow(0 0 8px ${profile.secondary})`;
  }

  const xOffset = type === 'shield' ? 21 : 16;
  const yOffset = type === 'shield' ? 25 : 8;
  addEffect(
    layer,
    `position:fixed;left:${point.x - xOffset}px;top:${point.y - yOffset}px;${css};transform-origin:${xOffset}px ${yOffset}px;mix-blend-mode:screen`,
    type === 'shield' ? [
      { transform: `rotate(${angle}deg) translateX(-8px) scale(.55)`, opacity: 0 },
      { transform: `rotate(${angle}deg) translateX(0) scale(1.05)`, opacity: 1, offset: .32 },
      { transform: `rotate(${angle}deg) translateX(36px) scale(1.22)`, opacity: 1, offset: .68 },
      { transform: `rotate(${angle}deg) translateX(45px) scale(.8)`, opacity: 0 }
    ] : [
      { transform: `rotate(${angle - 72}deg) translateX(-5px) scale(.45)`, opacity: 0 },
      { transform: `rotate(${angle - 48}deg) translateX(0) scale(1)`, opacity: 1, offset: .3 },
      { transform: `rotate(${angle + 34}deg) translateX(26px) scale(1.08)`, opacity: 1, offset: .7 },
      { transform: `rotate(${angle + 48}deg) translateX(32px) scale(.8)`, opacity: 0 }
    ],
    { duration, delay, easing: 'cubic-bezier(.2,.72,.24,1)' }
  );
};

const addArrowShot = (layer, origin, target, profile, duration, delay = 0) => {
  const direction = directionBetween(origin, target);
  const angle = direction.angle;

  // Bow and string visibly draw at the ranger before the arrow is released.
  addEffect(
    layer,
    `position:fixed;left:${origin.x - 29}px;top:${origin.y - 34}px;width:58px;height:68px;border:5px solid ${profile.secondary};border-left-color:transparent;border-radius:50%;filter:drop-shadow(0 0 7px ${profile.secondary});transform-origin:50% 50%`,
    [
      { transform: `rotate(${angle}rad) scale(.45)`, opacity: 0 },
      { transform: `rotate(${angle}rad) scaleX(.78) scaleY(1.05)`, opacity: 1, offset: .34 },
      { transform: `rotate(${angle}rad) scaleX(1.08) scaleY(.94)`, opacity: 1, offset: .52 },
      { transform: `rotate(${angle}rad) scale(.8)`, opacity: 0 }
    ],
    { duration: duration * .68, delay, easing: 'ease-out' }
  );
  addEffect(
    layer,
    `position:fixed;left:${origin.x - 1}px;top:${origin.y - 34}px;width:2px;height:68px;background:${profile.primary};box-shadow:0 0 5px #fff;transform-origin:50% 50%`,
    [
      { transform: `rotate(${angle}rad) scaleY(.3)`, opacity: 0 },
      { transform: `rotate(${angle}rad) scaleY(1) translateX(-9px)`, opacity: 1, offset: .4 },
      { transform: `rotate(${angle}rad) scaleY(.95) translateX(2px)`, opacity: .7, offset: .58 },
      { transform: `rotate(${angle}rad) scaleY(.6)`, opacity: 0 }
    ],
    { duration: duration * .68, delay, easing: 'ease-out' }
  );

  const flightDelay = delay + duration * .28;
  addEffect(
    layer,
    `position:fixed;left:${origin.x - 8}px;top:${origin.y - 5}px;width:76px;height:10px;background:linear-gradient(90deg,${profile.secondary},#fff 55%,${profile.primary});clip-path:polygon(0 38%,66% 38%,66% 0,100% 50%,66% 100%,66% 62%,0 62%);filter:drop-shadow(0 0 5px ${profile.secondary});transform-origin:8px 50%`,
    [
      { transform: `rotate(${angle}rad) translateX(0) scale(.75)`, opacity: 0 },
      { transform: `rotate(${angle}rad) translateX(${direction.distance * .06}px) scale(1)`, opacity: 1, offset: .08 },
      { transform: `rotate(${angle}rad) translateX(${direction.distance - 15}px) scale(1)`, opacity: 1, offset: .88 },
      { transform: `rotate(${angle}rad) translateX(${direction.distance}px) scale(.8)`, opacity: 0 }
    ],
    { duration: duration * .45, delay: flightDelay, easing: 'cubic-bezier(.3,.7,.22,1)' }
  );
};

const addVerticalStrike = (layer, point, profile, duration, delay, type = 'light') => {
  if (type === 'lightning') {
    addEffect(
      layer,
      `position:fixed;left:${point.x - 24}px;top:${point.y - 105}px;width:48px;height:125px;background:linear-gradient(#fff,${profile.primary},${profile.secondary});clip-path:polygon(58% 0,35% 38%,55% 38%,28% 68%,48% 68%,35% 100%,78% 55%,57% 55%,82% 25%,60% 25%);filter:drop-shadow(0 0 7px ${profile.secondary});mix-blend-mode:screen`,
      [
        { transform: 'scaleY(.08)', transformOrigin: '50% 0', opacity: 0 },
        { transform: 'scaleY(1.05)', transformOrigin: '50% 0', opacity: 1, offset: .28 },
        { transform: 'scaleY(.88)', transformOrigin: '50% 100%', opacity: .85, offset: .62 },
        { transform: 'scaleY(.2)', transformOrigin: '50% 100%', opacity: 0 }
      ],
      { duration, delay, easing: 'steps(4,end)' }
    );
  } else {
    addEffect(
      layer,
      `position:fixed;left:${point.x - 28}px;top:${point.y - 110}px;width:56px;height:135px;background:linear-gradient(180deg,transparent,${profile.primary} 25%,#fff 62%,${profile.secondary} 88%,transparent);filter:blur(1px) drop-shadow(0 0 12px ${profile.secondary});mix-blend-mode:screen`,
      [
        { transform: 'scaleX(.08) scaleY(.2)', transformOrigin: '50% 100%', opacity: 0 },
        { transform: 'scaleX(.7) scaleY(1)', transformOrigin: '50% 100%', opacity: .95, offset: .28 },
        { transform: 'scaleX(1.35) scaleY(1.05)', transformOrigin: '50% 100%', opacity: 0 }
      ],
      { duration, delay, easing: 'ease-out' }
    );
  }
};

const addSlimeBounce = (layer, origin, target, profile, duration, delay = 0) => {
  const direction = directionBetween(origin, target);
  const size = 42;
  addEffect(
    layer,
    `position:fixed;left:${origin.x - size / 2}px;top:${origin.y - size / 2}px;width:${size}px;height:${size * .86}px;border-radius:55% 55% 46% 46%;background:radial-gradient(circle at 34% 39%,#172554 0 2px,transparent 3px),radial-gradient(circle at 66% 39%,#172554 0 2px,transparent 3px),radial-gradient(circle at 36% 22%,#fff,${profile.primary} 16%,${profile.secondary} 70%);box-shadow:0 0 13px ${profile.secondary};mix-blend-mode:screen`,
    [
      { transform: 'translate(0,8px) scaleX(1.25) scaleY(.55)', opacity: 0 },
      { transform: 'translate(0,0) scale(1)', opacity: 1, offset: .12 },
      { transform: `translate(${direction.dx * .5}px,${direction.dy * .5 - 68}px) rotate(180deg) scale(.92)`, opacity: 1, offset: .38 },
      { transform: `translate(${direction.dx}px,${direction.dy + 5}px) rotate(360deg) scaleX(1.45) scaleY(.55)`, opacity: 1, offset: .67 },
      { transform: `translate(${direction.dx}px,${direction.dy}px) rotate(360deg) scale(.2)`, opacity: 0, offset: .8 },
      { transform: `translate(${direction.dx}px,${direction.dy}px) rotate(360deg) scale(.2)`, opacity: 0 }
    ],
    { duration, delay, easing: 'cubic-bezier(.28,.7,.24,1)' }
  );
};

const addRibbonOrbit = (layer, point, profile, duration, delay = 0, clockwise = true) => {
  const size = 82;
  addEffect(
    layer,
    `position:fixed;left:${point.x - size / 2}px;top:${point.y - size / 2}px;width:${size}px;height:${size}px;border:${clockwise ? 4 : 3}px solid ${clockwise ? profile.secondary : profile.primary};border-left-color:transparent;border-bottom-color:transparent;border-radius:50%;filter:drop-shadow(0 0 7px ${profile.secondary});mix-blend-mode:screen`,
    [
      { transform: `rotate(${clockwise ? -100 : 100}deg) scale(.25)`, opacity: 0 },
      { transform: `rotate(${clockwise ? 85 : -85}deg) scale(1)`, opacity: 1, offset: .45 },
      { transform: `rotate(${clockwise ? 300 : -300}deg) scale(1.2)`, opacity: 0 }
    ],
    { duration, delay, easing: 'cubic-bezier(.22,.68,.22,1)' }
  );
};

const addWave = (layer, point, profile, duration, delay = 0, type = 'sound') => {
  if (type === 'water') {
    addEffect(
      layer,
      `position:fixed;left:${point.x - 74}px;top:${point.y - 22}px;width:148px;height:74px;border-radius:50% 50% 18% 18%;background:radial-gradient(ellipse at 50% 100%,#fff 0 5%,${profile.primary} 20%,${profile.secondary} 48%,rgba(2,132,199,.28) 66%,transparent 69%);filter:drop-shadow(0 0 12px ${profile.secondary});mix-blend-mode:screen`,
      [
        { transform: 'translateY(38px) scaleX(.2) scaleY(.2)', opacity: 0 },
        { transform: 'translateY(2px) scaleX(.95) scaleY(1.2)', opacity: .95, offset: .42 },
        { transform: 'translateY(-20px) scaleX(1.35) scaleY(.6)', opacity: 0 }
      ],
      { duration, delay, easing: 'cubic-bezier(.12,.72,.25,1)' }
    );
    return;
  }

  [0, 1, 2].forEach(index => {
    const size = 42 + index * 24;
    addEffect(
      layer,
      `position:fixed;left:${point.x - size / 2}px;top:${point.y - size / 2}px;width:${size}px;height:${size}px;border:${3 - index * .5}px solid ${profile.primary};border-left-color:transparent;border-bottom-color:transparent;border-radius:50%;filter:drop-shadow(0 0 6px ${profile.secondary});mix-blend-mode:screen`,
      [
        { transform: 'rotate(-45deg) scale(.2)', opacity: 0 },
        { transform: 'rotate(-45deg) scale(.75)', opacity: .85, offset: .35 },
        { transform: 'rotate(-45deg) scale(1.4)', opacity: 0 }
      ],
      { duration, delay: delay + index * duration * .09, easing: 'ease-out' }
    );
  });
};

const addFlameEruption = (layer, point, profile, duration, delay = 0) => {
  [0, 1, 2].forEach(index => {
    const width = 44 - index * 9;
    const height = 94 - index * 13;
    addEffect(
      layer,
      `position:fixed;left:${point.x - width / 2 + (index - 1) * 15}px;top:${point.y - height * .76}px;width:${width}px;height:${height}px;border-radius:55% 45% 60% 40%;background:radial-gradient(ellipse at 50% 82%,#fff,${profile.primary} 18%,${profile.secondary} 52%,#dc2626 72%,transparent 75%);filter:drop-shadow(0 0 11px #f97316);mix-blend-mode:screen;transform-origin:50% 100%`,
      [
        { transform: 'translateY(34px) scaleX(1.25) scaleY(.08) rotate(-5deg)', opacity: 0 },
        { transform: `translateY(0) scaleX(.85) scaleY(1.1) rotate(${index % 2 ? 8 : -8}deg)`, opacity: 1, offset: .35 },
        { transform: `translateY(-28px) scaleX(.25) scaleY(1.25) rotate(${index % 2 ? -12 : 12}deg)`, opacity: 0 }
      ],
      { duration, delay: delay + index * duration * .05, easing: 'cubic-bezier(.18,.7,.2,1)' }
    );
  });
};

const addShadowAfterimages = (layer, origin, target, profile, duration, delay = 0) => {
  const direction = directionBetween(origin, target);
  [0, 1, 2].forEach(index => {
    const progress = .2 + index * .23;
    const point = { x: origin.x + direction.dx * progress, y: origin.y + direction.dy * progress };
    addEffect(
      layer,
      `position:fixed;left:${point.x - 13}px;top:${point.y - 22}px;width:26px;height:44px;border-radius:50% 50% 42% 42%;background:linear-gradient(135deg,transparent,${profile.secondary} 55%,#111827);filter:blur(${index + 1}px) drop-shadow(0 0 7px ${profile.secondary});mix-blend-mode:screen`,
      [
        { transform: `translate(${-direction.ux * 12}px,${-direction.uy * 12}px) skewX(-12deg) scale(.7)`, opacity: 0 },
        { transform: 'translate(0,0) skewX(-12deg) scale(1)', opacity: .62, offset: .25 },
        { transform: `translate(${direction.ux * 18}px,${direction.uy * 18}px) skewX(12deg) scale(.8)`, opacity: 0 }
      ],
      { duration: duration * .58, delay: delay + index * duration * .08, easing: 'ease-out' }
    );
  });
};

const addGroundCracks = (layer, point, profile, duration, delay = 0) => {
  [-62, -20, 18, 56].forEach((angle, index) => {
    const length = 30 + index * 5;
    addEffect(
      layer,
      `position:fixed;left:${point.x}px;top:${point.y}px;width:${length}px;height:3px;background:linear-gradient(90deg,#fff,${profile.secondary},transparent);box-shadow:0 0 8px ${profile.secondary};transform-origin:0 50%;mix-blend-mode:screen`,
      [
        { transform: `rotate(${angle}deg) scaleX(0)`, opacity: 0 },
        { transform: `rotate(${angle}deg) scaleX(1)`, opacity: 1, offset: .28 },
        { transform: `rotate(${angle}deg) scaleX(1.15)`, opacity: 0 }
      ],
      { duration, delay: delay + index * 12, easing: 'ease-out' }
    );
  });
};

const addMusicStaff = (layer, origin, target, profile, duration, delay = 0) => {
  const midpoint = { x: origin.x + (target.x - origin.x) * .52, y: origin.y + (target.y - origin.y) * .52 };
  const width = Math.min(170, Math.max(105, Math.hypot(target.x - origin.x, target.y - origin.y) * .58));
  const direction = directionBetween(origin, target);
  [-12, -6, 0, 6, 12].forEach((offset, index) => {
    addEffect(
      layer,
      `position:fixed;left:${midpoint.x - width / 2}px;top:${midpoint.y + offset}px;width:${width}px;height:1.5px;background:linear-gradient(90deg,transparent,${index % 2 ? profile.secondary : profile.primary},transparent);box-shadow:0 0 5px ${profile.secondary};transform-origin:50% 50%;mix-blend-mode:screen`,
      [
        { transform: `rotate(${direction.angle}rad) scaleX(0)`, opacity: 0 },
        { transform: `rotate(${direction.angle}rad) scaleX(1)`, opacity: .82, offset: .35 },
        { transform: `rotate(${direction.angle}rad) scaleX(1.08)`, opacity: 0 }
      ],
      { duration, delay: delay + index * 10, easing: 'ease-out' }
    );
  });
  ['♪', '♩', '✦'].forEach((glyph, index) => {
    const progress = .32 + index * .2;
    addGlyph(
      layer,
      { x: origin.x + (target.x - origin.x) * progress, y: origin.y + (target.y - origin.y) * progress - 12 },
      profile,
      duration * .68,
      glyph,
      delay + duration * (.12 + index * .1),
      { size: 27 + index * 3 }
    );
  });
};

const addHarp = (layer, point, profile, duration, delay = 0) => {
  addEffect(
    layer,
    `position:fixed;left:${point.x - 25}px;top:${point.y - 30}px;width:50px;height:58px;border:5px solid ${profile.secondary};border-top:0;border-radius:8% 8% 48% 48%;background:repeating-linear-gradient(90deg,transparent 0 7px,${profile.primary} 8px 10px,transparent 11px 15px);clip-path:polygon(8% 0,92% 0,100% 88%,50% 100%,0 88%);filter:drop-shadow(0 0 8px ${profile.secondary});mix-blend-mode:screen;transform-origin:50% 70%`,
    [
      { transform: 'translateY(8px) rotate(-10deg) scale(.35)', opacity: 0 },
      { transform: 'translateY(0) rotate(-5deg) scale(1)', opacity: 1, offset: .3 },
      { transform: 'translateY(-2px) rotate(5deg) scaleX(.94)', opacity: 1, offset: .5 },
      { transform: 'translateY(-5px) rotate(8deg) scale(.82)', opacity: 0 }
    ],
    { duration, delay, easing: 'cubic-bezier(.2,.7,.22,1)' }
  );
};

const animateDefenderImpact = (element, profile, totalDuration, impactDelay, style = 'hit') => {
  const impactOffset = Math.min(.82, impactDelay / totalDuration);
  if (style === 'burn') {
    element.animate([
      { transform: 'translateY(0) scale(1)', filter: 'brightness(1)' },
      { transform: 'translateY(0) scale(1)', filter: 'brightness(1)', offset: impactOffset },
      { transform: 'translateY(-5px) scale(.96)', filter: `brightness(2.1) sepia(1) drop-shadow(0 0 7px ${profile.secondary})`, offset: Math.min(.92, impactOffset + .08) },
      { transform: 'translateY(0) scale(1)', filter: 'brightness(1)' }
    ], { duration: totalDuration, easing: 'ease-out' });
    return;
  }
  element.animate([
    { transform: 'translateX(0) scale(1)', filter: 'brightness(1)' },
    { transform: 'translateX(0) scale(1)', filter: 'brightness(1)', offset: impactOffset },
    { transform: 'translateX(7px) scale(.97)', filter: `brightness(1.9) drop-shadow(0 0 5px ${profile.secondary})`, offset: Math.min(.9, impactOffset + .06) },
    { transform: 'translateX(-5px) scale(1.01)', filter: 'brightness(1.3)', offset: Math.min(.96, impactOffset + .14) },
    { transform: 'translateX(0) scale(1)', filter: 'brightness(1)' }
  ], { duration: totalDuration, easing: 'ease-out' });
};

/**
 * Plays a complete job-specific normal attack and returns its impact and
 * completion timings. Damage itself remains synchronous in the simulation.
 */
export function playNormalAttackAnimation(attacker, defender) {
  if (shouldSkipBattleAnimations()) return { impactDelay: 0, cadenceDelay: 0, completionDelay: 0 };

  const attackerEl = document.getElementById(attacker?.elementId);
  const defenderEl = document.getElementById(defender?.elementId);
  if (!attackerEl || !defenderEl) return { impactDelay: 0, cadenceDelay: 0, completionDelay: 0 };

  const layer = document.getElementById('battle-effects-layer') || document.body;
  const origin = centerOf(attackerEl.getBoundingClientRect());
  const target = centerOf(defenderEl.getBoundingClientRect());
  const direction = directionBetween(origin, target);
  const profile = NORMAL_ATTACK_ANIMATION_PROFILES[attacker.jobId || attacker.job] || DEFAULT_PROFILE;
  const actionDuration = getBattleAnimationDuration(560, 300);
  const impactDuration = getBattleAnimationDuration(360, 190);
  const impactDelay = Math.round(actionDuration * .68);
  const totalDuration = impactDelay + impactDuration;
  let defenderStyle = 'hit';

  switch (profile.kind) {
    case 'shield_bash':
      animateActor(attackerEl, profile, actionDuration, direction, 'heavy');
      addWeapon(layer, origin, direction, profile, actionDuration * .82, actionDuration * .08, 'shield');
      addRing(layer, target, profile, impactDuration, impactDelay, { radius: '24%', size: 82, width: 5, scale: 1.25 });
      addGroundCracks(layer, target, profile, impactDuration * .8, impactDelay);
      break;

    case 'arcane_cast':
      animateActor(attackerEl, profile, actionDuration, direction, 'cast');
      addMagicCircle(layer, origin, profile, actionDuration * .72, 0, '✧');
      addVerticalStrike(layer, target, profile, impactDuration * 1.15, impactDelay * .82, 'lightning');
      addMagicCircle(layer, target, profile, impactDuration, impactDelay * .72, '✦');
      break;

    case 'prayer':
      animateActor(attackerEl, profile, actionDuration, direction, 'cast');
      addGlyph(layer, { x: origin.x, y: origin.y - 26 }, profile, actionDuration * .7, '♱', 0, { size: 42 });
      addRing(layer, { x: origin.x, y: origin.y - 24 }, profile, actionDuration * .72, 0, { size: 54, width: 2, scale: 1.1 });
      addVerticalStrike(layer, target, profile, impactDuration * 1.25, impactDelay * .74, 'light');
      addGlyph(layer, target, profile, impactDuration, '✝', impactDelay * .78, { size: 58 });
      break;

    case 'bow_shot':
      animateActor(attackerEl, profile, actionDuration, direction, 'cast');
      addArrowShot(layer, origin, target, profile, actionDuration, 0);
      addSlash(layer, target, profile, impactDuration * .72, direction.angle * 180 / Math.PI, impactDelay, 62, 5);
      break;

    case 'runic_blade':
      animateActor(attackerEl, profile, actionDuration, direction, 'melee');
      addMagicCircle(layer, origin, profile, actionDuration * .62, 0, '◇');
      addWeapon(layer, origin, direction, profile, actionDuration * .85, actionDuration * .05, 'sword');
      addSlash(layer, target, profile, impactDuration, -46, impactDelay * .9, 128, 10);
      addMagicCircle(layer, target, profile, impactDuration * .9, impactDelay * .82, '◇');
      break;

    case 'slime_command':
      animateActor(attackerEl, profile, actionDuration, direction, 'dance');
      addGlyph(layer, { x: origin.x + 16, y: origin.y - 22 }, profile, actionDuration * .55, '!', 0, { size: 27, font: 'sans-serif' });
      addSlimeBounce(layer, origin, target, profile, actionDuration, actionDuration * .04);
      addRing(layer, target, profile, impactDuration, impactDelay, { radius: '48% 52% 45% 55%', size: 78, scale: 1.25 });
      addParticles(layer, target, profile, impactDuration, profile.particles, impactDelay, 38);
      break;

    case 'ribbon_dance':
      animateActor(attackerEl, profile, actionDuration, direction, 'dance');
      addRibbonOrbit(layer, origin, profile, actionDuration * .82, 0, true);
      addRibbonOrbit(layer, origin, profile, actionDuration * .76, actionDuration * .06, false);
      addSlash(layer, target, profile, impactDuration, -24, impactDelay * .82, 128, 7);
      addSlash(layer, target, { ...profile, primary: '#fff' }, impactDuration, 28, impactDelay, 118, 6);
      addGlyph(layer, target, profile, impactDuration, '✶', impactDelay * .76, { size: 42 });
      break;

    case 'harp_strum':
      animateActor(attackerEl, profile, actionDuration, direction, 'dance');
      addHarp(layer, { x: origin.x, y: origin.y - 9 }, profile, actionDuration * .72, 0);
      addWave(layer, origin, profile, actionDuration * .78, actionDuration * .08, 'sound');
      ['♪', '♫', '♩'].forEach((glyph, index) => {
        const progress = .38 + index * .2;
        addGlyph(layer, {
          x: origin.x + direction.dx * progress + (index - 1) * 12,
          y: origin.y + direction.dy * progress - 18 - index * 6
        }, profile, actionDuration * .58, glyph, actionDuration * (.18 + index * .1), { size: 28 + index * 2 });
      });
      addWave(layer, target, profile, impactDuration, impactDelay * .78, 'sound');
      break;

    case 'abyss_cleave':
      animateActor(attackerEl, profile, actionDuration, direction, 'heavy');
      addWeapon(layer, { x: origin.x, y: origin.y - 8 }, direction, profile, actionDuration * .94, 0, 'sword');
      addSlash(layer, target, profile, impactDuration * 1.2, -58, impactDelay * .78, 154, 16);
      addSlash(layer, target, { ...profile, primary: '#111827', secondary: '#dc2626' }, impactDuration, -52, impactDelay * .9, 138, 10);
      addGroundCracks(layer, target, profile, impactDuration, impactDelay * .9);
      addRing(layer, target, profile, impactDuration, impactDelay, { size: 88, width: 4, scale: 1.4 });
      break;

    case 'sacred_verdict':
      animateActor(attackerEl, profile, actionDuration, direction, 'heavy');
      addWeapon(layer, origin, direction, profile, actionDuration * .72, 0, 'shield');
      addGlyph(layer, { x: origin.x, y: origin.y - 28 }, profile, actionDuration * .64, '✝', 0, { size: 42 });
      addVerticalStrike(layer, target, profile, impactDuration * 1.25, impactDelay * .7, 'light');
      addSlash(layer, target, profile, impactDuration, -45, impactDelay * .86, 126, 9);
      addSlash(layer, target, profile, impactDuration, 45, impactDelay * .94, 126, 9);
      addRing(layer, target, profile, impactDuration, impactDelay, { size: 94, width: 3, scale: 1.45 });
      break;

    case 'guardian_rampart':
      animateActor(attackerEl, profile, actionDuration, direction, 'heavy');
      addWeapon(layer, origin, direction, profile, actionDuration * .86, actionDuration * .02, 'shield');
      addRing(layer, origin, profile, actionDuration * .72, 0, { radius: '24%', size: 72, width: 5, scale: 1.12, color: '#fde68a' });
      addRing(layer, target, profile, impactDuration * 1.08, impactDelay * .82, { radius: '24%', size: 102, width: 6, scale: 1.5 });
      addGroundCracks(layer, target, profile, impactDuration, impactDelay * .88);
      break;

    case 'tide_thrust':
      animateActor(attackerEl, profile, actionDuration, direction, 'melee');
      addWeapon(layer, origin, direction, profile, actionDuration * .9, actionDuration * .03, 'trident');
      addWave(layer, target, profile, impactDuration * 1.2, impactDelay * .75, 'water');
      addGlyph(layer, target, profile, impactDuration, '♆', impactDelay * .72, { size: 54 });
      addRing(layer, target, profile, impactDuration, impactDelay, { size: 92, width: 2, scale: 1.45 });
      break;

    case 'flame_eruption':
      animateActor(attackerEl, profile, actionDuration, direction, 'cast');
      addMagicCircle(layer, origin, profile, actionDuration * .76, 0, '△');
      addRibbonOrbit(layer, origin, profile, actionDuration * .62, actionDuration * .08, true);
      addFlameEruption(layer, target, profile, impactDuration * 1.25, impactDelay * .72);
      addRing(layer, target, profile, impactDuration, impactDelay, { color: '#fb923c', size: 86, width: 5, scale: 1.5 });
      defenderStyle = 'burn';
      break;

    case 'frost_nova':
      animateActor(attackerEl, profile, actionDuration, direction, 'cast');
      addMagicCircle(layer, origin, profile, actionDuration * .76, 0, '❄');
      addGlyph(layer, { x: origin.x, y: origin.y - 26 }, profile, actionDuration * .62, '✧', 0, { size: 38 });
      addVerticalStrike(layer, target, profile, impactDuration * 1.15, impactDelay * .76, 'light');
      addMagicCircle(layer, target, { ...profile, primary: '#fff' }, impactDuration, impactDelay * .74, '❄');
      addRing(layer, target, profile, impactDuration, impactDelay, { size: 96, width: 4, scale: 1.5 });
      break;

    case 'shadow_step':
      animateActor(attackerEl, profile, actionDuration, direction, 'vanish');
      addShadowAfterimages(layer, origin, target, profile, actionDuration, actionDuration * .08);
      addWeapon(layer, origin, direction, profile, actionDuration * .72, actionDuration * .08, 'dagger');
      addSlash(layer, target, profile, impactDuration * .82, -42, impactDelay * .82, 112, 7);
      addSlash(layer, target, profile, impactDuration * .82, 42, impactDelay * .94, 112, 7);
      addParticles(layer, target, { ...profile, primary: '#312e81' }, impactDuration, profile.particles, impactDelay, 34);
      break;

    case 'mana_crescendo':
      animateActor(attackerEl, profile, actionDuration, direction, 'dance');
      addWeapon(layer, origin, direction, profile, actionDuration * .68, 0, 'baton');
      addMusicStaff(layer, origin, target, profile, actionDuration * .82, actionDuration * .05);
      addMagicCircle(layer, target, profile, impactDuration, impactDelay * .72, '✦');
      addRing(layer, target, profile, impactDuration, impactDelay, { size: 98, width: 3, scale: 1.42, endAngle: 180 });
      addGlyph(layer, target, { ...profile, primary: '#fff' }, impactDuration * .8, '♬', impactDelay * .82, { size: 38 });
      break;

    case 'stage_spectacle':
      animateActor(attackerEl, profile, actionDuration, direction, 'dance');
      addHarp(layer, { x: origin.x - 8, y: origin.y - 10 }, profile, actionDuration * .68, 0);
      addRibbonOrbit(layer, origin, profile, actionDuration * .78, actionDuration * .04, true);
      addMusicStaff(layer, origin, target, profile, actionDuration * .8, actionDuration * .08);
      addWave(layer, target, profile, impactDuration, impactDelay * .7, 'sound');
      addRing(layer, target, profile, impactDuration, impactDelay * .82, { size: 100, width: 4, scale: 1.45, endAngle: 220 });
      addGlyph(layer, target, { ...profile, primary: '#fff' }, impactDuration * .82, '★', impactDelay * .76, { size: 46 });
      break;

    case 'sword_draw':
    default:
      animateActor(attackerEl, profile, actionDuration, direction, 'melee');
      addWeapon(layer, origin, direction, profile, actionDuration * .82, actionDuration * .06, 'sword');
      addSlash(layer, target, profile, impactDuration, -38, impactDelay * .9, 112, 9);
      addGroundCracks(layer, target, profile, impactDuration * .68, impactDelay);
      break;
  }

  // Every job gets its own staged action above; these shared finishing touches
  // only make the exact damage frame legible on busy dungeon backgrounds.
  if (profile.kind !== 'slime_command' && profile.kind !== 'shadow_step') {
    addParticles(layer, target, profile, impactDuration, profile.particles, impactDelay, 44);
  }
  animateDefenderImpact(defenderEl, profile, totalDuration, impactDelay, defenderStyle);

  // Leave two display frames after the nominal end time. setTimeout callbacks
  // can otherwise clear the battle scene in the same refresh cycle as the
  // final Web Animations frame, which makes a killing blow look truncated.
  return {
    impactDelay,
    // The next ATB action may begin once this attack has visibly connected.
    // Impact particles can finish concurrently without making combat sluggish.
    cadenceDelay: impactDelay,
    completionDelay: Math.ceil(totalDuration + 34)
  };
}
