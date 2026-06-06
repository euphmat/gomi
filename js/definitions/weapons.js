/**
 * このファイルは武器（右手に装備するアイテム）のデータをまとめたファイルです。
 * 
 * 武器のデータ定義ファイル
 * 
 * テンプレート（各項目は省略可能、省略された値は 0 として扱われます）
 *    stats:         { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
 *    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
 *    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
 */

export const WEAPONS = [
  { id: 'wooden_stick',           name: '木の棒',                           stats: { atk:  1 },                    ability: { name: '振り下ろし', description: '通常攻撃時に 10% の確率で 2 倍のダメージを与えます。', execute: (attacker, defender, damage, battle) => { if (Math.random() < 0.10) { setTimeout(() => { battle.showActionName(attacker.elementId, '振り下ろし', 'text-yellow-300', 'border-yellow-500/50'); }, 300); return damage * 2; } return damage; } } },
  { id: 'slime_blue_sword',       name: 'ブルースライムソード',             stats: { atk:  6, matk:  2 },          recipe: { price:  100, materials: [{ id: 'slime_blue_jelly', amount: 3 }, { id: 'slime_blue_core', amount: 1 }] } },
  { id: 'slime_green_sword',      name: 'グリーンスライムソード',           stats: { atk: 12, matk:  4 },          recipe: { price:  200, materials: [{ id: 'slime_green_jelly', amount: 3 }, { id: 'slime_green_core', amount: 1 }] } },
  { id: 'slime_red_sword',        name: 'レッドスライムソード',             stats: { atk: 18, matk:  6 },          recipe: { price:  300, materials: [{ id: 'slime_red_jelly', amount: 3 }, { id: 'slime_red_core', amount: 1 }] } },
  { id: 'slime_water_staff',      name: 'ウォータースライムスタッフ',       stats: { atk:  8, matk: 24 },          recipe: { price:  400, materials: [{ id: 'slime_water_jelly', amount: 3 }, { id: 'slime_water_core', amount: 1 }] } },
  { id: 'slime_fire_sword',       name: 'ファイヤースライムソード',         stats: { atk: 30, matk: 10 },          recipe: { price:  500, materials: [{ id: 'slime_fire_jelly', amount: 3 }, { id: 'slime_fire_core', amount: 1 }] } },
  { id: 'slime_ice_bow',          name: 'アイススライムボウ',               stats: { atk: 24, matk: 24, spd:  6 }, recipe: { price:  600, materials: [{ id: 'slime_ice_jelly', amount: 3 }, { id: 'slime_ice_core', amount: 1 }] } },
  { id: 'slime_wind_sword',       name: 'ウインドスライムソード',           stats: { atk: 42, matk: 14 },          recipe: { price:  700, materials: [{ id: 'slime_wind_jelly', amount: 3 }, { id: 'slime_wind_core', amount: 1 }] } },
  { id: 'slime_thunder_bow',      name: 'サンダースライムボウ',             stats: { atk: 32, matk: 32, spd:  8 }, recipe: { price:  800, materials: [{ id: 'slime_thunder_jelly', amount: 3 }, { id: 'slime_thunder_core', amount: 1 }] } },
  { id: 'slime_flower_bow',       name: 'フラワースライムボウ',             stats: { atk: 36, matk: 36, spd:  9 }, recipe: { price:  900, materials: [{ id: 'slime_flower_jelly', amount: 3 }, { id: 'slime_flower_core', amount: 1 }] } },
  { id: 'slime_grass_staff',      name: 'グラススライムスタッフ',           stats: { atk: 20, matk: 60 },          recipe: { price: 1000, materials: [{ id: 'slime_grass_jelly', amount: 3 }, { id: 'slime_grass_core', amount: 1 }] } },
  { id: 'slime_dark_bow',         name: 'ダークスライムボウ',               stats: { atk: 44, matk: 44, spd: 11 }, recipe: { price: 1100, materials: [{ id: 'slime_dark_jelly', amount: 3 }, { id: 'slime_dark_core', amount: 1 }] } },
  { id: 'slime_earth_staff',      name: 'アーススライムスタッフ',           stats: { atk: 24, matk: 72 },          recipe: { price: 1200, materials: [{ id: 'slime_earth_jelly', amount: 3 }, { id: 'slime_earth_core', amount: 1 }] } },
  { id: 'slime_angel_bow',        name: 'エンジェルスライムボウ',           stats: { atk: 52, matk: 52, spd: 13 }, recipe: { price: 1300, materials: [{ id: 'slime_angel_jelly', amount: 3 }, { id: 'slime_angel_core', amount: 1 }] } },
  { id: 'slime_king_staff',       name: 'キングスライムスタッフ',           stats: { atk: 28, matk: 84 },          recipe: { price: 1400, materials: [{ id: 'slime_king_jelly', amount: 3 }, { id: 'slime_king_core', amount: 1 }] } },
  { id: 'slime_angel_king_staff', name: 'エンジェルキングスライムスタッフ', stats: { atk: 30, matk: 90 },          recipe: { price: 1500, materials: [{ id: 'slime_angel_king_jelly', amount: 3 }, { id: 'slime_angel_king_core', amount: 1 }] } },
].map(item => ({ ...item, slot: 'rightHand', image: `./assets/weapon/${item.id}.webp` }));
