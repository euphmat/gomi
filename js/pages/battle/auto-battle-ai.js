/**
 * 自動戦闘の共通判断処理。
 *
 * 各スキル自身の autoBattle.check を基礎点として使いつつ、職業固有の
 * 役割やコンボをここで補正する。通常攻撃の確殺判定もここに集め、
 * 蘇生・大回復・成立済みコンボより先に割り込まないようにする。
 */

const ROLE = Object.freeze({
  OFFENSE: 'offense',
  AREA_OFFENSE: 'area_offense',
  RECOVERY: 'recovery',
  REVIVAL: 'revival',
  CLEANSE: 'cleanse',
  MAINTENANCE: 'maintenance',
  RESOURCE: 'resource',
  COMBO_SETUP: 'combo_setup',
  COMBO_FINISHER: 'combo_finisher'
});

const skill = (role, targeting = 'single') => Object.freeze({ role, targeting });

/**
 * 全職業のアクティブスキルを、AI上の役割と攻撃範囲で明示する。
 * 新しい職業・スキルを追加した時に、単発のスコアだけへ依存しないための表。
 */
export const AUTO_BATTLE_JOB_TACTICS = Object.freeze({
  norvice: Object.freeze({
    first_aid: skill(ROLE.RECOVERY, 'self'), heavy_strike: skill(ROLE.OFFENSE),
    focus: skill(ROLE.RESOURCE, 'self'), intimidate: skill(ROLE.MAINTENANCE),
    cleave: skill(ROLE.AREA_OFFENSE, 'area')
  }),
  knight: Object.freeze({
    provoke: skill(ROLE.MAINTENANCE, 'self'), defense_formation: skill(ROLE.MAINTENANCE, 'party'),
    shield_attack: skill(ROLE.OFFENSE)
  }),
  mage: Object.freeze({
    fireball: skill(ROLE.OFFENSE), ice_lance: skill(ROLE.OFFENSE), thunder: skill(ROLE.OFFENSE),
    magic_barrier: skill(ROLE.MAINTENANCE, 'party'), blizzard: skill(ROLE.AREA_OFFENSE, 'area'),
    volcano: skill(ROLE.AREA_OFFENSE, 'area'), thunderstorm: skill(ROLE.AREA_OFFENSE, 'area')
  }),
  priest: Object.freeze({
    heal: skill(ROLE.RECOVERY, 'ally'), raise: skill(ROLE.REVIVAL, 'ally'),
    restore: skill(ROLE.CLEANSE, 'ally'), holy: skill(ROLE.OFFENSE),
    all_heal: skill(ROLE.RECOVERY, 'party')
  }),
  ranger: Object.freeze({
    double_arrow: skill(ROLE.OFFENSE), arrow_rain: skill(ROLE.AREA_OFFENSE, 'area'),
    rain_of_arrows: skill(ROLE.AREA_OFFENSE, 'random')
  }),
  magic_knight: Object.freeze({
    flame_tongue: skill(ROLE.OFFENSE), ice_brand: skill(ROLE.AREA_OFFENSE, 'random'),
    thunder_slash: skill(ROLE.AREA_OFFENSE, 'area')
  }),
  slime_master: Object.freeze({
    slime_throw: skill(ROLE.AREA_OFFENSE, 'random'), slime_hazard: skill(ROLE.AREA_OFFENSE, 'random')
  }),
  dancer: Object.freeze({
    poison_salsa: skill(ROLE.AREA_OFFENSE, 'area'), juggling_dagger: skill(ROLE.AREA_OFFENSE, 'random'),
    confusion_tarantella: skill(ROLE.COMBO_SETUP, 'area'), curse_step: skill(ROLE.COMBO_SETUP, 'area')
  }),
  bird: Object.freeze({
    lullaby: skill(ROLE.COMBO_SETUP, 'area'), nightmare: skill(ROLE.COMBO_FINISHER),
    warding_song: skill(ROLE.MAINTENANCE, 'party')
  }),
  black_knight: Object.freeze({
    blood_saber: skill(ROLE.OFFENSE), shadow_lance: skill(ROLE.AREA_OFFENSE, 'random'),
    curse_blade: skill(ROLE.COMBO_SETUP, 'area'), hell_gate: skill(ROLE.AREA_OFFENSE, 'area')
  }),
  paladin: Object.freeze({
    holy_smite: skill(ROLE.OFFENSE), divine_shield: skill(ROLE.MAINTENANCE, 'party'),
    sanctuary: skill(ROLE.RECOVERY, 'party')
  }),
  poseidon: Object.freeze({
    trident_tempest: skill(ROLE.OFFENSE), tidal_wave: skill(ROLE.AREA_OFFENSE, 'area'),
    leviathan_judgment: skill(ROLE.AREA_OFFENSE, 'area'),
    abyssal_dominion: skill(ROLE.MAINTENANCE, 'party'),
    oceanic_benediction: skill(ROLE.RECOVERY, 'party')
  }),
  pyromancer: Object.freeze({
    flare_lance: skill(ROLE.COMBO_SETUP), ember_barrage: skill(ROLE.AREA_OFFENSE, 'random'),
    inferno: skill(ROLE.COMBO_SETUP, 'area'), meteor_catastrophe: skill(ROLE.COMBO_FINISHER, 'area')
  }),
  assassin: Object.freeze({
    razor_rush: skill(ROLE.OFFENSE), phantom_barrage: skill(ROLE.AREA_OFFENSE, 'random'),
    assassinate: skill(ROLE.OFFENSE), nightmare_requiem: skill(ROLE.OFFENSE),
    flash_thousand_blades: skill(ROLE.AREA_OFFENSE, 'spill')
  }),
  mana_conductor: Object.freeze({
    mana_relay: skill(ROLE.COMBO_SETUP, 'ally'), ether_overture: skill(ROLE.MAINTENANCE, 'party'),
    arcane_crescendo: skill(ROLE.COMBO_FINISHER), resonance_storm: skill(ROLE.COMBO_FINISHER, 'area'),
    grand_symphony: skill(ROLE.RESOURCE, 'area')
  }),
  entertainer: Object.freeze({
    spotlight_step: skill(ROLE.COMBO_SETUP), captivating_revue: skill(ROLE.COMBO_SETUP, 'area'),
    inspiring_revue: skill(ROLE.COMBO_SETUP, 'party'), encore: skill(ROLE.RECOVERY, 'party'),
    grand_finale: skill(ROLE.COMBO_FINISHER, 'area')
  }),
  guardian: Object.freeze({
    guardian_oath: skill(ROLE.MAINTENANCE, 'self'),
    impregnable_wall: skill(ROLE.MAINTENANCE, 'party'),
    aegis_bash: skill(ROLE.OFFENSE)
  }),
  cryomancer: Object.freeze({
    frost_spear: skill(ROLE.COMBO_SETUP), hail_barrage: skill(ROLE.AREA_OFFENSE, 'random'),
    whiteout: skill(ROLE.COMBO_SETUP, 'area'), absolute_zero: skill(ROLE.COMBO_FINISHER, 'area')
  })
});

const SKILL_TACTICS = Object.freeze(Object.values(AUTO_BATTLE_JOB_TACTICS).reduce((all, job) => {
  Object.entries(job).forEach(([skillId, tactics]) => { all[skillId] = tactics; });
  return all;
}, {}));

function getSkill(findSkill, character, skillId) {
  if (typeof findSkill === 'function') return findSkill(character, skillId);
  return character?._skillCache?.get(skillId) || null;
}

function hasPossibleEvasion(findSkill, defender) {
  const shadowMotion = getSkill(findSkill, defender, 'shadow_motion');
  if (shadowMotion?.level > 0 && shadowMotion.levelConfig?.evadeChance > 0) return true;

  const splendidEvasion = getSkill(findSkill, defender, 'splendid_evasion');
  if (splendidEvasion?.level > 0 && splendidEvasion.levelConfig?.evadeChance > 0) return true;

  const parry = getSkill(findSkill, defender, 'parry');
  return parry?.level > 0 && parry.levelConfig?.chance > 0;
}

function getElementMultiplier(attacker, defender) {
  const attackElements = attacker?.stats?.attackElements || {};
  const elementResist = defender?.stats?.elementResist || {};
  const positiveElements = Object.entries(attackElements).filter(([, value]) => value > 0);
  const totalElementPercent = positiveElements.reduce((sum, [, value]) => sum + value, 0);
  const elementPortionScale = totalElementPercent > 100 ? 100 / totalElementPercent : 1;
  const nonElementalPercent = totalElementPercent > 100 ? 0 : 100 - totalElementPercent;

  return positiveElements.reduce((sum, [element, value]) => {
    const resistanceMultiplier = Math.max(0, 1 - (elementResist[element] || 0) / 100);
    return sum + resistanceMultiplier * (value * elementPortionScale / 100);
  }, nonElementalPercent / 100);
}

export function estimateMinimumNormalAttackDamage(attacker, defender, findSkill) {
  if (!attacker?.stats || !defender?.stats) return 0;
  if (attacker.activeAilment?.type === 'blind') return 0;
  if (hasPossibleEvasion(findSkill, defender)) return 0;

  let attack = attacker.stats.atk || 0;

  const demonPower = getSkill(findSkill, attacker, 'demon_power');
  const attackerMaxHp = attacker.stats.hp || attacker.hp?.max;
  if (demonPower?.level > 0 && demonPower.levelConfig?.atkMatkMultiplier
    && attackerMaxHp > 0 && attacker.hp?.current / attackerMaxHp <= 0.5) {
    attack = Math.floor(attack * demonPower.levelConfig.atkMatkMultiplier);
  }

  const attackBuffPercent = (attacker._passiveAtkBuffPercent || 0)
    + (attacker._atkBuffTurns > 0 ? (attacker._atkBuffPercent || 0) : 0);
  if (attackBuffPercent !== 0) {
    attack = Math.floor(attack * (1 + attackBuffPercent / 100));
  }

  let defense = defender.stats.def || 0;
  const defenseBuffPercent = (defender._passiveDefBuffPercent || 0)
    + (defender._defBuffTurns > 0 ? (defender._defBuffPercent || 0) : 0);
  if (defenseBuffPercent !== 0) {
    defense = Math.floor(defense * (1 + defenseBuffPercent / 100));
  }

  const baseDamage = Math.max(1, attack - Math.floor(defense / 2));
  let damage = Math.floor(baseDamage * 0.9);

  const anatomyMastery = getSkill(findSkill, attacker, 'anatomy_mastery');
  const defenderMaxHp = defender.maxHp || defender.stats.hp;
  if (anatomyMastery?.level > 0 && anatomyMastery.levelConfig?.lowHpDamagePercent
    && defenderMaxHp > 0 && defender.currentHp / defenderMaxHp <= 0.4) {
    damage = Math.floor(damage * (1 + anatomyMastery.levelConfig.lowHpDamagePercent / 100));
  }

  if (defender.activeAilment?.type === 'curse') {
    damage = Math.floor(damage * 2);
  }

  damage = Math.max(1, Math.floor(damage * getElementMultiplier(attacker, defender)));

  // 確率ガードが発動しても倒せる場合だけ「確実」とみなす。
  const guard = getSkill(findSkill, defender, 'guard');
  if (guard?.level > 0 && guard.levelConfig?.chance > 0) {
    damage = Math.max(1, Math.floor(damage * (1 - (guard.levelConfig.reduction || 0) / 100)));
  }

  const slimeBody = getSkill(findSkill, defender, 'slime_body');
  if (slimeBody?.level > 0) {
    damage = Math.max(1, Math.floor(damage * (1 - (slimeBody.levelConfig?.reduction || 15) / 100)));
  }

  return Math.max(0, damage - Math.max(0, defender._barrierHp || 0));
}

export function findNormalAttackFinisher(attacker, enemies, preferredTarget, findSkill) {
  const finishers = (enemies || [])
    .filter(enemy => enemy && !enemy.isDead && enemy.currentHp > 0)
    .map(enemy => ({
      target: enemy,
      damage: estimateMinimumNormalAttackDamage(attacker, enemy, findSkill),
    }))
    .filter(candidate => candidate.damage >= candidate.target.currentHp);

  const preferred = finishers.find(candidate => candidate.target === preferredTarget);
  if (preferred) return preferred;

  // どれも一撃なら、よりHPの多い敵を倒す方が通常攻撃を有効利用できる。
  finishers.sort((a, b) => b.target.currentHp - a.target.currentHp);
  return finishers[0] || null;
}

function isSkillUsableBy(member, skillId, findSkill, isSkillEnabled) {
  if (!member || member.isDead) return false;
  if (['sleep', 'confusion', 'paralysis', 'freeze'].includes(member.activeAilment?.type)) return false;
  const cached = getSkill(findSkill, member, skillId);
  if (!cached?.def || cached.level <= 0 || !cached.levelConfig) return false;
  if (typeof isSkillEnabled === 'function' && !isSkillEnabled(member, skillId)) return false;
  const mpCost = cached.levelConfig.mpCost || 0;
  if ((member.mp?.current || 0) < mpCost) return false;
  return !(member.activeAilment?.type === 'silence' && mpCost > 0);
}

function getUsableSkill(usableSkills, skillId) {
  return usableSkills.find(candidate => candidate.id === skillId) || null;
}

function getMaxResource(character, findSkill, passiveId, configKey) {
  const passive = getSkill(findSkill, character, passiveId);
  return passive?.levelConfig?.[configKey] || 0;
}

function getHpRatio(entity) {
  const max = entity?.stats?.hp || entity?.hp?.max || entity?.maxHp || 1;
  const current = entity?.hp?.current ?? entity?.currentHp ?? 0;
  return current / Math.max(1, max);
}

function makeCandidate(skillEntry, target, score = 0) {
  if (!skillEntry || !target) return null;
  return { type: 'skill', score, target, skill: skillEntry, priority: 0 };
}

function applyJobComboTactics({ character, usableSkills, context, candidates, findSkill }) {
  const byId = new Map(candidates.map(candidate => [candidate.skill.id, candidate]));
  const aliveEnemies = context.enemies.filter(enemy => !enemy.isDead);
  const currentJob = character.jobId || character.job;

  // バード: 睡眠が入った後は、ほかの高得点スキルよりナイトメアを優先する。
  const sleeping = aliveEnemies.filter(enemy => enemy.activeAilment?.type === 'sleep');
  const nightmare = getUsableSkill(usableSkills, 'nightmare');
  if (nightmare && sleeping.length) {
    const target = sleeping.reduce((best, enemy) => enemy.currentHp > best.currentHp ? enemy : best);
    const candidate = byId.get('nightmare') || makeCandidate(nightmare, target);
    if (candidate) {
      candidate.target = target;
      candidate.priority = 500;
      candidate.score += 500;
      if (!byId.has('nightmare')) candidates.push(candidate);
    }
  } else if (currentJob === 'bird' && nightmare) {
    const lullaby = byId.get('lullaby');
    if (lullaby) {
      const combinedCost = (lullaby.skill.levelConfig.mpCost || 0)
        + (nightmare.levelConfig.mpCost || 0);
      lullaby.priority = 180;
      lullaby.score += character.mp.current >= combinedCost ? 140 : 55;
    }
  }

  // パイロマンサー: 火傷を確認したら、解除される前にメテオで起爆する。
  const burningCount = aliveEnemies.filter(enemy => enemy.activeAilment?.type === 'burn').length;
  const meteor = byId.get('meteor_catastrophe');
  if (meteor && burningCount > 0) {
    meteor.priority = 470;
    meteor.score += burningCount * 180;
  } else if (getUsableSkill(usableSkills, 'meteor_catastrophe')) {
    ['inferno', 'flare_lance'].forEach(id => {
      const setup = byId.get(id);
      if (setup) setup.score += 85;
    });
  }

  // クライオマンサー: 凍結を確認したら、解除される前に絶対零度で粉砕する。
  const frozenCount = aliveEnemies.filter(enemy => enemy.activeAilment?.type === 'freeze').length;
  const absoluteZero = byId.get('absolute_zero');
  if (absoluteZero && frozenCount > 0) {
    absoluteZero.priority = 480;
    absoluteZero.score += frozenCount * 190;
  } else if (getUsableSkill(usableSkills, 'absolute_zero')) {
    ['whiteout', 'frost_spear'].forEach(id => {
      const setup = byId.get(id);
      if (setup) setup.score += 90;
    });
  }

  // ブラックナイト: カースブレードを起点にし、呪い中の敵へ単体技を集中する。
  if (currentJob === 'black_knight') {
    const curseBlade = byId.get('curse_blade');
    const needsCurse = aliveEnemies.some(enemy =>
      enemy.activeAilment?.type !== 'curse' || !(enemy.atkDebuffTurns > 0) || !(enemy.defDebuffTurns > 0));
    if (curseBlade && needsCurse) curseBlade.score += 90;
    const cursedTarget = aliveEnemies.find(enemy => enemy.activeAilment?.type === 'curse');
    if (cursedTarget) {
      ['blood_saber', 'shadow_lance', 'hell_gate'].forEach(id => {
        const followUp = byId.get(id);
        if (followUp) followUp.score += 65;
      });
    }
  }

  // エンターテイナー: 舞台熱が最大になるまでフィナーレを温存する。
  if (currentJob === 'entertainer') {
    const maxHype = getMaxResource(character, findSkill, 'showstopper', 'maxHype');
    const hype = character._entertainerHype || 0;
    const finaleSkill = getUsableSkill(usableSkills, 'grand_finale');
    if (maxHype > 0 && hype < maxHype) {
      const finaleIndex = candidates.findIndex(candidate => candidate.skill.id === 'grand_finale');
      if (finaleIndex >= 0) candidates.splice(finaleIndex, 1);
      ['spotlight_step', 'captivating_revue', 'inspiring_revue', 'encore'].forEach(id => {
        const builder = byId.get(id);
        if (builder) builder.score += 75 + hype * 10;
      });
    } else if (finaleSkill && maxHype > 0 && hype >= maxHype && aliveEnemies.length) {
      const existing = byId.get('grand_finale');
      const finale = existing || makeCandidate(finaleSkill, aliveEnemies[0], 0);
      if (finale) {
        finale.target = aliveEnemies[0];
        finale.priority = 450;
        finale.score += 400 + hype * 50;
        if (!existing) candidates.push(finale);
      }
    }
  }

  // マナコンダクター: 共鳴を作れる状況ではリレーを優先し、最大時にまとめて放出する。
  if (currentJob === 'mana_conductor') {
    const maxHarmony = getMaxResource(character, findSkill, 'conductor_core', 'maxHarmony');
    const harmony = character._conductorHarmony || 0;
    const relay = byId.get('mana_relay');
    if (maxHarmony > 0 && harmony < maxHarmony && relay) {
      relay.priority = 220;
      relay.score += (maxHarmony - harmony) * 55;
    } else if (maxHarmony > 0 && harmony >= maxHarmony) {
      // グランド・シンフォニーは共鳴を消すが共鳴自体では強化されない。
      const symphonyIndex = candidates.findIndex(candidate => candidate.skill.id === 'grand_symphony');
      if (symphonyIndex >= 0) candidates.splice(symphonyIndex, 1);
      const finisherId = aliveEnemies.length >= 2 ? 'resonance_storm' : 'arcane_crescendo';
      const finisherSkill = getUsableSkill(usableSkills, finisherId);
      const existing = byId.get(finisherId);
      const finisher = existing || makeCandidate(finisherSkill, aliveEnemies[0], 0);
      if (finisher) {
        finisher.priority = 440;
        finisher.score += 350 + harmony * 60;
        if (!existing) candidates.push(finisher);
      }
    }
  }
}

function isEmergencyCandidate(candidate) {
  const role = SKILL_TACTICS[candidate.skill.id]?.role;
  if (role === ROLE.REVIVAL || role === ROLE.CLEANSE) return true;
  if (role !== ROLE.RECOVERY) return false;

  // 軽いかすり傷より確殺を優先するが、大きく崩れた時は職業本来の役割を優先。
  if (candidate.skill.id === 'oceanic_benediction') return true;
  return candidate.score >= 95 || getHpRatio(candidate.target) <= 0.4;
}

/**
 * スキル固有 check、職業別コンボ、通常攻撃の確殺をまとめて比較する。
 * 戻り値は skill / attack / wait のいずれか。
 */
export function selectAutoBattleAction({
  character,
  usableSkills,
  context,
  findSkill,
  isSkillEnabled,
  onSkillCheckError
}) {
  const aliveEnemies = context.enemies.filter(enemy => !enemy.isDead);
  const sleepingEnemies = aliveEnemies.filter(enemy => enemy.activeAilment?.type === 'sleep');
  const nightmareUser = sleepingEnemies.length
    ? context.party.find(member => isSkillUsableBy(member, 'nightmare', findSkill, isSkillEnabled))
    : null;
  const actorCanUseNightmare = sleepingEnemies.length > 0
    && isSkillUsableBy(character, 'nightmare', findSkill, isSkillEnabled);

  // ナイトメア担当以外は睡眠対象を候補から外す。単体技は起きている敵へ向け、
  // 全体・ランダム技は睡眠を巻き込むため候補から除外する。
  const protectedSleep = Boolean(nightmareUser && !actorCanUseNightmare);
  const safeEnemies = protectedSleep
    ? aliveEnemies.filter(enemy => enemy.activeAilment?.type !== 'sleep')
    : aliveEnemies;
  const evaluationContext = protectedSleep
    ? {
        ...context,
        enemies: safeEnemies,
        selectedEnemyTarget: safeEnemies.includes(context.selectedEnemyTarget) ? context.selectedEnemyTarget : null
      }
    : context;

  const candidates = [];
  for (const usableSkill of usableSkills) {
    const tactics = SKILL_TACTICS[usableSkill.id] || skill(ROLE.OFFENSE);
    if (protectedSleep && ['area', 'random', 'spill'].includes(tactics.targeting)) continue;

    let checkResult = null;
    try {
      checkResult = usableSkill.def.autoBattle.check(character, usableSkill.levelConfig, evaluationContext);
    } catch (error) {
      if (typeof onSkillCheckError === 'function') onSkillCheckError(usableSkill.id, error);
      continue;
    }
    if (!checkResult) continue;

    let score = 0;
    let target = null;
    if (typeof checkResult === 'object' && checkResult.score !== undefined) {
      score = checkResult.score;
      target = checkResult.target;
    } else if (checkResult === true) {
      target = evaluationContext.selectedEnemyTarget || safeEnemies[0] || null;
    }
    const candidate = makeCandidate(usableSkill, target, score);
    if (candidate) candidates.push(candidate);
  }

  applyJobComboTactics({
    character,
    usableSkills,
    context: evaluationContext,
    candidates,
    findSkill
  });

  const urgent = candidates
    .filter(candidate => candidate.priority >= 400 || isEmergencyCandidate(candidate))
    .sort((a, b) => {
      const aPriority = isEmergencyCandidate(a) ? 1000 : a.priority;
      const bPriority = isEmergencyCandidate(b) ? 1000 : b.priority;
      return bPriority - aPriority || b.score - a.score;
    })[0];
  if (urgent) return urgent;

  const normalAttackFinisher = findNormalAttackFinisher(
    character,
    safeEnemies,
    evaluationContext.selectedEnemyTarget,
    findSkill
  );
  if (normalAttackFinisher) {
    return {
      type: 'attack', score: 30, target: normalAttackFinisher.target,
      skill: null, estimatedDamage: normalAttackFinisher.damage
    };
  }

  const bestSkill = candidates.sort((a, b) => b.priority - a.priority || b.score - a.score)[0];
  if (bestSkill && bestSkill.score > 30) return bestSkill;

  const attackTarget = evaluationContext.selectedEnemyTarget || safeEnemies[0] || null;
  if (attackTarget) return { type: 'attack', score: 30, target: attackTarget, skill: null };

  // 全員が眠っていてナイトメア担当が控えている場合は、起こさず行動を譲る。
  return { type: 'wait', score: 0, target: null, skill: null };
}
