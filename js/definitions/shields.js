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
  { id: 'wooden_shield',           name: '木の盾',                       stats: { def:  2, mdef:  1 } }, 
  { id: 'slime_blue_shield',       name: 'ブルースライムの盾',           stats: { def:  2, mdef:  2 },   recipe: { price:  100, materials: [{ id: 'slime_blue_fluid', amount: 3 }, { id: 'slime_blue_jelly', amount: 1 }] } },
  { id: 'slime_green_shield',      name: 'グリーンスライムの盾',         stats: { def:  4, mdef:  4 },   recipe: { price:  200, materials: [{ id: 'slime_green_fluid', amount: 3 }, { id: 'slime_green_jelly', amount: 1 }] } },
  { id: 'slime_red_shield',        name: 'レッドスライムの盾',           stats: { def:  6, mdef:  6 },   recipe: { price:  300, materials: [{ id: 'slime_red_fluid', amount: 3 }, { id: 'slime_red_jelly', amount: 1 }] } },
  { id: 'slime_water_shield',      name: 'ウォータースライムの盾',       stats: { def:  8, mdef:  8 },   recipe: { price:  400, materials: [{ id: 'slime_water_fluid', amount: 3 }, { id: 'slime_water_jelly', amount: 1 }] } },
  { id: 'slime_fire_shield',       name: 'ファイヤースライムの盾',       stats: { def: 10, mdef: 10 },   recipe: { price:  500, materials: [{ id: 'slime_fire_fluid', amount: 3 }, { id: 'slime_fire_jelly', amount: 1 }] } },
  { id: 'slime_ice_shield',        name: 'アイススライムの盾',           stats: { def: 12, mdef: 12 },   recipe: { price:  600, materials: [{ id: 'slime_ice_fluid', amount: 3 }, { id: 'slime_ice_jelly', amount: 1 }] } },
  { id: 'slime_wind_shield',       name: 'ウインドスライムの盾',         stats: { def: 14, mdef: 14 },   recipe: { price:  700, materials: [{ id: 'slime_wind_fluid', amount: 3 }, { id: 'slime_wind_jelly', amount: 1 }] } },
  { id: 'slime_thunder_shield',    name: 'サンダースライムの盾',         stats: { def: 16, mdef: 16 },   recipe: { price:  800, materials: [{ id: 'slime_thunder_fluid', amount: 3 }, { id: 'slime_thunder_jelly', amount: 1 }] } },
  { id: 'slime_flower_shield',     name: 'フラワースライムの盾',         stats: { def: 18, mdef: 18 },   recipe: { price:  900, materials: [{ id: 'slime_flower_fluid', amount: 3 }, { id: 'slime_flower_jelly', amount: 1 }] } },
  { id: 'slime_grass_shield',      name: 'グラススライムの盾',           stats: { def: 20, mdef: 20 },   recipe: { price: 1000, materials: [{ id: 'slime_grass_fluid', amount: 3 }, { id: 'slime_grass_jelly', amount: 1 }] } },
  { id: 'slime_dark_shield',       name: 'ダークスライムの盾',           stats: { def: 22, mdef: 22 },   recipe: { price: 1100, materials: [{ id: 'slime_dark_fluid', amount: 3 }, { id: 'slime_dark_jelly', amount: 1 }] } },
  { id: 'slime_earth_shield',      name: 'アーススライムの盾',           stats: { def: 24, mdef: 24 },   recipe: { price: 1200, materials: [{ id: 'slime_earth_fluid', amount: 3 }, { id: 'slime_earth_jelly', amount: 1 }] } },
  { id: 'slime_angel_shield',      name: 'エンジェルスライムの盾',       stats: { def: 26, mdef: 26 },   recipe: { price: 1300, materials: [{ id: 'slime_angel_fluid', amount: 3 }, { id: 'slime_angel_jelly', amount: 1 }] } },
  { id: 'slime_king_shield',       name: 'キングスライムの盾',           stats: { def: 28, mdef: 28 },   recipe: { price: 1400, materials: [{ id: 'slime_king_fluid', amount: 3 }, { id: 'slime_king_jelly', amount: 1 }] } },
  { id: 'slime_angel_king_shield', name: 'エンジェルキングスライムの盾', stats: { def: 30, mdef: 30 },   recipe: { price: 1500, materials: [{ id: 'slime_angel_king_fluid', amount: 3 }, { id: 'slime_angel_king_jelly', amount: 1 }] } },
].map(item => ({ ...item, slot: 'leftHand', image: `./assets/shield/${item.id}.webp` }));
