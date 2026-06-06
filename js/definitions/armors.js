/**
 * このファイルは鎧（体防具）のデータをまとめたファイルです。
 * 
 * 鎧（体防具）のデータ定義ファイル
 * 
 * 体に装備して防御力を高めるアイテムです。
 * 
 * テンプレート（各項目は省略可能、省略された値は 0 として扱われます）
 *    stats:         { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
 *    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
 *    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
 */

export const ARMORS = [
  { id: 'cloth_armor',       name: '布の服',                   stats: { def: 1, mdef: 1 } },
  { id: 'slime_blue_armor',  name: 'ブルースライムアーマー',   stats: { def: 3, mdef: 3, spd: -1 }, recipe: { price: 200, materials: [{ id: 'slime_blue_core', amount: 3 }, { id: 'slime_blue_fluid', amount: 1 }] } },
  { id: 'slime_green_armor', name: 'グリーンスライムアーマー', stats: { def: 26, mdef: 26 }, recipe: { price: 500, materials: [{ id: 'slime_green_core', amount: 3 }, { id: 'slime_green_fluid', amount: 1 }] } },

  { id: 'slime_angel_armor', name: 'エンジェルスライムアーマー', stats: { def: 10, mdef: 10 }, recipe: { price: 100, materials: [{ id: 'slime_angel_core', amount: 3 }, { id: 'slime_angel_fluid', amount: 1 }] } },
  { id: 'slime_earth_armor', name: 'アーススライムアーマー', stats: { def: 18, mdef: 18 }, recipe: { price: 300, materials: [{ id: 'slime_earth_core', amount: 3 }, { id: 'slime_earth_fluid', amount: 1 }] } },
  { id: 'slime_flower_armor', name: 'フラワースライムアーマー', stats: { def: 22, mdef: 22 }, recipe: { price: 400, materials: [{ id: 'slime_flower_core', amount: 3 }, { id: 'slime_flower_fluid', amount: 1 }] } },
  { id: 'slime_king_armor', name: 'キングスライムアーマー', stats: { def: 30, mdef: 30 }, recipe: { price: 600, materials: [{ id: 'slime_king_core', amount: 3 }, { id: 'slime_king_fluid', amount: 1 }] } },
  { id: 'slime_thunder_armor', name: 'サンダースライムアーマー', stats: { def: 34, mdef: 34 }, recipe: { price: 700, materials: [{ id: 'slime_thunder_core', amount: 3 }, { id: 'slime_thunder_fluid', amount: 1 }] } },
  { id: 'slime_wind_armor', name: 'ウインドスライムアーマー', stats: { def: 38, mdef: 38 }, recipe: { price: 800, materials: [{ id: 'slime_wind_core', amount: 3 }, { id: 'slime_wind_fluid', amount: 1 }] } },
].map(item => ({
  ...item,
  slot: 'armor',
  image: `./assets/armor/${item.id}.webp`
}));