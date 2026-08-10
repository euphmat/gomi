import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

const LEVEL_COSTS = [1, 1, 1, 2, 2, 2, 3, 3, 3, 5];
const ADVANCED_LEVEL_COSTS = [2, 2, 2, 3, 3, 3, 4, 4, 4, 6];
const makeLevels = (configs, costs = LEVEL_COSTS) => configs.map((config, index) => ({
  level: index + 1,
  spCost: costs[index],
  ...config
}));

const CHARGE_ELEMENTS = ['fire', 'ice', 'thunder'];
const ELEMENT_LABELS = { fire: '火', ice: '氷', thunder: '雷' };

const getTargetGroup = (caster, battle) => {
  if (caster.activeAilment?.type === 'confusion'
    && battle.selectedEnemyTarget
    && battle.party.includes(battle.selectedEnemyTarget)) {
    return battle.party;
  }
  return battle.enemies;
};

const getLivingTargets = (caster, battle) =>
  getTargetGroup(caster, battle).filter(target => !target.isDead);

const getPrimaryTarget = (caster, battle) => {
  const targets = getLivingTargets(caster, battle);
  return targets.includes(battle.selectedEnemyTarget) ? battle.selectedEnemyTarget : targets[0] || null;
};

const getWeakestChargeElement = target => {
  const resists = target?.stats?.elementResist || target?.elementResist || {};
  return CHARGE_ELEMENTS.reduce((best, element) =>
    (Number(resists[element]) || 0) < (Number(resists[best]) || 0) ? element : best
  , CHARGE_ELEMENTS[0]);
};

const getGunMastery = (caster, battle) =>
  battle._findSkill?.(caster, 'gun_mastery')?.levelConfig || null;

const getPenetrator = (caster, battle) =>
  battle._findSkill?.(caster, 'penetrator')?.levelConfig || null;

const getDefenseIgnore = (caster, battle, baseIgnore = 0) =>
  Math.min(90, baseIgnore + (getGunMastery(caster, battle)?.skillDefenseIgnorePercent || 0));

const tryQuickReload = (caster, mpCost, battle) => {
  const config = battle._findSkill?.(caster, 'quick_reload')?.levelConfig;
  if (!config || !caster.mp || Math.random() * 100 >= config.chance) return;
  const maxMp = caster.stats?.mp || caster.mp.max;
  const recovery = Math.min(
    Math.max(0, maxMp - caster.mp.current),
    Math.max(1, Math.floor(mpCost * config.refundPercent / 100))
  );
  if (recovery <= 0) return;
  caster.mp.current += recovery;
  battle.showActionName?.(caster.elementId, 'クイックロード', 'text-amber-200', 'border-amber-400/60');
  battle.showDamage?.(caster.elementId, `+${recovery} MP`, 'text-cyan-300');
};

const tryApplyParalysis = (target, chance, battle) => {
  if (!target || target.isDead || target.activeAilment) return;
  const resist = (target.stats?.ailmentResist?.paralysis || 0)
    + (target._ailmentResistBuffTurns > 0 ? (target._ailmentResistBuffAmount || 0) : 0);
  if (Math.random() * 100 >= Math.max(0, chance - resist)) return;
  target.activeAilment = { type: 'paralysis', duration: 10 };
  battle.showDamage?.(target.elementId, '腕封じ', 'text-yellow-300');
};

const scheduleHit = (battle, callback, delay) => {
  if (typeof battle._scheduleBattleTimeout === 'function') battle._scheduleBattleTimeout(callback, delay);
  else setTimeout(callback, delay);
};

const playGunAnimation = (caster, targets, variant, onImpact) => {
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
    : { x: window.innerWidth / 2, y: window.innerHeight * .72 };

  targetList.forEach((target, index) => {
    const targetEl = document.getElementById(target?.elementId);
    const rect = targetEl?.getBoundingClientRect();
    const destination = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : origin;

    setTimeout(() => {
      const dx = destination.x - origin.x;
      const dy = destination.y - origin.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      const tracer = document.createElement('div');
      const isStorm = variant === 'storm';
      const isCharge = variant === 'charge';
      tracer.style.cssText = `position:fixed;left:${origin.x}px;top:${origin.y - 3}px;width:${isCharge ? 112 : 78}px;height:${isCharge ? 8 : 5}px;background:linear-gradient(90deg,#f59e0b,#fef3c7,#fff);clip-path:polygon(0 25%,88% 25%,100% 50%,88% 75%,0 75%);filter:drop-shadow(0 0 ${isCharge ? 12 : 7}px #f59e0b);transform-origin:0 50%;z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
      layer.appendChild(tracer);
      tracer.animate([
        { transform: `rotate(${angle}rad) translateX(0) scaleX(.18)`, opacity: 0 },
        { opacity: 1, offset: .12 },
        { transform: `rotate(${angle}rad) translateX(${Math.max(0, distance - 20)}px) scaleX(1)`, opacity: 1 }
      ], { duration: (isCharge ? 390 : 250) / speed, easing: 'cubic-bezier(.2,.75,.2,1)' }).onfinish = () => {
        tracer.remove();
        const impact = document.createElement('div');
        impact.style.cssText = `position:fixed;left:${destination.x - 34}px;top:${destination.y - 34}px;width:68px;height:68px;border:${isCharge ? 5 : 3}px solid #fef3c7;border-radius:50%;background:radial-gradient(circle,#fff 0 5%,#f59e0b99 18%,transparent 62%);box-shadow:0 0 18px #f59e0b;z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
        layer.appendChild(impact);
        impact.animate([
          { transform: 'scale(.08)', opacity: 1 },
          { transform: `scale(${isStorm ? 1.5 : 1.15}) rotate(70deg)`, opacity: 0 }
        ], { duration: 330 / speed, easing: 'ease-out' }).onfinish = () => impact.remove();
        onImpact?.(target, index);
      };
    }, index * (variant === 'storm' ? 55 : 75) / speed);
  });
};

const executeShot = ({
  caster, target, battle, multiplier, defenseIgnorePercent = 0, element,
  canPenetrate = false, onPrimaryHit
}) => {
  if (!target || target.isDead || caster.isDead || battle.isStopped) return;
  const penetrator = canPenetrate ? getPenetrator(caster, battle) : null;
  const spillTargets = penetrator && Math.random() * 100 < penetrator.chance
    ? getLivingTargets(caster, battle).filter(other => other !== target)
    : [];

  battle.executeAttack(caster, target, true, {
    statDependency: 'ATK', actionName: '', damageType: 'skill', hideActionName: true,
    damageMultiplier: multiplier,
    defenseIgnorePercent: getDefenseIgnore(caster, battle, defenseIgnorePercent),
    element,
    skipAtbReset: spillTargets.length > 0
  });
  onPrimaryHit?.(target);

  if (!spillTargets.length) return;
  battle.showActionName?.(caster.elementId, 'ペネトレイター', 'text-orange-200', 'border-orange-400/60');
  spillTargets.forEach((other, index) => {
    if (other.isDead || caster.isDead || battle.isStopped) return;
    battle.executeAttack(caster, other, true, {
      statDependency: 'ATK', actionName: '', damageType: 'skill', hideActionName: true,
      damageMultiplier: multiplier * penetrator.spillMultiplier,
      defenseIgnorePercent: getDefenseIgnore(caster, battle, defenseIgnorePercent),
      element, isAoEProcessed: true,
      skipAtbReset: index < spillTargets.length - 1
    });
  });
};

export const gunner = {
  id: 'gunner',
  name: 'ガンナー',
  icon: 'target',
  image: './assets/job/job_gunner.webp',
  changeCost: 500000,
  requirements: [
    { jobId: 'ranger', level: 100 },
    { jobId: 'assassin', level: 100 }
  ],
  skills: [
    {
      id: 'charged_shot', name: 'チャージショット', icon: 'my_location', statDependency: 'ATK',
      actionNameClass: 'text-orange-100', actionNameBorderClass: 'border-orange-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 22, multiplier: 1.55, defenseIgnorePercent: 10 },
        { mpCost: 26, multiplier: 1.70, defenseIgnorePercent: 12 },
        { mpCost: 30, multiplier: 1.86, defenseIgnorePercent: 14 },
        { mpCost: 35, multiplier: 2.03, defenseIgnorePercent: 16 },
        { mpCost: 40, multiplier: 2.21, defenseIgnorePercent: 18 },
        { mpCost: 46, multiplier: 2.40, defenseIgnorePercent: 20 },
        { mpCost: 53, multiplier: 2.61, defenseIgnorePercent: 22 },
        { mpCost: 61, multiplier: 2.84, defenseIgnorePercent: 24 },
        { mpCost: 70, multiplier: 3.08, defenseIgnorePercent: 27 },
        { mpCost: 82, multiplier: 3.35, defenseIgnorePercent: 30 }
      ]),
      getDescription: lc => `敵単体へATK ${lc.multiplier.toFixed(2)}倍の物理攻撃。DEFを${lc.defenseIgnorePercent}%無視する`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getPrimaryTarget(caster, battle);
        if (!target) return;
        tryQuickReload(caster, lc.mpCost, battle);
        playGunAnimation(caster, target, 'charge', () => executeShot({
          caster, target, battle, multiplier: lc.multiplier,
          defenseIgnorePercent: lc.defenseIgnorePercent, canPenetrate: true
        }));
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.includes(context.selectedEnemyTarget) ? context.selectedEnemyTarget : targets[0];
          return { target, score: 46 * lc.multiplier + lc.defenseIgnorePercent + (targets.length === 1 ? 38 : 0) };
        }
      }
    },
    {
      id: 'elemental_charge', name: '属性チャージ', icon: 'colors', statDependency: 'ATK',
      actionNameClass: 'text-cyan-100', actionNameBorderClass: 'border-cyan-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 28, multiplier: 1.35 }, { mpCost: 33, multiplier: 1.48 },
        { mpCost: 38, multiplier: 1.61 }, { mpCost: 44, multiplier: 1.75 },
        { mpCost: 50, multiplier: 1.90 }, { mpCost: 57, multiplier: 2.06 },
        { mpCost: 65, multiplier: 2.23 }, { mpCost: 74, multiplier: 2.42 },
        { mpCost: 84, multiplier: 2.62 }, { mpCost: 96, multiplier: 2.85 }
      ]),
      getDescription: lc => `敵単体の火・氷・雷で最も低い耐性を見抜き、ATK ${lc.multiplier.toFixed(2)}倍の属性弾を放つ`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getPrimaryTarget(caster, battle);
        if (!target) return;
        const element = getWeakestChargeElement(target);
        tryQuickReload(caster, lc.mpCost, battle);
        battle.showDamage?.(target.elementId, `${ELEMENT_LABELS[element]}属性`, 'text-cyan-200');
        playGunAnimation(caster, target, 'charge', () => executeShot({
          caster, target, battle, multiplier: lc.multiplier, element, canPenetrate: true
        }));
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.includes(context.selectedEnemyTarget) ? context.selectedEnemyTarget : targets[0];
          const element = getWeakestChargeElement(target);
          const resist = Number(target.stats?.elementResist?.[element]) || 0;
          return { target, score: 49 * lc.multiplier * Math.max(.25, 1 - resist / 100) };
        }
      }
    },
    {
      id: 'arm_snipe', name: 'アームスナイプ', icon: 'gps_fixed', statDependency: 'ATK',
      actionNameClass: 'text-yellow-100', actionNameBorderClass: 'border-yellow-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 24, multiplier: 1.18, bindChance: 24 }, { mpCost: 28, multiplier: 1.28, bindChance: 28 },
        { mpCost: 32, multiplier: 1.38, bindChance: 32 }, { mpCost: 37, multiplier: 1.49, bindChance: 36 },
        { mpCost: 42, multiplier: 1.60, bindChance: 40 }, { mpCost: 48, multiplier: 1.72, bindChance: 44 },
        { mpCost: 55, multiplier: 1.85, bindChance: 48 }, { mpCost: 63, multiplier: 1.99, bindChance: 53 },
        { mpCost: 72, multiplier: 2.14, bindChance: 58 }, { mpCost: 84, multiplier: 2.32, bindChance: 65 }
      ]),
      getDescription: lc => `敵単体へATK ${lc.multiplier.toFixed(2)}倍の精密射撃。${lc.bindChance}%で腕を封じ、麻痺を付与する`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getPrimaryTarget(caster, battle);
        if (!target) return;
        tryQuickReload(caster, lc.mpCost, battle);
        playGunAnimation(caster, target, 'snipe', () => executeShot({
          caster, target, battle, multiplier: lc.multiplier, canPenetrate: true,
          onPrimaryHit: hitTarget => tryApplyParalysis(hitTarget, lc.bindChance, battle)
        }));
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.find(enemy => !enemy.activeAilment) || targets[0];
          return { target, score: 42 * lc.multiplier + (!target.activeAilment ? lc.bindChance * 1.25 : 0) };
        }
      }
    },
    {
      id: 'rapid_fire', name: 'ラピッドファイア', icon: 'read_more', statDependency: 'ATK',
      actionNameClass: 'text-amber-100', actionNameBorderClass: 'border-amber-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 34, multiplier: .38, hits: 4 }, { mpCost: 40, multiplier: .41, hits: 4 },
        { mpCost: 47, multiplier: .44, hits: 5 }, { mpCost: 55, multiplier: .47, hits: 5 },
        { mpCost: 64, multiplier: .50, hits: 6 }, { mpCost: 74, multiplier: .53, hits: 6 },
        { mpCost: 85, multiplier: .56, hits: 7 }, { mpCost: 97, multiplier: .59, hits: 7 },
        { mpCost: 110, multiplier: .62, hits: 8 }, { mpCost: 126, multiplier: .66, hits: 9 }
      ]),
      getDescription: lc => `ランダムな敵へATK ${lc.multiplier.toFixed(2)}倍の弾丸を${lc.hits}発連射する`,
      execute(caster, lc, battle) {
        if (!battle) return;
        tryQuickReload(caster, lc.mpCost, battle);
        for (let hit = 0; hit < lc.hits; hit++) {
          scheduleHit(battle, () => {
            if (caster.isDead || battle.isStopped) return;
            const targets = getLivingTargets(caster, battle);
            if (!targets.length) return;
            const target = targets[Math.floor(Math.random() * targets.length)];
            playGunAnimation(caster, target, 'rapid', () => {
              if (target.isDead) return;
              battle.executeAttack(caster, target, true, {
                statDependency: 'ATK', actionName: '', damageType: 'skill', hideActionName: true,
                damageMultiplier: lc.multiplier,
                defenseIgnorePercent: getDefenseIgnore(caster, battle),
                skipAtbReset: hit < lc.hits - 1
              });
            });
          }, hit * 115 / (battle.speedMult || 1));
        }
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          return { target: targets[0], score: 39 * lc.multiplier * lc.hits + (targets.length === 1 ? 42 : 0) };
        }
      }
    },
    {
      id: 'bullet_storm', name: 'バレットストーム', icon: 'blur_on', statDependency: 'ATK',
      actionNameClass: 'text-red-100', actionNameBorderClass: 'border-orange-300/80',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 62, multiplier: .82, defenseIgnorePercent: 8 },
        { mpCost: 72, multiplier: .92, defenseIgnorePercent: 10 },
        { mpCost: 83, multiplier: 1.03, defenseIgnorePercent: 12 },
        { mpCost: 95, multiplier: 1.15, defenseIgnorePercent: 14 },
        { mpCost: 108, multiplier: 1.28, defenseIgnorePercent: 16 },
        { mpCost: 123, multiplier: 1.42, defenseIgnorePercent: 18 },
        { mpCost: 140, multiplier: 1.58, defenseIgnorePercent: 21 },
        { mpCost: 159, multiplier: 1.76, defenseIgnorePercent: 24 },
        { mpCost: 181, multiplier: 1.96, defenseIgnorePercent: 27 },
        { mpCost: 206, multiplier: 2.20, defenseIgnorePercent: 30 }
      ], ADVANCED_LEVEL_COSTS),
      getDescription: lc => `敵全体へATK ${lc.multiplier.toFixed(2)}倍の一斉射撃。DEFを${lc.defenseIgnorePercent}%無視する`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getLivingTargets(caster, battle);
        if (!targets.length) return;
        tryQuickReload(caster, lc.mpCost, battle);
        playGunAnimation(caster, targets, 'storm', (target, index) => {
          if (target.isDead || caster.isDead || battle.isStopped) return;
          battle.executeAttack(caster, target, true, {
            statDependency: 'ATK', actionName: '', damageType: 'skill', hideActionName: true,
            damageMultiplier: lc.multiplier,
            defenseIgnorePercent: getDefenseIgnore(caster, battle, lc.defenseIgnorePercent),
            isAoEProcessed: true,
            skipAtbReset: index < targets.length - 1
          });
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (targets.length < 2) return null;
          return { target: targets[0], score: 46 * lc.multiplier * targets.length + lc.defenseIgnorePercent };
        }
      }
    },
    {
      id: 'gun_mastery', name: '銃マスタリー', icon: 'manufacturing', type: 'passive',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusAtkPercent: 3, skillDefenseIgnorePercent: 2 },
        { mpCost: 0, bonusAtkPercent: 6, skillDefenseIgnorePercent: 4 },
        { mpCost: 0, bonusAtkPercent: 9, skillDefenseIgnorePercent: 6 },
        { mpCost: 0, bonusAtkPercent: 12, skillDefenseIgnorePercent: 8 },
        { mpCost: 0, bonusAtkPercent: 15, skillDefenseIgnorePercent: 10 },
        { mpCost: 0, bonusAtkPercent: 18, skillDefenseIgnorePercent: 12 },
        { mpCost: 0, bonusAtkPercent: 21, skillDefenseIgnorePercent: 14 },
        { mpCost: 0, bonusAtkPercent: 24, skillDefenseIgnorePercent: 16 },
        { mpCost: 0, bonusAtkPercent: 27, skillDefenseIgnorePercent: 18 },
        { mpCost: 0, bonusAtkPercent: 30, skillDefenseIgnorePercent: 20 }
      ]),
      getDescription: lc => `ATK+${lc.bonusAtkPercent}%。ガンナーの攻撃スキルがさらにDEFを${lc.skillDefenseIgnorePercent}%無視する`
    },
    {
      id: 'penetrator', name: 'ペネトレイター', icon: 'trending_flat', type: 'passive',
      maxLevel: 10,
      // Proc chance and spill damage multiply together; keep total growth linear.
      limitBreakFixedKeys: ['spillMultiplier'],
      levels: makeLevels([
        { mpCost: 0, chance: 15, spillMultiplier: .28 }, { mpCost: 0, chance: 20, spillMultiplier: .31 },
        { mpCost: 0, chance: 25, spillMultiplier: .34 }, { mpCost: 0, chance: 30, spillMultiplier: .37 },
        { mpCost: 0, chance: 35, spillMultiplier: .40 }, { mpCost: 0, chance: 40, spillMultiplier: .44 },
        { mpCost: 0, chance: 45, spillMultiplier: .48 }, { mpCost: 0, chance: 50, spillMultiplier: .52 },
        { mpCost: 0, chance: 55, spillMultiplier: .56 }, { mpCost: 0, chance: 60, spillMultiplier: .60 }
      ]),
      getDescription: lc => `単体銃撃スキルが${lc.chance}%で貫通し、他の敵全体に本来の${Math.round(lc.spillMultiplier * 100)}%ダメージを与える`
    },
    {
      id: 'quick_reload', name: 'クイックロード', icon: 'refresh', type: 'passive',
      maxLevel: 10,
      // Proc chance is the scalable part of MP efficiency after mastery.
      limitBreakFixedKeys: ['refundPercent'],
      levels: makeLevels([
        { mpCost: 0, bonusSpd: 2, chance: 10, refundPercent: 40 },
        { mpCost: 0, bonusSpd: 4, chance: 13, refundPercent: 40 },
        { mpCost: 0, bonusSpd: 6, chance: 16, refundPercent: 40 },
        { mpCost: 0, bonusSpd: 8, chance: 19, refundPercent: 45 },
        { mpCost: 0, bonusSpd: 10, chance: 22, refundPercent: 45 },
        { mpCost: 0, bonusSpd: 12, chance: 25, refundPercent: 45 },
        { mpCost: 0, bonusSpd: 15, chance: 28, refundPercent: 50 },
        { mpCost: 0, bonusSpd: 18, chance: 31, refundPercent: 50 },
        { mpCost: 0, bonusSpd: 21, chance: 34, refundPercent: 50 },
        { mpCost: 0, bonusSpd: 25, chance: 38, refundPercent: 50 }
      ]),
      getDescription: lc => `基礎SPD+${lc.bonusSpd}。銃撃スキル使用時に${lc.chance}%で消費MPの${lc.refundPercent}%を即座に再装填する`
    }
  ]
};
