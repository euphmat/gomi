import { getBattleAnimationSpeed, getBattleSpeed } from '../utils/battle-animation.js';

// ─── Animation Utilities ──────────────────────────────────────
const playSkillAnimation = (caster, targets, type, onImpact) => {
  if (!Array.isArray(targets)) targets = [targets];
  if (localStorage.getItem('disableBattleAnimations') === 'true') {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
    return;
  }
  const battleSpeed = getBattleSpeed();
  const speedMult = getBattleAnimationSpeed(battleSpeed);

  const casterEl = document.getElementById(caster.elementId);
  if (!casterEl && type === 'shield_attack') {
    if (onImpact) targets.forEach((t, i) => onImpact(t, i));
    return;
  }

  const screenShake = (intensity = 5, duration = 300) => {
    // Screen shake disabled globally by user request
  };

  const createImpact = (x, y, shake = false) => {
    if (shake) screenShake(shake.intensity || 5, shake.duration || 200);
    const ex = document.createElement('div');
    ex.style.position = 'fixed';
    ex.style.left = `${x - 50}px`;
    ex.style.top = `${y - 50}px`;
    ex.style.width = '100px';
    ex.style.height = '100px';
    ex.style.borderRadius = '50%';
    ex.style.border = '10px solid #cbd5e1';
    ex.style.boxShadow = '0 0 20px #94a3b8';
    ex.style.zIndex = '9999';
    ex.style.pointerEvents = 'none';
    (document.getElementById('battle-effects-layer') || document.body).appendChild(ex);
    
    const anim = ex.animate([
      { transform: 'scale(0.5)', opacity: 1, borderWidth: '20px' },
      { transform: 'scale(1.5)', opacity: 0, borderWidth: '0px' }
    ], { duration: 300 / speedMult, easing: 'ease-out' });
    anim.onfinish = () => ex.remove();
  };

  targets.forEach((target, index) => {
    const targetEl = document.getElementById(target.elementId);
    if (!targetEl && type !== 'defense_formation' && type !== 'provoke') {
      if (onImpact) onImpact(target, index);
      return;
    }
    
    const targetRect = targetEl ? targetEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const casterRect = casterEl ? casterEl.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    
    const cx = casterRect.left + casterRect.width / 2;
    const cy = casterRect.top + casterRect.height / 2;
    const tx = targetRect.left + targetRect.width / 2;
    const ty = targetRect.top + targetRect.height / 2;

    setTimeout(() => {
      switch (type) {
        case 'provoke': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${cx - 60}px`;
          el.style.top = `${cy - 60}px`;
          el.style.width = '120px';
          el.style.height = '120px';
          el.style.borderRadius = '50%';
          el.style.border = '4px solid #ef4444';
          el.style.boxShadow = '0 0 15px #ef4444';
          el.style.zIndex = '9998';
          el.style.pointerEvents = 'none';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(el);

          const anim = el.animate([
            { transform: 'scale(0)', opacity: 1 },
            { transform: 'scale(2)', opacity: 0 }
          ], { duration: 600 / speedMult, easing: 'ease-out' });

          anim.onfinish = () => el.remove();
          
          const icon = document.createElement('div');
          icon.textContent = '💢';
          icon.style.position = 'fixed';
          icon.style.left = `${cx - 20}px`;
          icon.style.top = `${cy - 50}px`;
          icon.style.fontSize = '40px';
          icon.style.zIndex = '9999';
          icon.style.pointerEvents = 'none';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(icon);
          
          const iconAnim = icon.animate([
            { transform: 'scale(0) translateY(20px)', opacity: 0 },
            { transform: 'scale(1.2) translateY(0px)', opacity: 1, offset: 0.2 },
            { transform: 'scale(1) translateY(0px)', opacity: 1, offset: 0.3 },
            { transform: 'scale(1) translateY(-20px)', opacity: 0 }
          ], { duration: 800 / speedMult });
          iconAnim.onfinish = () => icon.remove();

          setTimeout(() => { if (onImpact) onImpact(target, index); }, 300 / speedMult);
          break;
        }
        case 'defense_formation': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${tx - 40}px`;
          el.style.top = `${ty - 40}px`;
          el.style.width = '80px';
          el.style.height = '80px';
          el.style.clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
          el.style.background = 'rgba(96, 165, 250, 0.4)';
          el.style.border = '2px solid #3b82f6';
          el.style.boxShadow = '0 0 15px #3b82f6';
          el.style.zIndex = '9998';
          el.style.pointerEvents = 'none';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(el);

          const anim = el.animate([
            { transform: 'scale(0) rotate(-30deg)', opacity: 0 },
            { transform: 'scale(1.2) rotate(0deg)', opacity: 1, offset: 0.5 },
            { transform: 'scale(1) rotate(0deg)', opacity: 0 }
          ], { duration: 800 / speedMult, easing: 'ease-out' });

          anim.onfinish = () => el.remove();
          setTimeout(() => { if (onImpact) onImpact(target, index); }, 400 / speedMult);
          break;
        }
        case 'shield_attack': {
          const el = document.createElement('div');
          el.style.position = 'fixed';
          el.style.left = `${cx - 30}px`;
          el.style.top = `${cy - 30}px`;
          el.style.width = '60px';
          el.style.height = '60px';
          el.style.background = 'linear-gradient(135deg, #e2e8f0, #94a3b8)';
          el.style.clipPath = 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)';
          el.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          (document.getElementById('battle-effects-layer') || document.body).appendChild(el);

          const anim = el.animate([
            { transform: 'scale(0.5) rotate(-20deg)', opacity: 0 },
            { transform: 'scale(1.2) rotate(0deg)', opacity: 1, offset: 0.2 },
            { transform: `translate(${tx - cx}px, ${ty - cy}px) scale(1) rotate(10deg)`, opacity: 1 }
          ], { duration: 350 / speedMult, easing: 'ease-in' });

          anim.onfinish = () => {
            el.remove();
            createImpact(tx, ty, { intensity: 6, duration: 250 });
            if (onImpact) onImpact(target, index);
          };
          break;
        }
      }
    }, index * 50 / speedMult);
  });
};

export const knight = {
  id: 'knight',
  name: 'ナイト',
  icon: 'shield_person',
  changeCost: 30000,
  skills: [
    // ─── Active Skills ──────────────────────────────────────
    {
      id: 'provoke', name: '挑発', icon: 'record_voice_over',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 6, turns: 2, chance: 20 },
        { level:  2, spCost: 1, mpCost: 8, turns: 2, chance: 25 },
        { level:  3, spCost: 1, mpCost: 10, turns: 2, chance: 28 },
        { level:  4, spCost: 2, mpCost: 12, turns: 3, chance: 30 },
        { level:  5, spCost: 2, mpCost: 14, turns: 3, chance: 33 },
        { level:  6, spCost: 2, mpCost: 16, turns: 3, chance: 36 },
        { level:  7, spCost: 3, mpCost: 18, turns: 4, chance: 40 },
        { level:  8, spCost: 3, mpCost: 20, turns: 4, chance: 43 },
        { level:  9, spCost: 3, mpCost: 22, turns: 4, chance: 46 },
        { level: 10, spCost: 5, mpCost: 28, turns: 5, chance: 50 }
      ],
      getDescription: (lc) => `${lc.turns} ターンの間、${lc.chance}％ の確率で味方を庇う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        playSkillAnimation(caster, [caster], 'provoke', () => {
          caster._provokeTurns = levelConfig.turns;
          caster._provokeChance = levelConfig.chance;
          battle.showDamage(caster.elementId, '挑発', 'text-amber-400');
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          if (!caster._provokeTurns || caster._provokeTurns <= 0) {
            const aliveParty = context.party.filter(p => !p.isDead);
            const anyAllyLowHp = aliveParty.some(p => p !== caster && p.hp.current / (p.stats?.hp || p.hp.max) < 0.5);
            if (anyAllyLowHp) return { target: caster, score: 95 };
            return { target: caster, score: 75 };
          }
          return null;
        }
      }
    },
    {
      id: 'defense_formation', name: '物理防御陣形', icon: 'security',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 8, defPercent: 10, turns: 3 },
        { level:  2, spCost: 1, mpCost: 10, defPercent: 13, turns: 3 },
        { level:  3, spCost: 1, mpCost: 12, defPercent: 16, turns: 3 },
        { level:  4, spCost: 2, mpCost: 14, defPercent: 19, turns: 3 },
        { level:  5, spCost: 2, mpCost: 16, defPercent: 22, turns: 3 },
        { level:  6, spCost: 2, mpCost: 18, defPercent: 25, turns: 3 },
        { level:  7, spCost: 3, mpCost: 20, defPercent: 28, turns: 4 },
        { level:  8, spCost: 3, mpCost: 22, defPercent: 32, turns: 4 },
        { level:  9, spCost: 3, mpCost: 24, defPercent: 36, turns: 4 },
        { level: 10, spCost: 5, mpCost: 30, defPercent: 40, turns: 5 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、味方全員の防御力を ${lc.turns} ターンの間 ${lc.defPercent}％ アップする`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let targetGroup = battle.party;
        if (battle.selectedEnemyTarget && battle.enemies.includes(battle.selectedEnemyTarget)) {
          targetGroup = battle.enemies;
        }
        const aliveParty = targetGroup.filter(p => !p.isDead);
        playSkillAnimation(caster, aliveParty, 'defense_formation', (target) => {
          if (!target.isDead) {
            target._defBuffPercent = levelConfig.defPercent;
            target._defBuffTurns = levelConfig.turns;
            battle.showDamage(target.elementId, 'DEF UP', 'text-blue-400');
          }
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          const aliveParty = context.party.filter(p => !p.isDead);
          const hasDefBuff = aliveParty.some(p => p._defBuffTurns && p._defBuffTurns > 0);
          if (!hasDefBuff) return { target: caster, score: 85 };
          return null;
        }
      }
    },
    {
      id: 'shield_attack', name: 'シールドアタック', icon: 'shield', statDependency: 'ATK',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 6, multiplier: 1.0 },
        { level:  2, spCost: 1, mpCost: 8, multiplier: 1.05 },
        { level:  3, spCost: 1, mpCost: 10, multiplier: 1.1 },
        { level:  4, spCost: 2, mpCost: 12, multiplier: 1.15 },
        { level:  5, spCost: 2, mpCost: 14, multiplier: 1.2 },
        { level:  6, spCost: 2, mpCost: 16, multiplier: 1.25 },
        { level:  7, spCost: 3, mpCost: 18, multiplier: 1.3 },
        { level:  8, spCost: 3, mpCost: 20, multiplier: 1.35 },
        { level:  9, spCost: 3, mpCost: 22, multiplier: 1.4 },
        { level: 10, spCost: 5, mpCost: 28, multiplier: 1.5 }
      ],
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、盾の物理防御力＋自身の攻撃力で ${lc.multiplier.toFixed(2)} 倍の物理攻撃を行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(e => !e.isDead);
        if (!target) return;

        playSkillAnimation(caster, [target], 'shield_attack', () => {
          if (target.isDead) return;

          // Calculate shield DEF bonus
          let shieldDef = 0;
          if (caster.equipment && caster.equipment.leftHand) {
            const shield = battle.equipMap.get(caster.equipment.leftHand);
            if (shield && shield.stats && shield.stats.def) {
              shieldDef = shield.stats.def;
            }
          }

          // Temporarily add shield DEF to stats so executeAttack can use it
          const originalAtk = caster.stats.atk;
          const originalMatk = caster.stats.matk;
          if (shieldDef > 0) {
            caster.stats.atk = (caster.stats.atk || 0) + shieldDef;
            caster.stats.matk = (caster.stats.matk || 0) + shieldDef;
          }

          battle.executeAttack(caster, target, true, { damageType: 'skill', hideActionName: true,
            statDependency: this.statDependency,
            actionName: 'シールドアタック',
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            hideActionName: true
          });

          // Restore original stats
          if (shieldDef > 0) {
            if (originalAtk !== undefined) caster.stats.atk = originalAtk; else delete caster.stats.atk;
            if (originalMatk !== undefined) caster.stats.matk = originalMatk; else delete caster.stats.matk;
          }
        });
      },
      autoBattle: {
        check: (caster, levelConfig, context) => {
          if (caster.equipment && caster.equipment.leftHand) {
            const aliveEnemies = context.enemies.filter(e => !e.isDead);
            if (aliveEnemies.length === 0) return null;
            let target = context.selectedEnemyTarget;
            if (!target || target.isDead) target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            return { target, score: 40 * levelConfig.multiplier };
          }
          return null;
        }
      }
    },
    // ─── Passive Skills ──────────────────────────────────────
    {
      id: 'def_boost', name: '防御倍率アップ', icon: 'shield_with_heart', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, bonusDefPercent:  3 },
        { level:  2, spCost: 1, mpCost: 0, bonusDefPercent:  6 },
        { level:  3, spCost: 1, mpCost: 0, bonusDefPercent:  9 },
        { level:  4, spCost: 2, mpCost: 0, bonusDefPercent: 12 },
        { level:  5, spCost: 2, mpCost: 0, bonusDefPercent: 15 },
        { level:  6, spCost: 2, mpCost: 0, bonusDefPercent: 18 },
        { level:  7, spCost: 3, mpCost: 0, bonusDefPercent: 21 },
        { level:  8, spCost: 3, mpCost: 0, bonusDefPercent: 24 },
        { level:  9, spCost: 3, mpCost: 0, bonusDefPercent: 27 },
        { level: 10, spCost: 5, mpCost: 0, bonusDefPercent: 30 }
      ],
      getDescription: (lc) => `物理防御力の倍率が ${lc.bonusDefPercent}％ 上昇する`
    },
    {
      id: 'mdef_boost', name: '魔法防御倍率アップ', icon: 'magic_button', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, bonusMdefPercent:  3 },
        { level:  2, spCost: 1, mpCost: 0, bonusMdefPercent:  6 },
        { level:  3, spCost: 1, mpCost: 0, bonusMdefPercent:  9 },
        { level:  4, spCost: 2, mpCost: 0, bonusMdefPercent: 12 },
        { level:  5, spCost: 2, mpCost: 0, bonusMdefPercent: 15 },
        { level:  6, spCost: 2, mpCost: 0, bonusMdefPercent: 18 },
        { level:  7, spCost: 3, mpCost: 0, bonusMdefPercent: 21 },
        { level:  8, spCost: 3, mpCost: 0, bonusMdefPercent: 24 },
        { level:  9, spCost: 3, mpCost: 0, bonusMdefPercent: 27 },
        { level: 10, spCost: 5, mpCost: 0, bonusMdefPercent: 30 }
      ],
      getDescription: (lc) => `魔法防御力の倍率が ${lc.bonusMdefPercent}％ 上昇する`
    },
    {
      id: 'parry', name: 'パリィ', icon: 'swords', type: 'passive',
      maxLevel: 10,
      levels: [
        { level:  1, spCost: 1, mpCost: 0, chance:  3 },
        { level:  2, spCost: 1, mpCost: 0, chance:  4 },
        { level:  3, spCost: 1, mpCost: 0, chance:  5 },
        { level:  4, spCost: 2, mpCost: 0, chance:  6 },
        { level:  5, spCost: 2, mpCost: 0, chance:  7 },
        { level:  6, spCost: 2, mpCost: 0, chance:  8 },
        { level:  7, spCost: 3, mpCost: 0, chance: 10 },
        { level:  8, spCost: 3, mpCost: 0, chance: 12 },
        { level:  9, spCost: 3, mpCost: 0, chance: 13 },
        { level: 10, spCost: 5, mpCost: 0, chance: 15 }
      ],
      getDescription: (lc) => `${lc.chance}％ の確率で、物理攻撃を無効化する`
    }
  ]
};
