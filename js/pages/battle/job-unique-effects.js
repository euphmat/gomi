/**
 * Strong, non-damage release effects for every job identity gauge.
 *
 * Gauge damage multipliers live in job-gauge-system.js and in the authored
 * advanced-job skills.  This module deliberately adds a second, thematic
 * payoff (recovery, control, protection or tempo) when a gauge is spent.
 */

const livingParty = battle => (battle?.party || []).filter(member => !member.isDead);
const livingEnemies = battle => (battle?.enemies || []).filter(enemy => !enemy.isDead);
const maxHpOf = entity => Math.max(1, Number(entity?.stats?.hp || entity?.hp?.max || entity?.maxHp) || 1);
const maxMpOf = entity => Math.max(0, Number(entity?.stats?.mp || entity?.mp?.max) || 0);

const restoreHp = (target, amount, battle) => {
  if (!target?.hp || target.isDead) return 0;
  const restored = Math.min(Math.max(0, Math.floor(amount)), Math.max(0, maxHpOf(target) - target.hp.current));
  if (restored <= 0) return 0;
  target.hp.current += restored;
  battle?.showDamage?.(target.elementId, `+${restored}`, 'text-emerald-300');
  return restored;
};

const restoreMp = (target, amount, battle) => {
  if (!target?.mp || target.isDead) return 0;
  const restored = Math.min(Math.max(0, Math.floor(amount)), Math.max(0, maxMpOf(target) - target.mp.current));
  if (restored <= 0) return 0;
  target.mp.current += restored;
  battle?.showDamage?.(target.elementId, `+${restored} MP`, 'text-cyan-300');
  return restored;
};

const recoverParty = (battle, { hpPercent = 0, mpPercent = 0 } = {}) => {
  for (const ally of livingParty(battle)) {
    if (hpPercent > 0) restoreHp(ally, maxHpOf(ally) * hpPercent / 100, battle);
    if (mpPercent > 0) restoreMp(ally, maxMpOf(ally) * mpPercent / 100, battle);
  }
};

const addPartyBarrier = (battle, amount, turns = 3) => {
  const barrier = Math.max(1, Math.floor(amount));
  for (const ally of livingParty(battle)) {
    ally._barrierHp = Math.max(Number(ally._barrierHp) || 0, barrier);
    ally._barrierTurns = Math.max(Number(ally._barrierTurns) || 0, turns);
    battle?.showDamage?.(ally.elementId, `BARRIER +${barrier}`, 'text-cyan-200');
  }
};

const buffParty = (battle, fields, turns = 3) => {
  for (const ally of livingParty(battle)) {
    for (const [field, value] of Object.entries(fields)) {
      ally[field] = Math.max(Number(ally[field]) || 0, value);
    }
    if ('_atkBuffPercent' in fields) ally._atkBuffTurns = Math.max(Number(ally._atkBuffTurns) || 0, turns);
    if ('_matkBuffPercent' in fields) ally._matkBuffTurns = Math.max(Number(ally._matkBuffTurns) || 0, turns);
    if ('_defBuffPercent' in fields) ally._defBuffTurns = Math.max(Number(ally._defBuffTurns) || 0, turns);
    if ('_mdefBuffPercent' in fields) ally._mdefBuffTurns = Math.max(Number(ally._mdefBuffTurns) || 0, turns);
  }
};

const protectFromAilments = (battle, turns = 3) => {
  for (const ally of livingParty(battle)) {
    ally.activeAilment = null;
    ally._ailmentResistBuffAmount = Math.max(Number(ally._ailmentResistBuffAmount) || 0, 100);
    ally._ailmentResistBuffTurns = Math.max(Number(ally._ailmentResistBuffTurns) || 0, turns);
  }
};

const inflict = (battle, type, duration) => {
  let count = 0;
  for (const enemy of livingEnemies(battle)) {
    if (enemy.activeAilment) continue;
    enemy.activeAilment = { type, duration };
    count += 1;
  }
  return count;
};

const effects = {
  norvice: ({ caster, battle }) => {
    caster.activeAilment = null;
    restoreHp(caster, maxHpOf(caster) * .2, battle);
    restoreMp(caster, maxMpOf(caster) * .2, battle);
  },
  knight: ({ caster, battle, spent }) => addPartyBarrier(battle, (caster.stats?.def || 1) * spent * .15),
  mage: ({ caster, battle }) => {
    restoreMp(caster, maxMpOf(caster) * .15, battle);
    const ailment = { fire: 'burn', ice: 'freeze', thunder: 'paralysis' }[caster._jobGaugeLastElement] || 'paralysis';
    inflict(battle, ailment, 2);
  },
  priest: ({ battle }) => protectFromAilments(battle, 3),
  ranger: ({ battle }) => inflict(battle, 'paralysis', 2),
  magic_knight: ({ caster, battle }) => {
    caster._atkBuffPercent = Math.max(Number(caster._atkBuffPercent) || 0, 35);
    caster._matkBuffPercent = Math.max(Number(caster._matkBuffPercent) || 0, 35);
    caster._atkBuffTurns = Math.max(Number(caster._atkBuffTurns) || 0, 4);
    caster._matkBuffTurns = Math.max(Number(caster._matkBuffTurns) || 0, 4);
    addPartyBarrier({ party: [caster], showDamage: battle?.showDamage?.bind(battle) }, maxHpOf(caster) * .25, 4);
  },
  slime_master: ({ caster, battle }) => {
    recoverParty(battle, { hpPercent: 20 });
    addPartyBarrier(battle, maxHpOf(caster) * .15, 3);
  },
  dancer: ({ caster, battle, ratio }) => {
    for (const ally of livingParty(battle)) {
      if (ally !== caster) ally.atb = Math.min(1000, (Number(ally.atb) || 0) + Math.round(500 * ratio));
      if (ally.activeAilment?.type === 'confusion') ally.activeAilment = null;
    }
  },
  bird: ({ battle, ratio }) => recoverParty(battle, { hpPercent: 15 * ratio, mpPercent: 15 * ratio }),
  black_knight: ({ caster, battle, ratio }) => {
    restoreHp(caster, maxHpOf(caster) * .4 * ratio, battle);
    caster._atkBuffPercent = Math.max(Number(caster._atkBuffPercent) || 0, Math.round(30 * ratio));
    caster._atkBuffTurns = Math.max(Number(caster._atkBuffTurns) || 0, 3);
  },
  paladin: ({ caster, battle }) => {
    protectFromAilments(battle, 3);
    addPartyBarrier(battle, maxHpOf(caster) * .2, 3);
  },
  poseidon: ({ battle, ratio }) => recoverParty(battle, { hpPercent: 12 * ratio, mpPercent: 18 * ratio }),
  pyromancer: ({ caster, battle, ratio }) => {
    inflict(battle, 'burn', Math.max(3, Math.round(10 * ratio)));
    caster._matkBuffPercent = Math.max(Number(caster._matkBuffPercent) || 0, Math.round(40 * ratio));
    caster._matkBuffTurns = Math.max(Number(caster._matkBuffTurns) || 0, 3);
  },
  assassin: ({ caster, ratio }) => {
    caster.activeAilment = null;
    caster._atkBuffPercent = Math.max(Number(caster._atkBuffPercent) || 0, Math.round(50 * ratio));
    caster._atkBuffTurns = Math.max(Number(caster._atkBuffTurns) || 0, 3);
  },
  guardian: ({ caster, battle }) => {
    caster._guardianCoverTurns = Math.max(Number(caster._guardianCoverTurns) || 0, 2);
    caster._guardianCoverReduction = Math.max(Number(caster._guardianCoverReduction) || 0, 60);
    addPartyBarrier(battle, maxHpOf(caster) * .2, 3);
  },
  cryomancer: ({ battle, ratio }) => inflict(battle, 'freeze', Math.max(1, Math.round(3 * ratio))),
  magic_archer: ({ battle, ratio }) => recoverParty(battle, { mpPercent: 8 * ratio }),
  gunner: ({ caster, spent, max }) => {
    // Recycle half of the shells committed to Full Burst.  Expanded magazines
    // still benefit, while the gunner must build back to another full burst.
    caster._gunnerAmmo = Math.min(max, Math.floor(spent / 2));
    caster._gunnerReloadBonus = Math.max(Number(caster._gunnerReloadBonus) || 0, .35);
  },
  plague_doctor: ({ battle, skillId, spent }) => {
    if (skillId === 'pandemic') {
      for (const enemy of livingEnemies(battle)) {
        if (enemy.activeAilment) enemy.activeAilment.duration += spent;
      }
    } else {
      inflict(battle, 'poison', Math.max(5, spent));
    }
  },
  entertainer: ({ caster, battle, ratio }) => {
    buffParty(battle, { _atkBuffPercent: 25, _matkBuffPercent: 25 }, 3);
    for (const ally of livingParty(battle)) {
      if (ally !== caster) ally.atb = Math.min(1000, (Number(ally.atb) || 0) + Math.round(600 * ratio));
    }
  },
  mana_conductor: ({ battle, spent }) => recoverParty(battle, { hpPercent: spent * 5, mpPercent: spent * 3 }),
  slime_singer: ({ caster, battle, spent }) => {
    protectFromAilments(battle, 2);
    addPartyBarrier(battle, maxHpOf(caster) * spent * .08, 3);
  },
  dragoon: ({ caster, battle, spent }) => {
    caster._atkBuffPercent = Math.max(Number(caster._atkBuffPercent) || 0, spent * 10);
    caster._atkBuffTurns = Math.max(Number(caster._atkBuffTurns) || 0, 3);
    addPartyBarrier({ party: [caster], showDamage: battle?.showDamage?.bind(battle) }, maxHpOf(caster) * spent * .06, 3);
  },
  shinra_sage: ({ caster, battle, spent }) => {
    protectFromAilments(battle, 3);
    recoverParty(battle, { hpPercent: spent * 7 });
    addPartyBarrier(battle, (caster.stats?.matk || 1) * spent * .15, 3);
  },
  soul_reaper: ({ battle, spent }) => recoverParty(battle, { hpPercent: spent * 4, mpPercent: spent * 2 })
};

const definitions = {
  norvice: ['起死回生', ['heavy_strike', 'cleave']],
  knight: ['不落の布陣', ['shield_attack']],
  mage: ['三元素暴走', ['fireball', 'ice_lance', 'thunder', 'blizzard', 'volcano', 'thunderstorm']],
  priest: ['聖域顕現', ['all_heal']],
  ranger: ['拘束矢雨', ['rain_of_arrows']],
  magic_knight: ['魔装覚醒', ['flame_tongue', 'ice_brand', 'thunder_slash']],
  slime_master: ['分裂増殖', ['slime_hazard']],
  dancer: ['アンコールステップ', ['*']],
  bird: ['癒やしの残響', ['nightmare']],
  black_knight: ['血装再生', ['blood_saber', 'hell_gate']],
  paladin: ['絶対聖域', ['holy_smite']],
  poseidon: ['生命の大潮', ['tidal_wave', 'leviathan_judgment']],
  pyromancer: ['劫火炉心', ['meteor_catastrophe']],
  assassin: ['影纏い', ['assassinate']],
  guardian: ['不落城塞', ['aegis_bash']],
  cryomancer: ['永久凍土', ['absolute_zero']],
  magic_archer: ['マナ還流', ['mana_barrage', 'astral_arrow_rain']],
  gunner: ['薬莢再錬成', ['bullet_storm']],
  plague_doctor: ['変異感染', ['pandemic', 'black_death']],
  entertainer: ['喝采の余韻', ['grand_finale']],
  mana_conductor: ['生命交響', ['resonance_recharge', 'arcane_crescendo', 'resonance_storm', 'grand_symphony']],
  slime_singer: ['ぷるぷる加護', ['king_slime_chorus']],
  dragoon: ['竜血覚醒', ['skyfall_dive']],
  shinra_sage: ['森羅の祝福', ['shinra_mandala']],
  soul_reaper: ['魂命還元', ['corpse_vanguard', 'ossuary_aegis', 'march_of_dead', 'last_requiem']]
};

export const JOB_UNIQUE_RELEASE_EFFECTS = Object.freeze(Object.fromEntries(
  Object.entries(definitions).map(([jobId, [name, skillIds]]) => [jobId, Object.freeze({
    name,
    skillIds: Object.freeze(skillIds),
    apply: effects[jobId]
  })])
));

/** Apply a job's secondary unique payoff when its gauge decreased this action. */
export function applyJobUniqueReleaseEffect(battle, caster, skillId, before, after) {
  const jobId = caster?.jobId || caster?.job || '';
  const definition = JOB_UNIQUE_RELEASE_EFFECTS[jobId];
  if (!definition || !before || !after || before.jobId !== jobId || after.jobId !== jobId) return null;
  if (!definition.skillIds.includes('*') && !definition.skillIds.includes(skillId)) return null;
  const spent = Math.max(0, Number(before.current) - Number(after.current));
  if (spent <= 0) return null;
  const max = Math.max(1, Number(before.max) || spent);
  const ratio = Math.min(1, spent / max);
  definition.apply({ battle, caster, skillId, spent, max, ratio });
  battle?.showActionName?.(caster.elementId, definition.name, 'text-amber-100', 'border-amber-300/80');
  battle?.renderEntities?.();
  return { jobId, name: definition.name, spent, max, ratio };
}
