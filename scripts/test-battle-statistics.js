import {
  BattleTelemetry,
  captureBattleActionLabel,
  captureBattlePopup,
  renderBattleStatisticsTab,
  resolveBattleSkill
} from '../js/pages/battle/battle-statistics.js';
import { actionMethods } from '../js/pages/battle/battle-actions.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const hero = {
  id: 'hero', name: '勇者', elementId: 'party-0',
  hp: { current: 100, max: 100 },
  _skillCache: new Map([
    ['slash', {
      level: 3,
      levelConfig: { mpCost: 4, multiplier: 1.5 },
      def: {
        id: 'slash', name: '斬撃', type: 'active',
        getDescription: levelConfig => `MPを${levelConfig.mpCost}消費し、敵単体へ${levelConfig.multiplier.toFixed(1)}倍の物理攻撃を行う。`
      }
    }],
    ['guard', {
      level: 2,
      levelConfig: { chance: 20, reduction: 15 },
      def: {
        id: 'guard', name: 'ガード', type: 'passive',
        getDescription: levelConfig => `被攻撃時、${levelConfig.chance}%の確率でダメージを${levelConfig.reduction}%軽減する。`
      }
    }]
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
  assert(heroStat.skills.get('guard').prevented === 20, 'skill prevention was not counted');
  assert(healerStat.healingDone === 40, 'healing done was not attributed to its caster');
  assert(healerStat.skills.get('heal').healing === 40, 'skill healing was not counted');
  assert(telemetry.actorStats.size === 2, 'enemy statistics should not be retained');
}

{
  const telemetry = new BattleTelemetry();
  const medalHero = {
    ...hero,
    equipment: { armor: 'medal-armor' },
    stats: { hp: 100 },
    hp: { current: 100, max: 100 }
  };
  const battle = {
    equipMap: new Map([['medal-armor', {
      id: 'medal-armor', name: '守護のメダル鎧', icon: 'shield',
      specialEffect: { incomingDamageReductionPercent: 20, description: '受けるダメージを20%軽減する。' }
    }]]),
    battleTelemetry: telemetry
  };
  const reduced = actionMethods.applyMedalEquipmentIncomingDamage.call(battle, medalHero, 100);
  const stat = telemetry.getPartyStats([medalHero])[0];
  assert(reduced === 80, 'medal equipment did not reduce incoming damage');
  assert(stat.prevented === 20, 'medal equipment damage prevention was not included in statistics');
  assert(stat.skills.get('medal_equipment:被ダメージ軽減')?.prevented === 20,
    'medal equipment prevention was not attributed to its effect');
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

  captureBattleActionLabel(manager, hero.elementId, 'メダル装備・会心');
  const heroStat = telemetry.getPartyStats([hero, healer]).find(stat => stat.entityId === 'hero');
  assert(heroStat.skills.get('medal_equipment:会心')?.activations === 1,
    'medal equipment activation was not included in statistics');
}

{
  const telemetry = new BattleTelemetry();
  telemetry.recordAction(hero, { id: 'slash', name: '斬撃', type: 'active', icon: 'swords' });
  telemetry.recordDamage(hero, enemy, 12500, { id: 'slash', name: '斬撃', type: 'active', icon: 'swords' });
  telemetry.recordEffect(hero, { id: 'guard', name: 'ガード', type: 'passive', icon: 'shield' });
  telemetry.recordPrevented(hero, hero, 10, { id: 'guard', name: 'ガード', type: 'passive', icon: 'shield' });
  const listeners = {};
  const container = {
    dataset: {}, innerHTML: '',
    querySelector: selector => selector === '[data-battle-stat-overview]'
      ? { addEventListener: (_event, handler) => { listeners.overview = handler; } }
      : null,
    querySelectorAll: () => []
  };
  const manager = {
    party: [
      { ...hero, jobId: 'knight', equipment: { rightHand: 'medal-sword' } },
      { ...healer, jobId: 'priest' },
      { ...hero, id: 'ranger', elementId: 'party-2', name: '狩人', jobId: 'ranger', _skillCache: new Map() },
      { ...hero, id: 'mage', elementId: 'party-3', name: '魔術師', jobId: 'mage', _skillCache: new Map() }
    ],
    enemies: [enemy], battleTelemetry: telemetry,
    equipMap: new Map([['medal-sword', {
      id: 'medal-sword', name: '統計のメダル剣', icon: 'swords',
      specialEffect: { outgoingDamagePercent: 15, description: '与えるダメージ+15%。' }
    }]]),
    currentTab: 'stats', elements: { tabContent: container },
    jobDefinitions: {
      knight: { id: 'knight', name: 'ナイト', image: './assets/job/job_knight.webp', icon: 'shield' },
      priest: { id: 'priest', name: 'プリースト', image: './assets/job/job_priest.webp', icon: 'church' }
    }
  };
  renderBattleStatisticsTab(manager, true);
  assert(container.innerHTML.includes('data-battle-stat-overview')
      && container.innerHTML.indexOf('data-battle-stat-overview') < container.innerHTML.indexOf('data-battle-stat-character='),
    'party overview tab was not rendered before character tabs');
  assert(container.innerHTML.includes('data-party-overview')
      && (container.innerHTML.match(/data-party-comparison=/g) || []).length === 6
      && (container.innerHTML.match(/data-party-comparison-character=/g) || []).length === 24
      && container.innerHTML.includes('キャラクター比較')
      && container.innerHTML.includes('与ダメージ')
      && container.innerHTML.includes('HP回復'),
    'party comparison charts were not rendered');
  assert(container.innerHTML.includes('12.5k')
      && container.innerHTML.includes('100.0%'),
    'party comparison values or contribution percentages were not rendered');

  manager.battleStatisticsCharacterKey = 'party:hero';
  renderBattleStatisticsTab(manager, true);
  assert((container.innerHTML.match(/data-battle-stat-character=/g) || []).length === 4,
    'character tabs were not rendered');
  assert(container.innerHTML.includes('./assets/job/job_knight.webp'),
    'current job image was not rendered in statistics');
  assert(!container.innerHTML.includes("previousElementSibling.classList.remove('hidden')"),
    'job material icon fallback should not overlap the job image');
  assert(!container.innerHTML.includes('最大 / Hit')
      && !container.innerHTML.includes('発動頻度')
      && !container.innerHTML.includes('平均間隔')
      && !container.innerHTML.includes('最終発動')
      && !container.innerHTML.includes('軽減回数'),
    'unnecessary detailed skill statistics were rendered');
  assert(container.innerHTML.includes('data-skill-contributions')
      && container.innerHTML.includes('data-skill-primary-result')
      && container.innerHTML.includes('100.0%')
      && container.innerHTML.includes('与ダメージ'),
    'compact skill contribution summary was not rendered');
  assert(container.innerHTML.includes('data-skill-effect-inline')
      && container.innerHTML.includes('MPを4消費し、敵単体へ1.5倍の物理攻撃を行う。')
      && container.innerHTML.includes('Lv.3'),
    'current skill effect was not rendered inline with its name');
  assert(container.innerHTML.includes('12.5k')
      && !container.innerHTML.includes('万')
      && !container.innerHTML.includes('億'),
    'statistics did not use the shared compact notation');
  assert(container.innerHTML.includes('data-medal-equipment-effects')
      && container.innerHTML.includes('統計のメダル剣')
      && container.innerHTML.includes('与えるダメージ+15%。'),
    'equipped medal equipment effects were not rendered in statistics');
  assert(container.innerHTML.includes('被攻撃時、20%の確率でダメージを15%軽減する。')
      && container.innerHTML.includes('Lv.2'),
    'current passive skill effect description was not rendered');
  assert(container.innerHTML.includes('data-skill-performance-summary')
      && container.innerHTML.includes('スキル実績')
      && container.innerHTML.includes('防いだダメージ')
      && container.innerHTML.includes('HP回復')
      && !container.innerHTML.includes('用途別発動割合'),
    'skill performance totals were not rendered');
  listeners.overview();
  assert(manager.battleStatisticsCharacterKey === 'party:overview'
      && container.innerHTML.includes('data-party-overview'),
    'party overview tab did not switch back from a character tab');
}

console.log('battle statistics tests passed');
