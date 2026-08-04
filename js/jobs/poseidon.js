import { getBattleAnimationSpeed, getBattleSpeed } from '../utils/battle-animation.js';

// ─── Poseidon skill animations ────────────────────────────────
const playSkillAnimation = (caster, targets, type, onImpact) => {
  const targetList = Array.isArray(targets) ? targets : [targets];
  if (localStorage.getItem('disableBattleAnimations') === 'true') {
    targetList.forEach((target, index) => onImpact?.(target, index));
    return;
  }

  const battleSpeed = getBattleSpeed();
  const speedMult = getBattleAnimationSpeed(battleSpeed);
  const layer = document.getElementById('battle-effects-layer') || document.body;
  const casterEl = document.getElementById(caster.elementId);
  const casterRect = casterEl?.getBoundingClientRect();
  const origin = casterRect
    ? { x: casterRect.left + casterRect.width / 2, y: casterRect.top + casterRect.height / 2 }
    : { x: window.innerWidth / 2, y: window.innerHeight * 0.7 };

  const addBubbleBurst = (x, y, count = 8, spread = 55) => {
    for (let i = 0; i < count; i++) {
      const bubble = document.createElement('div');
      const size = 5 + Math.random() * 10;
      bubble.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border:1.5px solid rgba(165,243,252,.9);border-radius:50%;background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.9),rgba(34,211,238,.2) 32%,rgba(14,116,144,.12) 65%,transparent 70%);box-shadow:0 0 8px rgba(34,211,238,.75);z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
      layer.appendChild(bubble);
      const angle = Math.random() * Math.PI * 2;
      const distance = 18 + Math.random() * spread;
      bubble.animate([
        { transform: 'translate(0,0) scale(.45)', opacity: 0 },
        { transform: 'translate(0,-5px) scale(1)', opacity: 1, offset: .2 },
        { transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance - 35}px) scale(.2)`, opacity: 0 }
      ], { duration: (420 + Math.random() * 260) / speedMult, easing: 'ease-out' }).onfinish = () => bubble.remove();
    }
  };

  const addImpactRing = (x, y, color = '#67e8f9', size = 120) => {
    const ring = document.createElement('div');
    ring.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border:4px solid ${color};border-radius:50%;box-shadow:0 0 18px ${color},inset 0 0 14px rgba(255,255,255,.7);z-index:9998;pointer-events:none;mix-blend-mode:screen;`;
    layer.appendChild(ring);
    ring.animate([
      { transform: 'scale(.18) rotate(-20deg)', opacity: 1 },
      { transform: 'scale(1.45) rotate(30deg)', opacity: 0 }
    ], { duration: 430 / speedMult, easing: 'cubic-bezier(.1,.65,.25,1)' }).onfinish = () => ring.remove();
  };

  if (type === 'abyssal_dominion') {
    const oceanField = document.createElement('div');
    oceanField.style.cssText = 'position:fixed;inset:0;background:radial-gradient(ellipse at 50% 75%,rgba(34,211,238,.28),rgba(14,116,144,.16) 35%,rgba(8,47,73,.28) 58%,transparent 78%);z-index:9996;pointer-events:none;mix-blend-mode:screen;';
    layer.appendChild(oceanField);
    oceanField.animate([
      { opacity: 0, transform: 'scale(.85)' },
      { opacity: 1, transform: 'scale(1)', offset: .35 },
      { opacity: 0, transform: 'scale(1.08)' }
    ], { duration: 950 / speedMult, easing: 'ease-out' }).onfinish = () => oceanField.remove();
  }

  targetList.forEach((target, index) => {
    const targetEl = document.getElementById(target.elementId);
    if (!targetEl) {
      onImpact?.(target, index);
      return;
    }
    const rect = targetEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    setTimeout(() => {
      if (type === 'trident_tempest') {
        const projectile = document.createElement('div');
        const angle = Math.atan2(y - origin.y, x - origin.x);
        const distance = Math.hypot(x - origin.x, y - origin.y);
        projectile.style.cssText = `position:fixed;left:${origin.x - 12}px;top:${origin.y - 3}px;width:56px;height:6px;border-radius:999px;background:linear-gradient(90deg,#fde68a,#facc15 55%,#fff);box-shadow:0 0 9px #22d3ee,0 0 16px rgba(14,165,233,.9);transform-origin:12px 50%;z-index:9999;pointer-events:none;`;
        projectile.innerHTML = '<span style="position:absolute;right:-12px;top:-9px;width:23px;height:23px;border:5px solid #facc15;border-left:0;border-bottom:0;transform:rotate(45deg);filter:drop-shadow(0 0 4px #67e8f9)"></span>';
        layer.appendChild(projectile);
        projectile.animate([
          { transform: `rotate(${angle}rad) translateX(0) scaleX(.55)`, opacity: 0 },
          { transform: `rotate(${angle}rad) translateX(${distance * .18}px) scaleX(1)`, opacity: 1, offset: .16 },
          { transform: `rotate(${angle}rad) translateX(${Math.max(0, distance - 22)}px) scaleX(1.15)`, opacity: 1 }
        ], { duration: 260 / speedMult, easing: 'cubic-bezier(.3,.75,.25,1)' }).onfinish = () => {
          projectile.remove();
          targetEl.animate([
            { transform: 'translateX(0)', filter: 'brightness(1)' },
            { transform: 'translateX(7px)', filter: 'brightness(2) saturate(1.5)', offset: .32 },
            { transform: 'translateX(-5px)', filter: 'brightness(1.4)', offset: .62 },
            { transform: 'translateX(0)', filter: 'brightness(1)' }
          ], { duration: 260 / speedMult, easing: 'ease-out' });
          addImpactRing(x, y, '#67e8f9', 88);
          addBubbleBurst(x, y, 7, 42);
          onImpact?.(target, index);
        };
      } else if (type === 'tidal_wave') {
        const wave = document.createElement('div');
        wave.style.cssText = `position:fixed;left:${x - 90}px;top:${y + 36}px;width:180px;height:110px;border-radius:52% 58% 18% 18%;background:radial-gradient(ellipse at 52% 92%,rgba(14,116,144,.2) 10%,rgba(6,182,212,.88) 34%,rgba(103,232,249,.95) 55%,rgba(255,255,255,.96) 63%,transparent 66%);filter:drop-shadow(0 0 14px rgba(34,211,238,.85));z-index:9998;pointer-events:none;mix-blend-mode:screen;transform-origin:50% 100%;`;
        layer.appendChild(wave);
        wave.animate([
          { transform: 'translateY(70px) scaleX(.35) scaleY(.2)', opacity: 0 },
          { transform: 'translateY(-42px) scaleX(1) scaleY(1.2)', opacity: 1, offset: .42 },
          { transform: 'translateY(-80px) scaleX(1.25) scaleY(.65)', opacity: 0 }
        ], { duration: 640 / speedMult, easing: 'cubic-bezier(.15,.75,.22,1)' }).onfinish = () => wave.remove();

        const foam = document.createElement('div');
        foam.style.cssText = `position:fixed;left:${x - 72}px;top:${y + 18}px;width:144px;height:28px;border-top:4px solid rgba(255,255,255,.95);border-radius:50%;box-shadow:0 -5px 12px #67e8f9;z-index:9999;pointer-events:none;`;
        layer.appendChild(foam);
        foam.animate([
          { transform: 'scaleX(.2) translateY(38px)', opacity: 0 },
          { transform: 'scaleX(1.2) translateY(-22px)', opacity: 1, offset: .45 },
          { transform: 'scaleX(1.5) translateY(-48px)', opacity: 0 }
        ], { duration: 560 / speedMult, easing: 'ease-out' }).onfinish = () => foam.remove();

        setTimeout(() => {
          addBubbleBurst(x, y, 10, 65);
          addImpactRing(x, y + 15, '#a5f3fc', 130);
          onImpact?.(target, index);
        }, 330 / speedMult);
      } else if (type === 'abyssal_dominion') {
        const seal = document.createElement('div');
        seal.style.cssText = `position:fixed;left:${x - 48}px;top:${y - 48}px;width:96px;height:96px;border:3px double rgba(250,204,21,.9);border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.72),rgba(34,211,238,.35) 22%,rgba(14,116,144,.18) 52%,transparent 68%);box-shadow:0 0 20px #22d3ee,inset 0 0 17px rgba(250,204,21,.75);z-index:9998;pointer-events:none;mix-blend-mode:screen;`;
        seal.innerHTML = '<span style="position:absolute;left:50%;top:50%;width:5px;height:66px;border-radius:3px;background:#fde68a;box-shadow:0 0 8px #67e8f9;transform:translate(-50%,-50%)"><i style="position:absolute;left:-16px;top:0;width:37px;height:24px;border:4px solid #fde68a;border-bottom:0;border-radius:50% 50% 0 0"></i></span>';
        layer.appendChild(seal);
        seal.animate([
          { transform: 'scale(.12) rotate(-120deg)', opacity: 0 },
          { transform: 'scale(1.08) rotate(0)', opacity: 1, offset: .35 },
          { transform: 'scale(1.3) rotate(35deg)', opacity: 0 }
        ], { duration: 820 / speedMult, easing: 'cubic-bezier(.2,.75,.25,1)' }).onfinish = () => seal.remove();
        setTimeout(() => {
          addBubbleBurst(x, y + 18, 7, 44);
          addImpactRing(x, y, '#fde68a', 104);
          onImpact?.(target, index);
        }, 360 / speedMult);
      }
    }, index * 85 / speedMult);
  });
};

const levelCosts = [1, 1, 1, 2, 2, 2, 3, 3, 3, 5];
const makeLevels = (configs) => configs.map((config, index) => ({
  level: index + 1,
  spCost: levelCosts[index],
  ...config
}));

export const poseidon = {
  id: 'poseidon',
  name: 'ポセイドン',
  icon: 'tsunami',
  changeCost: 500000,
  requirements: [
    { type: 'fishLibrary', discoveredSpecies: 50, description: '魚図鑑 50種類' }
  ],
  skills: [
    {
      id: 'trident_tempest', name: 'トライデント・テンペスト', icon: 'storm', statDependency: 'MAT',
      actionNameClass: 'text-cyan-200', actionNameBorderClass: 'border-cyan-400/60',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 24, multiplier: .55, hits: 3 }, { mpCost: 28, multiplier: .60, hits: 3 },
        { mpCost: 32, multiplier: .65, hits: 3 }, { mpCost: 38, multiplier: .68, hits: 4 },
        { mpCost: 44, multiplier: .72, hits: 4 }, { mpCost: 50, multiplier: .76, hits: 4 },
        { mpCost: 58, multiplier: .80, hits: 5 }, { mpCost: 66, multiplier: .84, hits: 5 },
        { mpCost: 74, multiplier: .90, hits: 5 }, { mpCost: 88, multiplier: 1.00, hits: 5 }
      ]),
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵単体に MATK ${lc.multiplier.toFixed(2)} 倍の水属性攻撃を ${lc.hits} 回行う`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead) target = battle.enemies.find(enemy => !enemy.isDead);
        if (!target) return;
        for (let hit = 0; hit < levelConfig.hits; hit++) {
          setTimeout(() => {
            if (caster.isDead || target.isDead || battle.isStopped) return;
            playSkillAnimation(caster, target, 'trident_tempest', () => {
              if (target.isDead) return;
              battle.executeAttack(caster, target, true, {
                statDependency: this.statDependency,
                actionName: this.name,
                damageMultiplier: levelConfig.multiplier,
                damageType: 'skill',
                element: 'water',
                hideActionName: true,
                skipAtbReset: hit < levelConfig.hits - 1
              });
            });
          }, hit * 260 / (battle.speedMult || 1));
        }
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.reduce((best, enemy) =>
            (enemy.stats?.elementResist?.water || 0) < (best.stats?.elementResist?.water || 0) ? enemy : best
          );
          return { target, score: 34 * lc.multiplier * lc.hits * Math.max(.2, 1 - (target.stats?.elementResist?.water || 0) / 100) };
        }
      }
    },
    {
      id: 'tidal_wave', name: 'タイダルウェイブ', icon: 'tsunami', statDependency: 'MAT',
      actionNameClass: 'text-sky-200', actionNameBorderClass: 'border-sky-400/60',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 42, multiplier: .80 }, { mpCost: 48, multiplier: .88 },
        { mpCost: 54, multiplier: .96 }, { mpCost: 62, multiplier: 1.05 },
        { mpCost: 70, multiplier: 1.14 }, { mpCost: 78, multiplier: 1.24 },
        { mpCost: 88, multiplier: 1.34 }, { mpCost: 98, multiplier: 1.45 },
        { mpCost: 110, multiplier: 1.58 }, { mpCost: 126, multiplier: 1.75 }
      ]),
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、敵全体を大波でのみ込み MATK ${lc.multiplier.toFixed(2)} 倍の水属性ダメージを与える`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const targets = battle.enemies.filter(enemy => !enemy.isDead);
        if (!targets.length) return;
        playSkillAnimation(caster, targets, 'tidal_wave', (target, index) => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency,
            actionName: this.name,
            damageMultiplier: levelConfig.multiplier,
            damageType: 'skill',
            element: 'water',
            hideActionName: true,
            isAoEProcessed: true,
            skipAtbReset: index < targets.length - 1
          });
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (targets.length < 2) return null;
          return { target: targets[0], score: 46 * lc.multiplier + targets.length * 18 };
        }
      }
    },
    {
      id: 'abyssal_dominion', name: 'アビス・ドミニオン', icon: 'all_inclusive',
      actionNameClass: 'text-amber-200', actionNameBorderClass: 'border-cyan-400/60',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 72, barrierMatkPercent: 70, buffPercent: 8, turns: 3 },
        { mpCost: 80, barrierMatkPercent: 80, buffPercent: 10, turns: 3 },
        { mpCost: 88, barrierMatkPercent: 90, buffPercent: 12, turns: 3 },
        { mpCost: 98, barrierMatkPercent: 105, buffPercent: 14, turns: 3 },
        { mpCost: 108, barrierMatkPercent: 120, buffPercent: 16, turns: 4 },
        { mpCost: 120, barrierMatkPercent: 135, buffPercent: 18, turns: 4 },
        { mpCost: 132, barrierMatkPercent: 150, buffPercent: 21, turns: 4 },
        { mpCost: 146, barrierMatkPercent: 170, buffPercent: 24, turns: 4 },
        { mpCost: 162, barrierMatkPercent: 190, buffPercent: 27, turns: 5 },
        { mpCost: 180, barrierMatkPercent: 220, buffPercent: 30, turns: 5 }
      ]),
      getDescription: (lc) => `MP を ${lc.mpCost} 消費し、味方全体に MATK の ${lc.barrierMatkPercent}% 分のバリアを付与。さらに ${lc.turns} ターン ATK・MATK を ${lc.buffPercent}% 上昇させる`,
      execute(caster, levelConfig, battle) {
        if (!battle) return;
        const group = battle.enemies.includes(caster) ? battle.enemies : battle.party;
        const targets = group.filter(member => !member.isDead);
        const barrier = Math.max(1, Math.floor((caster.stats?.matk || 1) * levelConfig.barrierMatkPercent / 100));
        playSkillAnimation(caster, targets, 'abyssal_dominion', (target) => {
          if (target.isDead) return;
          target._barrierHp = Math.max(target._barrierHp || 0, barrier);
          target._barrierTurns = Math.max(target._barrierTurns || 0, levelConfig.turns);
          target._atkBuffPercent = Math.max(target._atkBuffPercent || 0, levelConfig.buffPercent);
          target._atkBuffTurns = Math.max(target._atkBuffTurns || 0, levelConfig.turns);
          target._matkBuffPercent = Math.max(target._matkBuffPercent || 0, levelConfig.buffPercent);
          target._matkBuffTurns = Math.max(target._matkBuffTurns || 0, levelConfig.turns);
          battle.showDamage(target.elementId, `BARRIER +${barrier}`, 'text-cyan-200');
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const allies = context.party.filter(member => !member.isDead);
          if (!allies.length) return null;
          const unprotected = allies.filter(member => !(member._barrierHp > 0) || !(member._matkBuffTurns > 0)).length;
          return unprotected >= Math.ceil(allies.length / 2)
            ? { target: caster, score: 76 + lc.buffPercent }
            : null;
        }
      }
    },
    {
      id: 'abyssal_wisdom', name: '深海の叡智', icon: 'psychology', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusMpPercent: 4, bonusMatkPercent: 3 }, { mpCost: 0, bonusMpPercent: 7, bonusMatkPercent: 5 },
        { mpCost: 0, bonusMpPercent: 10, bonusMatkPercent: 7 }, { mpCost: 0, bonusMpPercent: 13, bonusMatkPercent: 9 },
        { mpCost: 0, bonusMpPercent: 16, bonusMatkPercent: 12 }, { mpCost: 0, bonusMpPercent: 19, bonusMatkPercent: 15 },
        { mpCost: 0, bonusMpPercent: 22, bonusMatkPercent: 18 }, { mpCost: 0, bonusMpPercent: 25, bonusMatkPercent: 21 },
        { mpCost: 0, bonusMpPercent: 28, bonusMatkPercent: 24 }, { mpCost: 0, bonusMpPercent: 35, bonusMatkPercent: 30 }
      ]),
      getDescription: (lc) => `最大 MP の倍率が ${lc.bonusMpPercent}%、魔法攻撃力の倍率が ${lc.bonusMatkPercent}% 上昇する`
    },
    {
      id: 'sea_god_armor', name: '海神の鎧', icon: 'shield', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusHpPercent: 3, bonusMdefPercent: 4 }, { mpCost: 0, bonusHpPercent: 5, bonusMdefPercent: 7 },
        { mpCost: 0, bonusHpPercent: 7, bonusMdefPercent: 10 }, { mpCost: 0, bonusHpPercent: 9, bonusMdefPercent: 13 },
        { mpCost: 0, bonusHpPercent: 12, bonusMdefPercent: 16 }, { mpCost: 0, bonusHpPercent: 15, bonusMdefPercent: 19 },
        { mpCost: 0, bonusHpPercent: 18, bonusMdefPercent: 22 }, { mpCost: 0, bonusHpPercent: 21, bonusMdefPercent: 25 },
        { mpCost: 0, bonusHpPercent: 24, bonusMdefPercent: 28 }, { mpCost: 0, bonusHpPercent: 30, bonusMdefPercent: 35 }
      ]),
      getDescription: (lc) => `最大 HP の倍率が ${lc.bonusHpPercent}%、魔法防御力の倍率が ${lc.bonusMdefPercent}% 上昇する`
    },
    {
      id: 'ocean_sovereignty', name: '大洋の支配者', icon: 'water', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, waterDamagePercent: 5, waterResistPercent: 4 }, { mpCost: 0, waterDamagePercent: 8, waterResistPercent: 7 },
        { mpCost: 0, waterDamagePercent: 11, waterResistPercent: 10 }, { mpCost: 0, waterDamagePercent: 14, waterResistPercent: 13 },
        { mpCost: 0, waterDamagePercent: 17, waterResistPercent: 16 }, { mpCost: 0, waterDamagePercent: 20, waterResistPercent: 19 },
        { mpCost: 0, waterDamagePercent: 23, waterResistPercent: 22 }, { mpCost: 0, waterDamagePercent: 26, waterResistPercent: 25 },
        { mpCost: 0, waterDamagePercent: 30, waterResistPercent: 28 }, { mpCost: 0, waterDamagePercent: 35, waterResistPercent: 35 }
      ]),
      getDescription: (lc) => `水属性で与えるダメージが ${lc.waterDamagePercent}% 上昇し、水属性耐性が ${lc.waterResistPercent}% 上昇する`
    }
  ]
};
