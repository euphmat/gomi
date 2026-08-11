import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

const isShinraSage = caster => (caster?.jobId || caster?.job) === 'shinra_sage';
const SHINRA_ELEMENTS = ['grass', 'wind', 'earth'];

const levelCosts = [2, 2, 2, 3, 3, 3, 4, 4, 4, 6];
const makeLevels = configs => configs.map((config, index) => ({
  level: index + 1,
  spCost: levelCosts[index],
  ...config
}));

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

const getLivingAllies = (caster, battle) => {
  const group = battle.enemies.includes(caster) ? battle.enemies : battle.party;
  return group.filter(member => !member.isDead);
};

const getSigils = caster => Array.isArray(caster?._shinraSigils) ? caster._shinraSigils : [];

const addSigil = (caster, element, battle) => {
  if (!isShinraSage(caster) || !SHINRA_ELEMENTS.includes(element)) return;
  const sigils = getSigils(caster);
  if (sigils.includes(element)) return;
  caster._shinraSigils = [...sigils, element];
  const labels = { grass: '草', wind: '風', earth: '土' };
  battle.showDamage(caster.elementId, `${labels[element]}の印 ${caster._shinraSigils.length}/3`, 'text-emerald-300');
};

const restoreHp = (target, amount, battle) => {
  const maxHp = target.stats?.hp || target.hp?.max || target.maxHp || 1;
  const currentHp = target.hp ? target.hp.current : target.currentHp;
  const recovered = Math.max(0, Math.min(amount, maxHp - currentHp));
  if (recovered <= 0) return 0;
  if (target.hp) target.hp.current += recovered;
  else target.currentHp += recovered;
  battle.showDamage(target.elementId, `+${recovered}`, 'text-emerald-300');
  return recovered;
};

const animateSkill = (caster, targets, type, onImpact) => {
  const list = Array.isArray(targets) ? targets : [targets];
  if (shouldSkipBattleAnimations() || typeof document === 'undefined') {
    list.forEach((target, index) => onImpact?.(target, index));
    return;
  }

  const speed = getBattleAnimationSpeed(getBattleSpeed());
  const layer = document.getElementById('battle-effects-layer') || document.body;
  const palette = {
    thorn: ['#d9f99d', '#22c55e'],
    gale: ['#ecfdf5', '#2dd4bf'],
    rampart: ['#fde68a', '#a16207'],
    bloom: ['#f0fdf4', '#84cc16'],
    mandala: ['#ffffff', '#facc15']
  }[type] || ['#d9f99d', '#22c55e'];

  list.forEach((target, index) => {
    const targetEl = document.getElementById(target?.elementId);
    const rect = targetEl?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const delay = index * 90 / speed;

    setTimeout(() => {
      const effect = document.createElement('div');
      effect.style.cssText = `position:fixed;left:${x - 58}px;top:${y - 58}px;width:116px;height:116px;border-radius:${type === 'rampart' ? '28%' : '50%'};border:${type === 'mandala' ? 6 : 4}px ${type === 'mandala' ? 'double' : 'solid'} ${palette[0]};background:${type === 'rampart'
        ? `conic-gradient(from 45deg,${palette[1]},#78350f,${palette[0]},${palette[1]})`
        : `radial-gradient(circle,rgba(255,255,255,.72),${palette[1]}66 36%,transparent 70%)`};box-shadow:0 0 24px ${palette[1]},inset 0 0 16px ${palette[0]};z-index:9999;pointer-events:none;mix-blend-mode:screen;display:flex;align-items:center;justify-content:center;color:${palette[0]};font:900 42px/1 serif;text-shadow:0 0 8px ${palette[1]};`;
      effect.textContent = type === 'thorn' ? '❧' : type === 'gale' ? '〰' : type === 'rampart' ? '◇' : type === 'bloom' ? '✿' : '✦';
      layer.appendChild(effect);
      const duration = (type === 'mandala' ? 760 : 520) / speed;
      effect.animate([
        { transform: 'scale(.08) rotate(-90deg)', opacity: 0 },
        { transform: 'scale(1.08) rotate(18deg)', opacity: 1, offset: .48 },
        { transform: 'scale(1.65) rotate(120deg)', opacity: 0 }
      ], { duration, easing: 'cubic-bezier(.12,.72,.22,1)' }).onfinish = () => effect.remove();
      setTimeout(() => onImpact?.(target, index), duration * .5);
    }, delay);
  });
};

export const shinra_sage = {
  id: 'shinra_sage',
  name: '森羅導師',
  icon: 'nature',
  image: './assets/job/job_shinra_sage.webp',
  changeCost: 500000,
  requirements: [
    { jobId: 'ranger', level: 100 },
    { jobId: 'mage', level: 100 }
  ],
  skills: [
    {
      id: 'verdant_spear', name: '翠葉の霊槍', icon: 'psychiatry', statDependency: 'MAT',
      actionNameClass: 'text-lime-100', actionNameBorderClass: 'border-emerald-400/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 20, multiplier: 1.35 }, { mpCost: 23, multiplier: 1.48 },
        { mpCost: 27, multiplier: 1.62 }, { mpCost: 31, multiplier: 1.77 },
        { mpCost: 36, multiplier: 1.93 }, { mpCost: 42, multiplier: 2.10 },
        { mpCost: 49, multiplier: 2.28 }, { mpCost: 57, multiplier: 2.47 },
        { mpCost: 66, multiplier: 2.68 }, { mpCost: 78, multiplier: 2.92 }
      ]),
      getDescription: lc => `敵単体へMATK ${lc.multiplier.toFixed(2)}倍の草属性攻撃。【現職時】草の印を刻む`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getPrimaryTarget(caster, battle);
        if (!target) return;
        addSigil(caster, 'grass', battle);
        animateSkill(caster, target, 'thorn', () => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
            damageMultiplier: lc.multiplier, element: 'grass'
          });
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          const target = targets.includes(context.selectedEnemyTarget) ? context.selectedEnemyTarget : targets[0];
          if (!target) return null;
          const resist = target.stats?.elementResist?.grass || 0;
          const missingSigil = isShinraSage(caster) && !getSigils(caster).includes('grass');
          return { target, score: 48 * lc.multiplier * Math.max(.2, 1 - resist / 100) + (missingSigil ? 42 : 0) };
        }
      }
    },
    {
      id: 'sylph_cyclone', name: 'シルフサイクロン', icon: 'air', statDependency: 'MAT',
      actionNameClass: 'text-teal-100', actionNameBorderClass: 'border-teal-300/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 34, multiplier: .62 }, { mpCost: 39, multiplier: .69 },
        { mpCost: 44, multiplier: .76 }, { mpCost: 50, multiplier: .84 },
        { mpCost: 57, multiplier: .92 }, { mpCost: 65, multiplier: 1.01 },
        { mpCost: 74, multiplier: 1.10 }, { mpCost: 84, multiplier: 1.20 },
        { mpCost: 96, multiplier: 1.31 }, { mpCost: 110, multiplier: 1.44 }
      ]),
      getDescription: lc => `敵全体へMATK ${lc.multiplier.toFixed(2)}倍の風属性攻撃。【現職時】風の印を刻む`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getOffensiveTargets(caster, battle);
        if (!targets.length) return;
        addSigil(caster, 'wind', battle);
        animateSkill(caster, targets, 'gale', (target, index) => {
          if (target.isDead) return;
          battle.executeAttack(caster, target, true, {
            statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
            damageMultiplier: lc.multiplier, element: 'wind', isAoEProcessed: true,
            skipAtbReset: index < targets.length - 1
          });
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (targets.length < 2 && (!isShinraSage(caster) || getSigils(caster).includes('wind'))) return null;
          return targets.length ? {
            target: targets[0],
            score: 39 * lc.multiplier * targets.length + (!getSigils(caster).includes('wind') ? 42 : 0)
          } : null;
        }
      }
    },
    {
      id: 'gaia_rampart', name: 'ガイアの城壁', icon: 'landscape',
      actionNameClass: 'text-amber-100', actionNameBorderClass: 'border-amber-500/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 36, barrierMatkPercent: 30, defPercent: 10, turns: 3 },
        { mpCost: 41, barrierMatkPercent: 36, defPercent: 12, turns: 3 },
        { mpCost: 47, barrierMatkPercent: 42, defPercent: 14, turns: 3 },
        { mpCost: 54, barrierMatkPercent: 49, defPercent: 16, turns: 3 },
        { mpCost: 62, barrierMatkPercent: 56, defPercent: 18, turns: 4 },
        { mpCost: 71, barrierMatkPercent: 64, defPercent: 20, turns: 4 },
        { mpCost: 81, barrierMatkPercent: 73, defPercent: 22, turns: 4 },
        { mpCost: 92, barrierMatkPercent: 83, defPercent: 24, turns: 4 },
        { mpCost: 104, barrierMatkPercent: 94, defPercent: 27, turns: 5 },
        { mpCost: 118, barrierMatkPercent: 108, defPercent: 30, turns: 5 }
      ]),
      getDescription: lc => `味方全体へMATKの${lc.barrierMatkPercent}%分のバリアとDEF・MDEF+${lc.defPercent}%を${lc.turns}ターン付与。【現職時】土の印を刻む`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getLivingAllies(caster, battle);
        const barrier = Math.max(1, Math.floor((caster.stats?.matk || 1) * lc.barrierMatkPercent / 100));
        addSigil(caster, 'earth', battle);
        animateSkill(caster, targets, 'rampart', target => {
          target._barrierHp = Math.max(target._barrierHp || 0, barrier);
          target._barrierTurns = Math.max(target._barrierTurns || 0, lc.turns);
          target._defBuffPercent = Math.max(target._defBuffPercent || 0, lc.defPercent);
          target._defBuffTurns = Math.max(target._defBuffTurns || 0, lc.turns);
          target._mdefBuffPercent = Math.max(target._mdefBuffPercent || 0, lc.defPercent);
          target._mdefBuffTurns = Math.max(target._mdefBuffTurns || 0, lc.turns);
          battle.showDamage(target.elementId, `GAIA +${barrier}`, 'text-amber-300');
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const allies = context.party.filter(member => !member.isDead);
          const exposed = allies.filter(member => !(member._barrierHp > 0) || !(member._defBuffTurns > 0));
          const needsSigil = isShinraSage(caster) && !getSigils(caster).includes('earth');
          return exposed.length >= Math.ceil(allies.length / 2) || needsSigil
            ? { target: caster, score: 78 + exposed.length * 16 + (needsSigil ? 52 : 0) }
            : null;
        }
      }
    },
    {
      id: 'worldtree_breath', name: '世界樹の息吹', icon: 'eco',
      actionNameClass: 'text-emerald-100', actionNameBorderClass: 'border-lime-300/70',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 42, healMatkPercent: 36, regenHp: 8, turns: 3 },
        { mpCost: 48, healMatkPercent: 42, regenHp: 11, turns: 3 },
        { mpCost: 55, healMatkPercent: 49, regenHp: 14, turns: 3 },
        { mpCost: 63, healMatkPercent: 57, regenHp: 18, turns: 3 },
        { mpCost: 72, healMatkPercent: 66, regenHp: 22, turns: 4 },
        { mpCost: 82, healMatkPercent: 76, regenHp: 27, turns: 4 },
        { mpCost: 93, healMatkPercent: 87, regenHp: 32, turns: 4 },
        { mpCost: 105, healMatkPercent: 99, regenHp: 38, turns: 4 },
        { mpCost: 119, healMatkPercent: 112, regenHp: 45, turns: 5 },
        { mpCost: 135, healMatkPercent: 128, regenHp: 54, turns: 5 }
      ]),
      getDescription: lc => `味方全体のHPをMATKの${lc.healMatkPercent}%回復し、毎行動後HPを${lc.regenHp}回復する効果を${lc.turns}回付与。【現職時】草の印を刻む`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getLivingAllies(caster, battle);
        const heal = Math.max(1, Math.floor((caster.stats?.matk || 1) * lc.healMatkPercent / 100));
        addSigil(caster, 'grass', battle);
        animateSkill(caster, targets, 'bloom', target => {
          restoreHp(target, heal, battle);
          target._regenHp = Math.max(target._regenHp || 0, lc.regenHp);
          target._regenTurns = Math.max(target._regenTurns || 0, lc.turns);
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const allies = context.party.filter(member => !member.isDead);
          const need = allies.reduce((total, member) => {
            const maxHp = member.stats?.hp || member.hp?.max || 1;
            const hp = member.hp?.current ?? member.currentHp ?? 0;
            return total + (1 - hp / Math.max(1, maxHp)) * 100 + (!member._regenTurns ? 10 : 0);
          }, 0);
          return need >= 45 ? { target: caster, score: 74 + need } : null;
        }
      }
    },
    {
      id: 'shinra_mandala', name: '森羅万象・三界輪', icon: 'cyclone', statDependency: 'MAT',
      actionNameClass: 'text-yellow-100', actionNameBorderClass: 'border-emerald-300/80',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 76, multiplier: .46, sigilBonus: .10, healMatkPercent: 18 },
        { mpCost: 85, multiplier: .51, sigilBonus: .11, healMatkPercent: 20 },
        { mpCost: 95, multiplier: .56, sigilBonus: .12, healMatkPercent: 22 },
        { mpCost: 106, multiplier: .62, sigilBonus: .13, healMatkPercent: 24 },
        { mpCost: 118, multiplier: .68, sigilBonus: .14, healMatkPercent: 27 },
        { mpCost: 131, multiplier: .75, sigilBonus: .15, healMatkPercent: 30 },
        { mpCost: 145, multiplier: .82, sigilBonus: .16, healMatkPercent: 33 },
        { mpCost: 161, multiplier: .90, sigilBonus: .17, healMatkPercent: 36 },
        { mpCost: 178, multiplier: .99, sigilBonus: .18, healMatkPercent: 40 },
        { mpCost: 198, multiplier: 1.09, sigilBonus: .20, healMatkPercent: 45 }
      ]),
      getDescription: lc => `敵全体へ草・風・土それぞれMATK ${lc.multiplier.toFixed(2)}倍の3連撃。印を全消費し、対応属性の威力+${Math.round(lc.sigilBonus * 100)}%。3印完成時は各連撃をさらに+0.75倍し、味方全体をMATKの${lc.healMatkPercent}%回復`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getOffensiveTargets(caster, battle);
        if (!targets.length) return;
        const sigils = isShinraSage(caster) ? [...getSigils(caster)] : [];
        const isTrinity = sigils.length === SHINRA_ELEMENTS.length;
        if (isShinraSage(caster)) caster._shinraSigils = [];
        animateSkill(caster, targets, 'mandala', (target, targetIndex) => {
          SHINRA_ELEMENTS.forEach((element, elementIndex) => {
            if (target.isDead) return;
            battle.executeAttack(caster, target, true, {
              statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
              damageMultiplier: lc.multiplier + (sigils.includes(element) ? lc.sigilBonus : 0) + (isTrinity ? .75 : 0),
              element, isAoEProcessed: true,
              skipAtbReset: targetIndex < targets.length - 1 || elementIndex < SHINRA_ELEMENTS.length - 1
            });
          });
        });
        if (isTrinity) {
          const heal = Math.max(1, Math.floor((caster.stats?.matk || 1) * lc.healMatkPercent / 100));
          getLivingAllies(caster, battle).forEach(ally => restoreHp(ally, heal, battle));
          battle.showDamage(caster.elementId, '三界共鳴', 'text-yellow-200');
          battle.renderEntities();
        }
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const sigilCount = isShinraSage(caster) ? getSigils(caster).length : 0;
          if (isShinraSage(caster) && sigilCount < SHINRA_ELEMENTS.length) return null;
          return { target: targets[0], score: 55 * 3 * (lc.multiplier + sigilCount * lc.sigilBonus / 3 + (sigilCount === 3 ? .75 : 0)) * Math.max(1, targets.length * .72) + sigilCount * 38 };
        }
      }
    },
    {
      id: 'worldroot_core', name: '世界根の霊核', icon: 'forest', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusMpPercent: 4, bonusMatkPercent: 4 },
        { mpCost: 0, bonusMpPercent: 7, bonusMatkPercent: 7 },
        { mpCost: 0, bonusMpPercent: 10, bonusMatkPercent: 10 },
        { mpCost: 0, bonusMpPercent: 13, bonusMatkPercent: 13 },
        { mpCost: 0, bonusMpPercent: 16, bonusMatkPercent: 16 },
        { mpCost: 0, bonusMpPercent: 19, bonusMatkPercent: 19 },
        { mpCost: 0, bonusMpPercent: 22, bonusMatkPercent: 22 },
        { mpCost: 0, bonusMpPercent: 25, bonusMatkPercent: 25 },
        { mpCost: 0, bonusMpPercent: 29, bonusMatkPercent: 29 },
        { mpCost: 0, bonusMpPercent: 35, bonusMatkPercent: 35 }
      ]),
      getDescription: lc => `最大MPと魔法攻撃力の倍率がそれぞれ${lc.bonusMpPercent}%、${lc.bonusMatkPercent}%上昇する`
    },
    {
      id: 'three_realms_dominion', name: '三界の理', icon: 'deployed_code', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, natureDamagePercent: 5, natureResistPercent: 4 },
        { mpCost: 0, natureDamagePercent: 8, natureResistPercent: 7 },
        { mpCost: 0, natureDamagePercent: 11, natureResistPercent: 10 },
        { mpCost: 0, natureDamagePercent: 14, natureResistPercent: 13 },
        { mpCost: 0, natureDamagePercent: 17, natureResistPercent: 16 },
        { mpCost: 0, natureDamagePercent: 20, natureResistPercent: 19 },
        { mpCost: 0, natureDamagePercent: 23, natureResistPercent: 22 },
        { mpCost: 0, natureDamagePercent: 26, natureResistPercent: 25 },
        { mpCost: 0, natureDamagePercent: 30, natureResistPercent: 28 },
        { mpCost: 0, natureDamagePercent: 35, natureResistPercent: 35 }
      ]),
      getDescription: lc => `草・風・土属性で与えるダメージが${lc.natureDamagePercent}%上昇し、同3属性の耐性が${lc.natureResistPercent}%上昇する`
    }
  ]
};
