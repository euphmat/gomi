import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

const LEVEL_COSTS = [1, 1, 1, 2, 2, 2, 3, 3, 3, 5];
const ADVANCED_LEVEL_COSTS = [2, 2, 2, 3, 3, 3, 4, 4, 4, 6];

const makeLevels = (configs, costs = LEVEL_COSTS) => configs.map((config, index) => ({
  level: index + 1,
  spCost: costs[index],
  ...config
}));

const isDragoon = caster => (caster?.jobId || caster?.job) === 'dragoon';

const getOffensiveTargets = (caster, battle) => {
  if (caster.activeAilment?.type === 'confusion'
    && battle.selectedEnemyTarget
    && battle.party.includes(battle.selectedEnemyTarget)) {
    return battle.party.filter(member => !member.isDead);
  }
  return battle.enemies.filter(enemy => !enemy.isDead);
};

const getPrimaryTarget = (caster, battle) => {
  const targets = getOffensiveTargets(caster, battle);
  return targets.includes(battle.selectedEnemyTarget) ? battle.selectedEnemyTarget : targets[0] || null;
};

const getCurrentHpRatio = target => {
  const currentHp = target?.hp?.current ?? target?.currentHp ?? 0;
  const maxHp = target?.stats?.hp || target?.hp?.max || target?.maxHp || 1;
  return currentHp / Math.max(1, maxHp);
};

const getLanceMastery = (caster, battle) =>
  battle._findSkill?.(caster, 'lance_mastery')?.levelConfig || null;

const getDragonHeart = (caster, battle) =>
  battle._findSkill?.(caster, 'dragon_heart')?.levelConfig || null;

const addDragonSpirit = (caster, amount, battle) => {
  if (!isDragoon(caster) || amount <= 0) return;
  const heart = getDragonHeart(caster, battle);
  if (!heart?.maxDragonSpirit) return;

  const before = caster._dragoonSpirit || 0;
  caster._dragoonSpirit = Math.min(heart.maxDragonSpirit, before + amount);
  if (caster._dragoonSpirit > before) {
    battle.showDamage(caster.elementId, `竜気 ${caster._dragoonSpirit}`, 'text-sky-200');
  }
};

const getDefenseIgnore = (caster, battle, baseIgnore) => {
  const mastery = getLanceMastery(caster, battle);
  return Math.min(90, baseIgnore + (mastery?.skillDefenseIgnorePercent || 0));
};

const animateSkill = (caster, targets, type, onImpact) => {
  const targetList = Array.isArray(targets) ? targets : [targets];
  if (shouldSkipBattleAnimations() || typeof document === 'undefined') {
    targetList.forEach((target, index) => onImpact?.(target, index));
    return;
  }

  const speed = getBattleAnimationSpeed(getBattleSpeed());
  const layer = document.getElementById('battle-effects-layer') || document.body;
  const casterEl = document.getElementById(caster.elementId);
  const casterRect = casterEl?.getBoundingClientRect();
  const origin = casterRect
    ? { x: casterRect.left + casterRect.width / 2, y: casterRect.top + casterRect.height / 2 }
    : { x: window.innerWidth / 2, y: window.innerHeight * .7 };

  targetList.forEach((target, index) => {
    const targetEl = document.getElementById(target?.elementId);
    const rect = targetEl?.getBoundingClientRect();
    const destination = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : origin;

    setTimeout(() => {
      const effect = document.createElement('div');
      effect.style.position = 'fixed';
      effect.style.pointerEvents = 'none';
      effect.style.zIndex = '9999';
      effect.style.mixBlendMode = 'screen';

      if (type === 'sweep') {
        effect.style.left = `${destination.x - 70}px`;
        effect.style.top = `${destination.y - 40}px`;
        effect.style.width = '140px';
        effect.style.height = '80px';
        effect.style.borderTop = '7px solid #a7f3d0';
        effect.style.borderRadius = '50%';
        effect.style.filter = 'drop-shadow(0 0 12px #10b981)';
      } else {
        const isDive = type === 'dive' || type === 'high_jump';
        const start = isDive
          ? { x: destination.x - 28, y: destination.y - 210 }
          : origin;
        const dx = destination.x - start.x;
        const dy = destination.y - start.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const angle = Math.atan2(dy, dx);
        effect.style.left = `${start.x}px`;
        effect.style.top = `${start.y - 5}px`;
        effect.style.width = type === 'dive' ? '150px' : '105px';
        effect.style.height = type === 'dive' ? '14px' : '10px';
        effect.style.background = type === 'dive'
          ? 'linear-gradient(90deg,transparent,#38bdf8,#fef08a,#fff)'
          : 'linear-gradient(90deg,transparent,#6ee7b7,#fff)';
        effect.style.clipPath = 'polygon(0 36%,78% 36%,78% 0,100% 50%,78% 100%,78% 64%,0 64%)';
        effect.style.filter = `drop-shadow(0 0 ${type === 'dive' ? 18 : 10}px #38bdf8)`;
        effect.style.transformOrigin = '0 50%';
        effect.dataset.motion = JSON.stringify({ angle, distance });
      }

      layer.appendChild(effect);
      const duration = (type === 'dive' ? 650 : type === 'high_jump' ? 520 : 390) / speed;
      let frames;
      if (type === 'sweep') {
        frames = [
          { transform: 'rotate(-35deg) scale(.25)', opacity: 0 },
          { transform: 'rotate(5deg) scale(1.1)', opacity: 1, offset: .55 },
          { transform: 'rotate(38deg) scale(1.35)', opacity: 0 }
        ];
      } else {
        const { angle, distance } = JSON.parse(effect.dataset.motion);
        frames = [
          { transform: `rotate(${angle}rad) translateX(0) scaleX(.2)`, opacity: 0 },
          { opacity: 1, offset: .18 },
          { transform: `rotate(${angle}rad) translateX(${Math.max(0, distance - 24)}px) scaleX(1)`, opacity: 1 }
        ];
      }

      effect.animate(frames, { duration, easing: 'cubic-bezier(.25,.75,.2,1)' }).onfinish = () => {
        effect.remove();
        onImpact?.(target, index);
      };
    }, index * 70 / speed);
  });
};

const executePhysicalAttack = ({ caster, target, battle, multiplier, defenseIgnorePercent = 0, element, isAoEProcessed = false }) => {
  if (!target || target.isDead || caster.isDead || battle.isStopped) return;
  battle.executeAttack(caster, target, true, {
    statDependency: 'ATK',
    actionName: '',
    damageType: 'skill',
    hideActionName: true,
    damageMultiplier: multiplier,
    defenseIgnorePercent,
    element,
    isAoEProcessed
  });
};

export const dragoon = {
  id: 'dragoon',
  name: 'ドラグーン',
  icon: 'swords',
  image: './assets/job/job_dragoon.webp',
  changeCost: 500000,
  requirements: [
    { jobId: 'knight', level: 100 },
    { jobId: 'ranger', level: 100 }
  ],
  skills: [
    {
      id: 'piercing_lance', name: 'ピアシングランス', icon: 'arrow_right_alt', statDependency: 'ATK',
      actionNameClass: 'text-emerald-200', actionNameBorderClass: 'border-emerald-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 18, multiplier: 1.35, defenseIgnorePercent: 12 },
        { mpCost: 21, multiplier: 1.48, defenseIgnorePercent: 15 },
        { mpCost: 24, multiplier: 1.61, defenseIgnorePercent: 18 },
        { mpCost: 28, multiplier: 1.76, defenseIgnorePercent: 21 },
        { mpCost: 32, multiplier: 1.92, defenseIgnorePercent: 24 },
        { mpCost: 37, multiplier: 2.09, defenseIgnorePercent: 27 },
        { mpCost: 42, multiplier: 2.27, defenseIgnorePercent: 31 },
        { mpCost: 48, multiplier: 2.46, defenseIgnorePercent: 35 },
        { mpCost: 55, multiplier: 2.66, defenseIgnorePercent: 40 },
        { mpCost: 64, multiplier: 2.90, defenseIgnorePercent: 45 }
      ]),
      getDescription: lc => `敵単体へATK ${lc.multiplier.toFixed(2)}倍の物理攻撃。DEFを${lc.defenseIgnorePercent}%無視する。【現職時】竜気+1`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getPrimaryTarget(caster, battle);
        if (!target) return;
        addDragonSpirit(caster, 1, battle);
        animateSkill(caster, target, 'pierce', () => executePhysicalAttack({
          caster, target, battle, multiplier: lc.multiplier,
          defenseIgnorePercent: getDefenseIgnore(caster, battle, lc.defenseIgnorePercent)
        }));
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.includes(context.selectedEnemyTarget) ? context.selectedEnemyTarget : targets[0];
          return { target, score: 43 * lc.multiplier + lc.defenseIgnorePercent * .8 };
        }
      }
    },
    {
      id: 'high_jump', name: 'ハイジャンプ', icon: 'vertical_align_top', statDependency: 'ATK',
      actionNameClass: 'text-sky-100', actionNameBorderClass: 'border-sky-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 30, multiplier: 1.70, highHpMultiplier: 1.20, defenseIgnorePercent: 5 },
        { mpCost: 35, multiplier: 1.86, highHpMultiplier: 1.22, defenseIgnorePercent: 7 },
        { mpCost: 40, multiplier: 2.03, highHpMultiplier: 1.24, defenseIgnorePercent: 9 },
        { mpCost: 46, multiplier: 2.21, highHpMultiplier: 1.26, defenseIgnorePercent: 11 },
        { mpCost: 52, multiplier: 2.40, highHpMultiplier: 1.28, defenseIgnorePercent: 13 },
        { mpCost: 59, multiplier: 2.60, highHpMultiplier: 1.30, defenseIgnorePercent: 15 },
        { mpCost: 67, multiplier: 2.82, highHpMultiplier: 1.33, defenseIgnorePercent: 17 },
        { mpCost: 76, multiplier: 3.05, highHpMultiplier: 1.36, defenseIgnorePercent: 19 },
        { mpCost: 86, multiplier: 3.30, highHpMultiplier: 1.40, defenseIgnorePercent: 22 },
        { mpCost: 98, multiplier: 3.60, highHpMultiplier: 1.45, defenseIgnorePercent: 25 }
      ]),
      getDescription: lc => `敵単体へ風属性ATK ${lc.multiplier.toFixed(2)}倍の跳躍攻撃。対象のHPが70%以上なら威力${lc.highHpMultiplier.toFixed(2)}倍。【現職時】竜気+1`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getPrimaryTarget(caster, battle);
        if (!target) return;
        addDragonSpirit(caster, 1, battle);
        const openingMultiplier = getCurrentHpRatio(target) >= .7 ? lc.highHpMultiplier : 1;
        animateSkill(caster, target, 'high_jump', () => executePhysicalAttack({
          caster, target, battle, multiplier: lc.multiplier * openingMultiplier,
          defenseIgnorePercent: getDefenseIgnore(caster, battle, lc.defenseIgnorePercent), element: 'wind'
        }));
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.reduce((best, enemy) => getCurrentHpRatio(enemy) > getCurrentHpRatio(best) ? enemy : best);
          const openingMultiplier = getCurrentHpRatio(target) >= .7 ? lc.highHpMultiplier : 1;
          return { target, score: 45 * lc.multiplier * openingMultiplier + (targets.length === 1 ? 30 : 0) };
        }
      }
    },
    {
      id: 'dragon_sweep', name: 'ドラゴンスイープ', icon: 'cyclone', statDependency: 'ATK',
      actionNameClass: 'text-teal-100', actionNameBorderClass: 'border-teal-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 38, multiplier: .82, defenseIgnorePercent: 5 },
        { mpCost: 44, multiplier: .91, defenseIgnorePercent: 7 },
        { mpCost: 50, multiplier: 1.00, defenseIgnorePercent: 9 },
        { mpCost: 57, multiplier: 1.10, defenseIgnorePercent: 11 },
        { mpCost: 65, multiplier: 1.21, defenseIgnorePercent: 13 },
        { mpCost: 74, multiplier: 1.33, defenseIgnorePercent: 15 },
        { mpCost: 84, multiplier: 1.46, defenseIgnorePercent: 17 },
        { mpCost: 95, multiplier: 1.60, defenseIgnorePercent: 19 },
        { mpCost: 108, multiplier: 1.76, defenseIgnorePercent: 22 },
        { mpCost: 124, multiplier: 1.95, defenseIgnorePercent: 25 }
      ]),
      getDescription: lc => `敵全体へ風属性ATK ${lc.multiplier.toFixed(2)}倍の物理攻撃。DEFを${lc.defenseIgnorePercent}%無視する。【現職時】竜気+1`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getOffensiveTargets(caster, battle);
        if (!targets.length) return;
        addDragonSpirit(caster, 1, battle);
        animateSkill(caster, targets, 'sweep', target => executePhysicalAttack({
          caster, target, battle, multiplier: lc.multiplier,
          defenseIgnorePercent: getDefenseIgnore(caster, battle, lc.defenseIgnorePercent),
          element: 'wind', isAoEProcessed: true
        }));
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (targets.length < 2) return null;
          return { target: targets[0], score: 39 * lc.multiplier * targets.length + targets.length * 12 };
        }
      }
    },
    {
      id: 'skyfall_dive', name: '天墜竜槍', icon: 'south', statDependency: 'ATK',
      actionNameClass: 'text-yellow-100', actionNameBorderClass: 'border-sky-300/80',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 70, multiplier: 2.30, spiritMultiplier: .35, defenseIgnorePercent: 20 },
        { mpCost: 80, multiplier: 2.50, spiritMultiplier: .38, defenseIgnorePercent: 23 },
        { mpCost: 91, multiplier: 2.72, spiritMultiplier: .41, defenseIgnorePercent: 26 },
        { mpCost: 103, multiplier: 2.96, spiritMultiplier: .44, defenseIgnorePercent: 29 },
        { mpCost: 117, multiplier: 3.22, spiritMultiplier: .47, defenseIgnorePercent: 32 },
        { mpCost: 133, multiplier: 3.50, spiritMultiplier: .50, defenseIgnorePercent: 35 },
        { mpCost: 151, multiplier: 3.81, spiritMultiplier: .54, defenseIgnorePercent: 38 },
        { mpCost: 172, multiplier: 4.15, spiritMultiplier: .58, defenseIgnorePercent: 41 },
        { mpCost: 195, multiplier: 4.52, spiritMultiplier: .62, defenseIgnorePercent: 45 },
        { mpCost: 222, multiplier: 4.95, spiritMultiplier: .68, defenseIgnorePercent: 50 }
      ], ADVANCED_LEVEL_COSTS),
      getDescription: lc => `敵単体へ風属性ATK ${lc.multiplier.toFixed(2)}倍の竜槍を落とす。【現職時】竜気を全消費し、1個ごとに威力+${lc.spiritMultiplier.toFixed(2)}倍`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getPrimaryTarget(caster, battle);
        if (!target) return;
        const spirit = isDragoon(caster) ? (caster._dragoonSpirit || 0) : 0;
        if (isDragoon(caster)) caster._dragoonSpirit = 0;
        animateSkill(caster, target, 'dive', () => executePhysicalAttack({
          caster, target, battle, multiplier: lc.multiplier + spirit * lc.spiritMultiplier,
          defenseIgnorePercent: getDefenseIgnore(caster, battle, lc.defenseIgnorePercent), element: 'wind'
        }));
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.includes(context.selectedEnemyTarget)
            ? context.selectedEnemyTarget
            : targets.reduce((best, enemy) => (enemy.currentHp || 0) > (best.currentHp || 0) ? enemy : best);
          const spirit = isDragoon(caster) ? (caster._dragoonSpirit || 0) : 0;
          return { target, score: 46 * (lc.multiplier + spirit * lc.spiritMultiplier) + (targets.length === 1 ? 55 : 0) };
        }
      }
    },
    {
      id: 'lance_mastery', name: '槍術の極意', icon: 'stat_3', type: 'passive',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusAtkPercent: 3, skillDefenseIgnorePercent: 2 },
        { mpCost: 0, bonusAtkPercent: 5, skillDefenseIgnorePercent: 4 },
        { mpCost: 0, bonusAtkPercent: 7, skillDefenseIgnorePercent: 6 },
        { mpCost: 0, bonusAtkPercent: 10, skillDefenseIgnorePercent: 8 },
        { mpCost: 0, bonusAtkPercent: 13, skillDefenseIgnorePercent: 10 },
        { mpCost: 0, bonusAtkPercent: 16, skillDefenseIgnorePercent: 12 },
        { mpCost: 0, bonusAtkPercent: 19, skillDefenseIgnorePercent: 14 },
        { mpCost: 0, bonusAtkPercent: 22, skillDefenseIgnorePercent: 16 },
        { mpCost: 0, bonusAtkPercent: 26, skillDefenseIgnorePercent: 18 },
        { mpCost: 0, bonusAtkPercent: 30, skillDefenseIgnorePercent: 20 }
      ]),
      getDescription: lc => `ATK+${lc.bonusAtkPercent}%。ドラグーンの攻撃スキルがさらにDEFを${lc.skillDefenseIgnorePercent}%無視する`
    },
    {
      id: 'dragon_scales', name: '竜鱗の加護', icon: 'shield_moon', type: 'passive',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusHpPercent: 3, bonusDefPercent: 3 },
        { mpCost: 0, bonusHpPercent: 5, bonusDefPercent: 5 },
        { mpCost: 0, bonusHpPercent: 7, bonusDefPercent: 7 },
        { mpCost: 0, bonusHpPercent: 9, bonusDefPercent: 10 },
        { mpCost: 0, bonusHpPercent: 12, bonusDefPercent: 13 },
        { mpCost: 0, bonusHpPercent: 15, bonusDefPercent: 16 },
        { mpCost: 0, bonusHpPercent: 18, bonusDefPercent: 19 },
        { mpCost: 0, bonusHpPercent: 21, bonusDefPercent: 22 },
        { mpCost: 0, bonusHpPercent: 24, bonusDefPercent: 26 },
        { mpCost: 0, bonusHpPercent: 28, bonusDefPercent: 30 }
      ]),
      getDescription: lc => `最大HP+${lc.bonusHpPercent}%、DEF+${lc.bonusDefPercent}%`
    },
    {
      id: 'dragon_heart', name: '竜騎士の魂', icon: 'favorite', type: 'passive',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusSpd: 3, maxDragonSpirit: 2 },
        { mpCost: 0, bonusSpd: 5, maxDragonSpirit: 2 },
        { mpCost: 0, bonusSpd: 7, maxDragonSpirit: 2 },
        { mpCost: 0, bonusSpd: 10, maxDragonSpirit: 3 },
        { mpCost: 0, bonusSpd: 13, maxDragonSpirit: 3 },
        { mpCost: 0, bonusSpd: 16, maxDragonSpirit: 3 },
        { mpCost: 0, bonusSpd: 20, maxDragonSpirit: 4 },
        { mpCost: 0, bonusSpd: 24, maxDragonSpirit: 4 },
        { mpCost: 0, bonusSpd: 28, maxDragonSpirit: 4 },
        { mpCost: 0, bonusSpd: 35, maxDragonSpirit: 5 }
      ]),
      getDescription: lc => `基礎SPD+${lc.bonusSpd}。【現職時】攻撃スキルで竜気を最大${lc.maxDragonSpirit}個まで蓄積する`
    }
  ]
};
