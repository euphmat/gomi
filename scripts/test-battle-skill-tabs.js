globalThis.localStorage = { getItem: () => null };
globalThis.window = { addEventListener: () => {} };

const fs = await import('node:fs');
const { renderSkillTabHtml } = await import('../js/pages/battle/battle-ui.js');
const { formatSkillDescriptionHtml } = await import('../js/utils/skill-description.js');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const activeSkill = {
  id: 'flame_slash',
  name: '炎の一閃',
  icon: 'swords',
  type: 'active',
  statDependency: 'ATK',
  maxLevel: 1,
  levels: [{ level: 1, mpCost: 12, multiplier: 1.5 }],
  getDescription: config => `敵単体へATK ${config.multiplier}倍の炎属性物理攻撃を行う`
};
const passiveSkill = {
  id: 'flame_heart',
  name: '炎心',
  icon: 'local_fire_department',
  type: 'passive',
  maxLevel: 1,
  levels: [{ level: 1, bonusAtkPercent: 20 }],
  getDescription: config => `ATKが${config.bonusAtkPercent}%上昇する`
};
const inheritedPassiveSkill = {
  id: 'ice_guard',
  name: '氷結防護',
  icon: 'ac_unit',
  type: 'passive',
  maxLevel: 1,
  levels: [{ level: 1, iceResistPercent: 30 }],
  getDescription: config => `氷属性耐性が${config.iceResistPercent}%上昇する`
};
const jobs = {
  fighter: { skills: [activeSkill, passiveSkill] },
  mage: { skills: [inheritedPassiveSkill] }
};
const character = {
  id: 'hero',
  jobId: 'fighter',
  jobSkills: {
    fighter: { flame_slash: 1, flame_heart: 1 },
    mage: { ice_guard: 1 }
  },
  inheritedPassiveSkill: { jobId: 'mage', skillId: 'ice_guard' },
  hp: { current: 100, max: 100 },
  mp: { current: 100, max: 100 },
  activeAilment: null
};

const activeHtml = renderSkillTabHtml(character, false, {}, jobs, new Map(), 'active', true);
assert(activeHtml.includes('アクティブ') && activeHtml.includes('パッシブ'), '内側のスキル種別タブが表示されません');
assert(activeHtml.includes('炎の一閃') && !activeHtml.includes('炎心'), 'アクティブタブの絞り込みが正しくありません');
assert(activeHtml.includes('data-skill-kind="active"') && activeHtml.includes('data-skill-kind="passive"'), '内側タブに切り替え情報がありません');
assert(activeHtml.includes('skill-desc-value') && activeHtml.includes('炎属性'), 'スキル説明の数値・属性が強調されません');

const passiveHtml = renderSkillTabHtml(character, false, {}, jobs, new Map(), 'passive', false);
assert(passiveHtml.includes('炎心') && passiveHtml.includes('氷結防護') && !passiveHtml.includes('炎の一閃'), 'パッシブタブの絞り込みが正しくありません');
assert(passiveHtml.includes('常時有効') && passiveHtml.includes('継承'), 'パッシブ状態または継承表示がありません');
assert(!passiveHtml.includes('data-skill-id='), '閲覧専用パッシブが実行ボタンになっています');
assert(passiveHtml.includes('行動順待ちのため閲覧のみ'), '行動待ち中の閲覧状態が伝わりません');

const safeDescription = formatSkillDescriptionHtml('<img src=x onerror=alert(1)> HPを100回復');
assert(!safeDescription.includes('<img') && safeDescription.includes('&lt;img'), '説明文がHTMLエスケープされていません');
assert(safeDescription.includes('monitoring') && safeDescription.includes('auto_awesome'), '重要語に意味を示すアイコンがありません');

const battleIndexSource = fs.readFileSync(new URL('../js/pages/battle/index.js', import.meta.url), 'utf8');
assert(battleIndexSource.includes("this.skillSubTab = 'active'"), 'スキル内タブの選択状態が保持されません');
assert(battleIndexSource.includes("querySelectorAll('.skill-subtab')") && battleIndexSource.includes('this.skillSubTab = nextKind'), 'スキル内タブの切り替え操作が接続されていません');

console.log('battle skill tabs tests passed');
