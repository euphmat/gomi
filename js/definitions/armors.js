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
  { id: 'cloth_armor',         name: '布の服',                     stats: { def: 1, mdef: 1 }   },
  { id: 'slime_angel_armor',   name: 'エンジェルスライムアーマー', stats: { def: 10, mdef: 10 } },
  { id: 'slime_blue_armor',    name: 'ブルースライムアーマー',     stats: { def: 14, mdef: 14 } },
  { id: 'slime_earth_armor',   name: 'アーススライムアーマー',     stats: { def: 18, mdef: 18 } },
  { id: 'slime_flower_armor',  name: 'フラワースライムアーマー',   stats: { def: 22, mdef: 22 } },
  { id: 'slime_green_armor',   name: 'グリーンスライムアーマー',   stats: { def: 26, mdef: 26 } },
  { id: 'slime_king_armor',    name: 'キングスライムアーマー',     stats: { def: 30, mdef: 30 } },
  { id: 'slime_thunder_armor', name: 'サンダースライムアーマー',   stats: { def: 34, mdef: 34 } },
  { id: 'slime_wind_armor',    name: 'ウインドスライムアーマー',   stats: { def: 38, mdef: 38 } },
].map(item => ({ ...item, slot: 'armor', image: `./assets/armor/${item.id}.webp` }));
