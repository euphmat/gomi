import {
  BattleTelemetry,
  captureBattleActionLabel,
  captureBattlePopup,
  resolveBattleSkill
} from '../js/pages/battle/battle-statistics.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const hero = {
  id: 'hero', name: '勇者', elementId: 'party-0',
  hp: { current: 100, max: 100 },
  _skillCache: new Map([
    ['slash', { def: { id: 'slash', name: '斬撃', type: 'active' } }],
    ['guard', { def: { id: 'guard', name: 'ガード', type: 'passive' } }]
  ])
};
const healer = {
  id: 'healer', name: '僧侶', elementId: 'party-1',
  hp: { current: 80, max: 100 },
  _skillCache: new Map([
    ['heal', { def: { id: 'heal', name: 'ヒール', type: 'active' } }]
  ])
};
const enemy = {
  id: 'slime', uniqueId: 'enemy-0', name: 'スライム', elementId: 'enemy-0',
  currentHp: 100, maxHp: 100
};

{
  const telemetry = new BattleTelemetry();
  telemetry.recordAction(hero, { id: 'slash', name: '斬撃', type: 'active' });
  telemetry.recordDamage(hero, enemy, 75, { id: 'slash', name: '斬撃', type: 'active' });
  telemetry.recordDamage(enemy, hero, 20, { id: 'attack', name: '攻撃' });
  telemetry.recordRecovery(healer, hero, 15, { id: 'heal', name: 'ヒール', type: 'active' });
  telemetry.recordPrevented(hero, hero, 12, { id: 'guard', name: 'ガード', type: 'passive' });

  const heroStat = telemetry.getPartyStats([hero, healer]).find(stat => stat.entityId === 'hero');
  const healerStat = telemetry.getPartyStats([hero, healer]).find(stat => stat.entityId === 'healer');
  assert(heroStat.damageDealt === 75, 'dealt damage was not aggregated');
  assert(heroStat.damageTaken === 20, 'taken damage was not aggregated');
  assert(heroStat.healingReceived === 15, 'received healing was not aggregated');
  assert(heroStat.prevented === 12, 'prevented damage was not aggregated');
  assert(heroStat.skills.get('slash').activations === 1, 'skill activation was not counted');
  assert(heroStat.skills.get('slash').damage === 75, 'skill damage was not counted');
  assert(healerStat.healingDone === 15, 'healing done was not attributed to its caster');
  assert(healerStat.skills.get('heal').healing === 15, 'skill healing was not counted');
  assert(telemetry.actorStats.size === 2, 'enemy statistics should not be retained');
}

{
  const telemetry = new BattleTelemetry();
  const manager = { party: [hero, healer], enemies: [enemy], battleTelemetry: telemetry };
  const slash = resolveBattleSkill(manager, hero, '斬撃');
  assert(slash.id === 'slash', 'action label did not resolve to the learned skill');

  captureBattleActionLabel(manager, healer.elementId, 'ヒール');
  captureBattlePopup(manager, hero.elementId, '+18');
  const healerStat = telemetry.getPartyStats([hero, healer]).find(stat => stat.entityId === 'healer');
  assert(healerStat.skills.get('heal').activations === 1, 'popup hook did not count skill activation');
  assert(healerStat.skills.get('heal').healing === 18, 'popup hook did not attribute healing');
}

console.log('battle statistics tests passed');
