import {
  canCreateBattleEffect,
  getBattleAnimationDuration,
  shouldSkipBattleAnimations,
} from '../../utils/battle-animation.js';

const THEMES = Object.freeze({
  norvice: ['#fef3c7', '#f59e0b'], knight: ['#dbeafe', '#3b82f6'],
  mage: ['#e9d5ff', '#9333ea'], priest: ['#fef9c3', '#facc15'],
  ranger: ['#d1fae5', '#10b981'], magic_knight: ['#f5d0fe', '#06b6d4'],
  slime_master: ['#ccfbf1', '#14b8a6'], dancer: ['#fbcfe8', '#ec4899'],
  bird: ['#ddd6fe', '#8b5cf6'], black_knight: ['#fecaca', '#991b1b'],
  paladin: ['#fef3c7', '#eab308'], poseidon: ['#cffafe', '#0284c7'],
  pyromancer: ['#fed7aa', '#ef4444'], assassin: ['#e9d5ff', '#6d28d9'],
  guardian: ['#fde68a', '#1d4ed8'], cryomancer: ['#e0f2fe', '#38bdf8'],
  magic_archer: ['#f0abfc', '#0891b2'], gunner: ['#fef3c7', '#ea580c'],
  plague_doctor: ['#d9f99d', '#4d7c0f'], entertainer: ['#f5d0fe', '#d946ef'],
  mana_conductor: ['#ddd6fe', '#6366f1'], slime_singer: ['#cffafe', '#06b6d4'],
  dragoon: ['#bae6fd', '#2563eb'], shinra_sage: ['#bbf7d0', '#16a34a'],
  soul_reaper: ['#a5f3fc', '#7c3aed']
});

export function getJobGaugeAnimationSpec(event) {
  if (!event?.jobId || !event.type) return null;
  const [primary, secondary] = THEMES[event.jobId] || ['#fef3c7', '#f59e0b'];
  const isRelease = event.type === 'release';
  const isReload = event.type === 'reload';
  return {
    ...event,
    primary,
    secondary,
    icon: event.icon || (isReload ? 'refresh' : 'auto_awesome'),
    duration: isRelease ? 820 : isReload ? 520 : 620,
    ringScale: isRelease ? 2.15 : isReload ? 1.45 : 1.75,
    particleCount: isRelease ? 10 : isReload ? 6 : 8,
    bannerSuffix: isRelease ? 'BURST' : isReload ? 'RELOAD' : 'READY'
  };
}

export function makeJobGaugeReloadEvent(entity) {
  const max = Math.max(1, Math.floor(Number(entity?._jobGaugeCapacityMax) || 6));
  return {
    type: 'reload', jobId: entity?.jobId || entity?.job || 'gunner',
    label: 'リロード完了', icon: 'refresh', amount: max, max
  };
}

const style = (element, values) => {
  Object.assign(element.style, values);
  return element;
};

const removeOnFinish = (element, animation) => {
  if (!animation) {
    element.remove();
    return;
  }
  animation.onfinish = () => element.remove();
  animation.oncancel = () => element.remove();
};

/**
 * A shared pre-impact flourish for gauge finishers. It deliberately uses the
 * compositor-only Web Animations API so 5x auto battle does not add a JS loop.
 */
export function playJobGaugeAnimation(entity, event) {
  const spec = getJobGaugeAnimationSpec(event);
  if (!spec || typeof document === 'undefined' || typeof window === 'undefined') return false;
  if (shouldSkipBattleAnimations()) return false;
  const actor = document.getElementById(entity?.elementId);
  const layer = document.getElementById('battle-effects-layer') || document.body;
  if (!actor || !layer || typeof actor.animate !== 'function' || !canCreateBattleEffect(layer)) return false;

  const rect = actor.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const duration = reduced ? 180 : getBattleAnimationDuration(spec.duration, 220);
  const fragment = document.createDocumentFragment();

  const flash = style(document.createElement('div'), {
    position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '9998',
    background: `radial-gradient(circle at ${x}px ${y}px, ${spec.primary}70 0, ${spec.secondary}28 18%, transparent 52%)`,
    mixBlendMode: 'screen', opacity: '0'
  });
  fragment.appendChild(flash);

  const ring = style(document.createElement('div'), {
    position: 'fixed', left: `${x - 34}px`, top: `${y - 34}px`, width: '68px', height: '68px',
    borderRadius: '9999px', border: `3px solid ${spec.primary}`,
    boxShadow: `0 0 12px ${spec.primary}, 0 0 34px ${spec.secondary}, inset 0 0 18px ${spec.secondary}80`,
    pointerEvents: 'none', zIndex: '9999', opacity: '0'
  });
  fragment.appendChild(ring);

  const glyph = style(document.createElement('div'), {
    position: 'fixed', left: `${x - 25}px`, top: `${y - 25}px`, width: '50px', height: '50px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px',
    color: spec.primary, fontSize: '34px', fontVariationSettings: "'FILL' 1",
    textShadow: `0 0 8px ${spec.primary}, 0 0 20px ${spec.secondary}`,
    pointerEvents: 'none', zIndex: '10000', opacity: '0'
  });
  glyph.className = 'material-symbols-outlined';
  glyph.textContent = spec.icon;
  fragment.appendChild(glyph);

  const banner = style(document.createElement('div'), {
    position: 'fixed', left: `${x}px`, top: `${Math.max(8, rect.top - 8)}px`,
    transform: 'translate(-50%,-100%)', minWidth: '120px', maxWidth: '240px',
    padding: '4px 12px', borderRadius: '9999px', border: `1px solid ${spec.primary}`,
    background: `linear-gradient(90deg,transparent,${spec.secondary}e8 22%,#020617ee 50%,${spec.secondary}e8 78%,transparent)`,
    color: '#fff', fontSize: '11px', fontWeight: '900', letterSpacing: '.08em',
    textAlign: 'center', whiteSpace: 'nowrap', textShadow: `0 0 8px ${spec.primary}`,
    boxShadow: `0 0 16px ${spec.secondary}80`, pointerEvents: 'none', zIndex: '10001', opacity: '0'
  });
  banner.textContent = `${spec.label}  ·  ${spec.bannerSuffix}`;
  fragment.appendChild(banner);

  const particles = [];
  if (!reduced) {
    for (let index = 0; index < spec.particleCount; index++) {
      const angle = Math.PI * 2 * index / spec.particleCount;
      const particle = style(document.createElement('div'), {
        position: 'fixed', left: `${x - 3}px`, top: `${y - 3}px`, width: '6px', height: '6px',
        transform: 'rotate(45deg)', background: index % 2 ? spec.primary : spec.secondary,
        boxShadow: `0 0 9px ${spec.primary}`, pointerEvents: 'none', zIndex: '9999', opacity: '0'
      });
      particle.dataset.gaugeDx = String(Math.cos(angle) * (48 + index % 3 * 10));
      particle.dataset.gaugeDy = String(Math.sin(angle) * (48 + index % 3 * 10));
      particles.push(particle);
      fragment.appendChild(particle);
    }
  }

  layer.appendChild(fragment);
  actor.animate([
    { transform: 'scale(1)', filter: 'brightness(1)' },
    { transform: spec.type === 'release' ? 'scale(1.055)' : 'scale(1.025)', filter: `brightness(1.65) drop-shadow(0 0 10px ${spec.secondary})`, offset: .42 },
    { transform: 'scale(1)', filter: 'brightness(1)' }
  ], { duration, easing: 'ease-out' });

  removeOnFinish(flash, flash.animate([
    { opacity: 0 }, { opacity: spec.type === 'release' ? .9 : .58, offset: .2 }, { opacity: 0 }
  ], { duration, easing: 'ease-out' }));
  removeOnFinish(ring, ring.animate([
    { transform: 'scale(.25) rotate(-35deg)', opacity: 0 },
    { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: .28 },
    { transform: `scale(${spec.ringScale}) rotate(28deg)`, opacity: 0 }
  ], { duration, easing: 'cubic-bezier(.16,.8,.25,1)' }));
  removeOnFinish(glyph, glyph.animate([
    { transform: 'scale(.2) rotate(-25deg)', opacity: 0 },
    { transform: 'scale(1.22) rotate(4deg)', opacity: 1, offset: .34 },
    { transform: 'scale(.85) rotate(0deg)', opacity: 0 }
  ], { duration: duration * .82, easing: 'ease-out' }));
  removeOnFinish(banner, banner.animate([
    { transform: 'translate(-50%,-55%) scale(.8)', opacity: 0 },
    { transform: 'translate(-50%,-100%) scale(1.04)', opacity: 1, offset: .3 },
    { transform: 'translate(-50%,-125%) scale(1)', opacity: 0 }
  ], { duration, easing: 'ease-out' }));

  particles.forEach((particle, index) => {
    const dx = Number(particle.dataset.gaugeDx);
    const dy = Number(particle.dataset.gaugeDy);
    removeOnFinish(particle, particle.animate([
      { transform: 'translate(0,0) rotate(45deg) scale(.2)', opacity: 0 },
      { opacity: 1, offset: .2 + (index % 2) * .08 },
      { transform: `translate(${dx}px,${dy}px) rotate(${135 + index * 20}deg) scale(.1)`, opacity: 0 }
    ], { duration: duration * .9, easing: 'cubic-bezier(.16,.75,.25,1)' }));
  });
  return true;
}
