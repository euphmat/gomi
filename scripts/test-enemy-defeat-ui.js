globalThis.localStorage = { getItem: () => null };
globalThis.window = { addEventListener() {} };
globalThis.document = { hidden: false };

const { rendererMethods } = await import('../js/pages/battle/battle-renderer.js');
const { renderEnemyCardHtml } = await import('../js/pages/battle/battle-ui.js');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const makeClassList = (...initial) => {
  const values = new Set(initial);
  return {
    add: (...classes) => classes.forEach(className => values.add(className)),
    remove: (...classes) => classes.forEach(className => values.delete(className)),
    contains: className => values.has(className)
  };
};

const makeElement = (...classes) => ({
  classList: makeClassList(...classes),
  style: {},
  attributes: {},
  setAttribute(name, value) { this.attributes[name] = value; }
});

const enemy = {
  elementId: 'enemy-0', currentHp: 0, maxHp: 7000, isDead: true,
  _barrierHp: 0, uniqueId: 'enemy-0', image: '', atb: 0
};
const initialCardHtml = renderEnemyCardHtml(enemy, null);
assert(initialCardHtml.includes('>撃破</span>'), '初期描画で撃破した敵が0/xと表示されます');
assert(!initialCardHtml.includes('>0/'), '初期描画のDOMに0/x表記が残っています');

const root = makeElement('cursor-pointer', 'active:scale-105');
const iconContainer = makeElement();
const hpContainer = makeElement();
const atbContainer = makeElement();
const hpBar = makeElement();
const hpText = { textContent: '1/7K' };
const enemyAreaStyle = { values: {}, setProperty(name, value) { this.values[name] = value; } };

const battle = {
  enemies: [enemy],
  party: [],
  speedMult: 1,
  _cachedDisableAnim: true,
  _pendingAttackAnimationTargets: new Map([[enemy, 1]]),
  elements: { enemyArea: { style: enemyAreaStyle } },
  domCache: {
    enemies: {
      'enemy-0': {
        uiState: {}, root, iconContainer, hpContainer, hpBar, hpText, atbContainer
      }
    },
    party: {}
  },
  updateCommandBlocker() {}
};

rendererMethods._doUpdateEntities.call(battle);

assert(hpContainer.classList.contains('opacity-0'), '撃破演出待機中もHPゲージが表示されています');
assert(atbContainer.classList.contains('opacity-0'), '撃破演出待機中もATBゲージが表示されています');
assert(hpContainer.attributes['aria-hidden'] === 'true', '非表示のHPゲージが読み上げ対象に残っています');
assert(hpText.textContent === '撃破', '撃破した敵のHPが0/xとしてDOMに残っています');
assert(root.style.minWidth !== '0px', '攻撃演出完了前に敵カードが取り除かれています');

battle._pendingAttackAnimationTargets.clear();
rendererMethods._doUpdateEntities.call(battle);

assert(root.style.minWidth === '0px', '攻撃演出完了後も撃破した敵カードが残っています');
assert(root.style.pointerEvents === 'none', '撃破した敵カードを操作できる状態です');

console.log('Enemy defeat UI tests passed');
