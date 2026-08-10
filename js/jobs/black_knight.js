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
    // 詠唱者の暗黒オーラ（溜め）
    const darkFlash = document.createElement('div');
    darkFlash.style.position = 'fixed';
    darkFlash.style.left = `${cx - 60}px`;
    darkFlash.style.top = `${cy - 60}px`;
    darkFlash.style.width = '120px';
    darkFlash.style.height = '120px';
    darkFlash.style.borderRadius = '50%';
    darkFlash.style.background = 'radial-gradient(circle, rgba(147,51,234,0.8), rgba(88,28,135,0.4), transparent)';
    darkFlash.style.boxShadow = '0 0 20px #9333ea';
    darkFlash.style.zIndex = '9997';
    darkFlash.style.pointerEvents = 'none';
    (document.getElementById('battle-effects-layer') || document.body).appendChild(darkFlash);

    const flashAnim = darkFlash.animate([
      { transform: 'scale(0.5)', opacity: 1 },
      { transform: 'scale(1.5)', opacity: 0 }
    ], { duration: 300 / speedMult, easing: 'ease-out' });
    flashAnim.onfinish = () => darkFlash.remove();

    targets.forEach((target, index) => {
      // 対象ごとにタイミングを少しずらして「薙ぎ払い」感を出す
      setTimeout(() => {
        const targetEl = document.getElementById(target.elementId);
        if (!targetEl) { if (onImpact) onImpact(target, index); return; }
        const targetRect = targetEl.getBoundingClientRect();
        const tx = targetRect.left + targetRect.width / 2;
        const ty = targetRect.top + targetRect.height / 2;

        // 闇の斬撃（巨大な横薙ぎ）
        const sweep = document.createElement('div');
        sweep.style.position = 'fixed';
        sweep.style.left = `${tx - 150}px`; // 幅広の斬撃
        sweep.style.top = `${ty - 10}px`;
        sweep.style.width = '300px';
        sweep.style.height = '20px';
        sweep.style.background = 'linear-gradient(to right, transparent, #4c1d95, #a855f7, #d8b4fe, #a855f7, #4c1d95, transparent)';
        sweep.style.boxShadow = '0 0 15px #a855f7, 0 0 30px #581c87';
        sweep.style.borderRadius = '50%'; // 曲線的なエフェクトに
        sweep.style.zIndex = '9999';
        sweep.style.pointerEvents = 'none';
        (document.getElementById('battle-effects-layer') || document.body).appendChild(sweep);

        // 左から右へ振り抜くようなアニメーション
        const sweepAnim = sweep.animate([
          { transform: 'translateX(-60px) rotate(-10deg) scaleX(0.2) scaleY(0.5)', opacity: 0 },
          { transform: 'translateX(0px) rotate(-5deg) scaleX(1.2) scaleY(1.5)', opacity: 1, offset: 0.3 },
          { transform: 'translateX(60px) rotate(0deg) scaleX(1.5) scaleY(0.2)', opacity: 0 }
        ], { duration: 350 / speedMult, easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)' });
        sweepAnim.onfinish = () => sweep.remove();

        // 斬撃のインパクト火花
        for (let s = 0; s < 4; s++) {
          const spark = document.createElement('div');
          spark.style.position = 'fixed';
          spark.style.left = `${tx - 3}px`;
          spark.style.top = `${ty - 3}px`;
          spark.style.width = '6px';
          spark.style.height = '6px';
          spark.style.backgroundColor = '#d8b4fe';
          spark.style.boxShadow = '0 0 8px #a855f7';
          spark.style.borderRadius = '50%';
          spark.style.zIndex = '9999';
          spark.style.pointerEvents = 'none';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(spark);

          const angle = (Math.PI * 2 / 4) * s + Math.random() * 0.5;
          const dist = 30 + Math.random() * 40;
          const sparkAnim = spark.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) scale(0)`, opacity: 0 }
          ], { duration: 300 / speedMult, easing: 'ease-out' });
          sparkAnim.onfinish = () => spark.remove();
        }

        // アニメーションの一番太くなるタイミング(offset:0.3付近)でダメージ判定を発生させる
        setTimeout(() => {
          if (onImpact) onImpact(target, index);
        }, 100 / speedMult);

      }, (150 + index * 80) / speedMult); // 詠唱開始から150ms後に順次斬撃開始
    });

  // ─── Hell Gate ───────────────────────────────────────────────
  } else if (type === 'hell_gate') {
    targets.forEach((target, index) => {
      setTimeout(() => {
        const targetEl = document.getElementById(target.elementId);
        if (!targetEl) { if (onImpact) onImpact(target, index); return; }
        const targetRect = targetEl.getBoundingClientRect();
        const tx = targetRect.left + targetRect.width / 2;
        const ty = targetRect.top + targetRect.height / 2;

        if (!document.hidden && battleSpeed < 5) {
          const spear = document.createElement('div');
          spear.style.position = 'fixed';
          spear.style.left = `${cx}px`;
          spear.style.top = `${cy}px`;
          spear.style.width = '140px';
          spear.style.height = '12px';
          spear.style.background = 'linear-gradient(to right, transparent, #3b0764, #7e22ce, #c084fc)';
          spear.style.boxShadow = '0 0 15px #7e22ce';
          spear.style.borderRadius = '0 50% 50% 0';
          spear.style.zIndex = '9999';
          spear.style.pointerEvents = 'none';

          const tip = document.createElement('div');
          tip.style.position = 'absolute';
          tip.style.right = '-10px';
          tip.style.top = '-8px';
          tip.style.borderTop = '14px solid transparent';
          tip.style.borderBottom = '14px solid transparent';
          tip.style.borderLeft = '28px solid #c084fc';
          spear.appendChild(tip);

          (document.getElementById('battle-effects-layer') || document.body).appendChild(spear);

          const angle = Math.atan2(ty - cy, tx - cx);
          const distance = Math.hypot(tx - cx, ty - cy);
          
          const anim = spear.animate([
            { transform: `translate(-50%, -50%) rotate(${angle}rad) translateX(0) scale(0)`, opacity: 0 },
            { transform: `translate(-50%, -50%) rotate(${angle}rad) translateX(50px) scale(1)`, opacity: 1, offset: 0.3 },
            { transform: `translate(-50%, -50%) rotate(${angle}rad) translateX(${distance}px) scale(1)`, opacity: 1 }
          ], { duration: 300 / speedMult, easing: 'ease-in' });

          anim.onfinish = () => spear.remove();
          
        }

        setTimeout(() => {
          if (onImpact) onImpact(target, index);
        }, 300 / speedMult);

      }, index * 100 / speedMult);
    });

  } else {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
  }
};

// ─── HP 消費ヘルパー ──────────────────────────────────────────
const consumeHp = (caster, percent, battle) => {
  const maxHp = caster.stats?.hp || caster.hp.max;
  const requestedCost = Math.max(1, Math.floor(maxHp * percent / 100));
  const actualCost = Math.min(requestedCost, Math.max(0, caster.hp.current - 1));
  caster.hp.current -= actualCost; // HP消費では戦闘不能にならない
  if (actualCost > 0) {
    battle.showDamage(caster.elementId, `-${actualCost} HP`, 'text-red-400');
  }
  battle.renderEntities();
  return actualCost;
};

export const black_knight = {
  id: 'black_knight',
  name: 'ブラックナイト',
  icon: 'swords',
  changeCost: 500000,
  requirements: [
    { jobId: 'knight', level: 100 },
    { jobId: 'dancer', level: 100 }
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
          if (caster.isDead || target.isDead) return;
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
          if (caster.mp.current < (context.getEffectiveMpCost?.(caster, levelConfig.mpCost) ?? levelConfig.mpCost)) return null;
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
        { level: 10, spCost: 5, mpCost: 30, multiplier: 0.90, minHits: 6, maxHits: 11 }
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
                if (caster.isDead || target.isDead) return;
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
          if (caster.mp.current < (context.getEffectiveMpCost?.(caster, levelConfig.mpCost) ?? levelConfig.mpCost)) return null;
          
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
          if (caster.isDead || target.isDead) return;

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

          // 攻撃で倒した対象へ、戦闘不能後にデバフや呪いを再付与しない
          if (target.isDead) return;

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
          
          if (caster.mp.current < (context.getEffectiveMpCost?.(caster, levelConfig.mpCost) ?? levelConfig.mpCost)) return null;
          
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
          if (caster.isDead || target.isDead) return;
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
          if (caster.mp.current < (context.getEffectiveMpCost?.(caster, levelConfig.mpCost) ?? levelConfig.mpCost)) return null;
          
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
      limitBreakMinimums: { curseDamageMultiplier: 0.5, curseRecoilMultiplier: 0.1 },
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
