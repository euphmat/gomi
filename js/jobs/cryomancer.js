import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

const playSkillAnimation = (caster, targets, type, onImpact) => {
  const targetList = Array.isArray(targets) ? targets : [targets];
  if (shouldSkipBattleAnimations()) {
    targetList.forEach((target, index) => onImpact?.(target, index));
    return;
  }

  const speedMult = getBattleAnimationSpeed(getBattleSpeed());
  const layer = document.getElementById('battle-effects-layer') || document.body;
  const casterEl = document.getElementById(caster.elementId);
  const casterRect = casterEl?.getBoundingClientRect();
  const origin = casterRect
    ? { x: casterRect.left + casterRect.width / 2, y: casterRect.top + casterRect.height / 2 }
    : { x: window.innerWidth / 2, y: window.innerHeight * .72 };

  const addCrystalBurst = (x, y, count = 9, spread = 72) => {
    const renderedCount = Math.max(4, Math.min(count, getBattleSpeed() >= 5 ? 6 : count));
    for (let i = 0; i < renderedCount; i++) {
      const shard = document.createElement('div');
      const width = 5 + Math.random() * 6;
      const height = width * (2.2 + Math.random());
      shard.style.cssText = `position:fixed;left:${x - width / 2}px;top:${y - height / 2}px;width:${width}px;height:${height}px;background:linear-gradient(135deg,#fff,#a5f3fc 42%,#38bdf8 70%,#2563eb);clip-path:polygon(50% 0,100% 72%,50% 100%,0 72%);filter:drop-shadow(0 0 6px #67e8f9);z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
      layer.appendChild(shard);
      const angle = Math.PI * 2 * i / renderedCount + Math.random() * .35;
      const distance = 28 + Math.random() * spread;
      shard.animate([
        { transform: 'translate(0,0) scale(.2) rotate(0deg)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px) scale(1) rotate(${180 + Math.random() * 240}deg)`, opacity: 0 }
      ], { duration: (400 + Math.random() * 250) / speedMult, easing: 'cubic-bezier(.12,.7,.2,1)' }).onfinish = () => shard.remove();
    }
  };

  const addFrostRing = (x, y, size = 112, color = '#67e8f9') => {
    const ring = document.createElement('div');
    ring.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border:5px double ${color};border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.7) 0deg 2deg,transparent 2deg 30deg);box-shadow:0 0 18px #38bdf8,inset 0 0 22px #a5f3fc;z-index:9998;pointer-events:none;mix-blend-mode:screen;`;
    layer.appendChild(ring);
    ring.animate([
      { transform: 'scale(.08) rotate(-90deg)', opacity: 1 },
      { transform: 'scale(1.45) rotate(60deg)', opacity: 0 }
    ], { duration: 520 / speedMult, easing: 'cubic-bezier(.12,.72,.2,1)' }).onfinish = () => ring.remove();
  };

  const addSnowMist = (x, y, size = 150) => {
    const mist = document.createElement('div');
    mist.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.9),rgba(165,243,252,.55) 28%,rgba(56,189,248,.22) 52%,transparent 72%);filter:blur(3px);z-index:9997;pointer-events:none;mix-blend-mode:screen;`;
    layer.appendChild(mist);
    mist.animate([
      { transform: 'scale(.15)', opacity: 0 },
      { transform: 'scale(1)', opacity: .9, offset: .35 },
      { transform: 'scale(1.45)', opacity: 0 }
    ], { duration: 650 / speedMult, easing: 'ease-out' }).onfinish = () => mist.remove();
  };

  if (type === 'whiteout' || type === 'absolute_zero') {
    const veil = document.createElement('div');
    veil.style.cssText = `position:fixed;inset:0;background:${type === 'absolute_zero'
      ? 'radial-gradient(circle at 50% 58%,rgba(255,255,255,.52),rgba(34,211,238,.32) 34%,rgba(30,64,175,.38) 72%)'
      : 'linear-gradient(145deg,rgba(224,242,254,.24),rgba(14,116,144,.18),rgba(255,255,255,.3))'};backdrop-filter:brightness(1.1) saturate(.72);z-index:9995;pointer-events:none;mix-blend-mode:screen;`;
    layer.appendChild(veil);
    veil.animate([
      { opacity: 0 }, { opacity: 1, offset: .35 }, { opacity: 0 }
    ], { duration: (type === 'absolute_zero' ? 1050 : 720) / speedMult, easing: 'ease-in-out' }).onfinish = () => veil.remove();

    if (type === 'absolute_zero') {
      const seal = document.createElement('div');
      seal.style.cssText = `position:fixed;left:${origin.x - 90}px;top:${origin.y - 90}px;width:180px;height:180px;border:5px double #e0f2fe;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(165,243,252,.72) 0deg 2deg,transparent 2deg 30deg),radial-gradient(circle,rgba(255,255,255,.72),rgba(14,165,233,.22) 32%,transparent 66%);box-shadow:0 0 32px #22d3ee,inset 0 0 28px #60a5fa;z-index:9997;pointer-events:none;mix-blend-mode:screen;`;
      seal.innerHTML = '<span style="position:absolute;inset:24%;border:4px solid #fff;transform:rotate(45deg);filter:drop-shadow(0 0 7px #38bdf8)"></span>';
      layer.appendChild(seal);
      seal.animate([
        { transform: 'scale(.08) rotate(-150deg)', opacity: 0 },
        { transform: 'scale(1.08) rotate(0)', opacity: 1, offset: .42 },
        { transform: 'scale(.72) rotate(180deg)', opacity: 0 }
      ], { duration: 980 / speedMult, easing: 'cubic-bezier(.12,.72,.22,1)' }).onfinish = () => seal.remove();
    }
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
      if (type === 'frost_spear') {
        const spear = document.createElement('div');
        const angle = Math.atan2(y - origin.y, x - origin.x);
        const distance = Math.hypot(x - origin.x, y - origin.y);
        spear.style.cssText = `position:fixed;left:${origin.x - 14}px;top:${origin.y - 7}px;width:92px;height:14px;background:linear-gradient(90deg,#1d4ed8,#67e8f9 45%,#fff);clip-path:polygon(0 50%,80% 0,100% 50%,80% 100%);filter:drop-shadow(0 0 9px #38bdf8);transform-origin:14px 50%;z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
        layer.appendChild(spear);
        spear.animate([
          { transform: `rotate(${angle}rad) translateX(0) scaleX(.2)`, opacity: 0 },
          { opacity: 1, offset: .15 },
          { transform: `rotate(${angle}rad) translateX(${Math.max(0, distance - 30)}px) scaleX(1.1)`, opacity: 1 }
        ], { duration: 340 / speedMult, easing: 'cubic-bezier(.25,.75,.2,1)' }).onfinish = () => {
          spear.remove();
          addSnowMist(x, y, 105);
          addFrostRing(x, y, 94);
          addCrystalBurst(x, y, 10, 60);
          onImpact?.(target, index);
        };
      } else if (type === 'hail_barrage') {
        const shard = document.createElement('div');
        shard.style.cssText = `position:fixed;left:${x - 12}px;top:${y - 170}px;width:24px;height:92px;background:linear-gradient(135deg,#fff,#7dd3fc 45%,#2563eb);clip-path:polygon(50% 0,100% 75%,50% 100%,0 75%);filter:drop-shadow(0 0 10px #67e8f9);z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
        layer.appendChild(shard);
        shard.animate([
          { transform: 'translateY(-35px) scale(.35)', opacity: 0 },
          { opacity: 1, offset: .2 },
          { transform: 'translateY(185px) scale(1)', opacity: 1 }
        ], { duration: 300 / speedMult, easing: 'ease-in' }).onfinish = () => {
          shard.remove();
          addFrostRing(x, y, 70);
          addCrystalBurst(x, y, 7, 45);
          onImpact?.(target, index);
        };
      } else if (type === 'whiteout') {
        addSnowMist(x, y, 175);
        addFrostRing(x, y, 128);
        addCrystalBurst(x, y, 12, 80);
        setTimeout(() => onImpact?.(target, index), 290 / speedMult);
      } else if (type === 'absolute_zero') {
        const prison = document.createElement('div');
        prison.style.cssText = `position:fixed;left:${x - 58}px;top:${y - 125}px;width:116px;height:190px;background:linear-gradient(135deg,rgba(255,255,255,.92),rgba(103,232,249,.72) 38%,rgba(37,99,235,.52) 72%,transparent);clip-path:polygon(50% 0,68% 18%,86% 8%,80% 43%,100% 68%,68% 100%,50% 88%,28% 100%,0 68%,20% 42%,14% 10%,34% 20%);filter:drop-shadow(0 0 18px #67e8f9);z-index:9998;pointer-events:none;mix-blend-mode:screen;transform-origin:50% 100%;`;
        layer.appendChild(prison);
        prison.animate([
          { transform: 'scaleX(.1) scaleY(0)', opacity: 0 },
          { transform: 'scaleX(1.08) scaleY(1)', opacity: .95, offset: .45 },
          { transform: 'scaleX(.75) scaleY(1.1)', opacity: 0 }
        ], { duration: 820 / speedMult, easing: 'cubic-bezier(.1,.8,.2,1)' }).onfinish = () => prison.remove();
        setTimeout(() => {
          addSnowMist(x, y, 195);
          addFrostRing(x, y, 155, '#fff');
          addCrystalBurst(x, y, 16, 100);
          onImpact?.(target, index);
        }, 470 / speedMult);
      }
    }, index * 90 / speedMult);
  });
};

const levelCosts = [1, 1, 1, 2, 2, 2, 3, 3, 3, 5];
const makeLevels = configs => configs.map((config, index) => ({
  level: index + 1,
  spCost: levelCosts[index],
  ...config
}));

const getTargetGroup = (caster, battle) => {
  if (caster.activeAilment?.type === 'confusion'
    && battle.selectedEnemyTarget
    && battle.party.includes(battle.selectedEnemyTarget)) {
    return battle.party;
  }
  return battle.enemies;
};

const tryApplyFreeze = (target, chance, duration, battle) => {
  if (!target || target.isDead || target.activeAilment) return false;
  if (target.hp !== undefined) {
    const stigma = battle._findSkill?.(target, 'stigma_of_atonement');
    if (stigma?.level > 0) return false;
  }
  const resist = (target.stats?.ailmentResist?.paralysis || 0)
    + (target._ailmentResistBuffTurns > 0 ? (target._ailmentResistBuffAmount || 0) : 0);
  if (Math.random() * 100 >= Math.max(0, chance - resist)) return false;
  target.activeAilment = { type: 'freeze', duration };
  battle.showDamage(target.elementId, 'FREEZE', 'text-cyan-200');
  battle.renderEntities();
  return true;
};

export const cryomancer = {
  id: 'cryomancer',
  name: 'クライオマンサー',
  icon: 'ac_unit',
  image: './assets/job/job_cryomancer.webp',
  changeCost: 500000,
  requirements: [
    { jobId: 'mage', level: 100 },
    { jobId: 'poseidon', level: 100 }
  ],
  skills: [
    {
      id: 'frost_spear', name: 'フロストスピア', icon: 'ac_unit', statDependency: 'MAT',
      actionNameClass: 'text-cyan-100', actionNameBorderClass: 'border-cyan-300/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 24, multiplier: 1.45, freezeChance: 18, freezeTurns: 1 },
        { mpCost: 28, multiplier: 1.60, freezeChance: 21, freezeTurns: 1 },
        { mpCost: 32, multiplier: 1.75, freezeChance: 24, freezeTurns: 1 },
        { mpCost: 38, multiplier: 1.90, freezeChance: 27, freezeTurns: 1 },
        { mpCost: 44, multiplier: 2.05, freezeChance: 30, freezeTurns: 1 },
        { mpCost: 50, multiplier: 2.20, freezeChance: 33, freezeTurns: 1 },
        { mpCost: 58, multiplier: 2.35, freezeChance: 36, freezeTurns: 1 },
        { mpCost: 66, multiplier: 2.52, freezeChance: 39, freezeTurns: 1 },
        { mpCost: 76, multiplier: 2.70, freezeChance: 42, freezeTurns: 1 },
        { mpCost: 90, multiplier: 2.90, freezeChance: 45, freezeTurns: 1 }
      ]),
      getDescription: lc => `MP を ${lc.mpCost} 消費し、敵単体に MATK ${lc.multiplier.toFixed(2)} 倍の氷属性攻撃。${lc.freezeChance}% の確率で ${lc.freezeTurns} ターン凍結させる`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const group = getTargetGroup(caster, battle);
        let target = battle.selectedEnemyTarget;
        if (!target || target.isDead || !group.includes(target)) target = group.find(enemy => !enemy.isDead);
        if (!target) return;
        playSkillAnimation(caster, target, 'frost_spear', () => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, actionName: this.name,
            damageMultiplier: lc.multiplier, damageType: 'skill', element: 'ice', hideActionName: true
          });
          tryApplyFreeze(target, lc.freezeChance, lc.freezeTurns, battle);
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.find(enemy => !enemy.activeAilment) || context.selectedEnemyTarget || targets[0];
          return { target, score: 48 * lc.multiplier + (!target.activeAilment ? lc.freezeChance * .8 : 0) };
        }
      }
    },
    {
      id: 'hail_barrage', name: 'ヘイルバラージ', icon: 'grain', statDependency: 'MAT',
      actionNameClass: 'text-sky-100', actionNameBorderClass: 'border-sky-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 36, multiplier: .45, hits: 3 }, { mpCost: 42, multiplier: .48, hits: 3 },
        { mpCost: 48, multiplier: .52, hits: 4 }, { mpCost: 56, multiplier: .55, hits: 4 },
        { mpCost: 64, multiplier: .58, hits: 5 }, { mpCost: 74, multiplier: .61, hits: 5 },
        { mpCost: 84, multiplier: .64, hits: 6 }, { mpCost: 96, multiplier: .68, hits: 6 },
        { mpCost: 110, multiplier: .72, hits: 7 }, { mpCost: 126, multiplier: .75, hits: 7 }
      ]),
      getDescription: lc => `MP を ${lc.mpCost} 消費し、ランダムな敵に MATK ${lc.multiplier.toFixed(2)} 倍の氷属性攻撃を ${lc.hits} 回行う`,
      execute(caster, lc, battle) {
        if (!battle) return;
        for (let hit = 0; hit < lc.hits; hit++) {
          battle._scheduleBattleTimeout(() => {
            if (caster.isDead || battle.isStopped) return;
            const targets = getTargetGroup(caster, battle).filter(enemy => !enemy.isDead);
            if (!targets.length) return;
            const target = targets[Math.floor(Math.random() * targets.length)];
            playSkillAnimation(caster, target, 'hail_barrage', () => {
              if (target.isDead) return;
              battle.executeAttack(caster, target, true, {
                statDependency: this.statDependency, actionName: this.name,
                damageMultiplier: lc.multiplier, damageType: 'skill', element: 'ice',
                hideActionName: true, skipAtbReset: hit > 0
              });
            });
          }, hit * 145 / (battle.speedMult || 1));
        }
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const averageResist = targets.reduce((sum, enemy) => sum + (enemy.stats?.elementResist?.ice || 0), 0) / targets.length;
          return { target: targets[0], score: 37 * lc.multiplier * lc.hits * Math.max(.2, 1 - averageResist / 100) + (targets.length === 1 ? 45 : 0) };
        }
      }
    },
    {
      id: 'whiteout', name: 'ホワイトアウト', icon: 'severe_cold', statDependency: 'MAT',
      actionNameClass: 'text-cyan-50', actionNameBorderClass: 'border-cyan-200/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 54, multiplier: .85, freezeChance: 14, freezeTurns: 1 },
        { mpCost: 62, multiplier: .93, freezeChance: 17, freezeTurns: 1 },
        { mpCost: 70, multiplier: 1.01, freezeChance: 20, freezeTurns: 1 },
        { mpCost: 80, multiplier: 1.10, freezeChance: 23, freezeTurns: 1 },
        { mpCost: 92, multiplier: 1.19, freezeChance: 26, freezeTurns: 1 },
        { mpCost: 104, multiplier: 1.29, freezeChance: 29, freezeTurns: 1 },
        { mpCost: 118, multiplier: 1.39, freezeChance: 32, freezeTurns: 1 },
        { mpCost: 134, multiplier: 1.49, freezeChance: 35, freezeTurns: 1 },
        { mpCost: 152, multiplier: 1.60, freezeChance: 38, freezeTurns: 1 },
        { mpCost: 174, multiplier: 1.72, freezeChance: 42, freezeTurns: 1 }
      ]),
      getDescription: lc => `MP を ${lc.mpCost} 消費し、敵全体に MATK ${lc.multiplier.toFixed(2)} 倍の氷属性攻撃。${lc.freezeChance}% の確率で ${lc.freezeTurns} ターン凍結させる`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getTargetGroup(caster, battle).filter(enemy => !enemy.isDead);
        if (!targets.length) return;
        playSkillAnimation(caster, targets, 'whiteout', (target, index) => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, actionName: this.name,
            damageMultiplier: lc.multiplier, damageType: 'skill', element: 'ice',
            hideActionName: true, isAoEProcessed: true, skipAtbReset: index < targets.length - 1
          });
          tryApplyFreeze(target, lc.freezeChance, lc.freezeTurns, battle);
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (targets.length < 2) return null;
          const freezable = targets.filter(enemy => !enemy.activeAilment).length;
          return { target: targets[0], score: 42 * lc.multiplier * targets.length + freezable * lc.freezeChance * .7 };
        }
      }
    },
    {
      id: 'absolute_zero', name: 'アブソリュートゼロ', icon: 'mode_cool', statDependency: 'MAT',
      actionNameClass: 'text-white', actionNameBorderClass: 'border-blue-200/80',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 90, multiplier: 1.15, shatterMultiplier: 1.30 },
        { mpCost: 104, multiplier: 1.27, shatterMultiplier: 1.34 },
        { mpCost: 118, multiplier: 1.39, shatterMultiplier: 1.38 },
        { mpCost: 134, multiplier: 1.52, shatterMultiplier: 1.42 },
        { mpCost: 150, multiplier: 1.65, shatterMultiplier: 1.46 },
        { mpCost: 168, multiplier: 1.79, shatterMultiplier: 1.50 },
        { mpCost: 188, multiplier: 1.94, shatterMultiplier: 1.55 },
        { mpCost: 210, multiplier: 2.09, shatterMultiplier: 1.60 },
        { mpCost: 234, multiplier: 2.25, shatterMultiplier: 1.65 },
        { mpCost: 260, multiplier: 2.42, shatterMultiplier: 1.70 }
      ]),
      getDescription: lc => `MP を ${lc.mpCost} 消費し、敵全体に MATK ${lc.multiplier.toFixed(2)} 倍の氷属性攻撃。凍結中の対象にはさらに ${lc.shatterMultiplier.toFixed(2)} 倍のダメージを与え、凍結を粉砕する`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getTargetGroup(caster, battle).filter(enemy => !enemy.isDead);
        if (!targets.length) return;
        playSkillAnimation(caster, targets, 'absolute_zero', (target, index) => {
          if (target.isDead) return;
          const isFrozen = target.activeAilment?.type === 'freeze';
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, actionName: this.name,
            damageMultiplier: lc.multiplier * (isFrozen ? lc.shatterMultiplier : 1),
            damageType: 'skill', element: 'ice', hideActionName: true,
            isAoEProcessed: true, skipAtbReset: index < targets.length - 1
          });
          if (isFrozen && !target.isDead) {
            target.activeAilment = null;
            battle.showDamage(target.elementId, 'SHATTER', 'text-sky-100');
            battle.renderEntities();
          }
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length || caster.mp.current < lc.mpCost) return null;
          const frozen = targets.filter(enemy => enemy.activeAilment?.type === 'freeze').length;
          if (!frozen && targets.length < 3) return null;
          return { target: targets[0], score: 50 * lc.multiplier * (targets.length + frozen * (lc.shatterMultiplier - 1)) + frozen * 80 };
        }
      }
    },
    {
      id: 'frozen_core', name: '氷晶炉心', icon: 'diamond', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusMpPercent: 4, bonusMatkPercent: 4 }, { mpCost: 0, bonusMpPercent: 7, bonusMatkPercent: 7 },
        { mpCost: 0, bonusMpPercent: 10, bonusMatkPercent: 10 }, { mpCost: 0, bonusMpPercent: 13, bonusMatkPercent: 13 },
        { mpCost: 0, bonusMpPercent: 16, bonusMatkPercent: 16 }, { mpCost: 0, bonusMpPercent: 19, bonusMatkPercent: 19 },
        { mpCost: 0, bonusMpPercent: 22, bonusMatkPercent: 22 }, { mpCost: 0, bonusMpPercent: 25, bonusMatkPercent: 25 },
        { mpCost: 0, bonusMpPercent: 29, bonusMatkPercent: 29 }, { mpCost: 0, bonusMpPercent: 35, bonusMatkPercent: 35 }
      ]),
      getDescription: lc => `最大 MP と魔法攻撃力の倍率がそれぞれ ${lc.bonusMpPercent}%、${lc.bonusMatkPercent}% 上昇する`
    },
    {
      id: 'ice_sovereignty', name: '氷界の支配者', icon: 'ac_unit', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, iceDamagePercent: 5, iceResistPercent: 4 }, { mpCost: 0, iceDamagePercent: 8, iceResistPercent: 7 },
        { mpCost: 0, iceDamagePercent: 11, iceResistPercent: 10 }, { mpCost: 0, iceDamagePercent: 14, iceResistPercent: 13 },
        { mpCost: 0, iceDamagePercent: 17, iceResistPercent: 16 }, { mpCost: 0, iceDamagePercent: 20, iceResistPercent: 19 },
        { mpCost: 0, iceDamagePercent: 23, iceResistPercent: 22 }, { mpCost: 0, iceDamagePercent: 26, iceResistPercent: 25 },
        { mpCost: 0, iceDamagePercent: 30, iceResistPercent: 28 }, { mpCost: 0, iceDamagePercent: 35, iceResistPercent: 35 }
      ]),
      getDescription: lc => `氷属性で与えるダメージが ${lc.iceDamagePercent}% 上昇し、氷属性耐性が ${lc.iceResistPercent}% 上昇する`
    },
    {
      id: 'shatter_mastery', name: '氷砕の奥義', icon: 'broken_image', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, frozenTargetDamagePercent: 6 }, { mpCost: 0, frozenTargetDamagePercent: 9 },
        { mpCost: 0, frozenTargetDamagePercent: 12 }, { mpCost: 0, frozenTargetDamagePercent: 16 },
        { mpCost: 0, frozenTargetDamagePercent: 20 }, { mpCost: 0, frozenTargetDamagePercent: 24 },
        { mpCost: 0, frozenTargetDamagePercent: 29 }, { mpCost: 0, frozenTargetDamagePercent: 34 },
        { mpCost: 0, frozenTargetDamagePercent: 39 }, { mpCost: 0, frozenTargetDamagePercent: 45 }
      ]),
      getDescription: lc => `凍結中の敵へ氷属性攻撃で与えるダメージが ${lc.frozenTargetDamagePercent}% 上昇する`
    }
  ]
};
