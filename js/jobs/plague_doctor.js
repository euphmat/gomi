import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

const AILMENTS = ['poison', 'burn', 'paralysis', 'sleep', 'confusion', 'curse', 'blind', 'silence'];
const AILMENT_LABELS = {
  poison: '毒', burn: '火傷', paralysis: '麻痺', sleep: '睡眠',
  confusion: '混乱', curse: '呪い', blind: '暗闇', silence: '沈黙'
};
const LEVEL_COSTS = [2, 2, 2, 3, 3, 3, 4, 4, 4, 6];
const makeLevels = configs => configs.map((config, index) => ({
  level: index + 1,
  spCost: LEVEL_COSTS[index],
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

const getLivingTargets = (caster, battle) =>
  getTargetGroup(caster, battle).filter(target => !target.isDead);

const getPrimaryTarget = (caster, battle) => {
  const targets = getLivingTargets(caster, battle);
  return targets.includes(battle.selectedEnemyTarget) ? battle.selectedEnemyTarget : targets[0] || null;
};

const getPassiveConfig = (caster, battle, skillId) =>
  battle._findSkill?.(caster, skillId)?.levelConfig || null;

const getAilmentResistance = (target, ailment) =>
  (Number(target.stats?.ailmentResist?.[ailment]) || 0)
  + (target._ailmentResistBuffTurns > 0 ? (Number(target._ailmentResistBuffAmount) || 0) : 0);

const chooseWeakestAilment = (target, candidates = AILMENTS, excluded) => {
  const pool = candidates.filter(ailment => ailment !== excluded);
  return pool.reduce((best, ailment) =>
    getAilmentResistance(target, ailment) < getAilmentResistance(target, best) ? ailment : best
  , pool[0] || candidates[0]);
};

const isAilmentImmune = (target, battle) => {
  if (target.hp === undefined) return false;
  return Boolean(battle._findSkill?.(target, 'stigma_of_atonement')?.level);
};

const tryInflictAilment = (caster, target, ailment, config, battle, options = {}) => {
  if (!target || target.isDead || isAilmentImmune(target, battle)) return false;
  const mastery = getPassiveConfig(caster, battle, 'pathology_mastery');
  const pierce = (Number(config.resistancePierce) || 0) + (Number(mastery?.resistancePierce) || 0);
  const resistance = Math.max(0, getAilmentResistance(target, ailment) - pierce);
  const chance = Math.min(100, Math.max(0, (Number(config.ailmentChance) || 0) - resistance));
  if (Math.random() * 100 >= chance) return false;

  const durationBonus = Number(getPassiveConfig(caster, battle, 'virulence_theory')?.extensionTurns) || 0;
  const duration = Math.max(1, (Number(config.duration) || 10) + durationBonus);
  if (target.activeAilment && !options.replace) {
    if (target.activeAilment.type === ailment) {
      target.activeAilment.duration = Math.max(target.activeAilment.duration || 0, duration);
      battle.showDamage?.(target.elementId, `${AILMENT_LABELS[ailment]} 延長`, 'text-lime-300');
      return true;
    }
    return false;
  }

  target.activeAilment = { type: ailment, duration };
  battle.showDamage?.(target.elementId, AILMENT_LABELS[ailment], 'text-lime-300');
  battle.renderEntities?.();
  return true;
};

const getStatusDamageMultiplier = (caster, target, battle, authoredPercent = 0) => {
  if (!target?.activeAilment) return 1;
  const passivePercent = Number(getPassiveConfig(caster, battle, 'virulence_theory')?.statusDamagePercent) || 0;
  return 1 + (authoredPercent + passivePercent) / 100;
};

const extendAilment = (caster, target, turns, battle) => {
  if (!target?.activeAilment) return false;
  const passiveTurns = Number(getPassiveConfig(caster, battle, 'virulence_theory')?.extensionTurns) || 0;
  const extension = Math.max(1, Number(turns) + passiveTurns);
  target.activeAilment.duration = Math.min(30, (target.activeAilment.duration || 0) + extension);
  battle.showDamage?.(target.elementId, `病勢 +${extension}`, 'text-fuchsia-300');
  battle.renderEntities?.();
  return true;
};

const animateSkill = (caster, targets, variant, onImpact) => {
  const list = Array.isArray(targets) ? targets : [targets];
  if (shouldSkipBattleAnimations() || typeof document === 'undefined') {
    list.forEach((target, index) => onImpact?.(target, index));
    return;
  }

  const speed = getBattleAnimationSpeed(getBattleSpeed());
  const layer = document.getElementById('battle-effects-layer') || document.body;
  const palette = variant === 'black_death'
    ? ['#18181b', '#a855f7', '#84cc16']
    : variant === 'pandemic'
      ? ['#3f6212', '#d946ef', '#bef264']
      : ['#4c1d95', '#65a30d', '#d9f99d'];

  list.forEach((target, index) => {
    const targetEl = document.getElementById(target?.elementId);
    const rect = targetEl?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    setTimeout(() => {
      const cloud = document.createElement('div');
      cloud.style.cssText = `position:fixed;left:${x - 64}px;top:${y - 64}px;width:128px;height:128px;border-radius:44% 56% 48% 52%;background:radial-gradient(circle at 42% 42%,${palette[2]}dd,${palette[1]}99 34%,${palette[0]}dd 62%,transparent 72%);box-shadow:0 0 26px ${palette[1]},inset 0 0 18px ${palette[2]};filter:blur(1px);z-index:9999;pointer-events:none;mix-blend-mode:screen;color:#fff;display:flex;align-items:center;justify-content:center;font:900 38px/1 serif;text-shadow:0 0 10px ${palette[2]};`;
      cloud.textContent = variant === 'injection' ? '⚕' : variant === 'mutation' ? '☣' : '☠';
      layer.appendChild(cloud);
      const duration = (variant === 'black_death' ? 820 : 560) / speed;
      cloud.animate([
        { transform: 'scale(.08) rotate(-35deg)', opacity: 0 },
        { transform: 'scale(1.12) rotate(8deg)', opacity: 1, offset: .45 },
        { transform: 'scale(1.7) rotate(40deg)', opacity: 0 }
      ], { duration, easing: 'cubic-bezier(.12,.72,.2,1)' }).onfinish = () => cloud.remove();
      setTimeout(() => onImpact?.(target, index), duration * .48);
    }, index * 80 / speed);
  });
};

const executePlagueAttack = (caster, target, battle, multiplier, options = {}) => {
  if (!target || target.isDead) return;
  battle.executeAttack(caster, target, true, {
    statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
    damageMultiplier: multiplier * getStatusDamageMultiplier(caster, target, battle, options.statusDamagePercent || 0),
    isAoEProcessed: options.isAoEProcessed,
    skipAtbReset: options.skipAtbReset
  });
};

export const plague_doctor = {
  id: 'plague_doctor',
  name: 'ペスト医師',
  icon: 'masks',
  image: './assets/job/job_plague_doctor.webp',
  changeCost: 1500000,
  requirements: [
    { jobId: 'priest', level: 150 },
    { jobId: 'dancer', level: 150 }
  ],
  skills: [
    {
      id: 'pathogen_injection', name: '病原注射', icon: 'vaccines', statDependency: 'MAT',
      actionNameClass: 'text-lime-100', actionNameBorderClass: 'border-lime-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 28, multiplier: 1.55, ailmentChance: 65, resistancePierce: 10, duration: 9 },
        { mpCost: 33, multiplier: 1.72, ailmentChance: 69, resistancePierce: 12, duration: 9 },
        { mpCost: 38, multiplier: 1.90, ailmentChance: 73, resistancePierce: 14, duration: 10 },
        { mpCost: 44, multiplier: 2.09, ailmentChance: 77, resistancePierce: 17, duration: 10 },
        { mpCost: 51, multiplier: 2.29, ailmentChance: 81, resistancePierce: 20, duration: 10 },
        { mpCost: 59, multiplier: 2.50, ailmentChance: 85, resistancePierce: 23, duration: 11 },
        { mpCost: 68, multiplier: 2.72, ailmentChance: 89, resistancePierce: 26, duration: 11 },
        { mpCost: 78, multiplier: 2.95, ailmentChance: 93, resistancePierce: 29, duration: 12 },
        { mpCost: 90, multiplier: 3.18, ailmentChance: 97, resistancePierce: 32, duration: 12 },
        { mpCost: 104, multiplier: 3.45, ailmentChance: 100, resistancePierce: 35, duration: 13 }
      ]),
      getDescription: lc => `敵単体へMATK ${lc.multiplier.toFixed(2)}倍。毒・麻痺・沈黙から最も通りやすい異常を${lc.ailmentChance}%で付与し、耐性を${lc.resistancePierce}%貫通する`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getPrimaryTarget(caster, battle);
        if (!target) return;
        const ailment = chooseWeakestAilment(target, ['poison', 'paralysis', 'silence']);
        animateSkill(caster, target, 'injection', () => {
          executePlagueAttack(caster, target, battle, lc.multiplier);
          tryInflictAilment(caster, target, ailment, lc, battle);
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.find(enemy => !enemy.activeAilment) || targets[0];
          return { target, score: 48 * lc.multiplier + (!target.activeAilment ? lc.ailmentChance * 1.25 + lc.resistancePierce : 0) };
        }
      }
    },
    {
      id: 'corrosive_miasma', name: '腐蝕ミアズマ', icon: 'foggy', statDependency: 'MAT',
      actionNameClass: 'text-purple-100', actionNameBorderClass: 'border-lime-500/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 46, multiplier: .78, ailmentChance: 50, resistancePierce: 5, duration: 7 },
        { mpCost: 53, multiplier: .87, ailmentChance: 55, resistancePierce: 8, duration: 7 },
        { mpCost: 61, multiplier: .97, ailmentChance: 60, resistancePierce: 11, duration: 8 },
        { mpCost: 70, multiplier: 1.08, ailmentChance: 65, resistancePierce: 14, duration: 8 },
        { mpCost: 80, multiplier: 1.20, ailmentChance: 70, resistancePierce: 17, duration: 8 },
        { mpCost: 92, multiplier: 1.32, ailmentChance: 75, resistancePierce: 20, duration: 9 },
        { mpCost: 105, multiplier: 1.45, ailmentChance: 80, resistancePierce: 23, duration: 9 },
        { mpCost: 120, multiplier: 1.58, ailmentChance: 85, resistancePierce: 26, duration: 10 },
        { mpCost: 137, multiplier: 1.72, ailmentChance: 90, resistancePierce: 28, duration: 10 },
        { mpCost: 156, multiplier: 1.88, ailmentChance: 95, resistancePierce: 30, duration: 11 }
      ]),
      getDescription: lc => `敵全体へMATK ${lc.multiplier.toFixed(2)}倍。8種から各対象に最も通りやすい状態異常を${lc.ailmentChance}%で付与（耐性${lc.resistancePierce}%貫通）`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getLivingTargets(caster, battle);
        if (!targets.length) return;
        animateSkill(caster, targets, 'miasma', (target, index) => {
          executePlagueAttack(caster, target, battle, lc.multiplier, {
            isAoEProcessed: true, skipAtbReset: index < targets.length - 1
          });
          if (target.activeAilment) extendAilment(caster, target, 1, battle);
          else tryInflictAilment(caster, target, chooseWeakestAilment(target), lc, battle);
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const healthy = targets.filter(enemy => !enemy.activeAilment).length;
          return targets.length >= 2 || healthy > 0
            ? { target: targets[0], score: 38 * lc.multiplier * targets.length + healthy * (lc.ailmentChance + lc.resistancePierce) * .7 }
            : null;
        }
      }
    },
    {
      id: 'virulent_mutation', name: '劇症変異', icon: 'biotech', statDependency: 'MAT',
      actionNameClass: 'text-fuchsia-100', actionNameBorderClass: 'border-fuchsia-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 42, multiplier: 1.45, ailmentChance: 70, resistancePierce: 15, statusDamagePercent: 15, extensionTurns: 2, duration: 10 },
        { mpCost: 48, multiplier: 1.60, ailmentChance: 74, resistancePierce: 18, statusDamagePercent: 20, extensionTurns: 2, duration: 10 },
        { mpCost: 55, multiplier: 1.76, ailmentChance: 78, resistancePierce: 21, statusDamagePercent: 25, extensionTurns: 3, duration: 10 },
        { mpCost: 63, multiplier: 1.93, ailmentChance: 82, resistancePierce: 24, statusDamagePercent: 30, extensionTurns: 3, duration: 11 },
        { mpCost: 72, multiplier: 2.11, ailmentChance: 86, resistancePierce: 27, statusDamagePercent: 35, extensionTurns: 4, duration: 11 },
        { mpCost: 82, multiplier: 2.30, ailmentChance: 90, resistancePierce: 30, statusDamagePercent: 40, extensionTurns: 4, duration: 11 },
        { mpCost: 94, multiplier: 2.50, ailmentChance: 93, resistancePierce: 33, statusDamagePercent: 45, extensionTurns: 5, duration: 12 },
        { mpCost: 107, multiplier: 2.71, ailmentChance: 96, resistancePierce: 36, statusDamagePercent: 50, extensionTurns: 5, duration: 12 },
        { mpCost: 122, multiplier: 2.93, ailmentChance: 98, resistancePierce: 38, statusDamagePercent: 55, extensionTurns: 6, duration: 13 },
        { mpCost: 140, multiplier: 3.18, ailmentChance: 100, resistancePierce: 40, statusDamagePercent: 60, extensionTurns: 7, duration: 14 }
      ]),
      getDescription: lc => `敵単体へMATK ${lc.multiplier.toFixed(2)}倍。状態異常中なら威力+${lc.statusDamagePercent}%、異常を別種へ変異させ${lc.extensionTurns}ターン延長する`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getPrimaryTarget(caster, battle);
        if (!target) return;
        const previous = target.activeAilment?.type;
        animateSkill(caster, target, 'mutation', () => {
          executePlagueAttack(caster, target, battle, lc.multiplier, { statusDamagePercent: lc.statusDamagePercent });
          if (target.isDead) return;
          const next = chooseWeakestAilment(target, AILMENTS, previous);
          if (tryInflictAilment(caster, target, next, lc, battle, { replace: true })) {
            extendAilment(caster, target, lc.extensionTurns, battle);
          }
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const afflicted = targets.filter(enemy => enemy.activeAilment);
          const target = afflicted.sort((a, b) => b.currentHp - a.currentHp)[0] || targets[0];
          return { target, score: 45 * lc.multiplier * (target.activeAilment ? 1 + lc.statusDamagePercent / 100 : 1) + (target.activeAilment ? 80 : 0) };
        }
      }
    },
    {
      id: 'pandemic', name: 'パンデミック', icon: 'coronavirus', statDependency: 'MAT',
      actionNameClass: 'text-lime-100', actionNameBorderClass: 'border-purple-400/80',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 68, multiplier: .88, ailmentChance: 55, resistancePierce: 15, extensionTurns: 2, duration: 9 },
        { mpCost: 78, multiplier: .98, ailmentChance: 60, resistancePierce: 18, extensionTurns: 2, duration: 9 },
        { mpCost: 89, multiplier: 1.09, ailmentChance: 65, resistancePierce: 21, extensionTurns: 2, duration: 10 },
        { mpCost: 102, multiplier: 1.21, ailmentChance: 70, resistancePierce: 24, extensionTurns: 3, duration: 10 },
        { mpCost: 116, multiplier: 1.34, ailmentChance: 75, resistancePierce: 27, extensionTurns: 3, duration: 10 },
        { mpCost: 132, multiplier: 1.47, ailmentChance: 80, resistancePierce: 30, extensionTurns: 3, duration: 11 },
        { mpCost: 150, multiplier: 1.61, ailmentChance: 85, resistancePierce: 34, extensionTurns: 4, duration: 11 },
        { mpCost: 170, multiplier: 1.76, ailmentChance: 90, resistancePierce: 38, extensionTurns: 4, duration: 12 },
        { mpCost: 193, multiplier: 1.92, ailmentChance: 95, resistancePierce: 42, extensionTurns: 5, duration: 12 },
        { mpCost: 220, multiplier: 2.10, ailmentChance: 100, resistancePierce: 45, extensionTurns: 5, duration: 13 }
      ]),
      getDescription: lc => `敵全体へMATK ${lc.multiplier.toFixed(2)}倍。敵1体の状態異常を全体へ${lc.ailmentChance}%で感染させ、感染済みの敵は${lc.extensionTurns}ターン延長する`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getLivingTargets(caster, battle);
        if (!targets.length) return;
        const source = targets.filter(target => target.activeAilment)
          .sort((a, b) => (b.activeAilment?.duration || 0) - (a.activeAilment?.duration || 0))[0];
        const epidemicAilment = source?.activeAilment?.type;
        animateSkill(caster, targets, 'pandemic', (target, index) => {
          executePlagueAttack(caster, target, battle, lc.multiplier, {
            isAoEProcessed: true, skipAtbReset: index < targets.length - 1
          });
          if (target.isDead) return;
          if (target.activeAilment) extendAilment(caster, target, lc.extensionTurns, battle);
          else tryInflictAilment(caster, target, epidemicAilment || chooseWeakestAilment(target), lc, battle);
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          const afflicted = targets.filter(enemy => enemy.activeAilment).length;
          if (!targets.length || targets.length < 2 || afflicted === 0) return null;
          return { target: targets[0], score: 120 + 45 * lc.multiplier * targets.length + (targets.length - afflicted) * lc.ailmentChance + afflicted * 28 };
        }
      }
    },
    {
      id: 'black_death', name: '黒死病', icon: 'skull', statDependency: 'MAT',
      actionNameClass: 'text-zinc-100', actionNameBorderClass: 'border-purple-500/90',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 92, multiplier: 1.70, ailmentChance: 70, resistancePierce: 25, statusDamagePercent: 20, extensionTurns: 3, duration: 10 },
        { mpCost: 106, multiplier: 1.88, ailmentChance: 74, resistancePierce: 29, statusDamagePercent: 25, extensionTurns: 3, duration: 10 },
        { mpCost: 122, multiplier: 2.07, ailmentChance: 78, resistancePierce: 33, statusDamagePercent: 30, extensionTurns: 4, duration: 11 },
        { mpCost: 140, multiplier: 2.27, ailmentChance: 82, resistancePierce: 37, statusDamagePercent: 35, extensionTurns: 4, duration: 11 },
        { mpCost: 160, multiplier: 2.48, ailmentChance: 86, resistancePierce: 41, statusDamagePercent: 40, extensionTurns: 5, duration: 12 },
        { mpCost: 183, multiplier: 2.70, ailmentChance: 90, resistancePierce: 45, statusDamagePercent: 45, extensionTurns: 5, duration: 12 },
        { mpCost: 209, multiplier: 2.93, ailmentChance: 93, resistancePierce: 49, statusDamagePercent: 50, extensionTurns: 6, duration: 13 },
        { mpCost: 238, multiplier: 3.17, ailmentChance: 96, resistancePierce: 53, statusDamagePercent: 55, extensionTurns: 6, duration: 13 },
        { mpCost: 271, multiplier: 3.42, ailmentChance: 98, resistancePierce: 57, statusDamagePercent: 60, extensionTurns: 7, duration: 14 },
        { mpCost: 310, multiplier: 3.70, ailmentChance: 100, resistancePierce: 60, statusDamagePercent: 70, extensionTurns: 7, duration: 15 }
      ]),
      getDescription: lc => `敵全体へMATK ${lc.multiplier.toFixed(2)}倍。状態異常中なら威力+${lc.statusDamagePercent}%・病勢+${lc.extensionTurns}ターン、未感染なら最適な異常を${lc.ailmentChance}%で付与（耐性${lc.resistancePierce}%貫通）`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getLivingTargets(caster, battle);
        if (!targets.length) return;
        animateSkill(caster, targets, 'black_death', (target, index) => {
          const wasAfflicted = Boolean(target.activeAilment);
          executePlagueAttack(caster, target, battle, lc.multiplier, {
            statusDamagePercent: wasAfflicted ? lc.statusDamagePercent : 0,
            isAoEProcessed: true, skipAtbReset: index < targets.length - 1
          });
          if (target.isDead) return;
          if (wasAfflicted) extendAilment(caster, target, lc.extensionTurns, battle);
          else tryInflictAilment(caster, target, chooseWeakestAilment(target), lc, battle);
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const afflicted = targets.filter(enemy => enemy.activeAilment).length;
          return { target: targets[0], score: 52 * lc.multiplier * targets.length * (1 + (afflicted / targets.length) * lc.statusDamagePercent / 100) + afflicted * 45 };
        }
      }
    },
    {
      id: 'pathology_mastery', name: '病理学の極意', icon: 'science', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusMpPercent: 5, bonusMatkPercent: 5, resistancePierce: 3 },
        { mpCost: 0, bonusMpPercent: 8, bonusMatkPercent: 8, resistancePierce: 6 },
        { mpCost: 0, bonusMpPercent: 11, bonusMatkPercent: 11, resistancePierce: 9 },
        { mpCost: 0, bonusMpPercent: 14, bonusMatkPercent: 14, resistancePierce: 12 },
        { mpCost: 0, bonusMpPercent: 17, bonusMatkPercent: 17, resistancePierce: 15 },
        { mpCost: 0, bonusMpPercent: 20, bonusMatkPercent: 20, resistancePierce: 18 },
        { mpCost: 0, bonusMpPercent: 24, bonusMatkPercent: 24, resistancePierce: 21 },
        { mpCost: 0, bonusMpPercent: 28, bonusMatkPercent: 28, resistancePierce: 24 },
        { mpCost: 0, bonusMpPercent: 33, bonusMatkPercent: 33, resistancePierce: 27 },
        { mpCost: 0, bonusMpPercent: 40, bonusMatkPercent: 40, resistancePierce: 30 }
      ]),
      getDescription: lc => `最大MP・MATK+${lc.bonusMatkPercent}%。ペスト医師の状態異常付与がさらに耐性を${lc.resistancePierce}%貫通する`
    },
    {
      id: 'virulence_theory', name: '毒性学の真髄', icon: 'experiment', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, statusDamagePercent: 5, extensionTurns: 1 },
        { mpCost: 0, statusDamagePercent: 8, extensionTurns: 1 },
        { mpCost: 0, statusDamagePercent: 11, extensionTurns: 1 },
        { mpCost: 0, statusDamagePercent: 14, extensionTurns: 2 },
        { mpCost: 0, statusDamagePercent: 18, extensionTurns: 2 },
        { mpCost: 0, statusDamagePercent: 22, extensionTurns: 2 },
        { mpCost: 0, statusDamagePercent: 26, extensionTurns: 3 },
        { mpCost: 0, statusDamagePercent: 30, extensionTurns: 3 },
        { mpCost: 0, statusDamagePercent: 35, extensionTurns: 4 },
        { mpCost: 0, statusDamagePercent: 40, extensionTurns: 5 }
      ]),
      getDescription: lc => `ペスト医師のスキルが状態異常中の敵へ与えるダメージ+${lc.statusDamagePercent}%。病勢延長量+${lc.extensionTurns}ターン`
    },
    {
      id: 'sealed_mask', name: '完全防疫装備', icon: 'health_and_safety', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusMdefPercent: 3, ailmentResistPercent: 8 },
        { mpCost: 0, bonusMdefPercent: 5, ailmentResistPercent: 13 },
        { mpCost: 0, bonusMdefPercent: 7, ailmentResistPercent: 18 },
        { mpCost: 0, bonusMdefPercent: 9, ailmentResistPercent: 23 },
        { mpCost: 0, bonusMdefPercent: 11, ailmentResistPercent: 28 },
        { mpCost: 0, bonusMdefPercent: 13, ailmentResistPercent: 34 },
        { mpCost: 0, bonusMdefPercent: 16, ailmentResistPercent: 40 },
        { mpCost: 0, bonusMdefPercent: 19, ailmentResistPercent: 46 },
        { mpCost: 0, bonusMdefPercent: 22, ailmentResistPercent: 53 },
        { mpCost: 0, bonusMdefPercent: 25, ailmentResistPercent: 60 }
      ]),
      getDescription: lc => `MDEF+${lc.bonusMdefPercent}%。毒・火傷・麻痺・睡眠・混乱・呪い・暗闇・沈黙への耐性+${lc.ailmentResistPercent}%`
    }
  ]
};
