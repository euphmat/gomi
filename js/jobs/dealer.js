const LEVEL_COSTS = [2, 2, 2, 3, 3, 3, 4, 4, 4, 6];
const makeLevels = configs => configs.map((config, index) => ({
  level: index + 1,
  spCost: LEVEL_COSTS[index],
  ...config,
}));

const isDealer = caster => (caster?.jobId || caster?.job) === 'dealer';
const getTargets = (caster, battle) => {
  if (caster.activeAilment?.type === 'confusion'
    && battle.selectedEnemyTarget
    && battle.party.includes(battle.selectedEnemyTarget)) {
    return battle.party.filter(member => !member.isDead);
  }
  return battle.enemies.filter(enemy => !enemy.isDead);
};
const getPrimaryTarget = (caster, battle) => {
  const targets = getTargets(caster, battle);
  return targets.includes(battle.selectedEnemyTarget) ? battle.selectedEnemyTarget : targets[0] || null;
};
const maxHpOf = target => Math.max(1, Number(target?.stats?.hp || target?.hp?.max) || 1);
const maxMpOf = target => Math.max(0, Number(target?.stats?.mp || target?.mp?.max) || 0);

const attack = (caster, target, battle, multiplier, options = {}) => {
  if (!target || target.isDead) return;
  battle.executeAttack(caster, target, true, {
    statDependency: options.statDependency || 'MAT',
    actionName: '',
    damageType: 'skill',
    hideActionName: true,
    damageMultiplier: multiplier,
    defenseIgnorePercent: options.defenseIgnorePercent || 0,
    element: options.element,
    isAoEProcessed: options.isAoEProcessed,
    skipAtbReset: options.skipAtbReset,
  });
};

const restore = (target, hpPercent, mpPercent, battle) => {
  if (target.isDead) return;
  const currentMp = Number(target.mp?.current) || 0;
  const hp = Math.min(
    Math.max(0, maxHpOf(target) - target.hp.current),
    Math.max(0, Math.floor(maxHpOf(target) * hpPercent / 100))
  );
  const mp = Math.min(
    Math.max(0, maxMpOf(target) - currentMp),
    Math.max(0, Math.floor(maxMpOf(target) * mpPercent / 100))
  );
  if (hp > 0) {
    target.hp.current += hp;
    battle.showDamage?.(target.elementId, `+${hp}`, 'text-emerald-300');
  }
  if (mp > 0 && target.mp) {
    target.mp.current = currentMp + mp;
    battle.showDamage?.(target.elementId, `+${mp} MP`, 'text-cyan-300');
  }
};

export const dealer = {
  id: 'dealer',
  name: 'ディーラー',
  tier: 'special',
  icon: 'playing_cards',
  image: './assets/job/job_dealer.webp',
  changeCost: 777777,
  requirements: [{
    type: 'specialQuest',
    questId: 'blackjack_naturals_1',
    description: 'スペシャルクエスト「ナチュラル21 1回」を達成',
  }],
  skills: [
    {
      id: 'marked_deck', name: 'マークドデック', icon: 'style', statDependency: 'MAT',
      actionNameClass: 'text-fuchsia-100', actionNameBorderClass: 'border-fuchsia-400/80',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 24, multiplier: .72, hits: 3 }, { mpCost: 29, multiplier: .78, hits: 3 },
        { mpCost: 35, multiplier: .84, hits: 3 }, { mpCost: 42, multiplier: .90, hits: 4 },
        { mpCost: 50, multiplier: .97, hits: 4 }, { mpCost: 59, multiplier: 1.04, hits: 4 },
        { mpCost: 69, multiplier: 1.11, hits: 5 }, { mpCost: 80, multiplier: 1.18, hits: 5 },
        { mpCost: 93, multiplier: 1.26, hits: 5 }, { mpCost: 108, multiplier: 1.35, hits: 5 },
      ]),
      getDescription: lc => `印を付けたカードでランダムな敵へMATK ${lc.multiplier.toFixed(2)}倍の${lc.hits}連撃。光・闇属性を交互に与える`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const hits = isDealer(caster) ? lc.hits : 1;
        for (let index = 0; index < hits; index += 1) {
          const targets = getTargets(caster, battle);
          const target = targets[Math.floor(Math.random() * targets.length)];
          if (!target) break;
          attack(caster, target, battle, lc.multiplier, {
            element: index % 2 ? 'dark' : 'light',
            skipAtbReset: index < hits - 1,
          });
        }
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          return targets.length ? { target: targets[0], score: lc.multiplier * lc.hits * 55 } : null;
        },
      },
    },
    {
      id: 'double_down', name: 'ダブルダウン', icon: 'keyboard_double_arrow_up', statDependency: 'BOTH',
      actionNameClass: 'text-amber-100', actionNameBorderClass: 'border-amber-400/90',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 38, multiplier: 2.80, defenseIgnorePercent: 20 }, { mpCost: 46, multiplier: 3.10, defenseIgnorePercent: 24 },
        { mpCost: 56, multiplier: 3.42, defenseIgnorePercent: 28 }, { mpCost: 68, multiplier: 3.76, defenseIgnorePercent: 32 },
        { mpCost: 82, multiplier: 4.12, defenseIgnorePercent: 36 }, { mpCost: 98, multiplier: 4.50, defenseIgnorePercent: 40 },
        { mpCost: 116, multiplier: 4.90, defenseIgnorePercent: 45 }, { mpCost: 137, multiplier: 5.32, defenseIgnorePercent: 50 },
        { mpCost: 161, multiplier: 5.76, defenseIgnorePercent: 55 }, { mpCost: 190, multiplier: 6.25, defenseIgnorePercent: 60 },
      ]),
      getDescription: lc => `敵単体へATK＋MATK ${lc.multiplier.toFixed(2)}倍の複合攻撃。DEF・MDEFを${lc.defenseIgnorePercent}%無視する`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const target = getPrimaryTarget(caster, battle);
        attack(caster, target, battle, lc.multiplier, {
          statDependency: 'BOTH', defenseIgnorePercent: lc.defenseIgnorePercent, element: 'light',
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          const target = targets.includes(context.selectedEnemyTarget) ? context.selectedEnemyTarget : targets[0];
          return target ? { target, score: lc.multiplier * 85 + lc.defenseIgnorePercent * 2 + (targets.length === 1 ? 100 : 0) } : null;
        },
      },
    },
    {
      id: 'house_edge', name: 'ハウスエッジ', icon: 'casino', statDependency: 'MAT',
      actionNameClass: 'text-rose-100', actionNameBorderClass: 'border-rose-400/80',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 52, multiplier: 1.55, debuffPercent: 12, atbReduction: 120, turns: 3 }, { mpCost: 62, multiplier: 1.72, debuffPercent: 14, atbReduction: 150, turns: 3 },
        { mpCost: 74, multiplier: 1.90, debuffPercent: 16, atbReduction: 180, turns: 3 }, { mpCost: 88, multiplier: 2.09, debuffPercent: 19, atbReduction: 220, turns: 3 },
        { mpCost: 104, multiplier: 2.29, debuffPercent: 22, atbReduction: 260, turns: 4 }, { mpCost: 123, multiplier: 2.50, debuffPercent: 25, atbReduction: 300, turns: 4 },
        { mpCost: 145, multiplier: 2.72, debuffPercent: 28, atbReduction: 350, turns: 4 }, { mpCost: 171, multiplier: 2.95, debuffPercent: 31, atbReduction: 400, turns: 5 },
        { mpCost: 201, multiplier: 3.19, debuffPercent: 35, atbReduction: 450, turns: 5 }, { mpCost: 236, multiplier: 3.45, debuffPercent: 40, atbReduction: 500, turns: 5 },
      ]),
      getDescription: lc => `敵全体へ闇属性MATK ${lc.multiplier.toFixed(2)}倍。ATK・MATKを${lc.debuffPercent}%低下し、ATBを${lc.atbReduction}後退させる`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getTargets(caster, battle);
        targets.forEach((target, index) => {
          target._atkBuffPercent = Math.min(Number(target._atkBuffPercent) || 0, -lc.debuffPercent);
          target._atkBuffTurns = Math.max(Number(target._atkBuffTurns) || 0, lc.turns);
          target._matkBuffPercent = Math.min(Number(target._matkBuffPercent) || 0, -lc.debuffPercent);
          target._matkBuffTurns = Math.max(Number(target._matkBuffTurns) || 0, lc.turns);
          target.atb = Math.max(0, (Number(target.atb) || 0) - lc.atbReduction);
          attack(caster, target, battle, lc.multiplier, {
            element: 'dark', isAoEProcessed: true, skipAtbReset: index < targets.length - 1,
          });
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          return targets.length ? { target: targets[0], score: lc.multiplier * targets.length * 70 + targets.length * lc.debuffPercent * 3 } : null;
        },
      },
    },
    {
      id: 'royal_payout', name: 'ロイヤルペイアウト', icon: 'paid',
      actionNameClass: 'text-yellow-100', actionNameBorderClass: 'border-yellow-300/90',
      maxLevel: 10,
      levels: makeLevels([
        { mpCost: 70, hpPercent: 20, mpPercent: 10, buffPercent: 15, barrierMatkPercent: 40, atbGain: 100, turns: 3 },
        { mpCost: 84, hpPercent: 25, mpPercent: 13, buffPercent: 18, barrierMatkPercent: 50, atbGain: 130, turns: 3 },
        { mpCost: 100, hpPercent: 30, mpPercent: 16, buffPercent: 21, barrierMatkPercent: 60, atbGain: 160, turns: 3 },
        { mpCost: 119, hpPercent: 36, mpPercent: 19, buffPercent: 24, barrierMatkPercent: 72, atbGain: 200, turns: 3 },
        { mpCost: 141, hpPercent: 42, mpPercent: 22, buffPercent: 27, barrierMatkPercent: 84, atbGain: 240, turns: 4 },
        { mpCost: 167, hpPercent: 49, mpPercent: 26, buffPercent: 30, barrierMatkPercent: 98, atbGain: 290, turns: 4 },
        { mpCost: 197, hpPercent: 56, mpPercent: 30, buffPercent: 34, barrierMatkPercent: 114, atbGain: 340, turns: 4 },
        { mpCost: 232, hpPercent: 64, mpPercent: 34, buffPercent: 38, barrierMatkPercent: 132, atbGain: 390, turns: 5 },
        { mpCost: 273, hpPercent: 72, mpPercent: 38, buffPercent: 42, barrierMatkPercent: 152, atbGain: 450, turns: 5 },
        { mpCost: 322, hpPercent: 80, mpPercent: 42, buffPercent: 50, barrierMatkPercent: 175, atbGain: 500, turns: 5 },
      ]),
      getDescription: lc => `味方全体のHP${lc.hpPercent}%・MP${lc.mpPercent}%回復、ATK・MATK+${lc.buffPercent}%、MATKの${lc.barrierMatkPercent}%のバリア、ATB+${lc.atbGain}`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const barrier = Math.max(1, Math.floor((caster.stats?.matk || 1) * lc.barrierMatkPercent / 100));
        battle.party.filter(member => !member.isDead).forEach(target => {
          restore(target, lc.hpPercent, lc.mpPercent, battle);
          target._atkBuffPercent = Math.max(Number(target._atkBuffPercent) || 0, lc.buffPercent);
          target._atkBuffTurns = Math.max(Number(target._atkBuffTurns) || 0, lc.turns);
          target._matkBuffPercent = Math.max(Number(target._matkBuffPercent) || 0, lc.buffPercent);
          target._matkBuffTurns = Math.max(Number(target._matkBuffTurns) || 0, lc.turns);
          target._barrierHp = Math.max(Number(target._barrierHp) || 0, barrier);
          target._barrierTurns = Math.max(Number(target._barrierTurns) || 0, lc.turns);
          target.atb = Math.min(1000, (Number(target.atb) || 0) + lc.atbGain);
        });
        battle.renderEntities?.();
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const allies = context.party.filter(member => !member.isDead);
          const injured = allies.filter(member => member.hp.current / Math.max(1, member.stats?.hp || member.hp.max) < .7).length;
          const depleted = allies.filter(member => member.mp.current / Math.max(1, member.stats?.mp || member.mp.max) < .45).length;
          return injured || depleted ? { target: caster, score: 130 + injured * 95 + depleted * 55 + lc.buffPercent } : null;
        },
      },
    },
    {
      id: 'blackjack_finale', name: 'BLACKJACK・ワールド', icon: 'looks_two', statDependency: 'BOTH',
      actionNameClass: 'text-yellow-50', actionNameBorderClass: 'border-yellow-200/95',
      maxLevel: 10,
      getUseState(caster) {
        if (!isDealer(caster)) return { canUse: true };
        const count = Math.max(0, Math.floor(Number(caster._dealerCount) || 0));
        return count >= 21 ? { canUse: true } : { canUse: false, message: `カウント21が必要（${count}/21）` };
      },
      levels: makeLevels([
        { mpCost: 130, multiplier: .72, hits: 7 }, { mpCost: 153, multiplier: .79, hits: 7 },
        { mpCost: 180, multiplier: .86, hits: 7 }, { mpCost: 211, multiplier: .93, hits: 7 },
        { mpCost: 247, multiplier: 1.01, hits: 7 }, { mpCost: 289, multiplier: 1.09, hits: 7 },
        { mpCost: 338, multiplier: 1.18, hits: 7 }, { mpCost: 395, multiplier: 1.27, hits: 7 },
        { mpCost: 462, multiplier: 1.37, hits: 7 }, { mpCost: 540, multiplier: 1.50, hits: 7 },
      ]),
      getDescription: lc => `【現職時：カウント21で使用可】敵全体へATK＋MATK ${lc.multiplier.toFixed(2)}倍の7連撃。カウント全消費でさらに約2倍`,
      execute(caster, lc, battle) {
        if (!battle) return;
        const targets = getTargets(caster, battle);
        const hits = isDealer(caster) ? lc.hits : 1;
        targets.forEach((target, targetIndex) => {
          for (let hit = 0; hit < hits; hit += 1) {
            if (target.isDead) break;
            attack(caster, target, battle, lc.multiplier, {
              statDependency: 'BOTH', defenseIgnorePercent: 50,
              element: hit % 2 ? 'dark' : 'light', isAoEProcessed: true,
              skipAtbReset: targetIndex < targets.length - 1 || hit < hits - 1,
            });
          }
        });
      },
      autoBattle: {
        check: (caster, lc, context) => {
          const targets = context.enemies.filter(enemy => !enemy.isDead);
          const count = Math.max(0, Math.floor(Number(caster._dealerCount) || 0));
          return targets.length && (!isDealer(caster) || count >= 21)
            ? { target: targets[0], score: 1000 + lc.multiplier * lc.hits * targets.length * 100 }
            : null;
        },
      },
    },
    {
      id: 'house_advantage', name: '胴元の特権', icon: 'workspace_premium', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusAtkPercent: 8, bonusMatkPercent: 8, bonusSpdPercent: 5 }, { mpCost: 0, bonusAtkPercent: 12, bonusMatkPercent: 12, bonusSpdPercent: 8 },
        { mpCost: 0, bonusAtkPercent: 16, bonusMatkPercent: 16, bonusSpdPercent: 11 }, { mpCost: 0, bonusAtkPercent: 20, bonusMatkPercent: 20, bonusSpdPercent: 14 },
        { mpCost: 0, bonusAtkPercent: 24, bonusMatkPercent: 24, bonusSpdPercent: 18 }, { mpCost: 0, bonusAtkPercent: 29, bonusMatkPercent: 29, bonusSpdPercent: 22 },
        { mpCost: 0, bonusAtkPercent: 34, bonusMatkPercent: 34, bonusSpdPercent: 27 }, { mpCost: 0, bonusAtkPercent: 40, bonusMatkPercent: 40, bonusSpdPercent: 32 },
        { mpCost: 0, bonusAtkPercent: 46, bonusMatkPercent: 46, bonusSpdPercent: 38 }, { mpCost: 0, bonusAtkPercent: 55, bonusMatkPercent: 55, bonusSpdPercent: 45 },
      ]),
      getDescription: lc => `ATK・MATK+${lc.bonusAtkPercent}%、SPD+${lc.bonusSpdPercent}%`,
    },
    {
      id: 'high_roller', name: 'ハイローラー', icon: 'diamond', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusHpPercent: 6, bonusMpPercent: 6 }, { mpCost: 0, bonusHpPercent: 9, bonusMpPercent: 9 },
        { mpCost: 0, bonusHpPercent: 12, bonusMpPercent: 12 }, { mpCost: 0, bonusHpPercent: 15, bonusMpPercent: 15 },
        { mpCost: 0, bonusHpPercent: 18, bonusMpPercent: 18 }, { mpCost: 0, bonusHpPercent: 22, bonusMpPercent: 22 },
        { mpCost: 0, bonusHpPercent: 26, bonusMpPercent: 26 }, { mpCost: 0, bonusHpPercent: 31, bonusMpPercent: 31 },
        { mpCost: 0, bonusHpPercent: 36, bonusMpPercent: 36 }, { mpCost: 0, bonusHpPercent: 45, bonusMpPercent: 45 },
      ]),
      getDescription: lc => `最大HP・最大MP+${lc.bonusHpPercent}%`,
    },
    {
      id: 'dealer_insurance', name: 'インシュランス', icon: 'health_and_safety', type: 'passive', maxLevel: 10,
      levels: makeLevels([
        { mpCost: 0, bonusDefPercent: 5, bonusMdefPercent: 5, revivePercent: 25 }, { mpCost: 0, bonusDefPercent: 8, bonusMdefPercent: 8, revivePercent: 32 },
        { mpCost: 0, bonusDefPercent: 11, bonusMdefPercent: 11, revivePercent: 39 }, { mpCost: 0, bonusDefPercent: 14, bonusMdefPercent: 14, revivePercent: 46 },
        { mpCost: 0, bonusDefPercent: 17, bonusMdefPercent: 17, revivePercent: 54 }, { mpCost: 0, bonusDefPercent: 21, bonusMdefPercent: 21, revivePercent: 62 },
        { mpCost: 0, bonusDefPercent: 25, bonusMdefPercent: 25, revivePercent: 71 }, { mpCost: 0, bonusDefPercent: 29, bonusMdefPercent: 29, revivePercent: 80 },
        { mpCost: 0, bonusDefPercent: 34, bonusMdefPercent: 34, revivePercent: 90 }, { mpCost: 0, bonusDefPercent: 40, bonusMdefPercent: 40, revivePercent: 100 },
      ]),
      getDescription: lc => `DEF・MDEF+${lc.bonusDefPercent}%。【現職時／戦闘中1回】致死ダメージを無効化しHP${lc.revivePercent}%で復帰`,
    },
  ],
};
