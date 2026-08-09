import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

const levelCosts = [1, 1, 1, 2, 2, 2, 3, 3, 3, 5];
const makeLevels = configs => configs.map((config, index) => ({
  level: index + 1,
  spCost: levelCosts[index],
  ...config
}));

const ELEMENTS = ['fire', 'water', 'grass', 'ice', 'thunder', 'wind', 'earth', 'light', 'dark'];
const ELEMENT_LABELS = {
  fire: '火', water: '水', grass: '草', ice: '氷', thunder: '雷',
  wind: '風', earth: '土', light: '光', dark: '闇'
};
const ELEMENT_COLORS = {
  fire: ['#fff7ad', '#f97316'], water: ['#cffafe', '#0284c7'],
  grass: ['#ecfccb', '#65a30d'], ice: ['#ffffff', '#38bdf8'],
  thunder: ['#fef9c3', '#eab308'], wind: ['#d1fae5', '#10b981'],
  earth: ['#fef3c7', '#a16207'], light: ['#ffffff', '#facc15'],
  dark: ['#f5d0fe', '#7e22ce'], arcane: ['#cffafe', '#8b5cf6']
};

const getTargetGroup = (caster, battle) => {
  if (caster.activeAilment?.type === 'confusion'
    && battle.selectedEnemyTarget
    && battle.party.includes(battle.selectedEnemyTarget)) {
    return battle.party;
  }
  return battle.enemies;
};

const getSelectedTarget = (caster, battle) => {
  const group = getTargetGroup(caster, battle);
  let target = battle.selectedEnemyTarget;
  if (!target || target.isDead || !group.includes(target)) target = group.find(entity => !entity.isDead);
  return target || null;
};

const getWeakestElement = target => {
  const resists = target?.stats?.elementResist || target?.elementResist || target?.elements || {};
  return ELEMENTS.reduce((best, element) => (
    (Number(resists[element]) || 0) < (Number(resists[best]) || 0) ? element : best
  ), ELEMENTS[0]);
};

const scheduleHit = (battle, callback, delay) => {
  if (typeof battle._scheduleBattleTimeout === 'function') {
    battle._scheduleBattleTimeout(callback, delay);
  } else {
    setTimeout(callback, delay);
  }
};

const playSkillAnimation = (caster, targets, variant, element, onImpact) => {
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
  const [primary, secondary] = ELEMENT_COLORS[element] || ELEMENT_COLORS.arcane;

  const addImpact = (x, y, index) => {
    const ring = document.createElement('div');
    ring.style.cssText = `position:fixed;left:${x - 34}px;top:${y - 34}px;width:68px;height:68px;border:3px solid ${primary};border-radius:50%;background:radial-gradient(circle,${primary} 0 5%,${secondary}99 18%,transparent 65%);box-shadow:0 0 16px ${secondary},inset 0 0 12px ${primary};z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
    layer.appendChild(ring);
    ring.animate([
      { transform: 'scale(.08) rotate(-45deg)', opacity: 1 },
      { transform: 'scale(1.35) rotate(55deg)', opacity: 0 }
    ], { duration: 360 / speedMult, easing: 'ease-out' }).onfinish = () => ring.remove();

    for (let sparkIndex = 0; sparkIndex < 7; sparkIndex++) {
      const spark = document.createElement('i');
      const angle = Math.PI * 2 * sparkIndex / 7;
      spark.style.cssText = `position:fixed;left:${x - 3}px;top:${y - 3}px;width:6px;height:6px;background:${sparkIndex % 2 ? secondary : primary};transform:rotate(45deg);box-shadow:0 0 8px ${secondary};z-index:9999;pointer-events:none;`;
      layer.appendChild(spark);
      spark.animate([
        { transform: 'translate(0,0) rotate(45deg) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * 48}px,${Math.sin(angle) * 48}px) rotate(160deg) scale(.1)`, opacity: 0 }
      ], { duration: 320 / speedMult, easing: 'ease-out' }).onfinish = () => spark.remove();
    }
    onImpact?.(targetList[index], index);
  };

  targetList.forEach((target, index) => {
    const targetEl = document.getElementById(target.elementId);
    if (!targetEl) {
      onImpact?.(target, index);
      return;
    }
    const rect = targetEl.getBoundingClientRect();
    const destination = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    setTimeout(() => {
      const arrow = document.createElement('div');
      const isRain = variant === 'starfall';
      const start = isRain
        ? { x: destination.x - 50 + Math.random() * 100, y: destination.y - 190 }
        : origin;
      const dx = destination.x - start.x;
      const dy = destination.y - start.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      const arrowLength = variant === 'piercing' ? 112 : 78;
      arrow.style.cssText = `position:fixed;left:${start.x - 10}px;top:${start.y - 6}px;width:${arrowLength}px;height:12px;background:linear-gradient(90deg,transparent,${secondary} 28%,${primary} 72%,#fff);clip-path:polygon(0 40%,72% 40%,72% 0,100% 50%,72% 100%,72% 60%,0 60%);filter:drop-shadow(0 0 ${variant === 'piercing' ? 13 : 8}px ${secondary});transform-origin:10px 50%;z-index:9999;pointer-events:none;mix-blend-mode:screen;`;
      layer.appendChild(arrow);
      arrow.animate([
        { transform: `rotate(${angle}rad) translateX(0) scaleX(.2)`, opacity: 0 },
        { opacity: 1, offset: .15 },
        { transform: `rotate(${angle}rad) translateX(${Math.max(0, distance - 18)}px) scaleX(1)`, opacity: 1 }
      ], { duration: (variant === 'piercing' ? 390 : 280) / speedMult, easing: 'cubic-bezier(.3,.72,.2,1)' }).onfinish = () => {
        arrow.remove();
        addImpact(destination.x, destination.y, index);
      };
    }, index * 65 / speedMult);
  });
};

export const magic_archer = {
  id: 'magic_archer',
  name: 'マジックアーチャー',
  icon: 'my_location',
  image: './assets/job/job_magic_archer.webp',
  changeCost: 500000,
  requirements: [
    { jobId: 'ranger', level: 100 },
    { jobId: 'mage', level: 100 }
  ],
  skills: [
    {
      id: 'arcane_arrow', name: 'アーケインアロー', icon: 'arrow_right_alt', statDependency: 'MAT',
      actionNameClass: 'text-violet-200', actionNameBorderClass: 'border-violet-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 18, multiplier: 1.35 }, { mpCost: 22, multiplier: 1.48 },
        { mpCost: 26, multiplier: 1.61 }, { mpCost: 31, multiplier: 1.74 },
        { mpCost: 36, multiplier: 1.87 }, { mpCost: 42, multiplier: 2.00 },
        { mpCost: 49, multiplier: 2.14 }, { mpCost: 57, multiplier: 2.29 },
        { mpCost: 66, multiplier: 2.46 }, { mpCost: 78, multiplier: 2.65 }
      ]),
      getDescription: lc => `MP を ${lc.mpCost} 消費し、敵単体に MATK ${lc.multiplier.toFixed(2)} 倍の無属性魔法矢を放つ`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getSelectedTarget(caster, battle);
        if (!target) return;
        playSkillAnimation(caster, target, 'single', 'arcane', () => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, actionName: this.name,
            damageMultiplier: lc.multiplier, damageType: 'skill', hideActionName: true
          });
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(target => !target.isDead);
          if (!targets.length) return null;
          return { target: context.selectedEnemyTarget || targets[0], score: 44 * lc.multiplier };
        }
      }
    },
    {
      id: 'elemental_arrow', name: 'エレメンタルアロー', icon: 'colorize', statDependency: 'MAT',
      actionNameClass: 'text-cyan-100', actionNameBorderClass: 'border-cyan-300/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 28, multiplier: 1.18 }, { mpCost: 33, multiplier: 1.29 },
        { mpCost: 38, multiplier: 1.40 }, { mpCost: 44, multiplier: 1.51 },
        { mpCost: 50, multiplier: 1.62 }, { mpCost: 57, multiplier: 1.73 },
        { mpCost: 65, multiplier: 1.84 }, { mpCost: 74, multiplier: 1.96 },
        { mpCost: 84, multiplier: 2.08 }, { mpCost: 96, multiplier: 2.22 }
      ]),
      getDescription: lc => `MP を ${lc.mpCost} 消費し、敵単体の最も低い属性耐性を自動で見抜き、MATK ${lc.multiplier.toFixed(2)} 倍の属性魔法矢を放つ`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getSelectedTarget(caster, battle);
        if (!target) return;
        const element = getWeakestElement(target);
        battle.showDamage?.(target.elementId, `${ELEMENT_LABELS[element]}属性`, 'text-cyan-200');
        playSkillAnimation(caster, target, 'single', element, () => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, actionName: this.name,
            damageMultiplier: lc.multiplier, damageType: 'skill', element, hideActionName: true
          });
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(target => !target.isDead);
          if (!targets.length) return null;
          const target = context.selectedEnemyTarget || targets[0];
          const element = getWeakestElement(target);
          const resist = Number(target.stats?.elementResist?.[element]) || 0;
          return { target, score: 48 * lc.multiplier * Math.max(.25, 1 - resist / 100) };
        }
      }
    },
    {
      id: 'mana_barrage', name: 'マナバラージ', icon: 'double_arrow', statDependency: 'MAT',
      actionNameClass: 'text-fuchsia-200', actionNameBorderClass: 'border-fuchsia-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 34, multiplier: .38, hits: 3 }, { mpCost: 40, multiplier: .41, hits: 3 },
        { mpCost: 47, multiplier: .44, hits: 4 }, { mpCost: 55, multiplier: .47, hits: 4 },
        { mpCost: 64, multiplier: .50, hits: 5 }, { mpCost: 74, multiplier: .53, hits: 5 },
        { mpCost: 85, multiplier: .56, hits: 6 }, { mpCost: 97, multiplier: .59, hits: 6 },
        { mpCost: 110, multiplier: .62, hits: 7 }, { mpCost: 126, multiplier: .66, hits: 8 }
      ]),
      getDescription: lc => `MP を ${lc.mpCost} 消費し、ランダムな敵に MATK ${lc.multiplier.toFixed(2)} 倍の無属性魔法矢を ${lc.hits} 回放つ`,
      execute(caster, lc, battle) {
        if (!battle) return;
        for (let hit = 0; hit < lc.hits; hit++) {
          scheduleHit(battle, () => {
            if (caster.isDead || battle.isStopped) return;
            const targets = getTargetGroup(caster, battle).filter(target => !target.isDead);
            if (!targets.length) return;
            const target = targets[Math.floor(Math.random() * targets.length)];
            playSkillAnimation(caster, target, 'single', 'arcane', () => {
              if (target.isDead) return;
              battle.executeAttack(caster, target, true, {
                statDependency: this.statDependency, actionName: this.name,
                damageMultiplier: lc.multiplier, damageType: 'skill', hideActionName: true,
                skipAtbReset: hit > 0
              });
            });
          }, hit * 150 / (battle.speedMult || 1));
        }
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(target => !target.isDead);
          if (!targets.length) return null;
          return { target: targets[0], score: 39 * lc.multiplier * lc.hits + (targets.length === 1 ? 42 : 0) };
        }
      }
    },
    {
      id: 'astral_arrow_rain', name: 'アストラルレイン', icon: 'star_shine', statDependency: 'MAT',
      actionNameClass: 'text-indigo-100', actionNameBorderClass: 'border-indigo-300/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 54, multiplier: .68 }, { mpCost: 62, multiplier: .77 },
        { mpCost: 71, multiplier: .86 }, { mpCost: 81, multiplier: .96 },
        { mpCost: 92, multiplier: 1.06 }, { mpCost: 104, multiplier: 1.16 },
        { mpCost: 117, multiplier: 1.28 }, { mpCost: 131, multiplier: 1.40 },
        { mpCost: 146, multiplier: 1.54 }, { mpCost: 164, multiplier: 1.70 }
      ]),
      getDescription: lc => `MP を ${lc.mpCost} 消費し、敵全体に MATK ${lc.multiplier.toFixed(2)} 倍の光属性魔法矢を降らせる`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getTargetGroup(caster, battle).filter(target => !target.isDead);
        if (!targets.length) return;
        playSkillAnimation(caster, targets, 'starfall', 'light', (target, index) => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: this.statDependency, actionName: this.name,
            damageMultiplier: lc.multiplier, damageType: 'skill', element: 'light',
            hideActionName: true, isAoEProcessed: true,
            skipAtbReset: index < targets.length - 1
          });
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(target => !target.isDead);
          if (targets.length < 2) return null;
          const averageResist = targets.reduce((sum, target) => sum + (Number(target.stats?.elementResist?.light) || 0), 0) / targets.length;
          return { target: targets[0], score: 43 * lc.multiplier * targets.length * Math.max(.2, 1 - averageResist / 100) };
        }
      }
    },
    {
      id: 'arcane_bow_mastery', name: '魔弓の心得', icon: 'auto_awesome', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusMatkPercent: 3 }, { mpCost: 0, bonusMatkPercent: 6 },
        { mpCost: 0, bonusMatkPercent: 9 }, { mpCost: 0, bonusMatkPercent: 12 },
        { mpCost: 0, bonusMatkPercent: 15 }, { mpCost: 0, bonusMatkPercent: 18 },
        { mpCost: 0, bonusMatkPercent: 21 }, { mpCost: 0, bonusMatkPercent: 24 },
        { mpCost: 0, bonusMatkPercent: 27 }, { mpCost: 0, bonusMatkPercent: 30 }
      ]),
      getDescription: lc => `魔法攻撃力の倍率が ${lc.bonusMatkPercent}% 上昇する`
    },
    {
      id: 'mana_quiver', name: 'マナクィーヴァー', icon: 'battery_charging_full', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusMpPercent: 3 }, { mpCost: 0, bonusMpPercent: 6 },
        { mpCost: 0, bonusMpPercent: 9 }, { mpCost: 0, bonusMpPercent: 12 },
        { mpCost: 0, bonusMpPercent: 15 }, { mpCost: 0, bonusMpPercent: 18 },
        { mpCost: 0, bonusMpPercent: 21 }, { mpCost: 0, bonusMpPercent: 24 },
        { mpCost: 0, bonusMpPercent: 27 }, { mpCost: 0, bonusMpPercent: 30 }
      ]),
      getDescription: lc => `最大 MP の倍率が ${lc.bonusMpPercent}% 上昇する`
    },
    {
      id: 'mystic_hawkeye', name: '魔眼の照準', icon: 'visibility', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusSpd: 3 }, { mpCost: 0, bonusSpd: 6 },
        { mpCost: 0, bonusSpd: 9 }, { mpCost: 0, bonusSpd: 12 },
        { mpCost: 0, bonusSpd: 15 }, { mpCost: 0, bonusSpd: 18 },
        { mpCost: 0, bonusSpd: 21 }, { mpCost: 0, bonusSpd: 24 },
        { mpCost: 0, bonusSpd: 27 }, { mpCost: 0, bonusSpd: 30 }
      ]),
      getDescription: lc => `基礎スピードが ${lc.bonusSpd} 上昇する`
    }
  ]
};
