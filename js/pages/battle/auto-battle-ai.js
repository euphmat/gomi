/**
 * 自動戦闘で通常攻撃を選ぶための、演出や乱数を伴わない見積もり処理。
 *
 * 実ダメージの最低乱数 (90%) を使い、通常攻撃に付随する確率追撃は
 * あえて数えない。見積もりが敵HP以上なら、通常攻撃だけで倒せると
 * 安全側に判断できる。
 */

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
