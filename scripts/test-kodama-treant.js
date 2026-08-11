import { MONSTERS } from '../js/definitions/monsters.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const definition = MONSTERS.find(monster => monster.id === 'kodama_treant');
const resonance = definition?.actions?.find(action => action.name === '大地の共鳴');
assert(definition && resonance, '木魂のトレントまたは大地の共鳴が見つかりません');

const makeMember = (id, hp = 1000) => ({
  id, elementId: id, isDead: false,
  hp: { current: hp, max: 1000 },
  stats: { hp: 1000 }
});

const attacker = {
  id: definition.id, elementId: definition.id, isDead: false,
  stats: { ...definition.stats }, currentHp: 30000, maxHp: definition.stats.hp
};
const party = [makeMember('member-a'), makeMember('member-b')];
const popups = [];
const battle = {
  party,
  showActionName() {},
  showDamage(id, value) { popups.push({ id, value }); },
  executeAttack(source, target) {
    target.hp.current = Math.max(0, target.hp.current - 200);
  }
};

resonance.execute(attacker, party[0], battle);
assert(party.every(member => member.hp.current === 800), '大地の共鳴が味方の実HPを参照して攻撃していません');
assert(attacker.currentHp === 30200, `与ダメージ400の半分を回復できていません: ${attacker.currentHp}`);
assert(Number.isFinite(attacker.currentHp), '大地の共鳴でトレントのHPがNaNになりました');

attacker.currentHp -= 500;
assert(attacker.currentHp === 29700, '共鳴後のトレントに通常のHP減少が適用されません');

attacker.currentHp = 74950;
party.forEach(member => { member.hp.current = 1000; });
popups.length = 0;
resonance.execute(attacker, party[0], battle);
assert(attacker.currentHp === 75000, '大地の共鳴が最大HPを超えて回復しました');
assert(popups.some(popup => popup.id === attacker.elementId && popup.value === '+50'),
  '大地の共鳴が実際の回復量を表示していません');

const legacyMember = { elementId: 'legacy', isDead: false, currentHp: 500, maxHp: 500, stats: { hp: 500 } };
battle.party = [legacyMember];
battle.executeAttack = (source, target) => { target.currentHp -= 100; };
attacker.currentHp = 10000;
resonance.execute(attacker, legacyMember, battle);
assert(attacker.currentHp === 10050, '旧形式のcurrentHpを持つ対象との互換性が失われました');

console.log('Kodama Treant tests passed.');
