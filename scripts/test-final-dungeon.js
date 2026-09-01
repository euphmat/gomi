import { existsSync, readFileSync, statSync } from 'node:fs';
import { DUNGEONS } from '../js/definitions/dungeons.js';
import { MONSTERS } from '../js/definitions/monsters.js';
import { FINAL_DUNGEON_ID, FINAL_MONSTERS } from '../js/definitions/final-dungeon-content.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const dungeon = DUNGEONS.find(item => item.id === FINAL_DUNGEON_ID);
assert(dungeon, '最終ダンジョンがDUNGEONSへ登録されていません');
assert(dungeon.floors.length === 4, '最終ダンジョンは4Fである必要があります');
assert(dungeon.floors.every((floor, index) => floor.level === index + 1), '階層番号が連番ではありません');
assert(dungeon.unlockCondition?.allNormalDungeons === true, '全ノーマル踏破の解放条件がありません');
assert(dungeon.endingRoll === true, 'エンディングロール設定がありません');

const expectedIds = ['void_harbinger', 'paradox_arbiter', 'apocalyion', 'eschaton'];
const floorIds = dungeon.floors.map(floor => Object.keys(floor.monsters[0]).find(key => key !== 'weight'));
assert(floorIds.join(',') === expectedIds.join(','), '4Fのモンスター配置が不正です');
assert(FINAL_MONSTERS.length === 4, '最終ダンジョンのモンスター数が4体ではありません');

const monsterMap = new Map(MONSTERS.map(monster => [monster.id, monster]));
const currentFinalBoss = monsterMap.get('singularity_origin');
const newFinalBoss = monsterMap.get('eschaton');
assert(currentFinalBoss && newFinalBoss, '比較対象の最終ボスが見つかりません');
assert(newFinalBoss.stats.hp >= currentFinalBoss.stats.hp * 10, '新最終ボスのHPが圧倒的な強さに達していません');
assert(newFinalBoss.stats.atk >= currentFinalBoss.stats.atk * 6, '新最終ボスの攻撃力が圧倒的な強さに達していません');
assert(newFinalBoss.stats.matk >= currentFinalBoss.stats.matk * 6, '新最終ボスの魔攻が圧倒的な強さに達していません');

for (const monster of FINAL_MONSTERS) {
  assert(monsterMap.has(monster.id), `${monster.id}がMONSTERSへ登録されていません`);
  assert(typeof monster.openingAction === 'function', `${monster.id}に開幕行動がありません`);
  assert(typeof monster.onTurnStart === 'function', `${monster.id}に固有ターン能力がありません`);
  assert(monster.actions.length >= 2, `${monster.id}の特殊行動が不足しています`);
  assert(monster.actions.reduce((sum, action) => sum + action.chance, 0) < 100, `${monster.id}の行動率合計が100%以上です`);
  assert(monster.actions.every(action => action.description), `${monster.id}に説明のない行動があります`);

  const runtimeMonster = {
    ...monster,
    stats: {
      ...monster.stats,
      attackElements: {}, attackAilments: {},
      elementResist: { ...(monster.elements || {}) },
      ailmentResist: { ...(monster.ailments || {}) },
    },
    currentHp: monster.stats.hp,
    maxHp: monster.stats.hp,
    atb: 500,
    isDead: false,
    elementId: monster.id,
  };
  const party = Array.from({ length: 4 }, (_, index) => ({
    id: index, isDead: false, atb: 500,
    hp: { current: 1000000000, max: 1000000000 },
    mp: { current: 10000, max: 10000 },
    stats: { hp: 1000000000, mp: 10000, def: 1000000, mdef: 1000000, elementResist: {}, ailmentResist: {} },
  }));
  let attackCount = 0;
  const battle = {
    party,
    executeAttack() { attackCount += 1; },
    showActionName() {}, showDamage() {}, renderEntities() {},
  };
  runtimeMonster.openingAction(runtimeMonster, battle);
  assert(attackCount >= 4, `${monster.id}の開幕行動が全体攻撃になっていません`);

  const imagePath = `assets/monster/${monster.id}.webp`;
  assert(existsSync(imagePath) && statSync(imagePath).size > 10000, `${imagePath}がありません`);
}

assert(typeof newFinalBoss.onBeforeDefeat === 'function', 'エスカトンの復活能力がありません');
const rebornBoss = {
  ...newFinalBoss,
  stats: { ...newFinalBoss.stats },
  maxHp: newFinalBoss.stats.hp,
  currentHp: 0,
  isDead: true,
  atb: 0,
};
const hookBattle = { showActionName() {}, showDamage() {}, renderEntities() {} };
assert(rebornBoss.onBeforeDefeat(rebornBoss, hookBattle) === true, '初回撃破時に復活しません');
assert(rebornBoss.currentHp === Math.floor(rebornBoss.maxHp * 0.45) && !rebornBoss.isDead, '復活時のHPが不正です');
assert(rebornBoss.onBeforeDefeat(rebornBoss, hookBattle) === false, '復活能力が複数回発動します');

const battleIndexSource = readFileSync('js/pages/battle/index.js', 'utf8');
const battleActionSource = readFileSync('js/pages/battle/battle-actions.js', 'utf8');
const battleResultSource = readFileSync('js/pages/battle/battle-results.js', 'utf8');
assert(battleIndexSource.includes('executeOpeningEnemyActions'), '開幕行動フックが戦闘開始処理へ接続されていません');
assert(battleActionSource.includes('enemy.onTurnStart'), 'ターン開始フックが敵行動へ接続されていません');
assert(battleResultSource.includes('enemy.onBeforeDefeat'), '撃破前フックが報酬処理へ接続されていません');
assert(battleResultSource.includes('showEndingRoll') && battleResultSource.includes('ending_roll_seen'), 'エンディング処理がありません');

console.log(JSON.stringify({
  dungeon: dungeon.name,
  floors: dungeon.floors.length,
  monsters: FINAL_MONSTERS.length,
  finalBossHpRatio: Number((newFinalBoss.stats.hp / currentFinalBoss.stats.hp).toFixed(2)),
  openingActions: FINAL_MONSTERS.length,
  endingRoll: true,
}));
