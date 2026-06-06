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
  { id: 'slime_blue_ring',       name: 'ブルースライムリング',           stats: { hp:  30, def:  2, mdef:  2 }, recipe: { price:  100, materials: [{ id: 'slime_blue_jelly', amount: 1 }, { id: 'slime_blue_core', amount: 1 }, { id: 'slime_blue_fluid', amount: 1 }] } },
  { id: 'slime_green_ring',      name: 'グリーンスライムリング',         stats: { hp:  40, def:  4, mdef:  4 }, recipe: { price:  200, materials: [{ id: 'slime_green_jelly', amount: 1 }, { id: 'slime_green_core', amount: 1 }, { id: 'slime_green_fluid', amount: 1 }] } },
  { id: 'slime_red_ring',        name: 'レッドスライムリング',           stats: { hp:  50, def:  6, mdef:  6 }, recipe: { price:  300, materials: [{ id: 'slime_red_jelly', amount: 1 }, { id: 'slime_red_core', amount: 1 }, { id: 'slime_red_fluid', amount: 1 }] } },
  { id: 'slime_water_ring',      name: 'ウォータースライムリング',       stats: { hp:  60, def:  8, mdef:  8 }, recipe: { price:  400, materials: [{ id: 'slime_water_jelly', amount: 1 }, { id: 'slime_water_core', amount: 1 }, { id: 'slime_water_fluid', amount: 1 }] } },
  { id: 'slime_fire_ring',       name: 'ファイヤースライムリング',       stats: { hp:  70, def: 10, mdef: 10 }, recipe: { price:  500, materials: [{ id: 'slime_fire_jelly', amount: 1 }, { id: 'slime_fire_core', amount: 1 }, { id: 'slime_fire_fluid', amount: 1 }] } },
  { id: 'slime_ice_ring',        name: 'アイススライムリング',           stats: { hp:  80, def: 12, mdef: 12 }, recipe: { price:  600, materials: [{ id: 'slime_ice_jelly', amount: 1 }, { id: 'slime_ice_core', amount: 1 }, { id: 'slime_ice_fluid', amount: 1 }] } },
  { id: 'slime_wind_ring',       name: 'ウインドスライムリング',         stats: { hp:  90, def: 14, mdef: 14 }, recipe: { price:  700, materials: [{ id: 'slime_wind_jelly', amount: 1 }, { id: 'slime_wind_core', amount: 1 }, { id: 'slime_wind_fluid', amount: 1 }] } },
  { id: 'slime_thunder_ring',    name: 'サンダースライムリング',         stats: { hp: 100, def: 16, mdef: 16 }, recipe: { price:  800, materials: [{ id: 'slime_thunder_jelly', amount: 1 }, { id: 'slime_thunder_core', amount: 1 }, { id: 'slime_thunder_fluid', amount: 1 }] } },
  { id: 'slime_flower_ring',     name: 'フラワースライムリング',         stats: { hp: 110, def: 18, mdef: 18 }, recipe: { price:  900, materials: [{ id: 'slime_flower_jelly', amount: 1 }, { id: 'slime_flower_core', amount: 1 }, { id: 'slime_flower_fluid', amount: 1 }] } },
  { id: 'slime_grass_ring',      name: 'グラススライムリング',           stats: { hp: 120, def: 20, mdef: 20 }, recipe: { price: 1000, materials: [{ id: 'slime_grass_jelly', amount: 1 }, { id: 'slime_grass_core', amount: 1 }, { id: 'slime_grass_fluid', amount: 1 }] } },
  { id: 'slime_dark_ring',       name: 'ダークスライムリング',           stats: { hp: 130, def: 22, mdef: 22 }, recipe: { price: 1100, materials: [{ id: 'slime_dark_jelly', amount: 1 }, { id: 'slime_dark_core', amount: 1 }, { id: 'slime_dark_fluid', amount: 1 }] } },
  { id: 'slime_earth_ring',      name: 'アーススライムリング',           stats: { hp: 140, def: 24, mdef: 24 }, recipe: { price: 1200, materials: [{ id: 'slime_earth_jelly', amount: 1 }, { id: 'slime_earth_core', amount: 1 }, { id: 'slime_earth_fluid', amount: 1 }] } },
  { id: 'slime_angel_ring',      name: 'エンジェルスライムリング',       stats: { hp: 150, def: 26, mdef: 26 }, recipe: { price: 1300, materials: [{ id: 'slime_angel_jelly', amount: 1 }, { id: 'slime_angel_core', amount: 1 }, { id: 'slime_angel_fluid', amount: 1 }] } },
  { id: 'slime_king_ring',       name: 'キングスライムリング',           stats: { hp: 160, def: 28, mdef: 28 }, recipe: { price: 1400, materials: [{ id: 'slime_king_jelly', amount: 1 }, { id: 'slime_king_core', amount: 1 }, { id: 'slime_king_fluid', amount: 1 }] } },
  { id: 'slime_angel_king_ring', name: 'エンジェルキングスライムリング', stats: { hp: 170, def: 30, mdef: 30 }, recipe: { price: 1500, materials: [{ id: 'slime_angel_king_jelly', amount: 1 }, { id: 'slime_angel_king_core', amount: 1 }, { id: 'slime_angel_king_fluid', amount: 1 }] } },
].map(item => ({ ...item, slot: 'accessory', image: `./assets/accessory/${item.id}.webp` }));
