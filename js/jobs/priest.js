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

  const screenShake = (intensity = 5, duration = 300) => {
    // Screen shake disabled globally by user request
  };

  const createSparkles = (x, y, color = '#4ade80') => {
    for (let i = 0; i < 8; i++) {
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

      const angle = (Math.PI * 2 / 8) * i;
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

  targets.forEach((target, index) => {
    const targetEl = document.getElementById(target.elementId);
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    if (targetEl) {
      const targetRect = targetEl.getBoundingClientRect();
      tx = targetRect.left + targetRect.width / 2;
      ty = targetRect.top + targetRect.height / 2;
    } else {
      if (type !== 'raise') {
        if (onImpact) onImpact(target, index);
        return;
      }
    }

    setTimeout(() => {
      switch (type) {
        case 'heal':
        case 'all_heal': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 40}px`;
          el.style.top = `${ty - 80}px`;
          el.style.width = '80px';
          el.style.height = '160px';
          el.style.background = 'linear-gradient(to top, rgba(74, 222, 128, 0), rgba(74, 222, 128, 0.8), rgba(255, 255, 255, 1))';
          el.style.borderRadius = '50%';
          el.style.filter = 'drop-shadow(0 0 10px #4ade80)';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          el.style.mixBlendMode = 'screen';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(el);

          const anim = el.animate([
            { transform: 'scaleY(0)', opacity: 0, transformOrigin: 'bottom' },
            { transform: 'scaleY(1)', opacity: 1, offset: 0.3, transformOrigin: 'bottom' },
            { transform: 'scaleY(1.2)', opacity: 0, transformOrigin: 'bottom' }
          ], { duration: 600 / speedMult, easing: 'ease-out' });

          anim.onfinish = () => el.remove();
          
          setTimeout(() => {
            createSparkles(tx, ty, '#4ade80');
            if (onImpact) onImpact(target, index);
          }, 200 / speedMult);
          break;
        }
        case 'raise': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 50}px`;
          el.style.top = `${ty - 100}px`;
          el.style.width = '100px';
          el.style.height = '200px';
          el.style.background = 'radial-gradient(ellipse at center, #fef08a, #ca8a04, transparent)';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          el.style.mixBlendMode = 'screen';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(el);

          const anim = el.animate([
            { transform: 'scaleX(0)', opacity: 0 },
            { transform: 'scaleX(1.5)', opacity: 1, offset: 0.5 },
            { transform: 'scaleX(0)', opacity: 0 }
          ], { duration: 800 / speedMult, easing: 'ease-in-out' });

          anim.onfinish = () => el.remove();

          setTimeout(() => {
            createSparkles(tx, ty, '#fef08a');
            if (onImpact) onImpact(target, index);
          }, 400 / speedMult);
          break;
        }
        case 'restore': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 60}px`;
          el.style.top = `${ty - 60}px`;
          el.style.width = '120px';
          el.style.height = '120px';
          el.style.borderRadius = '50%';
          el.style.border = '8px solid #a7f3d0';
          el.style.boxShadow = '0 0 20px #34d399 inset, 0 0 20px #34d399';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(el);

          const anim = el.animate([
            { transform: 'scale(0)', opacity: 1 },
            { transform: 'scale(1.5)', opacity: 0 }
          ], { duration: 500 / speedMult, easing: 'ease-out' });

          anim.onfinish = () => el.remove();
          
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 250 / speedMult);
          break;
        }
        case 'holy': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 40}px`;
          el.style.top = `0px`;
          el.style.width = '80px';
          el.style.height = `${ty + 40}px`;
          el.style.background = 'linear-gradient(to right, transparent, #fff, #fef08a, #fff, transparent)';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          el.style.mixBlendMode = 'screen';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(el);

          const anim = el.animate([
            { transform: 'scaleX(0)', opacity: 0 },
            { transform: 'scaleX(2)', opacity: 1, offset: 0.1 },
            { transform: 'scaleX(0.5)', opacity: 1, offset: 0.8 },
            { transform: 'scaleX(0)', opacity: 0 }
          ], { duration: 600 / speedMult });

          anim.onfinish = () => el.remove();

          setTimeout(() => {
            screenShake(6, 400);
            const ex = document.createElement('div');
            ex.style.position = 'fixed';
            ex.style.left = `${tx - 100}px`;
            ex.style.top = `${ty - 100}px`;
            ex.style.width = '200px';
            ex.style.height = '200px';
            ex.style.borderRadius = '50%';
            ex.style.background = 'radial-gradient(circle, #fff, #fef08a, transparent)';
            ex.style.zIndex = '9999';
            ex.style.pointerEvents = 'none';
            ex.style.mixBlendMode = 'screen';
            (document.getElementById('battle-effects-layer') || document.body).appendChild(ex);

            const exAnim = ex.animate([
              { transform: 'scale(0.5)', opacity: 1 },
              { transform: 'scale(1.5)', opacity: 0 }
            ], { duration: 500 / speedMult, easing: 'ease-out' });
            exAnim.onfinish = () => ex.remove();

            if (onImpact) onImpact(target, index);
          }, 100 / speedMult);
          break;
        }
      }
    }, index * 100 / speedMult);
  });
};

export const priest = {
  id: 'priest',
  name: 'プリースト',
  icon: 'health_and_safety',
  changeCost: 30000,
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'heal', name: 'ヒール', icon: 'healing',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 6, healAmount: 30 },
        { level:  2, spCost: 1, mpCost: 8, healAmount: 45 },
        { level:  3, spCost: 1, mpCost: 10, healAmount: 60 },
        { level:  4, spCost: 2, mpCost: 12, healAmount: 80 },
        { level:  5, spCost: 2, mpCost: 14, healAmount: 100 },
        { level:  6, spCost: 2, mpCost: 16, healAmount: 125 },
        { level:  7, spCost: 3, mpCost: 18, healAmount: 150 },
        { level:  8, spCost: 3, mpCost: 22, healAmount: 180 },
        { level:  9, spCost: 3, mpCost: 26, healAmount: 220 },
        { level: 10, spCost: 5, mpCost: 30, healAmount: 260 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、HPが最も減っている味方単体の HP を ${lc.healAmount} 回復する`,
      execute(caster, levelConfig, battle, options = {}) {
        if (!battle) return;
        let targetGroup = battle.party;
        if (battle.selectedEnemyTarget && battle.enemies.includes(battle.selectedEnemyTarget)) {
          targetGroup = battle.enemies;
        }
        const aliveParty = targetGroup.filter(p => !p.isDead);
        if (aliveParty.length === 0) return;
        
        let target;
        if (options.autoTarget && aliveParty.includes(options.autoTarget)) {
          target = options.autoTarget;
        } else {
          // Find ally with lowest HP percentage
          target = aliveParty[0];
          let lowestHpPercent = target.hp !== undefined ? (target.hp.current / (target.stats?.hp || target.hp.max)) : (target.currentHp / (target.stats?.hp || target.maxHp));
          for (const p of aliveParty) {
            const hpPercent = p.hp !== undefined ? (p.hp.current / (p.stats?.hp || p.hp.max)) : (p.currentHp / (p.stats?.hp || p.maxHp));
            if (hpPercent < lowestHpPercent) {
              lowestHpPercent = hpPercent;
              target = p;
            }
          }
        }

        playSkillAnimation(caster, [target], 'heal', () => {
          if (target.isDead) return;
          if (target.hp !== undefined) {
            target.hp.current = Math.min(target.stats?.hp || target.hp.max, target.hp.current + levelConfig.healAmount);
          } else {
            target.currentHp = Math.min(target.stats?.hp || target.maxHp, target.currentHp + levelConfig.healAmount);
          }
          battle.showDamage(target.elementId, `+${levelConfig.healAmount}`, 'text-green-400');
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveParty = context.party.filter(p => !p.isDead);
          if (aliveParty.length === 0) return null;
          let bestTarget = null;
          let bestScore = 0;
          for (const p of aliveParty) {
            const hpPercent = p.hp !== undefined ? (p.hp.current / (p.stats?.hp || p.hp.max)) : (p.currentHp / (p.stats?.hp || p.maxHp));
            if (hpPercent < 0.8) {
              const score = (1 - hpPercent) * 150;
              if (score > bestScore) {
                bestScore = score;
                bestTarget = p;
              }
            }
          }
          if (bestScore > 0) return { target: bestTarget, score: bestScore };
          return null;
        }
      }
    },
    {
      id: 'raise', name: 'レイズ', icon: 'settings_backup_restore',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 20, revivePercent: 10 },
        { level:  2, spCost: 2, mpCost: 24, revivePercent: 14 },
        { level:  3, spCost: 2, mpCost: 28, revivePercent: 18 },
        { level:  4, spCost: 3, mpCost: 32, revivePercent: 22 },
        { level:  5, spCost: 3, mpCost: 36, revivePercent: 26 },
        { level:  6, spCost: 3, mpCost: 40, revivePercent: 31 },
        { level:  7, spCost: 4, mpCost: 44, revivePercent: 35 },
        { level:  8, spCost: 4, mpCost: 48, revivePercent: 40 },
        { level:  9, spCost: 4, mpCost: 52, revivePercent: 45 },
        { level: 10, spCost: 5, mpCost: 60, revivePercent: 50 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、戦闘不能の味方単体を HP ${lc.revivePercent}% で蘇生する`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let targetGroup = battle.party;
        if (battle.selectedEnemyTarget && battle.enemies.includes(battle.selectedEnemyTarget)) {
          targetGroup = battle.enemies;
        }
        const deadParty = targetGroup.filter(p => p.isDead);
        if (deadParty.length === 0) {
          battle.showActionName(caster.elementId, 'MISS', 'text-gray-400', 'border-gray-500/50');
          return;
        }
        
        const target = deadParty[Math.floor(Math.random() * deadParty.length)];
        playSkillAnimation(caster, [target], 'raise', () => {
          target.isDead = false;
          if (target.hp !== undefined) {
            const maxHp = target.stats?.hp || target.hp.max;
            target.hp.current = Math.max(1, Math.floor(maxHp * (levelConfig.revivePercent / 100)));
          } else {
            const maxHp = target.stats?.hp || target.maxHp;
            target.currentHp = Math.max(1, Math.floor(maxHp * (levelConfig.revivePercent / 100)));
          }
          target.atb = 0; // Reset ATB on revive just in case
          const stigmaSkill = battle._findSkill?.(target, 'stigma_of_atonement');
          if (stigmaSkill && stigmaSkill.level > 0 && stigmaSkill.levelConfig) {
            target.activeAilment = { type: 'curse', duration: 9999 };
          }
          battle.showDamage(target.elementId, `RAISE`, 'text-yellow-300');
          battle.renderEntities(); // This handles reviving UI
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const deadParty = context.party.filter(p => p.isDead);
          if (deadParty.length > 0) {
            return { target: deadParty[0], score: 200 };
          }
          return null;
        }
      }
    },
    {
      id: 'restore', name: 'レストア', icon: 'health_metrics',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 8 },
        { level:  2, spCost: 1, mpCost: 8 },
        { level:  3, spCost: 1, mpCost: 8 },
        { level:  4, spCost: 2, mpCost: 8 },
        { level:  5, spCost: 2, mpCost: 8 },
        { level:  6, spCost: 2, mpCost: 8 },
        { level:  7, spCost: 3, mpCost: 6 },
        { level:  8, spCost: 3, mpCost: 6 },
        { level:  9, spCost: 3, mpCost: 6 },
        { level: 10, spCost: 5, mpCost: 4 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、状態異常の味方単体の状態異常を回復する`,
      execute(caster, levelConfig, battle, options = {}) {
        if (!battle) return;
        let targetGroup = battle.party;
        if (battle.selectedEnemyTarget && battle.enemies.includes(battle.selectedEnemyTarget)) {
          targetGroup = battle.enemies;
        }
        const afflictedParty = targetGroup.filter(p => {
          if (p.isDead || !p.activeAilment) return false;
          // ブラックナイトの「贖罪の烙印」による呪いは治さない
          if (p.activeAilment.type === 'curse') {
            const hasStigma = p._skillCache?.has('stigma_of_atonement') || 
                              (p.jobId === 'black_knight' && p.jobSkills?.black_knight?.stigma_of_atonement > 0) ||
                              (p.inheritedPassive?.skillId === 'stigma_of_atonement');
            if (hasStigma) return false;
          }
          return true;
        });
        if (afflictedParty.length === 0) {
          battle.showActionName(caster.elementId, 'MISS', 'text-gray-400', 'border-gray-500/50');
          return;
        }
        
        const target = options.autoTarget && afflictedParty.includes(options.autoTarget)
            ? options.autoTarget
            : afflictedParty[Math.floor(Math.random() * afflictedParty.length)];
        playSkillAnimation(caster, [target], 'restore', () => {
          if (target.isDead) return;
          target.activeAilment = null;
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const afflictedParty = context.party.filter(p => {
            if (p.isDead || !p.activeAilment) return false;
            // ブラックナイトの「贖罪の烙印」による呪いは治さない（治してもすぐ再付与されるか、無効化されるため）
            if (p.activeAilment.type === 'curse') {
              const hasStigma = p._skillCache?.has('stigma_of_atonement') || 
                                (p.jobId === 'black_knight' && p.jobSkills?.black_knight?.stigma_of_atonement > 0) ||
                                (p.inheritedPassive?.skillId === 'stigma_of_atonement');
              if (hasStigma) return false;
            }
            return true;
          });
          if (afflictedParty.length > 0) {
             return { target: afflictedParty[0], score: 90 };
          }
          return null;
        }
      }
    },
    {
      id: 'holy', name: 'ホーリー', icon: 'light_mode', statDependency: 'MAT',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 10, multiplier: 1.3 },
        { level:  2, spCost: 1, mpCost: 12, multiplier: 1.4 },
        { level:  3, spCost: 1, mpCost: 14, multiplier: 1.5 },
        { level:  4, spCost: 2, mpCost: 16, multiplier: 1.6 },
        { level:  5, spCost: 2, mpCost: 18, multiplier: 1.7 },
        { level:  6, spCost: 2, mpCost: 20, multiplier: 1.8 },
        { level:  7, spCost: 3, mpCost: 22, multiplier: 1.9 },
        { level:  8, spCost: 3, mpCost: 24, multiplier: 2.0 },
        { level:  9, spCost: 3, mpCost: 26, multiplier: 2.1 },
        { level: 10, spCost: 5, mpCost: 32, multiplier: 2.4 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵単体に ${lc.multiplier.toFixed(1)} 倍の光属性魔法攻撃を行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (target) {
          playSkillAnimation(caster, [target], 'holy', () => {
            if (target.isDead) return;
            battle.executeAttack(caster, target, true, { damageType: 'skill', hideActionName: true,
            statDependency: this.statDependency, actionName: 'ホーリー', damageMultiplier: levelConfig.multiplier, damageType: 'skill', element: 'light', hideActionName: true });
          });
        }
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveEnemies = context.enemies.filter(e => !e.isDead);
          if (aliveEnemies.length === 0) return null;
          let bestTarget = null;
          let bestScore = 0;
          for (const enemy of aliveEnemies) {
            const resist = enemy.stats?.elementResist?.light || 0;
            const score = 50 * levelConfig.multiplier * ((100 - resist) / 100);
            if (score > bestScore) {
              bestScore = score;
              bestTarget = enemy;
            }
          }
          if (bestScore > 0) return { target: bestTarget, score: bestScore };
          return null;
        }
      }
    },
    {
      id: 'all_heal', name: 'オールヒール', icon: 'volunteer_activism',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 2, mpCost: 24, healAmount: 25 },
        { level:  2, spCost: 2, mpCost: 30, healAmount: 35 },
        { level:  3, spCost: 2, mpCost: 36, healAmount: 50 },
        { level:  4, spCost: 3, mpCost: 44, healAmount: 70 },
        { level:  5, spCost: 3, mpCost: 52, healAmount: 95 },
        { level:  6, spCost: 3, mpCost: 60, healAmount: 125 },
        { level:  7, spCost: 4, mpCost: 70, healAmount: 160 },
        { level:  8, spCost: 4, mpCost: 80, healAmount: 200 },
        { level:  9, spCost: 4, mpCost: 92, healAmount: 245 },
        { level: 10, spCost: 6, mpCost: 110, healAmount: 300 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、味方全体の HP を ${lc.healAmount} 回復する`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let targetGroup = battle.party;
        if (battle.selectedEnemyTarget && battle.enemies.includes(battle.selectedEnemyTarget)) {
          targetGroup = battle.enemies;
        }
        const aliveParty = targetGroup.filter(p => !p.isDead);
        if (aliveParty.length === 0) return;
        
        playSkillAnimation(caster, aliveParty, 'all_heal', (target) => {
          if (target.isDead) return;
          if (target.hp !== undefined) {
            target.hp.current = Math.min(target.stats?.hp || target.hp.max, target.hp.current + levelConfig.healAmount);
          } else {
            target.currentHp = Math.min(target.stats?.hp || target.maxHp, target.currentHp + levelConfig.healAmount);
          }
          battle.showDamage(target.elementId, `+${levelConfig.healAmount}`, 'text-green-400');
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveParty = context.party.filter(p => !p.isDead);
          let totalMissingHpPercent = 0;
          for (const p of aliveParty) {
             const hpPercent = p.hp !== undefined ? (p.hp.current / (p.stats?.hp || p.hp.max)) : (p.currentHp / (p.stats?.hp || p.maxHp));
             totalMissingHpPercent += (1 - hpPercent);
          }
          if (totalMissingHpPercent > 0.6) {
             return { target: caster, score: totalMissingHpPercent * 100 };
          }
          return null;
        }
      }
    },
    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'regen', name: 'リジェネ', icon: 'favorite', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, recoverHp: 10 },
        { level:  2, spCost: 1, mpCost: 0, recoverHp: 20 },
        { level:  3, spCost: 1, mpCost: 0, recoverHp: 30 },
        { level:  4, spCost: 2, mpCost: 0, recoverHp: 40 },
        { level:  5, spCost: 2, mpCost: 0, recoverHp: 50 },
        { level:  6, spCost: 2, mpCost: 0, recoverHp: 60 },
        { level:  7, spCost: 3, mpCost: 0, recoverHp: 70 },
        { level:  8, spCost: 3, mpCost: 0, recoverHp: 80 },
        { level:  9, spCost: 3, mpCost: 0, recoverHp: 90 },
        { level: 10, spCost: 5, mpCost: 0, recoverHp: 100 }
      ],
      getDescription: (lc) => `自身の行動終了時に、HP を ${lc.recoverHp} 回復する`
    }
  ]
};
