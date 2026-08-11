globalThis.localStorage = { getItem: () => null };
globalThis.document = { hidden: false, body: { classList: { contains: () => false } } };

const {
  BATTLE_VALUE_STYLES,
  BATTLE_VALUE_TYPES,
  popupMethods,
  resolveAttackValueType,
  resolveBattleValueType
} = await import('../js/pages/battle/battle-popups.js');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const expectedStyles = {
  PLAYER_DAMAGE: ['#ffffff', '32px'],
  ENEMY_DAMAGE: ['#ef4444', '32px'],
  HP_RECOVERY: ['#22c55e', '32px'],
  MP_RECOVERY: ['#3b82f6', '32px'],
  POISON_DAMAGE: ['#a855f7', '32px'],
  CURSE_DAMAGE: ['#111111', '32px'],
  WEAKNESS_DAMAGE: ['#f97316', '42px'],
  RESISTED_DAMAGE: ['#6366f1', '26px'],
  CRITICAL_DAMAGE: ['#facc15', '32px'],
  BURN_DAMAGE: ['#c2410c', '32px'],
  HP_COST: ['#fb7185', '32px'],
  MP_DAMAGE: ['#06b6d4', '32px'],
  BARRIER: ['#2dd4bf', '32px']
};

for (const [name, [color, defaultFontSize]] of Object.entries(expectedStyles)) {
  const style = BATTLE_VALUE_STYLES[BATTLE_VALUE_TYPES[name]];
  assert(style?.color === color, `${name} の色が ${color} に統一されていません`);
  assert((style.fontSize || '32px') === defaultFontSize, `${name} のフォントサイズが正しくありません`);
}

const inferredTypes = [
  ['party-0', 123, 'text-purple-400', BATTLE_VALUE_TYPES.ENEMY_DAMAGE],
  ['enemy-0', 123, 'text-white', BATTLE_VALUE_TYPES.PLAYER_DAMAGE],
  ['party-0', '+45', 'text-emerald-300', BATTLE_VALUE_TYPES.HP_RECOVERY],
  ['party-0', 'HP 45', 'text-cyan-200', BATTLE_VALUE_TYPES.HP_RECOVERY],
  ['party-0', '+12 MP', 'text-cyan-300', BATTLE_VALUE_TYPES.MP_RECOVERY],
  ['party-0', 'MP -12', 'text-blue-400', BATTLE_VALUE_TYPES.MP_DAMAGE],
  ['party-0', '-12 HP', 'text-red-400', BATTLE_VALUE_TYPES.HP_COST],
  ['party-0', 'BARRIER +80', 'text-lime-200', BATTLE_VALUE_TYPES.BARRIER]
];

for (const [elementId, value, hint, expected] of inferredTypes) {
  assert(
    resolveBattleValueType(elementId, value, hint) === expected,
    `${elementId} の「${value}」を ${expected} として判定できません`
  );
}

const attackTypes = [
  [false, 1.5, true, BATTLE_VALUE_TYPES.ENEMY_DAMAGE],
  [true, 1, false, BATTLE_VALUE_TYPES.PLAYER_DAMAGE],
  [true, 1.5, false, BATTLE_VALUE_TYPES.WEAKNESS_DAMAGE],
  [true, 0.5, false, BATTLE_VALUE_TYPES.RESISTED_DAMAGE],
  [true, 1.5, true, BATTLE_VALUE_TYPES.CRITICAL_DAMAGE]
];

for (const [isPartyAttack, elementMultiplier, isCritical, expected] of attackTypes) {
  assert(
    resolveAttackValueType(isPartyAttack, elementMultiplier, isCritical) === expected,
    `攻撃種別を ${expected} として判定できません`
  );
}

const renderedConfigs = [];
const battleStub = {
  party: [],
  enemies: [],
  _showFloatingPopup(elementId, config) { renderedConfigs.push({ elementId, ...config }); }
};
popupMethods.showDamage.call(battleStub, 'enemy-0', 999, BATTLE_VALUE_TYPES.WEAKNESS_DAMAGE);
popupMethods.showDamage.call(battleStub, 'enemy-0', 100, BATTLE_VALUE_TYPES.RESISTED_DAMAGE);
popupMethods.showDamage.call(battleStub, 'party-0', 50, BATTLE_VALUE_TYPES.CURSE_DAMAGE);

assert(renderedConfigs[0].color === '#f97316' && renderedConfigs[0].fontSize === '42px', '抜群ダメージが大きいオレンジで描画されません');
assert(renderedConfigs[1].color === '#6366f1' && renderedConfigs[1].fontSize === '26px', '効果今ひとつダメージが小さい青紫で描画されません');
assert(renderedConfigs[2].color === '#111111' && renderedConfigs[2].textShadow.includes('#fff'), '呪いダメージが判読可能な黒で描画されません');

console.log('Battle value style tests passed');
