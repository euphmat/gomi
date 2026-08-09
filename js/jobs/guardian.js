import { getBattleAnimationSpeed, getBattleSpeed, shouldSkipBattleAnimations } from '../utils/battle-animation.js';

const getLivingAllies = battle => battle.party.filter(member => !member.isDead);

const getOffensiveTargets = (caster, battle) => caster.activeAilment?.type === 'confusion'
  ? battle.party.filter(member => !member.isDead)
  : battle.enemies.filter(enemy => !enemy.isDead);

const standardLevels = values => values.map((value, index) => ({
  level: index + 1,
  spCost: index < 3 ? 1 : index < 6 ? 2 : index < 9 ? 3 : 5,
  ...value
}));

const animateSkill = (caster, targets, type, onImpact) => {
  const list = Array.isArray(targets) ? targets : [targets];
  if (shouldSkipBattleAnimations() || typeof document === 'undefined') {
    list.forEach((target, index) => onImpact?.(target, index));
    return;
  }

  const speed = getBattleAnimationSpeed(getBattleSpeed());
  const layer = document.getElementById('battle-effects-layer') || document.body;

  list.forEach((target, index) => {
    const targetEl = document.getElementById(target?.elementId);
    const rect = targetEl?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    setTimeout(() => {
      const effect = document.createElement('div');
      effect.style.position = 'fixed';
      effect.style.pointerEvents = 'none';
      effect.style.zIndex = '9999';
      effect.style.left = `${x - 48}px`;
      effect.style.top = `${y - 54}px`;
      effect.style.width = '96px';
      effect.style.height = '108px';
      effect.style.clipPath = 'polygon(50% 0, 94% 17%, 86% 75%, 50% 100%, 14% 75%, 6% 17%)';
      effect.style.mixBlendMode = 'screen';

      if (type === 'bash') {
        effect.style.background = 'linear-gradient(135deg,#fff,#fbbf24 35%,#1e3a8a 70%,transparent)';
        effect.style.boxShadow = '0 0 22px #fbbf24';
      } else if (type === 'wall') {
        effect.style.border = '4px double #bae6fd';
        effect.style.background = 'linear-gradient(145deg,rgba(255,255,255,.55),rgba(14,116,144,.18))';
        effect.style.boxShadow = '0 0 20px #22d3ee, inset 0 0 18px #fef3c7';
      } else {
        effect.style.border = '5px solid #fde68a';
        effect.style.background = 'linear-gradient(145deg,rgba(255,255,255,.7),rgba(30,58,138,.3))';
        effect.style.boxShadow = '0 0 28px #fbbf24, inset 0 0 22px #38bdf8';
      }

      layer.appendChild(effect);
      const duration = (type === 'bash' ? 420 : 620) / speed;
      const animation = effect.animate(type === 'bash' ? [
        { transform: 'translateX(-50px) scale(.35) rotate(-18deg)', opacity: 0 },
        { transform: 'translateX(0) scale(1.25) rotate(5deg)', opacity: 1, offset: .62 },
        { transform: 'translateX(12px) scale(1.5) rotate(9deg)', opacity: 0 }
      ] : [
        { transform: 'scale(.2)', opacity: 0 },
        { transform: 'scale(1.12)', opacity: 1, offset: .55 },
        { transform: 'scale(1.35)', opacity: 0 }
      ], { duration, easing: 'ease-out' });
      animation.onfinish = () => effect.remove();
      setTimeout(() => onImpact?.(target, index), duration * .55);
    }, index * 75 / speed);
  });
};

export const guardian = {
  id: 'guardian',
  name: 'ガーディアン',
  icon: 'shield_lock',
  image: './assets/job/job_guardian.webp',
  changeCost: 500000,
  requirements: [
    { jobId: 'knight', level: 50 },
    { jobId: 'paladin', level: 50 }
  ],
  skills: [
    {
      id: 'guardian_oath', name: '守護者の誓約', icon: 'shield_person',
      actionNameClass: 'text-amber-200', actionNameBorderClass: 'border-amber-400/60',
      maxLevel: 10,
      levels: standardLevels([
        { mpCost: 30, turns: 2, reduction: 15 }, { mpCost: 35, turns: 2, reduction: 18 },
        { mpCost: 40, turns: 2, reduction: 21 }, { mpCost: 46, turns: 3, reduction: 24 },
        { mpCost: 52, turns: 3, reduction: 27 }, { mpCost: 59, turns: 3, reduction: 30 },
        { mpCost: 66, turns: 4, reduction: 33 }, { mpCost: 74, turns: 4, reduction: 36 },
        { mpCost: 82, turns: 4, reduction: 39 }, { mpCost: 92, turns: 5, reduction: 42 }
      ]),
      getDescription: lc => `${lc.turns}ターン、味方への攻撃を全て引き受け、受けるダメージを${lc.reduction}%軽減する`,
      execute(caster, lc, battle) {
        if (!battle) return;
        animateSkill(caster, caster, 'oath', () => {
          caster._guardianCoverTurns = lc.turns;
          caster._guardianCoverReduction = lc.reduction;
          battle.showDamage(caster.elementId, 'ALL COVER', 'text-amber-300');
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          if (caster._guardianCoverTurns > 0) return null;
          const allies = context.party.filter(member => !member.isDead && member !== caster);
          if (!allies.length) return null;
          const danger = allies.reduce((score, ally) => {
            const maxHp = ally.stats?.hp || ally.hp?.max || 1;
            return score + (1 - ally.hp.current / Math.max(1, maxHp));
          }, 0);
          return { target: caster, score: 82 + danger * 45 + lc.reduction };
        }
      }
    },
    {
      id: 'impregnable_wall', name: '鉄壁城塞陣', icon: 'fort',
      actionNameClass: 'text-cyan-200', actionNameBorderClass: 'border-cyan-400/60',
      maxLevel: 10,
      levels: standardLevels([
        { mpCost: 45, barrierPercent: 6, defPercent: 10, turns: 3 },
        { mpCost: 52, barrierPercent: 8, defPercent: 13, turns: 3 },
        { mpCost: 59, barrierPercent: 10, defPercent: 16, turns: 3 },
        { mpCost: 67, barrierPercent: 12, defPercent: 19, turns: 3 },
        { mpCost: 76, barrierPercent: 15, defPercent: 22, turns: 4 },
        { mpCost: 86, barrierPercent: 18, defPercent: 25, turns: 4 },
        { mpCost: 97, barrierPercent: 21, defPercent: 28, turns: 4 },
        { mpCost: 109, barrierPercent: 24, defPercent: 31, turns: 4 },
        { mpCost: 122, barrierPercent: 27, defPercent: 33, turns: 5 },
        { mpCost: 138, barrierPercent: 30, defPercent: 35, turns: 5 }
      ]),
      getDescription: lc => `味方全体に自身の最大HPの${lc.barrierPercent}%分のバリアを付与し、DEF・MDEFを${lc.turns}ターン${lc.defPercent}%上昇する`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const allies = getLivingAllies(battle);
        const casterMaxHp = caster.stats?.hp || caster.hp?.max || 1;
        const barrier = Math.max(1, Math.floor(casterMaxHp * lc.barrierPercent / 100));
        animateSkill(caster, allies, 'wall', target => {
          if (target.isDead) return;
          target._barrierHp = Math.max(target._barrierHp || 0, barrier);
          target._barrierTurns = Math.max(target._barrierTurns || 0, lc.turns);
          target._defBuffPercent = Math.max(target._defBuffPercent || 0, lc.defPercent);
          target._defBuffTurns = Math.max(target._defBuffTurns || 0, lc.turns);
          target._mdefBuffPercent = Math.max(target._mdefBuffPercent || 0, lc.defPercent);
          target._mdefBuffTurns = Math.max(target._mdefBuffTurns || 0, lc.turns);
          battle.showDamage(target.elementId, `BARRIER +${barrier}`, 'text-cyan-200');
          battle.renderEntities();
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const allies = context.party.filter(member => !member.isDead);
          const exposed = allies.filter(member => !(member._barrierHp > 0) || !(member._defBuffTurns > 0) || !(member._mdefBuffTurns > 0));
          if (exposed.length < Math.ceil(allies.length / 2)) return null;
          return { target: caster, score: 88 + exposed.length * 15 + lc.defPercent };
        }
      }
    },
    {
      id: 'aegis_bash', name: 'イージスバッシュ', icon: 'shield', statDependency: 'ATK',
      actionNameClass: 'text-sky-200', actionNameBorderClass: 'border-sky-400/60',
      maxLevel: 10,
      levels: standardLevels([
        { mpCost: 16, multiplier: 1.20, defenseRatio: .35 },
        { mpCost: 19, multiplier: 1.32, defenseRatio: .40 },
        { mpCost: 22, multiplier: 1.44, defenseRatio: .45 },
        { mpCost: 26, multiplier: 1.57, defenseRatio: .52 },
        { mpCost: 30, multiplier: 1.70, defenseRatio: .59 },
        { mpCost: 35, multiplier: 1.84, defenseRatio: .66 },
        { mpCost: 40, multiplier: 1.99, defenseRatio: .74 },
        { mpCost: 46, multiplier: 2.16, defenseRatio: .82 },
        { mpCost: 52, multiplier: 2.35, defenseRatio: .91 },
        { mpCost: 60, multiplier: 2.60, defenseRatio: 1.00 }
      ]),
      getDescription: lc => `敵単体へ、ATKにDEF・MDEFの${Math.round(lc.defenseRatio * 100)}%を加えた${lc.multiplier.toFixed(2)}倍の物理攻撃を行う`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getOffensiveTargets(caster, battle);
        const target = targets.includes(battle.selectedEnemyTarget) ? battle.selectedEnemyTarget : targets[0];
        if (!target) return;
        animateSkill(caster, target, 'bash', () => {
          if (target.isDead) return;
          const originalAtk = caster.stats.atk;
          caster.stats.atk = Math.floor((originalAtk || 0) + ((caster.stats.def || 0) + (caster.stats.mdef || 0)) * lc.defenseRatio);
          battle.executeAttack(caster, target, true, {
            statDependency: 'ATK', actionName: '', damageType: 'skill', hideActionName: true,
            damageMultiplier: lc.multiplier
          });
          caster.stats.atk = originalAtk;
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          if (!targets.length) return null;
          const target = targets.includes(context.selectedEnemyTarget) ? context.selectedEnemyTarget : targets[0];
          return { target, score: 38 * lc.multiplier };
        }
      }
    },
    {
      id: 'adamant_fortress', name: '金剛城塞', icon: 'castle', type: 'passive',
      maxLevel: 10,
      levels: standardLevels([
        { mpCost: 0, bonusHpPercent: 4, bonusDefPercent: 5, bonusMdefPercent: 5 },
        { mpCost: 0, bonusHpPercent: 7, bonusDefPercent: 8, bonusMdefPercent: 8 },
        { mpCost: 0, bonusHpPercent: 10, bonusDefPercent: 11, bonusMdefPercent: 11 },
        { mpCost: 0, bonusHpPercent: 13, bonusDefPercent: 15, bonusMdefPercent: 15 },
        { mpCost: 0, bonusHpPercent: 16, bonusDefPercent: 19, bonusMdefPercent: 19 },
        { mpCost: 0, bonusHpPercent: 20, bonusDefPercent: 23, bonusMdefPercent: 23 },
        { mpCost: 0, bonusHpPercent: 24, bonusDefPercent: 27, bonusMdefPercent: 27 },
        { mpCost: 0, bonusHpPercent: 28, bonusDefPercent: 31, bonusMdefPercent: 31 },
        { mpCost: 0, bonusHpPercent: 32, bonusDefPercent: 35, bonusMdefPercent: 35 },
        { mpCost: 0, bonusHpPercent: 36, bonusDefPercent: 40, bonusMdefPercent: 40 }
      ]),
      getDescription: lc => `最大HP+${lc.bonusHpPercent}%、DEF・MDEF+${lc.bonusDefPercent}%`
    },
    {
      id: 'last_bastion', name: 'ラストバスティオン', icon: 'health_and_safety', type: 'passive',
      maxLevel: 10,
      levels: standardLevels([
        { mpCost: 0, revivePercent: 10 }, { mpCost: 0, revivePercent: 13 },
        { mpCost: 0, revivePercent: 16 }, { mpCost: 0, revivePercent: 20 },
        { mpCost: 0, revivePercent: 24 }, { mpCost: 0, revivePercent: 28 },
        { mpCost: 0, revivePercent: 32 }, { mpCost: 0, revivePercent: 36 },
        { mpCost: 0, revivePercent: 40 }, { mpCost: 0, revivePercent: 45 }
      ]),
      getDescription: lc => `各戦闘で1度だけ、致死ダメージを受けた時に最大HPの${lc.revivePercent}%で踏みとどまる`
    }
  ]
};
