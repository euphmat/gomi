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
  priest: ({ battle }) => {
    // The priest alone turns a gauge release into resurrection.  Existing
    // Raise remains the reliable single-target option; this is the miracle
    // earned by filling Faith and committing it to All Heal.
    for (const ally of battle?.party || []) {
      if (ally.isDead && ally.hp) {
        ally.isDead = false;
        ally.hp.current = Math.max(1, Math.floor(maxHpOf(ally) * .25));
        battle?.showDamage?.(ally.elementId, 'REVIVE 25%', 'text-yellow-200');
      }
    }
    protectFromAilments(battle, 3);
  },
  ranger: ({ battle }) => {
    inflict(battle, 'paralysis', 2);
    for (const enemy of livingEnemies(battle)) enemy.atb = Math.max(0, (Number(enemy.atb) || 0) - 500);
  },
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
  bird: ({ battle, ratio }) => {
    for (const ally of livingParty(battle)) {
      restoreMp(ally, maxMpOf(ally) * 12 * ratio / 100, battle);
      ally._regenHp = Math.max(Number(ally._regenHp) || 0, Math.floor(maxHpOf(ally) * .05 * ratio));
      ally._regenTurns = Math.max(Number(ally._regenTurns) || 0, 3);
    }
  },
  black_knight: ({ caster, battle, ratio }) => {
    restoreHp(caster, maxHpOf(caster) * .4 * ratio, battle);
    caster._atkBuffPercent = Math.max(Number(caster._atkBuffPercent) || 0, Math.round(30 * ratio));
    caster._atkBuffTurns = Math.max(Number(caster._atkBuffTurns) || 0, 3);
  },
  paladin: ({ caster, battle }) => {
    buffParty(battle, { _defBuffPercent: 30, _mdefBuffPercent: 30 }, 4);
    addPartyBarrier(battle, maxHpOf(caster) * .2, 4);
  },
  poseidon: ({ battle, ratio }) => {
    // A released high tide literally pushes every enemy back in the ATB race.
    for (const enemy of livingEnemies(battle)) enemy.atb = 0;
    recoverParty(battle, { mpPercent: 18 * ratio });
  },
  pyromancer: ({ caster, battle, ratio }) => {
    inflict(battle, 'burn', Math.max(3, Math.round(10 * ratio)));
    caster._matkBuffPercent = Math.max(Number(caster._matkBuffPercent) || 0, Math.round(40 * ratio));
    caster._matkBuffTurns = Math.max(Number(caster._matkBuffTurns) || 0, 3);
  },
  assassin: ({ caster, ratio }) => {
    caster.activeAilment = null;
    caster._assassinPerfectEvasionCharges = Math.max(Number(caster._assassinPerfectEvasionCharges) || 0, 1);
    caster._atkBuffPercent = Math.max(Number(caster._atkBuffPercent) || 0, Math.round(35 * ratio));
    caster._atkBuffTurns = Math.max(Number(caster._atkBuffTurns) || 0, 2);
  },
  guardian: ({ caster, battle }) => {
    caster._guardianCoverTurns = Math.max(Number(caster._guardianCoverTurns) || 0, 2);
    caster._guardianCoverReduction = Math.max(Number(caster._guardianCoverReduction) || 0, 60);
    addPartyBarrier(battle, maxHpOf(caster) * .2, 3);
  },
  cryomancer: ({ battle, ratio }) => {
    inflict(battle, 'freeze', Math.max(1, Math.round(3 * ratio)));
    for (const enemy of livingEnemies(battle)) enemy.atb = 0;
  },
  magic_archer: ({ caster, battle, spent, max, ratio }) => {
    caster._magicArcherArrows = Math.min(max, Math.max(1, Math.ceil(spent / 3)));
    restoreMp(caster, maxMpOf(caster) * 12 * ratio / 100, battle);
  },
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
  mana_conductor: ({ battle, spent }) => {
    for (const ally of livingParty(battle)) {
      restoreHp(ally, maxHpOf(ally) * spent * .04, battle);
      ally._manaFlowAmount = Math.max(Number(ally._manaFlowAmount) || 0, spent * 4);
      ally._manaFlowTurns = Math.max(Number(ally._manaFlowTurns) || 0, 3);
    }
  },
  slime_singer: ({ caster, battle, spent }) => {
    addPartyBarrier(battle, maxHpOf(caster) * spent * .08, 3);
    for (const ally of livingParty(battle)) {
      ally._regenHp = Math.max(Number(ally._regenHp) || 0, Math.floor(maxHpOf(ally) * spent * .02));
      ally._regenTurns = Math.max(Number(ally._regenTurns) || 0, 3);
    }
  },
  dragoon: ({ caster, spent, max }) => {
    // Applied after the normal action reset by battle-actions.js.  No other
    // job can turn its finisher into an immediate landing-to-next-turn loop.
    caster._dragoonLandingAtb = Math.min(800, Math.round(800 * spent / Math.max(1, max)));
  },
  shinra_sage: ({ caster, battle, spent }) => {
    // Each realm contributes a different boon: grass heals, wind advances
    // turns, and earth protects.  A completed trinity applies all three.
    for (const ally of livingParty(battle)) {
      restoreHp(ally, maxHpOf(ally) * spent * .04, battle);
      ally.atb = Math.min(1000, (Number(ally.atb) || 0) + spent * 100);
    }
    addPartyBarrier(battle, (caster.stats?.matk || 1) * spent * .18, 3);
  },
  soul_reaper: ({ battle, spent }) => {
    // Corpses become one-use substitutes for the souls of living allies.
    // The lethal-hit hook consumes the ward instead of an ally's life.
    for (const ally of livingParty(battle)) {
      ally._soulReaperDeathWard = Math.max(Number(ally._soulReaperDeathWard) || 0, Math.min(3, spent));
    }
  }
};

const definitions = {
  norvice: ['起死回生', ['heavy_strike', 'cleave'], 'self_recovery_cleanse'],
  knight: ['不落の布陣', ['shield_attack'], 'defense_scaled_party_wall'],
  mage: ['三元素暴走', ['fireball', 'ice_lance', 'thunder', 'blizzard', 'volcano', 'thunderstorm'], 'last_element_overflow'],
  priest: ['聖域顕現', ['all_heal'], 'mass_resurrection_sanctuary'],
  ranger: ['拘束矢雨', ['rain_of_arrows'], 'paralysis_atb_snipe'],
  magic_knight: ['魔装覚醒', ['flame_tongue', 'ice_brand', 'thunder_slash'], 'dual_stat_spell_armor'],
  slime_master: ['分裂増殖', ['slime_hazard'], 'mass_split_heal'],
  dancer: ['アンコールステップ', ['*'], 'ally_atb_choreography'],
  bird: ['癒やしの残響', ['nightmare'], 'melody_regeneration'],
  black_knight: ['血装再生', ['blood_saber', 'hell_gate'], 'blood_self_reconstruction'],
  paladin: ['絶対聖域', ['holy_smite'], 'holy_dual_defense'],
  poseidon: ['大海嘯', ['tidal_wave', 'leviathan_judgment'], 'enemy_tide_reset'],
  pyromancer: ['劫火炉心', ['meteor_catastrophe'], 'burning_overheat'],
  assassin: ['影纏い', ['assassinate'], 'perfect_evasion_charge'],
  guardian: ['不落城塞', ['aegis_bash'], 'forced_party_interception'],
  cryomancer: ['永久凍土', ['absolute_zero'], 'absolute_atb_freeze'],
  magic_archer: ['魔矢輪廻', ['mana_barrage', 'astral_arrow_rain'], 'magic_arrow_regeneration'],
  gunner: ['薬莢再錬成', ['bullet_storm'], 'shell_recycling'],
  plague_doctor: ['変異感染', ['pandemic', 'black_death'], 'ailment_mutation_extension'],
  entertainer: ['喝采の余韻', ['grand_finale'], 'audience_applause_acceleration'],
  mana_conductor: ['生命交響', ['resonance_recharge', 'arcane_crescendo', 'resonance_storm', 'grand_symphony'], 'harmony_mana_flow'],
  slime_singer: ['ぷるぷる加護', ['king_slime_chorus'], 'elastic_regenerating_barrier'],
  dragoon: ['天翔返し', ['skyfall_dive'], 'landing_atb_refund'],
  shinra_sage: ['三界の祝福', ['shinra_mandala'], 'three_distinct_realm_boons'],
  soul_reaper: ['魂の身代わり', ['corpse_vanguard', 'ossuary_aegis', 'march_of_dead', 'last_requiem'], 'party_death_ward']
};

export const JOB_UNIQUE_RELEASE_EFFECTS = Object.freeze(Object.fromEntries(
  Object.entries(definitions).map(([jobId, [name, skillIds, mechanicId]]) => [jobId, Object.freeze({
    name,
    skillIds: Object.freeze(skillIds),
    mechanicId,
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

/** Consume the Assassin-only deterministic evasion granted by Shadow Veil. */
export function consumeAssassinPerfectEvasion(entity) {
  const charges = Math.max(0, Math.floor(Number(entity?._assassinPerfectEvasionCharges) || 0));
  if (charges <= 0) return false;
  entity._assassinPerfectEvasionCharges = charges - 1;
  return true;
}

/** Consume and return the Dragoon-only landing ATB refund. */
export function consumeDragoonLandingAtb(entity) {
  const refund = Math.max(0, Math.min(800, Math.floor(Number(entity?._dragoonLandingAtb) || 0)));
  if (entity) entity._dragoonLandingAtb = 0;
  return refund;
}

/** Consume one Soul Reaper death ward and return the HP it preserves. */
export function consumeSoulReaperDeathWard(entity) {
  const wards = Math.max(0, Math.floor(Number(entity?._soulReaperDeathWard) || 0));
  if (wards <= 0) return 0;
  entity._soulReaperDeathWard = wards - 1;
  return Math.max(1, Math.floor(maxHpOf(entity) * .15));
}
