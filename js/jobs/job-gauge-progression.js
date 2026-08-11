const capacity = (skillId, amount, unit = '枠') => Object.freeze({
  skillId,
  milestones: Object.freeze([
    Object.freeze({ breaks: 10, amount, label: `固有ゲージ上限 +${amount}${unit}` }),
    Object.freeze({ breaks: 25, amount, label: `固有ゲージ上限 +${amount}${unit}` })
  ])
});

/** Fixed-cap resources gain capacity from the limit breaks of their signature skill. */
export const JOB_GAUGE_CAPACITY_PROGRESSION = Object.freeze({
  norvice: capacity('cleave', 1),
  knight: capacity('shield_attack', 1),
  mage: capacity('thunderstorm', 1),
  priest: capacity('all_heal', 20, '点'),
  ranger: capacity('rain_of_arrows', 1),
  magic_knight: capacity('thunder_slash', 1),
  slime_master: capacity('slime_hazard', 20, '点'),
  dancer: capacity('curse_step', 1),
  bird: capacity('nightmare', 1),
  black_knight: capacity('hell_gate', 20, '点'),
  paladin: capacity('holy_smite', 1),
  poseidon: capacity('leviathan_judgment', 1),
  pyromancer: capacity('meteor_catastrophe', 20, '点'),
  assassin: capacity('assassinate', 1),
  guardian: capacity('aegis_bash', 1),
  cryomancer: capacity('absolute_zero', 1),
  magic_archer: capacity('astral_arrow_rain', 1),
  gunner: capacity('bullet_storm', 1),
  plague_doctor: capacity('black_death', 2, '株'),
  soul_reaper: capacity('grave_sovereignty', 1, '体')
});

const normalizedLevel = value => Math.max(0, Math.floor(Number(value) || 0));

export function getJobGaugeCapacityBonus(entity, jobId = entity?.jobId || entity?.job) {
  const progression = JOB_GAUGE_CAPACITY_PROGRESSION[jobId];
  if (!progression) return 0;
  const level = normalizedLevel(entity?.jobSkills?.[jobId]?.[progression.skillId]);
  const breaks = Math.max(0, level - 10);
  return progression.milestones.reduce(
    (total, milestone) => total + (breaks >= milestone.breaks ? milestone.amount : 0),
    0
  );
}

export function installJobGaugeCapacityMilestones(jobs) {
  for (const [jobId, progression] of Object.entries(JOB_GAUGE_CAPACITY_PROGRESSION)) {
    const skill = jobs?.[jobId]?.skills?.find(candidate => candidate.id === progression.skillId);
    if (!skill) continue;
    const existing = Array.isArray(skill.limitBreakMilestones) ? skill.limitBreakMilestones : [];
    const additions = progression.milestones
      .filter(milestone => !existing.some(candidate => candidate.label === milestone.label && candidate.breaks === milestone.breaks))
      .map(milestone => ({
        breaks: milestone.breaks,
        label: milestone.label,
        bonuses: { gaugeCapacityBonus: milestone.amount }
      }));
    skill.limitBreakMilestones = [...existing, ...additions];
  }
}

export function getJobGaugeCapacityProgressionText(jobId) {
  const progression = JOB_GAUGE_CAPACITY_PROGRESSION[jobId];
  if (!progression) {
    const legacyLabels = {
      entertainer: 'ショーストッパー',
      mana_conductor: 'コンダクター・コア',
      slime_singer: '共鳴ジェル',
      dragoon: '竜騎士の魂'
    };
    const skillName = legacyLabels[jobId];
    return skillName ? `${skillName}の限界突破+10／+25で上限+1` : '';
  }
  return progression.milestones.map(milestone => `限界突破+${milestone.breaks}：${milestone.label}`).join('、');
}
