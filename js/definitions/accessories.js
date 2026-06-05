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
  { id: 'power_ring',            name: '力の指輪',                       stats: { atk: 1 } },
  { id: 'slime_angel_ring',      name: 'エンジェルスライムリング',       stats: { hp: 20, def: 5 },  recipe: { price: 120,  materials: [{ id: 'slime_angel_jelly', amount: 1 }, { id: 'slime_angel_core', amount: 1 }, { id: 'slime_angel_fluid', amount: 1 }] } },
  { id: 'slime_angel_king_ring', name: 'エンジェルキングスライムリング', stats: { hp: 25, def: 6 },  recipe: { price: 180,  materials: [{ id: 'slime_angel_king_jelly', amount: 1 }, { id: 'slime_angel_king_core', amount: 1 }, { id: 'slime_angel_king_fluid', amount: 1 }] } },
  { id: 'slime_blue_ring',       name: 'ブルースライムリング',           stats: { hp: 30, def: 7 },  recipe: { price: 240,  materials: [{ id: 'slime_blue_jelly', amount: 1 }, { id: 'slime_blue_core', amount: 1 }, { id: 'slime_blue_fluid', amount: 1 }] } },
  { id: 'slime_dark_ring',       name: 'ダークスライムリング',           stats: { hp: 35, def: 8 },  recipe: { price: 300,  materials: [{ id: 'slime_dark_jelly', amount: 1 }, { id: 'slime_dark_core', amount: 1 }, { id: 'slime_dark_fluid', amount: 1 }] } },
  { id: 'slime_earth_ring',      name: 'アーススライムリング',           stats: { hp: 40, def: 9 },  recipe: { price: 360,  materials: [{ id: 'slime_earth_jelly', amount: 1 }, { id: 'slime_earth_core', amount: 1 }, { id: 'slime_earth_fluid', amount: 1 }] } },
  { id: 'slime_fire_ring',       name: 'ファイヤースライムリング',       stats: { hp: 45, def: 10 }, recipe: { price: 420,  materials: [{ id: 'slime_fire_jelly', amount: 1 }, { id: 'slime_fire_core', amount: 1 }, { id: 'slime_fire_fluid', amount: 1 }] } },
  { id: 'slime_flower_ring',     name: 'フラワースライムリング',         stats: { hp: 50, def: 11 }, recipe: { price: 480,  materials: [{ id: 'slime_flower_jelly', amount: 1 }, { id: 'slime_flower_core', amount: 1 }, { id: 'slime_flower_fluid', amount: 1 }] } },
  { id: 'slime_grass_ring',      name: 'グラススライムリング',           stats: { hp: 55, def: 12 }, recipe: { price: 540,  materials: [{ id: 'slime_grass_jelly', amount: 1 }, { id: 'slime_grass_core', amount: 1 }, { id: 'slime_grass_fluid', amount: 1 }] } },
  { id: 'slime_green_ring',      name: 'グリーンスライムリング',         stats: { hp: 60, def: 13 }, recipe: { price: 600,  materials: [{ id: 'slime_green_jelly', amount: 1 }, { id: 'slime_green_core', amount: 1 }, { id: 'slime_green_fluid', amount: 1 }] } },
  { id: 'slime_ice_ring',        name: 'アイススライムリング',           stats: { hp: 65, def: 14 }, recipe: { price: 660,  materials: [{ id: 'slime_ice_jelly', amount: 1 }, { id: 'slime_ice_core', amount: 1 }, { id: 'slime_ice_fluid', amount: 1 }] } },
  { id: 'slime_king_ring',       name: 'キングスライムリング',           stats: { hp: 70, def: 15 }, recipe: { price: 720,  materials: [{ id: 'slime_king_jelly', amount: 1 }, { id: 'slime_king_core', amount: 1 }, { id: 'slime_king_fluid', amount: 1 }] } },
  { id: 'slime_red_ring',        name: 'レッドスライムリング',           stats: { hp: 75, def: 16 }, recipe: { price: 780,  materials: [{ id: 'slime_red_jelly', amount: 1 }, { id: 'slime_red_core', amount: 1 }, { id: 'slime_red_fluid', amount: 1 }] } },
  { id: 'slime_thunder_ring',    name: 'サンダースライムリング',         stats: { hp: 80, def: 17 }, recipe: { price: 840,  materials: [{ id: 'slime_thunder_jelly', amount: 1 }, { id: 'slime_thunder_core', amount: 1 }, { id: 'slime_thunder_fluid', amount: 1 }] } },
  { id: 'slime_water_ring',      name: 'ウォータースライムリング',       stats: { hp: 85, def: 18 }, recipe: { price: 900,  materials: [{ id: 'slime_water_jelly', amount: 1 }, { id: 'slime_water_core', amount: 1 }, { id: 'slime_water_fluid', amount: 1 }] } },
  { id: 'slime_wind_ring',       name: 'ウインドスライムリング',         stats: { hp: 90, def: 19 }, recipe: { price: 960,  materials: [{ id: 'slime_wind_jelly', amount: 1 }, { id: 'slime_wind_core', amount: 1 }, { id: 'slime_wind_fluid', amount: 1 }] } },
].map(item => ({ ...item, slot: 'accessory', image: `./assets/accessory/${item.id}.webp` }));
