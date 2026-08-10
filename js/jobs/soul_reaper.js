import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

export const SOUL_REAPER_MAX_CORPSES = 5;

const LEVEL_COSTS = [3, 3, 3, 4, 4, 4, 5, 5, 5, 8];
const makeLevels = configs => configs.map((config, index) => ({
  level: index + 1,
  spCost: LEVEL_COSTS[index],
  ...config
}));

const isSoulReaper = caster => (caster?.jobId || caster?.job) === 'soul_reaper';
const getLivingEnemies = (caster, battle) => {
  if (caster.activeAilment?.type === 'confusion'
    && battle.selectedEnemyTarget
    && battle.party.includes(battle.selectedEnemyTarget)) {
    return battle.party.filter(member => !member.isDead);
  }
  return battle.enemies.filter(enemy => !enemy.isDead);
};
const getPrimaryTarget = (caster, battle) => {
  const targets = getLivingEnemies(caster, battle);
  return targets.includes(battle.selectedEnemyTarget) ? battle.selectedEnemyTarget : targets[0] || null;
};

export const getSoulReaperCorpseStock = caster => Math.min(
  SOUL_REAPER_MAX_CORPSES,
  Math.max(0, Math.floor(Number(caster?._soulReaperCorpses) || 0))
);

export function addSoulReaperCorpses(caster, amount, battle, options = {}) {
  if (!isSoulReaper(caster) || amount <= 0) return 0;
  const before = getSoulReaperCorpseStock(caster);
  caster._soulReaperCorpses = Math.min(SOUL_REAPER_MAX_CORPSES, before + Math.floor(amount));
  const added = caster._soulReaperCorpses - before;
  if (added > 0 && options.announce !== false) {
    battle?.showDamage?.(caster.elementId, `亡骸 +${added}`, 'text-cyan-200');
  }
  if (added > 0) battle?.renderEntities?.();
  return added;
}

export function consumeSoulReaperCorpses(caster, amount, battle, options = {}) {
  if (!isSoulReaper(caster) || amount <= 0) return 0;
  const before = getSoulReaperCorpseStock(caster);
  const consumed = Math.min(before, Math.floor(amount));
  caster._soulReaperCorpses = before - consumed;
  if (consumed > 0 && options.announce !== false) {
    battle?.showDamage?.(caster.elementId, `亡骸 -${consumed}`, 'text-violet-300');
  }
  if (consumed > 0) battle?.renderEntities?.();
  return consumed;
}

const getUseState = required => caster => {
  if (!isSoulReaper(caster)) return { canUse: true };
  const stock = getSoulReaperCorpseStock(caster);
  return stock >= required
    ? { canUse: true }
    : { canUse: false, message: `亡骸が${required}体必要` };
};

const animateSoulSkill = (caster, targets, variant, onImpact) => {
  const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
  if (shouldSkipBattleAnimations() || typeof document === 'undefined') {
    list.forEach((target, index) => onImpact?.(target, index));
    return;
  }

  const speed = getBattleAnimationSpeed(getBattleSpeed());
  const layer = document.getElementById('battle-effects-layer') || document.body;
  list.forEach((target, index) => {
    const targetEl = document.getElementById(target.elementId);
    const rect = targetEl?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const delay = index * 70 / speed;

    setTimeout(() => {
      const effect = document.createElement('div');
      const isFinale = variant === 'requiem';
      const isAegis = variant === 'aegis';
      effect.style.cssText = `position:fixed;left:${x - 58}px;top:${y - 58}px;width:116px;height:116px;border-radius:${isAegis ? '24%' : '50%'};border:${isFinale ? 6 : 3}px ${isFinale ? 'double' : 'solid'} ${isAegis ? '#a5f3fc' : '#c4b5fd'};background:radial-gradient(circle,rgba(236,254,255,.78),rgba(88,28,135,.48) 34%,rgba(8,47,73,.28) 58%,transparent 72%);box-shadow:0 0 ${isFinale ? 34 : 20}px #7c3aed,inset 0 0 20px #22d3ee;z-index:9999;pointer-events:none;mix-blend-mode:screen;display:flex;align-items:center;justify-content:center;color:#ecfeff;font:900 ${isFinale ? 46 : 35}px/1 serif;text-shadow:0 0 9px #22d3ee;`;
      effect.textContent = isAegis ? '◇' : isFinale ? '☠' : variant === 'march' ? '♱' : '☾';
      layer.appendChild(effect);
      const duration = (isFinale ? 760 : 500) / speed;
      const animation = effect.animate([
        { transform: 'translateY(24px) scale(.08) rotate(-70deg)', opacity: 0 },
        { transform: 'translateY(0) scale(1.12) rotate(12deg)', opacity: 1, offset: .48 },
        { transform: 'translateY(-22px) scale(1.65) rotate(90deg)', opacity: 0 }
      ], { duration, easing: 'cubic-bezier(.12,.72,.22,1)' });
      animation.onfinish = () => effect.remove();
      setTimeout(() => onImpact?.(target, index), duration * .48);
    }, delay);
  });
};

const executeDarkAttack = (caster, target, battle, multiplier, options = {}) => {
  if (!target || target.isDead) return;
  battle.executeAttack(caster, target, true, {
    statDependency: 'MAT', actionName: '', damageType: 'skill', hideActionName: true,
    damageMultiplier: multiplier, element: 'dark',
    isAoEProcessed: options.isAoEProcessed,
    skipAtbReset: options.skipAtbReset
  });
};

const reviveFallenParty = (caster, battle, revivePercent) => {
  const fallen = battle.party.filter(member => member.isDead);
  fallen.forEach(member => {
    member.isDead = false;
    const maxHp = member.stats?.hp || member.hp?.max || 1;
    member.hp.current = Math.max(1, Math.floor(maxHp * revivePercent / 100));
    member.atb = 0;
    const stigma = battle._findSkill?.(member, 'stigma_of_atonement');
    if (stigma?.level > 0 && stigma.levelConfig) {
      member.activeAilment = { type: 'curse', duration: 9999 };
    }
    battle.showDamage?.(member.elementId, 'SOUL RETURN', 'text-cyan-200');
  });
  if (fallen.length > 0) battle.renderEntities?.();
  return fallen.length;
};

export const soul_reaper = {
  id: 'soul_reaper',
  name: 'ソウルリーパー',
  tier: 'super_advanced',
  icon: 'skull',
  image: './assets/job/job_soul_reaper.webp',
  changeCost: 5000000,
  requirements: [
    { jobId: 'black_knight', level: 200 },
    { jobId: 'plague_doctor', level: 200 }
  ],
  skills: [
    {
      id: 'soul_harvest', name: '魂魄刈り', icon: 'content_cut', statDependency: 'MAT',
      actionNameClass: 'text-cyan-100', actionNameBorderClass: 'border-violet-400/80',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 26, multiplier: 1.80 }, { mpCost: 31, multiplier: 2.02 },
        { mpCost: 37, multiplier: 2.25 }, { mpCost: 44, multiplier: 2.49 },
        { mpCost: 52, multiplier: 2.74 }, { mpCost: 61, multiplier: 3.00 },
        { mpCost: 71, multiplier: 3.27 }, { mpCost: 82, multiplier: 3.56 },
        { mpCost: 95, multiplier: 3.87 }, { mpCost: 110, multiplier: 4.20 }
      ]),
      getDescription: lc => `敵単体へ闇属性MATK ${lc.multiplier.toFixed(2)}倍。【現職時】亡骸を1体召喚する（最大${SOUL_REAPER_MAX_CORPSES}体）`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getPrimaryTarget(caster, battle);
        if (!target) return;
        addSoulReaperCorpses(caster, 1, battle);
        animateSoulSkill(caster, target, 'harvest', () => executeDarkAttack(caster, target, battle, lc.multiplier));
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.includes(context.selectedEnemyTarget) ? context.selectedEnemyTarget : targets[0];
          return { target, score: 54 * lc.multiplier + (SOUL_REAPER_MAX_CORPSES - getSoulReaperCorpseStock(caster)) * 32 };
        }
      }
    },
    {
      id: 'corpse_vanguard', name: '骸兵召喚', icon: 'swords', statDependency: 'MAT',
      actionNameClass: 'text-violet-100', actionNameBorderClass: 'border-cyan-400/70',
      maxLevel: 10,
      getUseState: getUseState(1),
      levels: makeLevels([
        { mpCost: 38, multiplier: .72, hits: 3 }, { mpCost: 45, multiplier: .79, hits: 3 },
        { mpCost: 53, multiplier: .86, hits: 3 }, { mpCost: 62, multiplier: .94, hits: 4 },
        { mpCost: 72, multiplier: 1.02, hits: 4 }, { mpCost: 84, multiplier: 1.10, hits: 4 },
        { mpCost: 97, multiplier: 1.18, hits: 5 }, { mpCost: 112, multiplier: 1.27, hits: 5 },
        { mpCost: 129, multiplier: 1.36, hits: 5 }, { mpCost: 148, multiplier: 1.46, hits: 5 }
      ]),
      getDescription: lc => `亡骸1体を消費し、骸兵がランダムな敵へ闇属性MATK ${lc.multiplier.toFixed(2)}倍で${lc.hits}回攻撃する`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getLivingEnemies(caster, battle);
        if (!targets.length) return;
        if (isSoulReaper(caster) && consumeSoulReaperCorpses(caster, 1, battle) < 1) return;
        const hits = isSoulReaper(caster) ? lc.hits : 1;
        animateSoulSkill(caster, getPrimaryTarget(caster, battle), 'vanguard', () => {
          for (let hit = 0; hit < hits; hit += 1) {
            const living = getLivingEnemies(caster, battle);
            const target = living[Math.floor(Math.random() * living.length)];
            if (!target) break;
            executeDarkAttack(caster, target, battle, lc.multiplier, { skipAtbReset: hit < hits - 1 });
          }
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length || (isSoulReaper(caster) && getSoulReaperCorpseStock(caster) < 1)) return null;
          return { target: targets[0], score: 46 * lc.multiplier * lc.hits + (targets.length === 1 ? 70 : 30) };
        }
      }
    },
    {
      id: 'ossuary_aegis', name: '骸骨城塞', icon: 'shield_moon',
      actionNameClass: 'text-cyan-100', actionNameBorderClass: 'border-slate-300/70',
      maxLevel: 10,
      getUseState: getUseState(1),
      levels: makeLevels([
        { mpCost: 48, barrierMatkPercent: 55, buffPercent: 10, turns: 3 }, { mpCost: 56, barrierMatkPercent: 64, buffPercent: 12, turns: 3 },
        { mpCost: 65, barrierMatkPercent: 74, buffPercent: 14, turns: 3 }, { mpCost: 76, barrierMatkPercent: 85, buffPercent: 16, turns: 4 },
        { mpCost: 88, barrierMatkPercent: 97, buffPercent: 18, turns: 4 }, { mpCost: 102, barrierMatkPercent: 110, buffPercent: 20, turns: 4 },
        { mpCost: 118, barrierMatkPercent: 124, buffPercent: 23, turns: 4 }, { mpCost: 136, barrierMatkPercent: 139, buffPercent: 26, turns: 5 },
        { mpCost: 156, barrierMatkPercent: 155, buffPercent: 29, turns: 5 }, { mpCost: 180, barrierMatkPercent: 175, buffPercent: 33, turns: 5 }
      ]),
      getDescription: lc => `亡骸1体を消費。味方全体へMATKの${lc.barrierMatkPercent}%のバリアとDEF・MDEF+${lc.buffPercent}%を${lc.turns}ターン付与`,
      execute(caster, lc, battle) {
        if (!battle) return;
        if (isSoulReaper(caster) && consumeSoulReaperCorpses(caster, 1, battle) < 1) return;
        const allies = battle.party.filter(member => !member.isDead);
        const barrier = Math.max(1, Math.floor((caster.stats?.matk || 1) * lc.barrierMatkPercent / 100));
        animateSoulSkill(caster, allies, 'aegis', target => {
          target._barrierHp = Math.max(target._barrierHp || 0, barrier);
          target._barrierTurns = Math.max(target._barrierTurns || 0, lc.turns);
          target._defBuffPercent = Math.max(target._defBuffPercent || 0, lc.buffPercent);
          target._defBuffTurns = Math.max(target._defBuffTurns || 0, lc.turns);
          target._mdefBuffPercent = Math.max(target._mdefBuffPercent || 0, lc.buffPercent);
          target._mdefBuffTurns = Math.max(target._mdefBuffTurns || 0, lc.turns);
          battle.showDamage?.(target.elementId, `BARRIER +${barrier}`, 'text-cyan-200');
          battle.renderEntities?.();
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          if (isSoulReaper(caster) && getSoulReaperCorpseStock(caster) < 1) return null;
          const allies = context.party.filter(member => !member.isDead);
          const exposed = allies.filter(member => !(member._barrierHp > 0));
          return exposed.length >= Math.ceil(allies.length / 2)
            ? { target: caster, score: 105 + exposed.length * 28 + lc.buffPercent }
            : null;
        }
      }
    },
    {
      id: 'march_of_dead', name: '亡者大行軍', icon: 'groups_3', statDependency: 'MAT',
      actionNameClass: 'text-purple-100', actionNameBorderClass: 'border-violet-400/90',
      maxLevel: 10,
      getUseState: getUseState(3),
      levels: makeLevels([
        { mpCost: 82, multiplier: .68, curseChance: 45 }, { mpCost: 95, multiplier: .75, curseChance: 50 },
        { mpCost: 110, multiplier: .82, curseChance: 55 }, { mpCost: 127, multiplier: .90, curseChance: 60 },
        { mpCost: 146, multiplier: .98, curseChance: 66 }, { mpCost: 168, multiplier: 1.07, curseChance: 72 },
        { mpCost: 193, multiplier: 1.16, curseChance: 79 }, { mpCost: 221, multiplier: 1.26, curseChance: 86 },
        { mpCost: 253, multiplier: 1.36, curseChance: 93 }, { mpCost: 290, multiplier: 1.48, curseChance: 100 }
      ]),
      getDescription: lc => `亡骸3体を消費。敵全体へ3波の闇属性MATK ${lc.multiplier.toFixed(2)}倍攻撃を行い、${lc.curseChance}%で呪う`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getLivingEnemies(caster, battle);
        if (!targets.length) return;
        if (isSoulReaper(caster) && consumeSoulReaperCorpses(caster, 3, battle) < 3) return;
        const waves = isSoulReaper(caster) ? 3 : 1;
        animateSoulSkill(caster, targets, 'march', (target, targetIndex) => {
          const originalAilments = caster.stats.attackAilments;
          caster.stats.attackAilments = { ...(originalAilments || {}), curse: lc.curseChance };
          for (let wave = 0; wave < waves; wave += 1) {
            if (target.isDead) break;
            executeDarkAttack(caster, target, battle, lc.multiplier, {
              isAoEProcessed: true,
              skipAtbReset: targetIndex < targets.length - 1 || wave < waves - 1
            });
          }
          caster.stats.attackAilments = originalAilments;
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length || (isSoulReaper(caster) && getSoulReaperCorpseStock(caster) < 3)) return null;
          return { target: targets[0], score: 48 * lc.multiplier * 3 * targets.length + targets.length * 55 };
        }
      }
    },
    {
      id: 'last_requiem', name: '終焉の葬列', icon: 'deceased', statDependency: 'MAT',
      actionNameClass: 'text-white', actionNameBorderClass: 'border-cyan-200/90',
      maxLevel: 10,
      getUseState: getUseState(5),
      levels: makeLevels([
        { mpCost: 150, multiplier: .64, revivePercent: 25 }, { mpCost: 174, multiplier: .70, revivePercent: 29 },
        { mpCost: 202, multiplier: .77, revivePercent: 33 }, { mpCost: 234, multiplier: .84, revivePercent: 37 },
        { mpCost: 271, multiplier: .92, revivePercent: 41 }, { mpCost: 314, multiplier: 1.00, revivePercent: 46 },
        { mpCost: 363, multiplier: 1.09, revivePercent: 51 }, { mpCost: 420, multiplier: 1.18, revivePercent: 57 },
        { mpCost: 486, multiplier: 1.28, revivePercent: 63 }, { mpCost: 560, multiplier: 1.40, revivePercent: 70 }
      ]),
      getDescription: lc => `亡骸5体を全消費。敵全体へ5回の闇属性MATK ${lc.multiplier.toFixed(2)}倍攻撃。戦闘不能の味方全員をHP${lc.revivePercent}%で蘇生`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getLivingEnemies(caster, battle);
        if (!targets.length) return;
        if (isSoulReaper(caster)
          && consumeSoulReaperCorpses(caster, SOUL_REAPER_MAX_CORPSES, battle) < SOUL_REAPER_MAX_CORPSES) return;
        const waves = isSoulReaper(caster) ? SOUL_REAPER_MAX_CORPSES : 1;
        reviveFallenParty(caster, battle, lc.revivePercent);
        animateSoulSkill(caster, targets, 'requiem', (target, targetIndex) => {
          for (let wave = 0; wave < waves; wave += 1) {
            if (target.isDead) break;
            executeDarkAttack(caster, target, battle, lc.multiplier, {
              isAoEProcessed: true,
              skipAtbReset: targetIndex < targets.length - 1 || wave < waves - 1
            });
          }
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length || (isSoulReaper(caster) && getSoulReaperCorpseStock(caster) < SOUL_REAPER_MAX_CORPSES)) return null;
          const fallen = context.party.filter(member => member.isDead).length;
          return { target: targets[0], score: 58 * lc.multiplier * SOUL_REAPER_MAX_CORPSES * targets.length + fallen * 500 };
        }
      }
    },
    {
      id: 'grave_sovereignty', name: '墓標の王', icon: 'tombstone', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusMpPercent: 6, bonusMatkPercent: 6 }, { mpCost: 0, bonusMpPercent: 9, bonusMatkPercent: 9 },
        { mpCost: 0, bonusMpPercent: 12, bonusMatkPercent: 12 }, { mpCost: 0, bonusMpPercent: 15, bonusMatkPercent: 15 },
        { mpCost: 0, bonusMpPercent: 18, bonusMatkPercent: 18 }, { mpCost: 0, bonusMpPercent: 22, bonusMatkPercent: 22 },
        { mpCost: 0, bonusMpPercent: 26, bonusMatkPercent: 26 }, { mpCost: 0, bonusMpPercent: 31, bonusMatkPercent: 31 },
        { mpCost: 0, bonusMpPercent: 36, bonusMatkPercent: 36 }, { mpCost: 0, bonusMpPercent: 45, bonusMatkPercent: 45 }
      ]),
      getDescription: lc => `最大MP・MATK+${lc.bonusMatkPercent}%。【現職時】敵撃破時に亡骸を1体回収する`
    },
    {
      id: 'legion_of_dead', name: '死霊軍勢', icon: 'diversity_2', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusAtkPercent: 4, corpseDamagePercent: 3 }, { mpCost: 0, bonusAtkPercent: 6, corpseDamagePercent: 4 },
        { mpCost: 0, bonusAtkPercent: 8, corpseDamagePercent: 5 }, { mpCost: 0, bonusAtkPercent: 10, corpseDamagePercent: 6 },
        { mpCost: 0, bonusAtkPercent: 12, corpseDamagePercent: 7 }, { mpCost: 0, bonusAtkPercent: 15, corpseDamagePercent: 8 },
        { mpCost: 0, bonusAtkPercent: 18, corpseDamagePercent: 9 }, { mpCost: 0, bonusAtkPercent: 21, corpseDamagePercent: 10 },
        { mpCost: 0, bonusAtkPercent: 25, corpseDamagePercent: 12 }, { mpCost: 0, bonusAtkPercent: 30, corpseDamagePercent: 15 }
      ]),
      getDescription: lc => `ATK+${lc.bonusAtkPercent}%。【現職時】亡骸1体につき与ダメージ+${lc.corpseDamagePercent}%`
    },
    {
      id: 'death_denial', name: '死の拒絶', icon: 'heart_broken', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusMdefPercent: 4, revivePercent: 18 }, { mpCost: 0, bonusMdefPercent: 6, revivePercent: 21 },
        { mpCost: 0, bonusMdefPercent: 8, revivePercent: 24 }, { mpCost: 0, bonusMdefPercent: 10, revivePercent: 27 },
        { mpCost: 0, bonusMdefPercent: 12, revivePercent: 30 }, { mpCost: 0, bonusMdefPercent: 15, revivePercent: 34 },
        { mpCost: 0, bonusMdefPercent: 18, revivePercent: 38 }, { mpCost: 0, bonusMdefPercent: 21, revivePercent: 42 },
        { mpCost: 0, bonusMdefPercent: 25, revivePercent: 46 }, { mpCost: 0, bonusMdefPercent: 30, revivePercent: 50 }
      ]),
      getDescription: lc => `MDEF+${lc.bonusMdefPercent}%。【現職時】致死ダメージ時に亡骸1体を消費し、HP${lc.revivePercent}%で踏みとどまる`
    }
  ]
};
