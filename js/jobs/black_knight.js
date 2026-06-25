// ─── Animation Utilities ──────────────────────────────────────
const playSkillAnimation = (caster, targets, type, onImpact) => {
  if (!Array.isArray(targets)) targets = [targets];
  if (localStorage.getItem('disableBattleAnimations') === 'true') {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
    return;
  }
  const speedMult = Math.max(1, parseInt(localStorage.getItem('autoBattleSpeed') || '1', 10));

  const casterEl = document.getElementById(caster.elementId);
  const casterRect = casterEl ? casterEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  const cx = casterRect.left + casterRect.width / 2;
  const cy = casterRect.top + casterRect.height / 2;

  // ─── Blood Saber ─────────────────────────────────────────────
  if (type === 'blood_saber') {
    // Blood aura burst on caster
    const aura = document.createElement('div');
    aura.style.position = 'fixed';
    aura.style.left = `${cx - 50}px`;
    aura.style.top = `${cy - 50}px`;
    aura.style.width = '100px';
    aura.style.height = '100px';
    aura.style.borderRadius = '50%';
    aura.style.background = 'radial-gradient(circle, rgba(220,38,38,0.6), transparent)';
    aura.style.boxShadow = '0 0 30px rgba(220,38,38,0.8)';
    aura.style.zIndex = '9997';
    aura.style.pointerEvents = 'none';
    (document.getElementById('battle-effects-layer') || document.body).appendChild(aura);

    const auraAnim = aura.animate([
      { transform: 'scale(0)', opacity: 0 },
      { transform: 'scale(1.5)', opacity: 1, offset: 0.3 },
      { transform: 'scale(0.5)', opacity: 0 }
    ], { duration: 500 / speedMult, easing: 'ease-out' });
    auraAnim.onfinish = () => aura.remove();

    targets.forEach((target, index) => {
      setTimeout(() => {
        const targetEl = document.getElementById(target.elementId);
        if (!targetEl) { if (onImpact) onImpact(target, index); return; }
        const targetRect = targetEl.getBoundingClientRect();
        const tx = targetRect.left + targetRect.width / 2;
        const ty = targetRect.top + targetRect.height / 2;

        // Blood slash - dark red diagonal slash
        const slash = document.createElement('div');
        slash.style.position = 'fixed';
        slash.style.left = `${tx - 80}px`;
        slash.style.top = `${ty - 5}px`;
        slash.style.width = '160px';
        slash.style.height = '10px';
        slash.style.background = 'linear-gradient(to right, transparent, #7f1d1d, #dc2626, #ef4444, #dc2626, #7f1d1d, transparent)';
        slash.style.boxShadow = '0 0 15px #dc2626, 0 0 30px #991b1b';
        slash.style.zIndex = '9999';
        slash.style.pointerEvents = 'none';
        (document.getElementById('battle-effects-layer') || document.body).appendChild(slash);

        const slashAnim = slash.animate([
          { transform: 'rotate(-45deg) scaleX(0)', opacity: 0 },
          { transform: 'rotate(-45deg) scaleX(1.3)', opacity: 1, offset: 0.3 },
          { transform: 'rotate(-45deg) scaleX(1.5)', opacity: 0 }
        ], { duration: 300 / speedMult, easing: 'ease-out' });
        slashAnim.onfinish = () => slash.remove();

        // Second cross slash
        setTimeout(() => {
          const slash2 = document.createElement('div');
          slash2.style.position = 'fixed';
          slash2.style.left = `${tx - 80}px`;
          slash2.style.top = `${ty - 5}px`;
          slash2.style.width = '160px';
          slash2.style.height = '10px';
          slash2.style.background = 'linear-gradient(to right, transparent, #991b1b, #ef4444, #fca5a5, #ef4444, #991b1b, transparent)';
          slash2.style.boxShadow = '0 0 15px #ef4444, 0 0 30px #dc2626';
          slash2.style.zIndex = '9999';
          slash2.style.pointerEvents = 'none';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(slash2);

          const slash2Anim = slash2.animate([
            { transform: 'rotate(45deg) scaleX(0)', opacity: 0 },
            { transform: 'rotate(45deg) scaleX(1.3)', opacity: 1, offset: 0.3 },
            { transform: 'rotate(45deg) scaleX(1.5)', opacity: 0 }
          ], { duration: 300 / speedMult, easing: 'ease-out' });
          slash2Anim.onfinish = () => slash2.remove();
        }, 100 / speedMult);

        // Blood splatter particles
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            const drop = document.createElement('div');
            drop.style.position = 'fixed';
            drop.style.left = `${tx - 4}px`;
            drop.style.top = `${ty - 4}px`;
            drop.style.width = '8px';
            drop.style.height = '8px';
            drop.style.borderRadius = '50%';
            drop.style.background = i % 2 === 0 ? '#dc2626' : '#991b1b';
            drop.style.boxShadow = `0 0 6px ${i % 2 === 0 ? '#dc2626' : '#991b1b'}`;
            drop.style.zIndex = '9999';
            drop.style.pointerEvents = 'none';
            (document.getElementById('battle-effects-layer') || document.body).appendChild(drop);

            const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.5;
            const dist = 25 + Math.random() * 35;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist;

            const dropAnim = drop.animate([
              { transform: 'translate(0, 0) scale(1)', opacity: 1 },
              { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 }
            ], { duration: (300 + Math.random() * 150) / speedMult, easing: 'ease-out' });
            dropAnim.onfinish = () => drop.remove();
          }, i * 20 / speedMult);
        }

        // Impact burst
        setTimeout(() => {
          const burst = document.createElement('div');
          burst.style.position = 'fixed';
          burst.style.left = `${tx - 60}px`;
          burst.style.top = `${ty - 60}px`;
          burst.style.width = '120px';
          burst.style.height = '120px';
          burst.style.borderRadius = '50%';
          burst.style.background = 'radial-gradient(circle, rgba(239,68,68,0.8), rgba(127,29,29,0.4), transparent)';
          burst.style.zIndex = '9998';
          burst.style.pointerEvents = 'none';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(burst);

          const burstAnim = burst.animate([
            { transform: 'scale(0.3)', opacity: 1 },
            { transform: 'scale(1.5)', opacity: 0 }
          ], { duration: 300 / speedMult, easing: 'ease-out' });
          burstAnim.onfinish = () => burst.remove();

          if (onImpact) onImpact(target, index);
        }, 200 / speedMult);

      }, (200 + index * 100) / speedMult);
    });

  // ─── Shadow Lance ────────────────────────────────────────────
  } else if (type === 'shadow_lance') {
    targets.forEach((target, index) => {
      setTimeout(() => {
        const targetEl = document.getElementById(target.elementId);
        if (!targetEl) { if (onImpact) onImpact(target, index); return; }
        const targetRect = targetEl.getBoundingClientRect();
        const tx = targetRect.left + targetRect.width / 2;
        const ty = targetRect.top + targetRect.height / 2;

        // Shadow lance falling from above
        const lance = document.createElement('div');
        lance.style.position = 'fixed';
        lance.style.width = '6px';
        lance.style.height = '60px';
        lance.style.background = 'linear-gradient(to bottom, transparent, #4c1d95, #7c3aed, #a78bfa)';
        lance.style.boxShadow = '0 0 12px #7c3aed, 0 0 20px #4c1d95';
        lance.style.zIndex = '9999';
        lance.style.pointerEvents = 'none';
        lance.style.borderRadius = '2px';
        (document.getElementById('battle-effects-layer') || document.body).appendChild(lance);

        // Lance tip (arrowhead)
        const tip = document.createElement('div');
        tip.style.position = 'fixed';
        tip.style.width = '0';
        tip.style.height = '0';
        tip.style.borderLeft = '8px solid transparent';
        tip.style.borderRight = '8px solid transparent';
        tip.style.borderTop = '16px solid #a78bfa';
        tip.style.filter = 'drop-shadow(0 0 6px #7c3aed)';
        tip.style.zIndex = '10000';
        tip.style.pointerEvents = 'none';
        (document.getElementById('battle-effects-layer') || document.body).appendChild(tip);

        const startX = tx - 3 + (Math.random() * 20 - 10);
        const startY = ty - 200 - Math.random() * 50;

        const lanceAnim = lance.animate([
          { left: `${startX}px`, top: `${startY}px`, opacity: 0, transform: 'scaleY(0.5)' },
          { left: `${startX}px`, top: `${startY + 30}px`, opacity: 1, transform: 'scaleY(1)', offset: 0.2 },
          { left: `${tx - 3}px`, top: `${ty - 30}px`, opacity: 1, transform: 'scaleY(1.2)' }
        ], { duration: 300 / speedMult, easing: 'cubic-bezier(0.3, 0, 0.8, 1)' });

        const tipAnim = tip.animate([
          { left: `${startX - 5}px`, top: `${startY + 60}px`, opacity: 0 },
          { left: `${startX - 5}px`, top: `${startY + 90}px`, opacity: 1, offset: 0.2 },
          { left: `${tx - 8}px`, top: `${ty - 14}px`, opacity: 1 }
        ], { duration: 300 / speedMult, easing: 'cubic-bezier(0.3, 0, 0.8, 1)' });

        lanceAnim.onfinish = () => {
          lance.remove();
          tip.remove();

          // Impact effect: dark purple shockwave
          const ring = document.createElement('div');
          ring.style.position = 'fixed';
          ring.style.left = `${tx - 40}px`;
          ring.style.top = `${ty - 40}px`;
          ring.style.width = '80px';
          ring.style.height = '80px';
          ring.style.borderRadius = '50%';
          ring.style.border = '4px solid #a78bfa';
          ring.style.boxShadow = '0 0 15px #7c3aed, inset 0 0 10px rgba(124,58,237,0.3)';
          ring.style.zIndex = '9999';
          ring.style.pointerEvents = 'none';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(ring);

          const ringAnim = ring.animate([
            { transform: 'scale(0.3)', opacity: 1 },
            { transform: 'scale(1.5)', opacity: 0 }
          ], { duration: 250 / speedMult, easing: 'ease-out' });
          ringAnim.onfinish = () => ring.remove();

          // Dark sparks
          for (let s = 0; s < 5; s++) {
            const spark = document.createElement('div');
            spark.style.position = 'fixed';
            spark.style.left = `${tx - 2}px`;
            spark.style.top = `${ty - 2}px`;
            spark.style.width = '4px';
            spark.style.height = '4px';
            spark.style.borderRadius = '50%';
            spark.style.background = '#c4b5fd';
            spark.style.boxShadow = '0 0 6px #7c3aed';
            spark.style.zIndex = '9999';
            spark.style.pointerEvents = 'none';
            (document.getElementById('battle-effects-layer') || document.body).appendChild(spark);

            const sa = Math.random() * Math.PI * 2;
            const sd = 15 + Math.random() * 25;

            const sparkAnim = spark.animate([
              { transform: 'translate(0, 0) scale(1)', opacity: 1 },
              { transform: `translate(${Math.cos(sa) * sd}px, ${Math.sin(sa) * sd}px) scale(0)`, opacity: 0 }
            ], { duration: (200 + Math.random() * 100) / speedMult, easing: 'ease-out' });
            sparkAnim.onfinish = () => spark.remove();
          }

          if (onImpact) onImpact(target, index);
        };
        tipAnim.onfinish = () => tip.remove();

      }, index * 120 / speedMult);
    });

  // ─── Curse Blade ─────────────────────────────────────────────
  } else if (type === 'curse_blade') {
    // Caster dark aura charge
    const darkAura = document.createElement('div');
    darkAura.style.position = 'fixed';
    darkAura.style.left = `${cx - 70}px`;
    darkAura.style.top = `${cy - 70}px`;
    darkAura.style.width = '140px';
    darkAura.style.height = '140px';
    darkAura.style.borderRadius = '50%';
    darkAura.style.background = 'radial-gradient(circle, rgba(88,28,135,0.6), rgba(30,10,60,0.3), transparent)';
    darkAura.style.boxShadow = '0 0 40px rgba(88,28,135,0.5)';
    darkAura.style.zIndex = '9997';
    darkAura.style.pointerEvents = 'none';
    (document.getElementById('battle-effects-layer') || document.body).appendChild(darkAura);

    const darkAuraAnim = darkAura.animate([
      { transform: 'scale(0) rotate(0deg)', opacity: 0 },
      { transform: 'scale(1.2) rotate(180deg)', opacity: 1, offset: 0.4 },
      { transform: 'scale(0.8) rotate(360deg)', opacity: 0.5 }
    ], { duration: 600 / speedMult, easing: 'ease-in-out' });
    darkAuraAnim.onfinish = () => darkAura.remove();

    targets.forEach((target, index) => {
      setTimeout(() => {
        const targetEl = document.getElementById(target.elementId);
        if (!targetEl) { if (onImpact) onImpact(target, index); return; }
        const targetRect = targetEl.getBoundingClientRect();
        const tx = targetRect.left + targetRect.width / 2;
        const ty = targetRect.top + targetRect.height / 2;

        // Cursed rune circle under target
        const rune = document.createElement('div');
        rune.style.position = 'fixed';
        rune.style.left = `${tx - 35}px`;
        rune.style.top = `${ty + 5}px`;
        rune.style.width = '70px';
        rune.style.height = '70px';
        rune.style.border = '2px dashed #a855f7';
        rune.style.borderRadius = '50%';
        rune.style.boxShadow = '0 0 12px #a855f7, inset 0 0 12px rgba(168,85,247,0.3)';
        rune.style.transform = 'rotateX(60deg)';
        rune.style.zIndex = '9997';
        rune.style.pointerEvents = 'none';
        (document.getElementById('battle-effects-layer') || document.body).appendChild(rune);

        const runeAnim = rune.animate([
          { transform: 'rotateX(60deg) rotateZ(0deg) scale(0)', opacity: 0 },
          { transform: 'rotateX(60deg) rotateZ(180deg) scale(1)', opacity: 1, offset: 0.3 },
          { transform: 'rotateX(60deg) rotateZ(540deg) scale(1.2)', opacity: 0 }
        ], { duration: 800 / speedMult, easing: 'ease-in-out' });
        runeAnim.onfinish = () => rune.remove();

        // Dark energy tendrils rising from rune
        for (let t = 0; t < 4; t++) {
          setTimeout(() => {
            const tendril = document.createElement('div');
            tendril.style.position = 'fixed';
            tendril.style.left = `${tx - 3 + (Math.random() * 30 - 15)}px`;
            tendril.style.top = `${ty + 20}px`;
            tendril.style.width = '6px';
            tendril.style.height = '30px';
            tendril.style.background = 'linear-gradient(to top, #581c87, #a855f7, transparent)';
            tendril.style.borderRadius = '3px';
            tendril.style.boxShadow = '0 0 8px #a855f7';
            tendril.style.zIndex = '9998';
            tendril.style.pointerEvents = 'none';
            (document.getElementById('battle-effects-layer') || document.body).appendChild(tendril);

            const tendrilAnim = tendril.animate([
              { transform: 'translateY(0) scaleY(0)', opacity: 0 },
              { transform: 'translateY(-30px) scaleY(1)', opacity: 1, offset: 0.4 },
              { transform: 'translateY(-60px) scaleY(0.5)', opacity: 0 }
            ], { duration: 500 / speedMult, easing: 'ease-out' });
            tendrilAnim.onfinish = () => tendril.remove();
          }, t * 60 / speedMult);
        }

        setTimeout(() => {
          if (onImpact) onImpact(target, index);
        }, 400 / speedMult);
      }, (400 + index * 80) / speedMult);
    });

  // ─── Hell Gate ───────────────────────────────────────────────
  } else if (type === 'hell_gate') {
    // Phase 1: Dark portal opens at center
    const portalX = window.innerWidth / 2;
    const portalY = window.innerHeight / 2 - 30;

    // Dark vortex background
    const vortex = document.createElement('div');
    vortex.style.position = 'fixed';
    vortex.style.left = `${portalX - 120}px`;
    vortex.style.top = `${portalY - 120}px`;
    vortex.style.width = '240px';
    vortex.style.height = '240px';
    vortex.style.borderRadius = '50%';
    vortex.style.background = 'conic-gradient(from 0deg, #1e1b4b, #312e81, #1e1b4b, #0f0a2e, #1e1b4b)';
    vortex.style.boxShadow = '0 0 60px rgba(30,27,75,0.8), 0 0 100px rgba(15,10,46,0.6)';
    vortex.style.zIndex = '9996';
    vortex.style.pointerEvents = 'none';
    vortex.style.mixBlendMode = 'screen';
    (document.getElementById('battle-effects-layer') || document.body).appendChild(vortex);

    const vortexAnim = vortex.animate([
      { transform: 'scale(0) rotate(0deg)', opacity: 0 },
      { transform: 'scale(0.8) rotate(180deg)', opacity: 0.8, offset: 0.2 },
      { transform: 'scale(1) rotate(360deg)', opacity: 0.9, offset: 0.5 },
      { transform: 'scale(1.2) rotate(720deg)', opacity: 0 }
    ], { duration: 1500 / speedMult, easing: 'ease-in-out' });
    vortexAnim.onfinish = () => vortex.remove();

    // Inner portal ring
    const ring = document.createElement('div');
    ring.style.position = 'fixed';
    ring.style.left = `${portalX - 80}px`;
    ring.style.top = `${portalY - 80}px`;
    ring.style.width = '160px';
    ring.style.height = '160px';
    ring.style.borderRadius = '50%';
    ring.style.border = '6px solid #6d28d9';
    ring.style.boxShadow = '0 0 30px #6d28d9, inset 0 0 30px rgba(109,40,217,0.4)';
    ring.style.zIndex = '9997';
    ring.style.pointerEvents = 'none';
    (document.getElementById('battle-effects-layer') || document.body).appendChild(ring);

    const ringAnim = ring.animate([
      { transform: 'scale(0) rotate(0deg)', opacity: 0 },
      { transform: 'scale(1) rotate(90deg)', opacity: 1, offset: 0.2 },
      { transform: 'scale(1.2) rotate(270deg)', opacity: 0.8, offset: 0.6 },
      { transform: 'scale(0.5) rotate(360deg)', opacity: 0 }
    ], { duration: 1200 / speedMult, easing: 'ease-in-out' });
    ringAnim.onfinish = () => ring.remove();

    // Phase 2: Dark energy beams shoot out to all targets
    targets.forEach((target, index) => {
      setTimeout(() => {
        const targetEl = document.getElementById(target.elementId);
        if (!targetEl) { if (onImpact) onImpact(target, index); return; }
        const targetRect = targetEl.getBoundingClientRect();
        const tx = targetRect.left + targetRect.width / 2;
        const ty = targetRect.top + targetRect.height / 2;

        // Dark beam from portal to target
        const dx = tx - portalX;
        const dy = ty - portalY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        const beam = document.createElement('div');
        beam.style.position = 'fixed';
        beam.style.left = `${portalX}px`;
        beam.style.top = `${portalY - 4}px`;
        beam.style.width = `${dist}px`;
        beam.style.height = '8px';
        beam.style.background = 'linear-gradient(to right, #4c1d95, #7c3aed, #a78bfa, #7c3aed)';
        beam.style.boxShadow = '0 0 15px #7c3aed, 0 0 30px #4c1d95';
        beam.style.transformOrigin = '0 50%';
        beam.style.transform = `rotate(${angle}deg)`;
        beam.style.zIndex = '9998';
        beam.style.pointerEvents = 'none';
        (document.getElementById('battle-effects-layer') || document.body).appendChild(beam);

        const beamAnim = beam.animate([
          { transform: `rotate(${angle}deg) scaleX(0)`, opacity: 0 },
          { transform: `rotate(${angle}deg) scaleX(1)`, opacity: 1, offset: 0.4 },
          { transform: `rotate(${angle}deg) scaleX(1)`, opacity: 0 }
        ], { duration: 400 / speedMult, easing: 'ease-out' });
        beamAnim.onfinish = () => beam.remove();

        // Dark explosion on target
        setTimeout(() => {
          const explosion = document.createElement('div');
          explosion.style.position = 'fixed';
          explosion.style.left = `${tx - 50}px`;
          explosion.style.top = `${ty - 50}px`;
          explosion.style.width = '100px';
          explosion.style.height = '100px';
          explosion.style.borderRadius = '50%';
          explosion.style.background = 'radial-gradient(circle, #a78bfa, #6d28d9, #1e1b4b, transparent)';
          explosion.style.boxShadow = '0 0 30px #6d28d9';
          explosion.style.zIndex = '9999';
          explosion.style.pointerEvents = 'none';
          explosion.style.mixBlendMode = 'screen';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(explosion);

          const explAnim = explosion.animate([
            { transform: 'scale(0.2)', opacity: 1 },
            { transform: 'scale(1.5)', opacity: 0 }
          ], { duration: 350 / speedMult, easing: 'ease-out' });
          explAnim.onfinish = () => explosion.remove();

          // Dark particles
          for (let p = 0; p < 6; p++) {
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.left = `${tx - 3}px`;
            particle.style.top = `${ty - 3}px`;
            particle.style.width = '6px';
            particle.style.height = '6px';
            particle.style.borderRadius = '50%';
            particle.style.background = p % 2 === 0 ? '#a78bfa' : '#6d28d9';
            particle.style.boxShadow = `0 0 8px ${p % 2 === 0 ? '#a78bfa' : '#6d28d9'}`;
            particle.style.zIndex = '9999';
            particle.style.pointerEvents = 'none';
            (document.getElementById('battle-effects-layer') || document.body).appendChild(particle);

            const pa = Math.random() * Math.PI * 2;
            const pd = 20 + Math.random() * 30;

            const pAnim = particle.animate([
              { transform: 'translate(0, 0) scale(1)', opacity: 1 },
              { transform: `translate(${Math.cos(pa) * pd}px, ${Math.sin(pa) * pd}px) scale(0)`, opacity: 0 }
            ], { duration: (250 + Math.random() * 150) / speedMult, easing: 'ease-out' });
            pAnim.onfinish = () => particle.remove();
          }

          if (onImpact) onImpact(target, index);
        }, 200 / speedMult);
      }, (500 + index * 80) / speedMult);
    });

  } else {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
  }
};

// ─── HP 消費ヘルパー ──────────────────────────────────────────
const consumeHp = (caster, percent, battle) => {
  const maxHp = caster.stats?.hp || caster.hp.max;
  const cost = Math.max(1, Math.floor(maxHp * percent / 100));
  caster.hp.current -= cost;
  if (caster.hp.current < 1) caster.hp.current = 1; // HP消費で死なない
  battle.showDamage(caster.elementId, `-${cost} HP`, 'text-red-400');
  battle.renderEntities();
  return cost;
};

export const black_knight = {
  id: 'black_knight',
  name: 'ブラックナイト',
  icon: 'swords',
  changeCost: 500000,
  requirements: [
    { jobId: 'knight', level: 50 },
    { jobId: 'dancer', level: 50 }
  ],
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'blood_saber', name: 'ブラッドセイバー', icon: 'bloodtype', statDependency: 'ATK',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 15, multiplier: 2.0 },
        { level:  2, spCost: 1, mpCost: 17, multiplier: 2.2 },
        { level:  3, spCost: 1, mpCost: 19, multiplier: 2.4 },
        { level:  4, spCost: 2, mpCost: 21, multiplier: 2.6 },
        { level:  5, spCost: 2, mpCost: 23, multiplier: 2.8 },
        { level:  6, spCost: 2, mpCost: 25, multiplier: 3.0 },
        { level:  7, spCost: 3, mpCost: 27, multiplier: 3.1 },
        { level:  8, spCost: 3, mpCost: 29, multiplier: 3.2 },
        { level:  9, spCost: 3, mpCost: 31, multiplier: 3.3 },
        { level: 10, spCost: 5, mpCost: 35, multiplier: 3.5 }
      ],
      getDescription: (lc) => `自身の MP を ${lc.mpCost} 消費し、敵単体に ${lc.multiplier.toFixed(1)} 倍の物理攻撃ダメージを与える`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (!target) return;

        playSkillAnimation(caster, [target], 'blood_saber', () => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency,
            actionName: 'ブラッドセイバー',
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            hideActionName: true
          });
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          if (caster.mp.current < levelConfig.mpCost) return null;
          let target = context.selectedEnemyTarget;
          if (!target || target.isDead) target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          
          const tHp = target.hp !== undefined ? target.hp.current : target.currentHp;
          const tMaxHp = target.hp !== undefined ? (target.stats?.hp || target.hp.max) : target.maxHp;
          const targetHpRatio = tHp / tMaxHp;
          
          // HPが半分以下の敵には大きなフィニッシュボーナス
          const finishBonus = targetHpRatio < 0.5 ? 150 : 0;
          // 敵が単体の場合は単体高火力スキルとして優先
          const singleTargetBonus = aliveEnemies.length === 1 ? 100 : 0;
          const randomFactor = Math.random() * 40;
          
          return { target, score: 70 * levelConfig.multiplier + finishBonus + singleTargetBonus + randomFactor };
        }
      }
    },
    {
      id: 'shadow_lance', name: 'シャドウランス', icon: 'north', statDependency: 'ATK',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 10, multiplier: 0.40, minHits: 3, maxHits: 5 },
        { level:  2, spCost: 1, mpCost: 12, multiplier: 0.45, minHits: 3, maxHits: 5 },
        { level:  3, spCost: 1, mpCost: 14, multiplier: 0.50, minHits: 3, maxHits: 6 },
        { level:  4, spCost: 2, mpCost: 16, multiplier: 0.55, minHits: 4, maxHits: 7 },
        { level:  5, spCost: 2, mpCost: 18, multiplier: 0.60, minHits: 4, maxHits: 7 },
        { level:  6, spCost: 2, mpCost: 20, multiplier: 0.65, minHits: 4, maxHits: 8 },
        { level:  7, spCost: 3, mpCost: 22, multiplier: 0.70, minHits: 5, maxHits: 9 },
        { level:  8, spCost: 3, mpCost: 24, multiplier: 0.75, minHits: 5, maxHits: 9 },
        { level:  9, spCost: 3, mpCost: 26, multiplier: 0.80, minHits: 6, maxHits: 10 },
        { level: 10, spCost: 5, mpCost: 30, multiplier: 0.80, minHits: 6, maxHits: 10 }
      ],
      getDescription: (lc) => `自身の MP を ${lc.mpCost} 消費し、ランダムな敵に ${lc.multiplier.toFixed(2)} 倍の物理攻撃を ${lc.minHits}～${lc.maxHits} 回行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;

        const hits = Math.floor(Math.random() * (levelConfig.maxHits - levelConfig.minHits + 1)) + levelConfig.minHits;
        for (let i = 0; i < hits; i++) {
          setTimeout(() => {
            const aliveEnemies = battle.enemies.filter(e => !e.isDead);
            if (aliveEnemies.length > 0) {
              const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
              playSkillAnimation(caster, [target], 'shadow_lance', () => {
                if (target.isDead) return;
                battle.executeAttack(caster, target, true, {
                  statDependency: this.statDependency,
                  actionName: '',
                  damageMultiplier: levelConfig.multiplier,
                  damageType: 'skill',
                  hideActionName: true,
                  skipAtbReset: i > 0
                });
              });
            }
          }, i * 150 / (battle.speedMult || 1));
        }
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          if (caster.mp.current < levelConfig.mpCost) return null;
          
          const hpRatio = caster.hp.current / (caster.stats?.hp || caster.hp.max);
          const avgHits = (levelConfig.minHits + levelConfig.maxHits) / 2;
          
          // 血の渇望(Blood Thirst)による回復量が多いため、自身のHPが低い時は優先的に使用して回復を狙う
          const lowHpBonus = hpRatio < 0.4 ? 150 : 0;
          // 敵が複数の場合はヒットが分散するが、全体的に削るのにも有効
          const groupBonus = aliveEnemies.length >= 2 ? 50 : 0;
          const randomFactor = Math.random() * 40;
          
          const score = 45 * levelConfig.multiplier * avgHits + lowHpBonus + groupBonus + randomFactor;
          return { target: aliveEnemies[0], score };
        }
      }
    },
    {
      id: 'curse_blade', name: 'カースブレード', icon: 'destruction',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 20, atkReduce: 10, defReduce: 10, curseChance: 30, turns: 2, multiplier: 0.5 },
        { level:  2, spCost: 2, mpCost: 22, atkReduce: 13, defReduce: 13, curseChance: 35, turns: 2, multiplier: 0.5 },
        { level:  3, spCost: 2, mpCost: 24, atkReduce: 16, defReduce: 16, curseChance: 40, turns: 3, multiplier: 0.6 },
        { level:  4, spCost: 3, mpCost: 26, atkReduce: 18, defReduce: 18, curseChance: 45, turns: 3, multiplier: 0.6 },
        { level:  5, spCost: 3, mpCost: 28, atkReduce: 20, defReduce: 20, curseChance: 50, turns: 3, multiplier: 0.7 },
        { level:  6, spCost: 3, mpCost: 30, atkReduce: 22, defReduce: 22, curseChance: 55, turns: 4, multiplier: 0.7 },
        { level:  7, spCost: 4, mpCost: 32, atkReduce: 24, defReduce: 24, curseChance: 60, turns: 4, multiplier: 0.8 },
        { level:  8, spCost: 4, mpCost: 34, atkReduce: 26, defReduce: 26, curseChance: 65, turns: 4, multiplier: 0.8 },
        { level:  9, spCost: 4, mpCost: 36, atkReduce: 28, defReduce: 28, curseChance: 70, turns: 5, multiplier: 0.9 },
        { level: 10, spCost: 6, mpCost: 40, atkReduce: 30, defReduce: 30, curseChance: 80, turns: 5, multiplier: 1.0 }
      ],
      getDescription: (lc) => `自身の MP を ${lc.mpCost} 消費し、敵全体に ${lc.multiplier.toFixed(1)} 倍のダメージを与え、ATK/DEF を ${lc.turns} ターン ${lc.atkReduce}% 低下させ、${lc.curseChance}% の確率で呪いを付与する`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targets = battle.enemies.filter(e => !e.isDead);
        if (targets.length === 0) return;

        playSkillAnimation(caster, targets, 'curse_blade', (target, index) => {
          if (target.isDead) return;

          // ダメージ処理を追加
          battle.executeAttack(caster, target, true, {
            statDependency: 'ATK',
            actionName: '',
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            element: 'dark',
            hideActionName: true,
            skipAtbReset: index > 0,
            isAoEProcessed: true
          });

          // ATK debuff
          if (!target.originalAtk) target.originalAtk = target.stats.atk;
          target.stats.atk = Math.floor(target.originalAtk * (1 - levelConfig.atkReduce / 100));
          target.atkDebuffTurns = levelConfig.turns;
          setTimeout(() => {
            battle.showDamage(target.elementId, 'ATK DOWN', 'text-blue-500');
          }, 300 / (battle.speedMult || 1));

          // DEF debuff
          if (!target.originalDef) target.originalDef = target.stats.def;
          target.stats.def = Math.floor(target.originalDef * (1 - levelConfig.defReduce / 100));
          target.defDebuffTurns = levelConfig.turns;
          setTimeout(() => {
            battle.showDamage(target.elementId, 'DEF DOWN', 'text-cyan-500');
          }, 600 / (battle.speedMult || 1));

          // Curse ailment
          if (!target.activeAilment && Math.random() * 100 < levelConfig.curseChance) {
            target.activeAilment = { type: 'curse', duration: 10 };
          }
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          
          if (caster.mp.current < levelConfig.mpCost) return null;
          
          // デバフ状態の敵がいるかチェック
          const hasDebuffedEnemy = aliveEnemies.some(e => {
            const hasAtkDown = e.atkDebuffTurns && e.atkDebuffTurns > 0;
            const hasDefDown = e.defDebuffTurns && e.defDebuffTurns > 0;
            const hasCurse = e.activeAilment && e.activeAilment.type === 'curse';
            return hasAtkDown || hasDefDown || hasCurse;
          });
          
          // デバフ状態の敵がいるときは発動しない
          if (hasDebuffedEnemy) {
            return null;
          }

          // 未付与の場合は戦闘序盤の起点として最優先で撃つ
          return { target: aliveEnemies[0], score: 450 + Math.random() * 50 };
        }
      }
    },
    {
      id: 'hell_gate', name: 'ヘルゲート', icon: 'local_fire_department', statDependency: 'MAT',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost:  40, hpPercent: 20, multiplier: 1.5 },
        { level:  2, spCost: 2, mpCost:  46, hpPercent: 20, multiplier: 1.7 },
        { level:  3, spCost: 2, mpCost:  52, hpPercent: 20, multiplier: 1.9 },
        { level:  4, spCost: 3, mpCost:  58, hpPercent: 21, multiplier: 2.1 },
        { level:  5, spCost: 3, mpCost:  64, hpPercent: 21, multiplier: 2.3 },
        { level:  6, spCost: 3, mpCost:  70, hpPercent: 22, multiplier: 2.5 },
        { level:  7, spCost: 4, mpCost:  78, hpPercent: 22, multiplier: 2.6 },
        { level:  8, spCost: 4, mpCost:  86, hpPercent: 23, multiplier: 2.8 },
        { level:  9, spCost: 4, mpCost:  94, hpPercent: 24, multiplier: 2.9 },
        { level: 10, spCost: 6, mpCost: 100, hpPercent: 25, multiplier: 3.0 }
      ],
      getDescription: (lc) => `自身の HP を ${lc.hpPercent}% と MP を ${lc.mpCost} 消費し、敵全体に ${lc.multiplier.toFixed(1)} 倍の闇属性魔法攻撃を行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targets = battle.enemies.filter(e => !e.isDead);
        if (targets.length === 0) return;

        consumeHp(caster, levelConfig.hpPercent, battle);

        playSkillAnimation(caster, targets, 'hell_gate', (target, index) => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency,
            actionName: '',
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            element: 'dark',
            hideActionName: true,
            skipAtbReset: index > 0,
            isAoEProcessed: true
          });
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          const hpRatio = caster.hp.current / (caster.stats?.hp || caster.hp.max);
          if (hpRatio < 0.25) return null;
          if (caster.mp.current < levelConfig.mpCost) return null;
          
          let totalScore = 0;
          for (const enemy of aliveEnemies) {
            const resist = enemy.stats?.elementResist?.dark || 0;
            totalScore += 40 * levelConfig.multiplier * ((100 - resist) / 100);
          }
          
          // 敵が多いほど強力なAoEとして高評価
          if (aliveEnemies.length >= 3) totalScore += 150;
          else if (aliveEnemies.length === 2) totalScore += 50;

          // 鬼神の力(HP50%以下で発動)を狙うため、HPに余裕がある時は積極的にHPを消費するスキルとして評価を上げる
          if (hpRatio > 0.6) {
            totalScore += 100;
          }

          if (totalScore > 80) return { target: aliveEnemies[0], score: totalScore + Math.random() * 30 };
          return null;
        }
      }
    },
    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'blood_thirst', name: '血の渇望', icon: 'water_drop', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, drainPercent:  5 },
        { level:  2, spCost: 1, mpCost: 0, drainPercent:  7 },
        { level:  3, spCost: 1, mpCost: 0, drainPercent:  9 },
        { level:  4, spCost: 2, mpCost: 0, drainPercent: 11 },
        { level:  5, spCost: 2, mpCost: 0, drainPercent: 13 },
        { level:  6, spCost: 2, mpCost: 0, drainPercent: 15 },
        { level:  7, spCost: 3, mpCost: 0, drainPercent: 16 },
        { level:  8, spCost: 3, mpCost: 0, drainPercent: 18 },
        { level:  9, spCost: 3, mpCost: 0, drainPercent: 19 },
        { level: 10, spCost: 5, mpCost: 0, drainPercent: 20 }
      ],
      getDescription: (lc) => `通常攻撃やアクティブスキルでダメージを与えた時、与えたダメージの ${lc.drainPercent}% を HP として吸収する`
    },
    {
      id: 'stigma_of_atonement', name: '贖罪の烙印', icon: 'gavel', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 0, curseDamageMultiplier: 1.9, curseRecoilMultiplier: 0.38 },
        { level:  2, spCost: 2, mpCost: 0, curseDamageMultiplier: 1.8, curseRecoilMultiplier: 0.36 },
        { level:  3, spCost: 2, mpCost: 0, curseDamageMultiplier: 1.7, curseRecoilMultiplier: 0.34 },
        { level:  4, spCost: 3, mpCost: 0, curseDamageMultiplier: 1.6, curseRecoilMultiplier: 0.32 },
        { level:  5, spCost: 3, mpCost: 0, curseDamageMultiplier: 1.5, curseRecoilMultiplier: 0.30 },
        { level:  6, spCost: 3, mpCost: 0, curseDamageMultiplier: 1.4, curseRecoilMultiplier: 0.28 },
        { level:  7, spCost: 4, mpCost: 0, curseDamageMultiplier: 1.3, curseRecoilMultiplier: 0.26 },
        { level:  8, spCost: 4, mpCost: 0, curseDamageMultiplier: 1.2, curseRecoilMultiplier: 0.24 },
        { level:  9, spCost: 4, mpCost: 0, curseDamageMultiplier: 1.1, curseRecoilMultiplier: 0.22 },
        { level: 10, spCost: 6, mpCost: 0, curseDamageMultiplier: 1.0, curseRecoilMultiplier: 0.20 }
      ],
      getDescription: (lc) => `常に「呪い」状態になるが、他の状態異常を無効化する。また、呪いによる被ダメージ倍率を ${lc.curseDamageMultiplier.toFixed(1)} 倍に、反動ダメージを ${(lc.curseRecoilMultiplier * 100).toFixed(0)}% に軽減する`
    },
    {
      id: 'demon_power', name: '鬼神の力', icon: 'whatshot', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 0, atkMatkMultiplier: 1.20 },
        { level:  2, spCost: 2, mpCost: 0, atkMatkMultiplier: 1.28 },
        { level:  3, spCost: 2, mpCost: 0, atkMatkMultiplier: 1.36 },
        { level:  4, spCost: 3, mpCost: 0, atkMatkMultiplier: 1.44 },
        { level:  5, spCost: 3, mpCost: 0, atkMatkMultiplier: 1.52 },
        { level:  6, spCost: 3, mpCost: 0, atkMatkMultiplier: 1.60 },
        { level:  7, spCost: 4, mpCost: 0, atkMatkMultiplier: 1.70 },
        { level:  8, spCost: 4, mpCost: 0, atkMatkMultiplier: 1.80 },
        { level:  9, spCost: 4, mpCost: 0, atkMatkMultiplier: 1.90 },
        { level: 10, spCost: 6, mpCost: 0, atkMatkMultiplier: 2.00 }
      ],
      getDescription: (lc) => `自身の HP が 50% 以下のとき、ATK と MATK が ${lc.atkMatkMultiplier.toFixed(2)} 倍になる`
    }
  ]
};
