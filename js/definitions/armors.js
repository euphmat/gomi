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
  { id: 'cloth_armor',            name: '布の服',                           stats: { def:  2, mdef:  1 }, elements: {                        } }, 
  { id: 'slime_blue_armor',       name: 'ブルースライムアーマー',           stats: { def:  4, mdef:  2 }, elements: { water:    5            }, recipe: { price:  500, materials: [{ id: 'slime_blue_core',       amount: 25 }, { id: 'slime_blue_fluid',       amount: 5 }] } },
  { id: 'slime_green_armor',      name: 'グリーンスライムアーマー',         stats: { def:  5, mdef:  7 }, elements: { grass:   20            }, recipe: { price: 1000, materials: [{ id: 'slime_green_core',      amount: 25 }, { id: 'slime_green_fluid',      amount: 5 }] } },
  { id: 'slime_red_armor',        name: 'レッドスライムアーマー',           stats: { def: 10, mdef:  8 }, elements: { fire:    20            }, recipe: { price: 1500, materials: [{ id: 'slime_red_core',        amount: 25 }, { id: 'slime_red_fluid',        amount: 5 }] } },
  { id: 'slime_water_armor',      name: 'ウォータースライムアーマー',       stats: { def: 11, mdef: 13 }, elements: { water:   20            }, recipe: { price: 2000, materials: [{ id: 'slime_water_core',      amount: 25 }, { id: 'slime_water_fluid',      amount: 5 }] } },
  { id: 'slime_fire_armor',       name: 'ファイヤースライムアーマー',       stats: { def: 16, mdef: 14 }, elements: { fire:    20            }, recipe: { price: 2500, materials: [{ id: 'slime_fire_core',       amount: 25 }, { id: 'slime_fire_fluid',       amount: 5 }] } },
  { id: 'slime_ice_armor',        name: 'アイススライムアーマー',           stats: { def: 17, mdef: 19 }, elements: { ice:     20            }, recipe: { price: 3000, materials: [{ id: 'slime_ice_core',        amount: 25 }, { id: 'slime_ice_fluid',        amount: 5 }] } },
  { id: 'slime_wind_armor',       name: 'ウインドスライムアーマー',         stats: { def: 22, mdef: 20 }, elements: { wind:    20            }, recipe: { price: 3500, materials: [{ id: 'slime_wind_core',       amount: 25 }, { id: 'slime_wind_fluid',       amount: 5 }] } },
  { id: 'slime_thunder_armor',    name: 'サンダースライムアーマー',         stats: { def: 23, mdef: 25 }, elements: { thunder: 20            }, recipe: { price: 4000, materials: [{ id: 'slime_thunder_core',    amount: 25 }, { id: 'slime_thunder_fluid',    amount: 5 }] } },
  { id: 'slime_flower_armor',     name: 'フラワースライムアーマー',         stats: { def: 28, mdef: 26 }, elements: { grass:   20            }, recipe: { price: 4500, materials: [{ id: 'slime_flower_core',     amount: 25 }, { id: 'slime_flower_fluid',     amount: 5 }] } },
  { id: 'slime_grass_armor',      name: 'グラススライムアーマー',           stats: { def: 29, mdef: 31 }, elements: { grass:   25            }, recipe: { price: 5000, materials: [{ id: 'slime_grass_core',      amount: 25 }, { id: 'slime_grass_fluid',      amount: 5 }] } },
  { id: 'slime_dark_armor',       name: 'ダークスライムアーマー',           stats: { def: 34, mdef: 32 }, elements: { dark:    25            }, recipe: { price: 5500, materials: [{ id: 'slime_dark_core',       amount: 25 }, { id: 'slime_dark_fluid',       amount: 5 }] } },
  { id: 'slime_earth_armor',      name: 'アーススライムアーマー',           stats: { def: 35, mdef: 37 }, elements: { earth:   20            }, recipe: { price: 6000, materials: [{ id: 'slime_earth_core',      amount: 25 }, { id: 'slime_earth_fluid',      amount: 5 }] } },
  { id: 'slime_angel_armor',      name: 'エンジェルスライムアーマー',       stats: { def: 40, mdef: 38 }, elements: { light:   20            }, recipe: { price: 6500, materials: [{ id: 'slime_angel_core',      amount: 25 }, { id: 'slime_angel_fluid',      amount: 5 }] } },
  { id: 'slime_king_armor',       name: 'キングスライムアーマー',           stats: { def: 41, mdef: 43 }, elements: { fire:    15, water: 15 }, recipe: { price: 7000, materials: [{ id: 'slime_king_core',       amount: 25 }, { id: 'slime_king_fluid',       amount: 5 }] } },
  { id: 'slime_angel_king_armor', name: 'エンジェルキングスライムアーマー', stats: { def: 46, mdef: 44 }, elements: { light:   30, dark:  30 }, recipe: { price: 7500, materials: [{ id: 'slime_angel_king_core', amount: 25 }, { id: 'slime_angel_king_fluid',  amount: 5 }] } },
].map(item => ({ ...item, slot: 'armor', image: `./assets/armor/${item.id}.webp` }));
