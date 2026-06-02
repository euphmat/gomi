/**
 * このファイルは盾（左手に装備する防具）のデータをまとめたファイルです。
 * 
 * 盾（防具の一種）のデータ定義ファイル
 * 
 * 左手に装備する防御用のアイテムです。
 * 新しい盾を追加する場合は一番下にコピーして追加してください。
 * 
 * テンプレート（各項目は省略可能、省略された値は 0 として扱われます）
 *    stats:         { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
 *    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
 *    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
 */

export const SHIELDS = [
  {
    id: 'wooden_shield', name: '木の盾',
    stats: { def: 2, mdef: 1 },
  },
  { id: 'slime_angel_king_shield', name: 'エンジェルキングスライムの盾', stats: { def: 12, mdef: 12 } },
  { id: 'slime_dark_shield',       name: 'ダークスライムの盾',           stats: { def: 16, mdef: 16 } },
  { id: 'slime_fire_shield',       name: 'ファイヤースライムの盾',       stats: { def: 20, mdef: 20 } },
  { id: 'slime_grass_shield',      name: 'グラススライムの盾',           stats: { def: 24, mdef: 24 } },
  { id: 'slime_ice_shield',        name: 'アイススライムの盾',           stats: { def: 28, mdef: 28 } },
  { id: 'slime_red_shield',        name: 'レッドスライムの盾',           stats: { def: 32, mdef: 32 } },
  { id: 'slime_water_shield',      name: 'ウォータースライムの盾',       stats: { def: 36, mdef: 36 } },
].map(item => ({ ...item, slot: 'leftHand', image: `./assets/shield/${item.id}.webp` }));
