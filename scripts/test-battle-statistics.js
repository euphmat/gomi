import {
  BattleTelemetry,
  captureBattleActionLabel,
  captureBattlePopup,
  renderBattleStatisticsTab,
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
  telemetry.recordAction(hero, { id: 'slash', name: '斬撃', type: 'active' });
  telemetry.recordDamage(hero, enemy, 25, { id: 'slash', name: '斬撃', type: 'active' });
  telemetry.recordDamage(enemy, hero, 20, { id: 'attack', name: '攻撃' });
  telemetry.recordRecovery(healer, hero, 15, { id: 'heal', name: 'ヒール', type: 'active' });
  telemetry.recordRecovery(healer, hero, 25, { id: 'heal', name: 'ヒール', type: 'active' });
  telemetry.recordPrevented(hero, hero, 12, { id: 'guard', name: 'ガード', type: 'passive' });
  telemetry.recordPrevented(hero, hero, 8, { id: 'guard', name: 'ガード', type: 'passive' });

  const heroStat = telemetry.getPartyStats([hero, healer]).find(stat => stat.entityId === 'hero');
  const healerStat = telemetry.getPartyStats([hero, healer]).find(stat => stat.entityId === 'healer');
  assert(heroStat.damageDealt === 100, 'dealt damage was not aggregated');
  assert(heroStat.damageTaken === 20, 'taken damage was not aggregated');
  assert(heroStat.healingReceived === 40, 'received healing was not aggregated');
  assert(heroStat.prevented === 20, 'prevented damage was not aggregated');
  assert(heroStat.maxDamageDealt === 75 && heroStat.damageDealtEvents === 2,
    'character maximum damage or hit count is invalid');
  assert(heroStat.skills.get('slash').activations === 2, 'skill activation was not counted');
  assert(heroStat.skills.get('slash').damage === 100, 'skill damage was not counted');
  assert(heroStat.skills.get('slash').maxDamage === 75, 'skill maximum damage was not counted');
  assert(heroStat.skills.get('slash').minDamage === 25, 'skill minimum damage was not counted');
  assert(heroStat.skills.get('slash').damageEvents === 2, 'skill hit count was not counted');
  assert(heroStat.skills.get('guard').maxPrevented === 12, 'maximum prevention was not counted');
  assert(heroStat.skills.get('guard').minPrevented === 8, 'minimum prevention was not counted');
  assert(healerStat.healingDone === 40, 'healing done was not attributed to its caster');
  assert(healerStat.skills.get('heal').healing === 40, 'skill healing was not counted');
  assert(healerStat.skills.get('heal').maxHealing === 25, 'skill maximum healing was not counted');
  assert(healerStat.skills.get('heal').minHealing === 15, 'skill minimum healing was not counted');
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

{
  const telemetry = new BattleTelemetry();
  telemetry.recordAction(hero, { id: 'slash', name: '斬撃', type: 'active', icon: 'swords' });
  telemetry.recordDamage(hero, enemy, 80, { id: 'slash', name: '斬撃', type: 'active', icon: 'swords' });
  const container = {
    dataset: {}, innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => []
  };
  const manager = {
    party: [{ ...hero, jobId: 'knight' }, { ...healer, jobId: 'priest' }],
    enemies: [enemy], battleTelemetry: telemetry,
    currentTab: 'stats', elements: { tabContent: container },
    jobDefinitions: {
      knight: { id: 'knight', name: 'ナイト', image: './assets/job/job_knight.webp', icon: 'shield' },
      priest: { id: 'priest', name: 'プリースト', image: './assets/job/job_priest.webp', icon: 'church' }
    }
  };
  renderBattleStatisticsTab(manager, true);
  assert((container.innerHTML.match(/data-battle-stat-character=/g) || []).length === 2,
    'character tabs were not rendered');
  assert(container.innerHTML.includes('./assets/job/job_knight.webp'),
    'current job icon was not rendered in statistics');
  assert(container.innerHTML.includes('最大 / Hit') && container.innerHTML.includes('平均 / Hit'),
    'detailed damage statistics were not rendered');
  assert(container.innerHTML.includes('発動頻度') && container.innerHTML.includes('平均間隔'),
    'activation frequency statistics were not rendered');
}

console.log('battle statistics tests passed');
