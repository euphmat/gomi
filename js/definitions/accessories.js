/**
 * このファイルはアクセサリー（指輪やネックレスなど）のデータをまとめたファイルです。
 * 
 * アクセサリーのデータ定義ファイル
 * 
 * ステータスを補助する指輪やネックレスなどです。
 * 
 * テンプレート（各項目は省略可能、省略された値は 0 として扱われます）
 *    stats:         { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
 *    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
 *    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
 */

export const ACCESSORIES = [
  { id: 'slime_blue_ring',       name: 'ブルースライムリング',           stats: { hp:  10, def:  2, mdef:  1 }, recipe: { price:  500, materials: [{ id: 'slime_blue_jelly',       amount: 25 }, { id: 'slime_blue_core',       amount: 15 }, { id: 'slime_blue_fluid',       amount: 5 }] } },
  { id: 'slime_green_ring',      name: 'グリーンスライムリング',         stats: { hp:  20, def:  3, mdef:  5 }, recipe: { price: 1000, materials: [{ id: 'slime_green_jelly',      amount: 25 }, { id: 'slime_green_core',      amount: 15 }, { id: 'slime_green_fluid',      amount: 5 }] } },
  { id: 'slime_red_ring',        name: 'レッドスライムリング',           stats: { hp:  30, def:  7, mdef:  5 }, recipe: { price: 1500, materials: [{ id: 'slime_red_jelly',        amount: 25 }, { id: 'slime_red_core',        amount: 15 }, { id: 'slime_red_fluid',        amount: 5 }] } },
  { id: 'slime_water_ring',      name: 'ウォータースライムリング',       stats: { hp:  40, def:  7, mdef:  9 }, recipe: { price: 2000, materials: [{ id: 'slime_water_jelly',      amount: 25 }, { id: 'slime_water_core',      amount: 15 }, { id: 'slime_water_fluid',      amount: 5 }] } },
  { id: 'slime_fire_ring',       name: 'ファイヤースライムリング',       stats: { hp:  50, def: 11, mdef:  9 }, recipe: { price: 2500, materials: [{ id: 'slime_fire_jelly',       amount: 25 }, { id: 'slime_fire_core',       amount: 15 }, { id: 'slime_fire_fluid',       amount: 5 }] } },
  { id: 'slime_ice_ring',        name: 'アイススライムリング',           stats: { hp:  60, def: 11, mdef: 13 }, recipe: { price: 3000, materials: [{ id: 'slime_ice_jelly',        amount: 25 }, { id: 'slime_ice_core',        amount: 15 }, { id: 'slime_ice_fluid',        amount: 5 }] } },
  { id: 'slime_wind_ring',       name: 'ウインドスライムリング',         stats: { hp:  70, def: 15, mdef: 13 }, recipe: { price: 3500, materials: [{ id: 'slime_wind_jelly',       amount: 25 }, { id: 'slime_wind_core',       amount: 15 }, { id: 'slime_wind_fluid',       amount: 5 }] } },
  { id: 'slime_thunder_ring',    name: 'サンダースライムリング',         stats: { hp:  80, def: 15, mdef: 17 }, recipe: { price: 4000, materials: [{ id: 'slime_thunder_jelly',    amount: 25 }, { id: 'slime_thunder_core',    amount: 15 }, { id: 'slime_thunder_fluid',    amount: 5 }] } },
  { id: 'slime_flower_ring',     name: 'フラワースライムリング',         stats: { hp:  90, def: 19, mdef: 17 }, recipe: { price: 4500, materials: [{ id: 'slime_flower_jelly',     amount: 25 }, { id: 'slime_flower_core',     amount: 15 }, { id: 'slime_flower_fluid',     amount: 5 }] } },
  { id: 'slime_grass_ring',      name: 'グラススライムリング',           stats: { hp: 100, def: 19, mdef: 21 }, recipe: { price: 5000, materials: [{ id: 'slime_grass_jelly',      amount: 25 }, { id: 'slime_grass_core',      amount: 15 }, { id: 'slime_grass_fluid',      amount: 5 }] } },
  { id: 'slime_dark_ring',       name: 'ダークスライムリング',           stats: { hp: 110, def: 23, mdef: 21 }, recipe: { price: 5500, materials: [{ id: 'slime_dark_jelly',       amount: 25 }, { id: 'slime_dark_core',       amount: 15 }, { id: 'slime_dark_fluid',       amount: 5 }] } },
  { id: 'slime_earth_ring',      name: 'アーススライムリング',           stats: { hp: 120, def: 23, mdef: 25 }, recipe: { price: 6000, materials: [{ id: 'slime_earth_jelly',      amount: 25 }, { id: 'slime_earth_core',      amount: 15 }, { id: 'slime_earth_fluid',      amount: 5 }] } },
  { id: 'slime_angel_ring',      name: 'エンジェルスライムリング',       stats: { hp: 130, def: 27, mdef: 25 }, recipe: { price: 6500, materials: [{ id: 'slime_angel_jelly',      amount: 25 }, { id: 'slime_angel_core',      amount: 15 }, { id: 'slime_angel_fluid',      amount: 5 }] } },
  { id: 'slime_king_ring',       name: 'キングスライムリング',           stats: { hp: 130, def: 27, mdef: 29 }, recipe: { price: 7000, materials: [{ id: 'slime_king_jelly',       amount: 25 }, { id: 'slime_king_core',       amount: 15 }, { id: 'slime_king_fluid',       amount: 5 }] } },
  { id: 'slime_angel_king_ring', name: 'エンジェルキングスライムリング', stats: { hp: 150, def: 31, mdef: 29 }, recipe: { price: 7500, materials: [{ id: 'slime_angel_king_jelly', amount: 25 }, { id: 'slime_angel_king_core', amount: 15 }, { id: 'slime_angel_king_fluid', amount: 5 }] } },
].map(item => ({ ...item, slot: 'accessory', image: `./assets/accessory/${item.id}.webp` }));
