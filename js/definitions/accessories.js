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
  { id: 'power_ring', name: '力の指輪',
    stats: { atk: 1 },
  },
  { id: 'purupuru_ring', name: 'ぷるぷるリング',
    stats: { def: 5, hp: 50 },
  },
  { id: 'slime_angel_ring', name: 'エンジェルスライムリング', stats: { hp: 20, def: 5 } },
  { id: 'slime_angel_king_ring', name: 'エンジェルキングスライムリング', stats: { hp: 25, def: 6 } },
  { id: 'slime_blue_ring', name: 'ブルースライムリング', stats: { hp: 30, def: 7 } },
  { id: 'slime_dark_ring', name: 'ダークスライムリング', stats: { hp: 35, def: 8 } },
  { id: 'slime_earth_ring', name: 'アーススライムリング', stats: { hp: 40, def: 9 } },
  { id: 'slime_fire_ring', name: 'ファイヤースライムリング', stats: { hp: 45, def: 10 } },
  { id: 'slime_flower_ring', name: 'フラワースライムリング', stats: { hp: 50, def: 11 } },
  { id: 'slime_grass_ring', name: 'グラススライムリング', stats: { hp: 55, def: 12 } },
  { id: 'slime_green_ring', name: 'グリーンスライムリング', stats: { hp: 60, def: 13 } },
  { id: 'slime_ice_ring', name: 'アイススライムリング', stats: { hp: 65, def: 14 } },
  { id: 'slime_king_ring', name: 'キングスライムリング', stats: { hp: 70, def: 15 } },
  { id: 'slime_red_ring', name: 'レッドスライムリング', stats: { hp: 75, def: 16 } },
  { id: 'slime_thunder_ring', name: 'サンダースライムリング', stats: { hp: 80, def: 17 } },
  { id: 'slime_water_ring', name: 'ウォータースライムリング', stats: { hp: 85, def: 18 } },
  { id: 'slime_wind_ring', name: 'ウインドスライムリング', stats: { hp: 90, def: 19 } },
].map(item => ({ ...item, slot: 'accessory', image: `./assets/accessory/${item.id}.webp` }));
