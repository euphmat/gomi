import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { JOBS } from '../js/jobs/index.js';
import {
  beginJobGaugeNormalAttack,
  beginJobGaugeSkillAction,
  getJobGaugeIncomingMultiplier,
  getJobGaugeOutgoingMultiplier,
  getJobGaugeSkillUseState,
  getStandardJobGaugeValue,
  setStandardJobGaugeValue,
} from '../js/pages/battle/job-gauge-system.js';

const dealer = JOBS.dealer;
assert(dealer, 'ディーラーが職業一覧へ登録されていません');
assert.equal(dealer.tier, 'special');
assert.equal(dealer.changeCost, 777777);
assert.deepEqual(dealer.requirements, [{
  type: 'specialQuest',
  questId: 'blackjack_naturals_1',
  description: 'スペシャルクエスト「ナチュラル21 1回」を達成',
}]);
assert(existsSync(new URL('../assets/job/job_dealer.webp', import.meta.url)), 'ディーラー画像がありません');

const activeSkills = dealer.skills.filter(skill => skill.type !== 'passive');
const passiveSkills = dealer.skills.filter(skill => skill.type === 'passive');
assert.deepEqual(activeSkills.map(skill => skill.id), [
  'marked_deck', 'double_down', 'house_edge', 'royal_payout', 'blackjack_finale',
]);
assert.deepEqual(passiveSkills.map(skill => skill.id), [
  'house_advantage', 'high_roller', 'dealer_insurance',
]);
assert(activeSkills.every(skill => skill.levels.length === 10));
assert(passiveSkills.every(skill => skill.levels.length === 10));

const actor = { jobId: 'dealer' };
assert.equal(getStandardJobGaugeValue(actor), 0);
beginJobGaugeNormalAttack(actor);
assert.equal(getStandardJobGaugeValue(actor), 1);
beginJobGaugeSkillAction(actor, 'marked_deck');
beginJobGaugeSkillAction(actor, 'double_down');
beginJobGaugeSkillAction(actor, 'house_edge');
beginJobGaugeSkillAction(actor, 'royal_payout');
assert.equal(getStandardJobGaugeValue(actor), 20, 'カード技のカウント加算が不正です');
assert.equal(getJobGaugeSkillUseState(actor, 'blackjack_finale').canUse, false);
beginJobGaugeNormalAttack(actor);
assert.equal(getStandardJobGaugeValue(actor), 21);
assert.equal(getJobGaugeSkillUseState(actor, 'blackjack_finale').canUse, true);
assert(getJobGaugeOutgoingMultiplier(actor, {}) >= 1.42, 'カウント21の与ダメージ補正が不足しています');
assert(getJobGaugeIncomingMultiplier(actor) <= .79, 'カウント21の被ダメージ軽減が不足しています');
beginJobGaugeSkillAction(actor, 'blackjack_finale');
assert.equal(getStandardJobGaugeValue(actor), 0);
assert(actor._jobGaugeActionMultiplier >= 2, 'BLACKJACK解放倍率が不足しています');

const enemyA = { id: 'a', currentHp: 1000, isDead: false, atb: 900 };
const enemyB = { id: 'b', currentHp: 1000, isDead: false, atb: 700 };
const caster = {
  jobId: 'dealer', elementId: 'dealer', stats: { atk: 500, matk: 700 },
  hp: { current: 1000, max: 1000 }, mp: { current: 1000, max: 1000 },
};
const attacks = [];
const battle = {
  enemies: [enemyA, enemyB], party: [caster], selectedEnemyTarget: enemyA,
  executeAttack(source, target, isSkill, options) { attacks.push({ source, target, isSkill, options }); },
  showDamage() {}, renderEntities() {},
};

dealer.skills.find(skill => skill.id === 'marked_deck').execute(caster, activeSkills[0].levels[9], battle);
assert.equal(attacks.length, 5, 'マークドデックが最大Lvで5連撃になりません');
attacks.length = 0;
dealer.skills.find(skill => skill.id === 'blackjack_finale').execute(caster, activeSkills[4].levels[9], battle);
assert.equal(attacks.length, 14, 'BLACKJACK・ワールドが敵全体へ7連撃しません');
assert(attacks.every(entry => entry.options.defenseIgnorePercent === 50));

const changeJobSource = readFileSync(new URL('../js/pages/guild-tabs/change-job.js', import.meta.url), 'utf8');
assert(changeJobSource.includes("req.type === 'specialQuest'"));
assert(changeJobSource.includes('SpecialQuestManager.getState(req.questId).completed'));
const battleActionsSource = readFileSync(new URL('../js/pages/battle/battle-actions.js', import.meta.url), 'utf8');
assert(battleActionsSource.includes("this._findSkill(defender, 'dealer_insurance')"));
assert(battleActionsSource.includes('_dealerInsuranceUsed'));

setStandardJobGaugeValue(actor, 999);
assert.equal(getStandardJobGaugeValue(actor), 21, 'ディーラーカウントが21を超えました');

console.log('Dealer tests passed.');
