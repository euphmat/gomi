/**
 * 全ノーマルダンジョン踏破者向けの最終領域。
 * 既存最終ボス「特異点オリジン」(HP 約3,429万 / 攻撃 約24.8万)を
 * 明確に上回る基準で、開幕行動・HPフェーズ・復活を設計している。
 */

export const FINAL_DUNGEON_ID = 'last_horizon';

const livingParty = battle => (battle?.party || []).filter(member => !member.isDead);

function clearPositiveEffects(target) {
  const numericFields = [
    '_defBuffTurns', '_defBuffPercent', '_mdefBuffTurns', '_mdefBuffPercent', '_mdefBuffAmount',
    '_atkBuffTurns', '_atkBuffPercent', '_matkBuffTurns', '_matkBuffPercent',
    '_provokeTurns', '_provokeChance', '_guardianCoverTurns', '_guardianCoverReduction',
    '_ailmentResistBuffTurns', '_ailmentResistBuffAmount', '_barrierTurns', '_barrierHp',
  ];
  numericFields.forEach(field => { target[field] = 0; });
}

function applyDefenseCollapse(target, percent, turns = 4) {
  target._defBuffPercent = -Math.abs(percent);
  target._defBuffTurns = turns;
  target._mdefBuffPercent = -Math.abs(percent);
  target._mdefBuffTurns = turns;
}

function withAttackProfile(attacker, elements, ailments, execute) {
  const originalElements = attacker.stats.attackElements;
  const originalAilments = attacker.stats.attackAilments;
  attacker.stats.attackElements = elements;
  attacker.stats.attackAilments = ailments || {};
  try {
    execute();
  } finally {
    attacker.stats.attackElements = originalElements;
    attacker.stats.attackAilments = originalAilments;
  }
}

function attackParty(attacker, battle, config) {
  const targets = livingParty(battle);
  if (!targets.length) return;
  battle.showActionName?.(
    attacker.elementId,
    config.name,
    config.nameClass || 'text-fuchsia-200',
    config.borderClass || 'border-fuchsia-400/70'
  );
  withAttackProfile(attacker, config.elements || {}, config.ailments || {}, () => {
    targets.forEach((target, index) => {
      if (target.isDead) return;
      battle.executeAttack(attacker, target, false, {
        actionName: config.name,
        damageMultiplier: config.multiplier,
        isMagic: Boolean(config.isMagic),
        isHybrid: Boolean(config.isHybrid),
        damageType: 'skill',
        defenseIgnorePercent: config.defenseIgnorePercent || 0,
        hideActionName: true,
        skipAtbReset: index < targets.length - 1,
      });
    });
  });
}

function attackPartyRepeated(attacker, battle, config, hits) {
  battle.showActionName?.(attacker.elementId, config.name, 'text-rose-100', 'border-rose-300/80');
  withAttackProfile(attacker, config.elements || {}, config.ailments || {}, () => {
    for (let hit = 0; hit < hits; hit += 1) {
      const targets = livingParty(battle);
      targets.forEach((target, index) => {
        battle.executeAttack(attacker, target, false, {
          actionName: config.name,
          damageMultiplier: config.multiplier,
          isMagic: Boolean(config.isMagic),
          isHybrid: Boolean(config.isHybrid),
          damageType: 'skill',
          defenseIgnorePercent: config.defenseIgnorePercent || 0,
          hideActionName: true,
          skipAtbReset: hit < hits - 1 || index < targets.length - 1,
        });
      });
    }
  });
}

function healMonster(monster, battle, rate) {
  const maxHp = monster.maxHp || monster.stats.hp;
  const before = monster.currentHp;
  monster.currentHp = Math.min(maxHp, before + Math.floor(maxHp * rate));
  const restored = monster.currentHp - before;
  if (restored > 0) battle.showDamage?.(monster.elementId, `+${restored}`, 'text-emerald-300');
}

function enrageAtHalfHp(monster, battle, label) {
  if (monster._finalEnrage || monster.currentHp / monster.maxHp > 0.5) return;
  monster._finalEnrage = true;
  monster.stats.atk = Math.floor(monster.stats.atk * 1.5);
  monster.stats.matk = Math.floor(monster.stats.matk * 1.5);
  monster.stats.spd = Math.floor(monster.stats.spd * 1.25);
  monster.atb = Math.max(monster.atb || 0, 850);
  battle.showActionName?.(monster.elementId, label, 'text-rose-200', 'border-rose-400/80');
  battle.showDamage?.(monster.elementId, 'ATK / MATK / SPD UP', 'text-rose-300');
}

const voidHarbinger = {
  id: 'void_harbinger', name: '虚無の先触れ',
  stats: { hp: 210000000, atk: 1150000, def: 780000, matk: 1250000, mdef: 860000, spd: 1900 },
  elements: { dark: 180, light: -160, fire: 80, water: 80, grass: 80, ice: 80, thunder: 80, wind: 80, earth: 80 },
  ailments: { poison: 95, burn: 95, paralysis: 80, sleep: 95, confusion: 80, curse: 95, blind: 95, silence: 80 },
  rewards: { exp: 24000, jp: 6000, gold: 15000 }, drops: [],
  openingAction(attacker, battle) {
    livingParty(battle).forEach(target => {
      clearPositiveEffects(target);
      target.atb = 0;
      applyDefenseCollapse(target, 30, 5);
    });
    attackParty(attacker, battle, {
      name: '開幕・虚無宣告', multiplier: 6.5, isMagic: true,
      elements: { dark: 100 }, ailments: { curse: 70, silence: 55 },
      nameClass: 'text-violet-100', borderClass: 'border-violet-300/80',
    });
  },
  onTurnStart: (monster, battle) => enrageAtHalfHp(monster, battle, '虚無相転移'),
  actions: [
    {
      name: '事象抹消', chance: 55,
      description: '全体へ超威力の闇属性魔法。強化を解除し、防御・魔防とATBを崩壊させる。',
      execute(attacker, defender, battle) {
        livingParty(battle).forEach(target => {
          clearPositiveEffects(target);
          applyDefenseCollapse(target, 45, 4);
          target.atb = Math.max(0, (target.atb || 0) - 650);
        });
        attackParty(attacker, battle, {
          name: '事象抹消', multiplier: 11, isMagic: true,
          elements: { dark: 100 }, ailments: { curse: 80, silence: 65 },
        });
      },
    },
    {
      name: 'イベントホライズン', chance: 25,
      description: '単体へ防御をほぼ無視する致命撃を放ち、自身を回復する。',
      execute(attacker, defender, battle) {
        withAttackProfile(attacker, { dark: 100 }, { confusion: 75 }, () => {
          battle.executeAttack(attacker, defender, false, {
            actionName: 'イベントホライズン', damageMultiplier: 18, isMagic: true,
            defenseIgnorePercent: 85, damageType: 'skill',
          });
        });
        healMonster(attacker, battle, 0.06);
      },
    },
  ],
};

const paradoxArbiter = {
  id: 'paradox_arbiter', name: '逆理の審判者',
  stats: { hp: 300000000, atk: 1450000, def: 980000, matk: 1600000, mdef: 1100000, spd: 2150 },
  elements: { light: 140, dark: 140, fire: 90, water: 90, grass: 90, ice: 90, thunder: 90, wind: 90, earth: -150 },
  ailments: { poison: 95, burn: 95, paralysis: 85, sleep: 95, confusion: 95, curse: 95, blind: 85, silence: 95 },
  rewards: { exp: 30000, jp: 7500, gold: 20000 }, drops: [],
  openingAction(attacker, battle) {
    livingParty(battle).forEach(target => {
      target.atb = 0;
      if (target.mp) target.mp.current = Math.floor(target.mp.current * 0.3);
    });
    attackParty(attacker, battle, {
      name: '開幕・零式判決', multiplier: 7, isMagic: true,
      elements: { light: 50, dark: 50 }, ailments: { silence: 80, confusion: 65 },
      nameClass: 'text-amber-100', borderClass: 'border-amber-300/80',
    });
  },
  onTurnStart(monster, battle) {
    monster._paradoxTurn = (monster._paradoxTurn || 0) + 1;
    const lightPhase = monster._paradoxTurn % 2 === 1;
    monster.stats.elementResist.light = lightPhase ? 220 : -220;
    monster.stats.elementResist.dark = lightPhase ? -220 : 220;
    battle.showActionName?.(
      monster.elementId,
      lightPhase ? '逆理法：白は黒なり' : '逆理法：黒は白なり',
      lightPhase ? 'text-slate-100' : 'text-violet-200',
      'border-amber-300/60'
    );
  },
  actions: [
    {
      name: 'パラドクス・ヴァーディクト', chance: 50,
      description: '光と闇を同時に帯びた全体判決。沈黙・混乱を高確率で付与する。',
      execute(attacker, defender, battle) {
        attackParty(attacker, battle, {
          name: 'パラドクス・ヴァーディクト', multiplier: 13, isMagic: true,
          elements: { light: 50, dark: 50 }, ailments: { silence: 85, confusion: 75 },
        });
      },
    },
    {
      name: '命数均衡', chance: 30,
      description: '最もHPの高い者を処刑し、全員のATBを反転、強化とMPを奪う。',
      execute(attacker, defender, battle) {
        const targets = livingParty(battle);
        if (!targets.length) return;
        const highestHp = targets.reduce((best, target) => target.hp.current > best.hp.current ? target : best);
        targets.forEach(target => {
          clearPositiveEffects(target);
          target.atb = Math.max(0, 1000 - Math.min(1000, target.atb || 0));
          if (target.mp) target.mp.current = Math.floor(target.mp.current * 0.15);
        });
        withAttackProfile(attacker, { light: 50, dark: 50 }, { curse: 80 }, () => {
          battle.executeAttack(attacker, highestHp, false, {
            actionName: '命数均衡', damageMultiplier: 22, isMagic: true,
            defenseIgnorePercent: 90, damageType: 'skill',
          });
        });
      },
    },
  ],
};

const apocalyion = {
  id: 'apocalyion', name: '終焉竜アポカリオン',
  stats: { hp: 480000000, atk: 2050000, def: 1350000, matk: 2200000, mdef: 1450000, spd: 2450 },
  elements: { fire: 170, dark: 170, light: -180, water: 110, grass: 110, ice: 110, thunder: 110, wind: 110, earth: 110 },
  ailments: { poison: 95, burn: 95, paralysis: 90, sleep: 95, confusion: 90, curse: 95, blind: 90, silence: 90 },
  rewards: { exp: 42000, jp: 10000, gold: 30000 }, drops: [],
  openingAction(attacker, battle) {
    livingParty(battle).forEach(target => {
      target.atb = 0;
      applyDefenseCollapse(target, 35, 5);
    });
    attackPartyRepeated(attacker, battle, {
      name: '開幕・終焉三重奏', multiplier: 3.8, isHybrid: true,
      elements: { fire: 50, dark: 50 }, ailments: { burn: 80, curse: 70 },
    }, 3);
  },
  onTurnStart(monster, battle) {
    const missingHp = 1 - monster.currentHp / monster.maxHp;
    monster._atkBuffTurns = 2;
    monster._matkBuffTurns = 2;
    monster._atkBuffPercent = Math.floor(missingHp * 180);
    monster._matkBuffPercent = Math.floor(missingHp * 180);
    if (missingHp >= 0.5 && !monster._apocalypseAwakened) {
      monster._apocalypseAwakened = true;
      monster.stats.spd = Math.floor(monster.stats.spd * 1.45);
      monster.atb = 1000;
      battle.showActionName?.(monster.elementId, '黙示録形態', 'text-rose-100', 'border-rose-300/80');
    }
  },
  actions: [
    {
      name: 'アポカリプス・ノヴァ', chance: 48,
      description: 'HP減少量に応じて威力が増す全体終焉ブレス。火傷と呪いを付与する。',
      execute(attacker, defender, battle) {
        attackParty(attacker, battle, {
          name: 'アポカリプス・ノヴァ', multiplier: 15, isHybrid: true,
          elements: { fire: 50, dark: 50 }, ailments: { burn: 90, curse: 80 },
        });
      },
    },
    {
      name: '時代捕食', chance: 32,
      description: 'ランダムな対象を5連撃し、全員のATBを奪って自身を回復する。',
      execute(attacker, defender, battle) {
        battle.showActionName?.(attacker.elementId, '時代捕食', 'text-fuchsia-200', 'border-fuchsia-400/70');
        withAttackProfile(attacker, { dark: 100 }, { paralysis: 70 }, () => {
          for (let hit = 0; hit < 5; hit += 1) {
            const targets = livingParty(battle);
            if (!targets.length) break;
            const target = targets[Math.floor(Math.random() * targets.length)];
            battle.executeAttack(attacker, target, false, {
              actionName: '時代捕食', damageMultiplier: 6.5, isMagic: false,
              defenseIgnorePercent: 55, damageType: 'skill', hideActionName: true,
              skipAtbReset: hit < 4,
            });
          }
        });
        livingParty(battle).forEach(target => { target.atb = Math.max(0, (target.atb || 0) - 600); });
        healMonster(attacker, battle, 0.1);
      },
    },
  ],
};

const eschaton = {
  id: 'eschaton', name: '万象終焉エスカトン',
  stats: { hp: 750000000, atk: 2650000, def: 1800000, matk: 2850000, mdef: 1950000, spd: 2850 },
  elements: { fire: 130, water: 130, grass: 130, ice: 130, thunder: 130, wind: 130, earth: 130, light: 160, dark: 160 },
  ailments: { poison: 100, burn: 100, paralysis: 95, sleep: 100, confusion: 95, curse: 100, blind: 95, silence: 95 },
  rewards: { exp: 100000, jp: 25000, gold: 100000 }, drops: [],
  openingAction(attacker, battle) {
    livingParty(battle).forEach(target => {
      clearPositiveEffects(target);
      applyDefenseCollapse(target, 40, 6);
      target.atb = 0;
      if (target.mp) target.mp.current = Math.floor(target.mp.current * 0.5);
    });
    attackParty(attacker, battle, {
      name: '開幕・天地終滅', multiplier: 8, isHybrid: true,
      elements: { light: 50, dark: 50 }, ailments: { curse: 85, paralysis: 70 },
      defenseIgnorePercent: 65,
      nameClass: 'text-amber-50', borderClass: 'border-amber-200/90',
    });
  },
  onTurnStart(monster, battle) {
    const hpRatio = monster.currentHp / monster.maxHp;
    const nextPhase = hpRatio <= 0.25 ? 3 : hpRatio <= 0.5 ? 2 : hpRatio <= 0.75 ? 1 : 0;
    const currentPhase = monster._eschatonPhase || 0;
    if (nextPhase <= currentPhase) return;
    for (let phase = currentPhase + 1; phase <= nextPhase; phase += 1) {
      monster.stats.atk = Math.floor(monster.stats.atk * 1.25);
      monster.stats.matk = Math.floor(monster.stats.matk * 1.25);
      monster.stats.spd = Math.floor(monster.stats.spd * 1.18);
    }
    monster._eschatonPhase = nextPhase;
    monster._barrierHp = Math.floor(monster.maxHp * (0.04 + nextPhase * 0.02));
    monster._barrierTurns = 99;
    monster.atb = 1000;
    battle.showActionName?.(monster.elementId, `終末位相 ${nextPhase}`, 'text-amber-100', 'border-amber-300/90');
    battle.showDamage?.(monster.elementId, 'LIMIT BREAK', 'text-fuchsia-200');
  },
  onBeforeDefeat(monster, battle) {
    if (monster._eschatonReborn) return false;
    monster._eschatonReborn = true;
    monster.isDead = false;
    monster.currentHp = Math.floor(monster.maxHp * 0.45);
    monster.stats.atk = Math.floor(monster.stats.atk * 1.5);
    monster.stats.matk = Math.floor(monster.stats.matk * 1.5);
    monster.stats.spd = Math.floor(monster.stats.spd * 1.25);
    monster._barrierHp = Math.floor(monster.maxHp * 0.1);
    monster._barrierTurns = 99;
    monster.atb = 1000;
    battle.showActionName?.(monster.elementId, '終焉拒絶・第二宇宙', 'text-white', 'border-fuchsia-200/90');
    battle.showDamage?.(monster.elementId, `HP ${monster.currentHp}`, 'text-emerald-200');
    battle.renderEntities?.();
    return true;
  },
  actions: [
    {
      name: '万象終滅', chance: 42,
      description: '全体へ防御貫通の光闇複合超威力攻撃。強化を解除しATBを消去する。',
      execute(attacker, defender, battle) {
        livingParty(battle).forEach(target => {
          clearPositiveEffects(target);
          target.atb = 0;
        });
        attackParty(attacker, battle, {
          name: '万象終滅', multiplier: 18, isHybrid: true,
          elements: { light: 50, dark: 50 }, ailments: { curse: 90, paralysis: 80 },
          defenseIgnorePercent: 75, nameClass: 'text-white', borderClass: 'border-fuchsia-200/90',
        });
      },
    },
    {
      name: '世界再起動', chance: 28,
      description: '全体の強化・MP・ATBを奪って攻撃し、自身のHPを回復する。',
      execute(attacker, defender, battle) {
        livingParty(battle).forEach(target => {
          clearPositiveEffects(target);
          target.atb = 0;
          if (target.mp) target.mp.current = Math.floor(target.mp.current * 0.2);
          applyDefenseCollapse(target, 55, 5);
        });
        attackParty(attacker, battle, {
          name: '世界再起動', multiplier: 13, isMagic: true,
          elements: { light: 50, dark: 50 }, ailments: { silence: 90, confusion: 80 },
        });
        healMonster(attacker, battle, 0.08);
      },
    },
    {
      name: '黒陽圧壊', chance: 18,
      description: '最もHPの高い対象へ、防御をほぼ無視する単体必殺攻撃を放つ。',
      execute(attacker, defender, battle) {
        const targets = livingParty(battle);
        if (!targets.length) return;
        const target = targets.reduce((best, member) => member.hp.current > best.hp.current ? member : best);
        withAttackProfile(attacker, { dark: 100 }, { curse: 95 }, () => {
          battle.executeAttack(attacker, target, false, {
            actionName: '黒陽圧壊', damageMultiplier: 30, isMagic: true,
            defenseIgnorePercent: 95, damageType: 'skill',
          });
        });
      },
    },
  ],
};

export const FINAL_MONSTERS = [voidHarbinger, paradoxArbiter, apocalyion, eschaton];

export const FINAL_DUNGEON = {
  id: FINAL_DUNGEON_ID,
  name: '終界・ラストホライズン',
  description: '全てのノーマルダンジョンを制した者だけが挑める、世界の終端。',
  bgImage: 'assets/dungeon/bg_subspace.webp',
  theme: { color: '244, 114, 182', icon: 'all_inclusive' },
  isUnlocked: false,
  unlockCondition: { allNormalDungeons: true },
  endingRoll: true,
  floors: [
    { level: 1, monsters: [{ void_harbinger: 1, weight: 100 }] },
    { level: 2, monsters: [{ paradox_arbiter: 1, weight: 100 }] },
    { level: 3, monsters: [{ apocalyion: 1, weight: 100 }] },
    { level: 4, monsters: [{ eschaton: 1, weight: 100 }] },
  ],
};
