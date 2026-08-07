import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

// ─── Animation Utilities ──────────────────────────────────────
const playSkillAnimation = (caster, targets, type, onImpact) => {
  if (!Array.isArray(targets)) targets = [targets];
  if (shouldSkipBattleAnimations()) {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
    return;
  }
  const battleSpeed = getBattleSpeed();
  const speedMult = getBattleAnimationSpeed(battleSpeed);

  const casterEl = document.getElementById(caster.elementId);
  const casterRect = casterEl ? casterEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  const cx = casterRect.left + casterRect.width / 2;
  const cy = casterRect.top + casterRect.height / 2;

  // Helper: create sparkle particles
  const createSparkles = (x, y, color = '#fbbf24', count = 8) => {
    for (let i = 0; i < count; i++) {
      const sparkle = document.createElement('div');
      sparkle.style.position = 'fixed';
      sparkle.style.left = `${x - 10}px`;
      sparkle.style.top = `${y - 10}px`;
      sparkle.style.width = '20px';
      sparkle.style.height = '20px';
      sparkle.style.background = `radial-gradient(circle, #fff, ${color}, transparent)`;
      sparkle.style.clipPath = 'polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%)';
      sparkle.style.zIndex = '9999';
      sparkle.style.pointerEvents = 'none';
      sparkle.style.mixBlendMode = 'screen';
      (document.getElementById('battle-effects-layer') || document.body).appendChild(sparkle);

      const angle = (Math.PI * 2 / count) * i;
      const dist = 30 + Math.random() * 30;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 20;

      const anim = sparkle.animate([
        { transform: 'translate(0, 0) scale(0)', opacity: 0 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0.2 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0 }
      ], { duration: (600 + Math.random() * 400) / speedMult, easing: 'ease-out' });

      anim.onfinish = () => sparkle.remove();
    }
  };

  // ─── Holy Smite ─────────────────────────────────────────────
  if (type === 'holy_smite') {
    targets.forEach((target, index) => {
      setTimeout(() => {
        const targetEl = document.getElementById(target.elementId);
        if (!targetEl) { if (onImpact) onImpact(target, index); return; }
        const targetRect = targetEl.getBoundingClientRect();
        const tx = targetRect.left + targetRect.width / 2;
        const ty = targetRect.top + targetRect.height / 2;

        // Holy light pillar from above
        const pillar = document.createElement('div');
        pillar.style.position = 'fixed';
        pillar.style.left = `${tx - 30}px`;
        pillar.style.top = '0px';
        pillar.style.width = '60px';
        pillar.style.height = `${ty + 40}px`;
        pillar.style.background = 'linear-gradient(to right, transparent, rgba(251,191,36,0.3), rgba(255,255,255,0.8), rgba(251,191,36,0.3), transparent)';
        pillar.style.zIndex = '9998';
        pillar.style.pointerEvents = 'none';
        pillar.style.mixBlendMode = 'screen';
        (document.getElementById('battle-effects-layer') || document.body).appendChild(pillar);

        const pillarAnim = pillar.animate([
          { transform: 'scaleX(0)', opacity: 0 },
          { transform: 'scaleX(1.5)', opacity: 1, offset: 0.15 },
          { transform: 'scaleX(0.8)', opacity: 0.8, offset: 0.6 },
          { transform: 'scaleX(0)', opacity: 0 }
        ], { duration: 600 / speedMult });
        pillarAnim.onfinish = () => pillar.remove();

        // Golden cross slash
        setTimeout(() => {
          const slash1 = document.createElement('div');
          slash1.style.position = 'fixed';
          slash1.style.left = `${tx - 60}px`;
          slash1.style.top = `${ty - 4}px`;
          slash1.style.width = '120px';
          slash1.style.height = '8px';
          slash1.style.background = 'linear-gradient(to right, transparent, #fbbf24, #fff, #fbbf24, transparent)';
          slash1.style.boxShadow = '0 0 15px #fbbf24';
          slash1.style.zIndex = '9999';
          slash1.style.pointerEvents = 'none';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(slash1);

          const slash1Anim = slash1.animate([
            { transform: 'rotate(-45deg) scaleX(0)', opacity: 0 },
            { transform: 'rotate(-45deg) scaleX(1.3)', opacity: 1, offset: 0.3 },
            { transform: 'rotate(-45deg) scaleX(1.5)', opacity: 0 }
          ], { duration: 300 / speedMult, easing: 'ease-out' });
          slash1Anim.onfinish = () => slash1.remove();

          // Second cross slash
          setTimeout(() => {
            const slash2 = document.createElement('div');
            slash2.style.position = 'fixed';
            slash2.style.left = `${tx - 60}px`;
            slash2.style.top = `${ty - 4}px`;
            slash2.style.width = '120px';
            slash2.style.height = '8px';
            slash2.style.background = 'linear-gradient(to right, transparent, #f59e0b, #fef08a, #f59e0b, transparent)';
            slash2.style.boxShadow = '0 0 15px #f59e0b';
            slash2.style.zIndex = '9999';
            slash2.style.pointerEvents = 'none';
            (document.getElementById('battle-effects-layer') || document.body).appendChild(slash2);

            const slash2Anim = slash2.animate([
              { transform: 'rotate(45deg) scaleX(0)', opacity: 0 },
              { transform: 'rotate(45deg) scaleX(1.3)', opacity: 1, offset: 0.3 },
              { transform: 'rotate(45deg) scaleX(1.5)', opacity: 0 }
            ], { duration: 300 / speedMult, easing: 'ease-out' });
            slash2Anim.onfinish = () => slash2.remove();
          }, 80 / speedMult);

          // Impact burst + sparkles
          setTimeout(() => {
            const burst = document.createElement('div');
            burst.style.position = 'fixed';
            burst.style.left = `${tx - 50}px`;
            burst.style.top = `${ty - 50}px`;
            burst.style.width = '100px';
            burst.style.height = '100px';
            burst.style.borderRadius = '50%';
            burst.style.background = 'radial-gradient(circle, rgba(255,255,255,0.9), rgba(251,191,36,0.5), transparent)';
            burst.style.zIndex = '9999';
            burst.style.pointerEvents = 'none';
            burst.style.mixBlendMode = 'screen';
            (document.getElementById('battle-effects-layer') || document.body).appendChild(burst);

            const burstAnim = burst.animate([
              { transform: 'scale(0.3)', opacity: 1 },
              { transform: 'scale(1.5)', opacity: 0 }
            ], { duration: 300 / speedMult, easing: 'ease-out' });
            burstAnim.onfinish = () => burst.remove();

            createSparkles(tx, ty, '#fbbf24');
            if (onImpact) onImpact(target, index);
          }, 150 / speedMult);
        }, 150 / speedMult);

      }, index * 100 / speedMult);
    });

  // ─── Divine Shield ──────────────────────────────────────────
  } else if (type === 'divine_shield') {
    targets.forEach((target, index) => {
      setTimeout(() => {
        const targetEl = document.getElementById(target.elementId);
        if (!targetEl) { if (onImpact) onImpact(target, index); return; }
        const targetRect = targetEl.getBoundingClientRect();
        const tx = targetRect.left + targetRect.width / 2;
        const ty = targetRect.top + targetRect.height / 2;

        // Shield hexagon barrier
        const shield = document.createElement('div');
        shield.style.position = 'fixed';
        shield.style.left = `${tx - 40}px`;
        shield.style.top = `${ty - 45}px`;
        shield.style.width = '80px';
        shield.style.height = '90px';
        shield.style.clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
        shield.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(251,191,36,0.4), rgba(59,130,246,0.3))';
        shield.style.boxShadow = '0 0 20px rgba(251,191,36,0.4), inset 0 0 15px rgba(59,130,246,0.3)';
        shield.style.zIndex = '9998';
        shield.style.pointerEvents = 'none';
        (document.getElementById('battle-effects-layer') || document.body).appendChild(shield);

        const shieldAnim = shield.animate([
          { transform: 'scale(0) rotate(-30deg)', opacity: 0 },
          { transform: 'scale(1.2) rotate(0deg)', opacity: 1, offset: 0.3 },
          { transform: 'scale(1) rotate(0deg)', opacity: 0.8, offset: 0.7 },
          { transform: 'scale(1.1) rotate(0deg)', opacity: 0 }
        ], { duration: 800 / speedMult, easing: 'ease-out' });
        shieldAnim.onfinish = () => shield.remove();

        // Outer golden ring
        const ring = document.createElement('div');
        ring.style.position = 'fixed';
        ring.style.left = `${tx - 50}px`;
        ring.style.top = `${ty - 50}px`;
        ring.style.width = '100px';
        ring.style.height = '100px';
        ring.style.borderRadius = '50%';
        ring.style.border = '3px solid rgba(251,191,36,0.6)';
        ring.style.boxShadow = '0 0 15px rgba(59,130,246,0.4)';
        ring.style.zIndex = '9997';
        ring.style.pointerEvents = 'none';
        (document.getElementById('battle-effects-layer') || document.body).appendChild(ring);

        const ringAnim = ring.animate([
          { transform: 'scale(0.5)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1, offset: 0.3 },
          { transform: 'scale(1.3)', opacity: 0 }
        ], { duration: 600 / speedMult, easing: 'ease-out' });
        ringAnim.onfinish = () => ring.remove();

        setTimeout(() => {
          createSparkles(tx, ty, '#60a5fa', 6);
          if (onImpact) onImpact(target, index);
        }, 400 / speedMult);
      }, index * 100 / speedMult);
    });

  // ─── Sanctuary ──────────────────────────────────────────────
  } else if (type === 'sanctuary') {
    // Caster golden aura burst
    const aura = document.createElement('div');
    aura.style.position = 'fixed';
    aura.style.left = `${cx - 60}px`;
    aura.style.top = `${cy - 60}px`;
    aura.style.width = '120px';
    aura.style.height = '120px';
    aura.style.borderRadius = '50%';
    aura.style.background = 'radial-gradient(circle, rgba(251,191,36,0.6), rgba(245,158,11,0.3), transparent)';
    aura.style.boxShadow = '0 0 30px rgba(251,191,36,0.5)';
    aura.style.zIndex = '9997';
    aura.style.pointerEvents = 'none';
    aura.style.mixBlendMode = 'screen';
    (document.getElementById('battle-effects-layer') || document.body).appendChild(aura);

    const auraAnim = aura.animate([
      { transform: 'scale(0)', opacity: 0 },
      { transform: 'scale(1.5)', opacity: 1, offset: 0.3 },
      { transform: 'scale(3)', opacity: 0 }
    ], { duration: 800 / speedMult, easing: 'ease-out' });
    auraAnim.onfinish = () => aura.remove();

    targets.forEach((target, index) => {
      setTimeout(() => {
        const targetEl = document.getElementById(target.elementId);
        if (!targetEl) { if (onImpact) onImpact(target, index); return; }
        const targetRect = targetEl.getBoundingClientRect();
        const tx = targetRect.left + targetRect.width / 2;
        const ty = targetRect.top + targetRect.height / 2;

        // Healing pillar (green-gold)
        const pillar = document.createElement('div');
        pillar.style.position = 'fixed';
        pillar.style.left = `${tx - 25}px`;
        pillar.style.top = `${ty - 60}px`;
        pillar.style.width = '50px';
        pillar.style.height = '120px';
        pillar.style.background = 'linear-gradient(to top, rgba(74,222,128,0), rgba(74,222,128,0.6), rgba(251,191,36,0.4), rgba(255,255,255,0.8))';
        pillar.style.borderRadius = '50%';
        pillar.style.filter = 'drop-shadow(0 0 8px #4ade80)';
        pillar.style.zIndex = '9998';
        pillar.style.pointerEvents = 'none';
        pillar.style.mixBlendMode = 'screen';
        (document.getElementById('battle-effects-layer') || document.body).appendChild(pillar);

        const pillarAnim = pillar.animate([
          { transform: 'scaleY(0)', opacity: 0, transformOrigin: 'bottom' },
          { transform: 'scaleY(1)', opacity: 1, offset: 0.3, transformOrigin: 'bottom' },
          { transform: 'scaleY(1.2)', opacity: 0, transformOrigin: 'bottom' }
        ], { duration: 600 / speedMult, easing: 'ease-out' });
        pillarAnim.onfinish = () => pillar.remove();

        // Rune circle at feet
        const rune = document.createElement('div');
        rune.style.position = 'fixed';
        rune.style.left = `${tx - 30}px`;
        rune.style.top = `${ty + 10}px`;
        rune.style.width = '60px';
        rune.style.height = '60px';
        rune.style.border = '2px solid rgba(251,191,36,0.7)';
        rune.style.borderRadius = '50%';
        rune.style.boxShadow = '0 0 10px rgba(74,222,128,0.5), inset 0 0 8px rgba(251,191,36,0.3)';
        rune.style.transform = 'rotateX(60deg)';
        rune.style.zIndex = '9997';
        rune.style.pointerEvents = 'none';
        (document.getElementById('battle-effects-layer') || document.body).appendChild(rune);

        const runeAnim = rune.animate([
          { transform: 'rotateX(60deg) scale(0)', opacity: 0 },
          { transform: 'rotateX(60deg) scale(1)', opacity: 1, offset: 0.3 },
          { transform: 'rotateX(60deg) scale(1.3)', opacity: 0 }
        ], { duration: 800 / speedMult, easing: 'ease-out' });
        runeAnim.onfinish = () => rune.remove();

        setTimeout(() => {
          createSparkles(tx, ty, '#4ade80', 6);
          if (onImpact) onImpact(target, index);
        }, 300 / speedMult);
      }, (300 + index * 80) / speedMult);
    });

  } else {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
  }
};

export const paladin = {
  id: 'paladin',
  name: 'パラディン',
  icon: 'local_police',
  changeCost: 500000,
  requirements: [
    { jobId: 'knight', level: 50 },
    { jobId: 'priest', level: 50 }
  ],
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'holy_smite', name: 'ホーリースマイト', icon: 'bolt', statDependency: 'ATK',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 14, multiplier: 1.0, matkRatio: 0.30, drainPercent: 20 },
        { level:  2, spCost: 1, mpCost: 16, multiplier: 1.1, matkRatio: 0.33, drainPercent: 22 },
        { level:  3, spCost: 1, mpCost: 18, multiplier: 1.2, matkRatio: 0.36, drainPercent: 24 },
        { level:  4, spCost: 2, mpCost: 20, multiplier: 1.3, matkRatio: 0.40, drainPercent: 26 },
        { level:  5, spCost: 2, mpCost: 22, multiplier: 1.4, matkRatio: 0.43, drainPercent: 28 },
        { level:  6, spCost: 2, mpCost: 24, multiplier: 1.5, matkRatio: 0.46, drainPercent: 30 },
        { level:  7, spCost: 3, mpCost: 26, multiplier: 1.6, matkRatio: 0.50, drainPercent: 35 },
        { level:  8, spCost: 3, mpCost: 28, multiplier: 1.7, matkRatio: 0.53, drainPercent: 40 },
        { level:  9, spCost: 3, mpCost: 30, multiplier: 1.8, matkRatio: 0.56, drainPercent: 45 },
        { level: 10, spCost: 5, mpCost: 36, multiplier: 2.0, matkRatio: 0.60, drainPercent: 50 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵単体に ATK ${lc.multiplier.toFixed(1)} 倍 ＋ MATK ${(lc.matkRatio * 100).toFixed(0)}% の複合光属性ダメージを与え、与ダメージの ${lc.drainPercent}% を HP として吸収する`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (!target) return;

        playSkillAnimation(caster, [target], 'holy_smite', () => {
          if (target.isDead) return;

          // Temporarily add MATK component to ATK for composite damage
          const originalAtk = caster.stats.atk;
          caster.stats.atk = Math.floor((caster.stats.atk || 0) + (caster.stats.matk || 0) * levelConfig.matkRatio);

          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency,
            actionName: 'ホーリースマイト',
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            element: 'light',
            hideActionName: true
          });

          // Restore original ATK
          caster.stats.atk = originalAtk;

          // Self-heal (HP drain based on ATK + MATK)
          const baseHeal = Math.floor(((caster.stats.atk || 0) + (caster.stats.matk || 0)) * levelConfig.drainPercent / 100);
          const healAmt = Math.max(1, baseHeal);
          const maxHp = caster.stats?.hp || caster.hp.max;
          caster.hp.current = Math.min(maxHp, caster.hp.current + healAmt);
          battle.showDamage(caster.elementId, `+${healAmt}`, 'text-green-400');
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let target = context.selectedEnemyTarget;
          if (!target || target.isDead) target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          const hpRatio = caster.hp.current / (caster.stats?.hp || caster.hp.max);
          // Higher priority when HP is lower (self-sustain value)
          const hpBonus = hpRatio < 0.6 ? 20 : 0;
          return { target, score: 50 * levelConfig.multiplier + hpBonus };
        }
      }
    },
    {
      id: 'divine_shield', name: 'ディバインシールド', icon: 'verified_user',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 80, barrierPercent: 10, turns: 2 },
        { level:  2, spCost: 1, mpCost: 85, barrierPercent: 13, turns: 2 },
        { level:  3, spCost: 1, mpCost: 90, barrierPercent: 16, turns: 2 },
        { level:  4, spCost: 2, mpCost: 95, barrierPercent: 19, turns: 3 },
        { level:  5, spCost: 2, mpCost: 100, barrierPercent: 22, turns: 3 },
        { level:  6, spCost: 2, mpCost: 105, barrierPercent: 25, turns: 3 },
        { level:  7, spCost: 3, mpCost: 110, barrierPercent: 28, turns: 4 },
        { level:  8, spCost: 3, mpCost: 115, barrierPercent: 32, turns: 4 },
        { level:  9, spCost: 3, mpCost: 120, barrierPercent: 36, turns: 4 },
        { level: 10, spCost: 5, mpCost: 130, barrierPercent: 40, turns: 5 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、味方全体に、対象の味方の最大 HP の ${lc.barrierPercent}% のバリアを ${lc.turns} ターン付与する`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targetGroup = battle.enemies.includes(caster) ? battle.enemies : battle.party;
        const aliveParty = targetGroup.filter(p => !p.isDead);
        if (aliveParty.length === 0) return;

        playSkillAnimation(caster, aliveParty, 'divine_shield', (target) => {
          if (target.isDead) return;
          
          const maxHp = target.stats?.hp || target.hp?.max || target.maxHp || 1;
          const barrierAmt = Math.floor(maxHp * levelConfig.barrierPercent / 100);
          
          target._barrierHp = (target._barrierHp || 0) + barrierAmt;
          target._barrierTurns = levelConfig.turns;
          battle.showDamage(target.elementId, `BARRIER +${barrierAmt}`, 'text-blue-300');

          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveParty = context.party.filter(p => !p.isDead);
          if (aliveParty.length === 0) return null;
          
          const noBarrier = aliveParty.every(p => !p._barrierHp || p._barrierHp <= 0);
          if (noBarrier) return { target: caster, score: 80 };
          return null;
        }
      }
    },
    {
      id: 'sanctuary', name: 'サンクチュアリ', icon: 'spa',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 38, regenHp:  45, turns: 3, statusResist:  0 },
        { level:  2, spCost: 1, mpCost: 40, regenHp:  60, turns: 3, statusResist:  0 },
        { level:  3, spCost: 1, mpCost: 52, regenHp:  75, turns: 3, statusResist:  5 },
        { level:  4, spCost: 2, mpCost: 54, regenHp:  85, turns: 3, statusResist:  5 },
        { level:  5, spCost: 2, mpCost: 66, regenHp: 105, turns: 4, statusResist: 10 },
        { level:  6, spCost: 2, mpCost: 78, regenHp: 125, turns: 4, statusResist: 10 },
        { level:  7, spCost: 3, mpCost: 80, regenHp: 150, turns: 4, statusResist: 15 },
        { level:  8, spCost: 3, mpCost: 84, regenHp: 185, turns: 5, statusResist: 15 },
        { level:  9, spCost: 3, mpCost: 88, regenHp: 200, turns: 5, statusResist: 20 },
        { level: 10, spCost: 5, mpCost: 94, regenHp: 250, turns: 5, statusResist: 25 }
      ],
      getDescription: (lc) => {
        let desc = `MP を ${lc.mpCost} 消費し、味方全体に ${lc.turns} ターンの間、毎ターン HP ${lc.regenHp} 回復するリジェネを付与する`;
        if (lc.statusResist > 0) desc += `。さらに状態異常耐性が ${lc.statusResist}% アップ`;
        return desc;
      },
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targetGroup = battle.enemies.includes(caster) ? battle.enemies : battle.party;
        const aliveParty = targetGroup.filter(p => !p.isDead);
        if (aliveParty.length === 0) return;

        playSkillAnimation(caster, aliveParty, 'sanctuary', (target) => {
          if (target.isDead) return;
          // Apply regen
          target._regenHp = levelConfig.regenHp;
          target._regenTurns = levelConfig.turns;
          battle.showDamage(target.elementId, 'REGEN', 'text-green-300');

          // Apply status ailment resistance if level is high enough
          if (levelConfig.statusResist > 0) {
            target._ailmentResistBuffAmount = levelConfig.statusResist;
            target._ailmentResistBuffTurns = levelConfig.turns;
          }
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveParty = context.party.filter(p => !p.isDead);
          if (aliveParty.length === 0) return null;
          // Use when party doesn't have regen and is somewhat damaged
          const hasRegen = aliveParty.some(p => p._regenTurns && p._regenTurns > 0);
          if (hasRegen) return null;
          let totalMissingHpPercent = 0;
          for (const p of aliveParty) {
            const hpPercent = p.hp !== undefined ? (p.hp.current / (p.stats?.hp || p.hp.max)) : (p.currentHp / (p.stats?.hp || p.maxHp));
            totalMissingHpPercent += (1 - hpPercent);
          }
          if (totalMissingHpPercent > 0.3) {
            return { target: caster, score: 70 + totalMissingHpPercent * 30 };
          }
          // Still use proactively at start of tough fights
          return { target: caster, score: 45 };
        }
      }
    },
    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'holy_protection', name: '聖なる加護', icon: 'security', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, bonusHpPercent:  3, bonusMdefPercent:  5 },
        { level:  2, spCost: 1, mpCost: 0, bonusHpPercent:  5, bonusMdefPercent:  8 },
        { level:  3, spCost: 1, mpCost: 0, bonusHpPercent:  7, bonusMdefPercent: 11 },
        { level:  4, spCost: 2, mpCost: 0, bonusHpPercent:  9, bonusMdefPercent: 14 },
        { level:  5, spCost: 2, mpCost: 0, bonusHpPercent: 12, bonusMdefPercent: 17 },
        { level:  6, spCost: 2, mpCost: 0, bonusHpPercent: 14, bonusMdefPercent: 20 },
        { level:  7, spCost: 3, mpCost: 0, bonusHpPercent: 17, bonusMdefPercent: 23 },
        { level:  8, spCost: 3, mpCost: 0, bonusHpPercent: 19, bonusMdefPercent: 26 },
        { level:  9, spCost: 3, mpCost: 0, bonusHpPercent: 22, bonusMdefPercent: 29 },
        { level: 10, spCost: 5, mpCost: 0, bonusHpPercent: 25, bonusMdefPercent: 33 }
      ],
      getDescription: (lc) => `最大 HP の倍率が ${lc.bonusHpPercent}%、魔法防御力の倍率が ${lc.bonusMdefPercent}% 上昇する`
    },
    {
      id: 'auto_guard', name: 'オートガード', icon: 'shield_person', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, guardChance:  8 },
        { level:  2, spCost: 1, mpCost: 0, guardChance: 11 },
        { level:  3, spCost: 1, mpCost: 0, guardChance: 14 },
        { level:  4, spCost: 2, mpCost: 0, guardChance: 17 },
        { level:  5, spCost: 2, mpCost: 0, guardChance: 20 },
        { level:  6, spCost: 2, mpCost: 0, guardChance: 23 },
        { level:  7, spCost: 3, mpCost: 0, guardChance: 26 },
        { level:  8, spCost: 3, mpCost: 0, guardChance: 29 },
        { level:  9, spCost: 3, mpCost: 0, guardChance: 32 },
        { level: 10, spCost: 5, mpCost: 0, guardChance: 35 }
      ],
      getDescription: (lc) => `盾を装備している場合、${lc.guardChance}% の確率で味方へのダメージを半減して肩代わりする`
    }
  ]
};
