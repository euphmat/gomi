/**
 * このファイルは敵として登場するモンスターの強さや、落とすアイテムなどのデータをまとめたファイルです。
 * 
 * モンスターのデータ定義ファイル
 * 
 * 敵キャラクターとして出現するモンスターのステータスやドロップアイテムを定義します。
 * 
 * テンプレート（各項目は省略可能、省略された値は 0 として扱われます）
 *    stats:         { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
 *    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
 *    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
 */

export const MONSTERS = [
  { id: 'slime',            name: 'スライム',                
    stats      : { hp: 15, atk: 4, matk: 1, mdef: 1, spd: 2 },
    rewards    : { exp: 1, jp: 1, gold: 1 },
    drops      : [
      { itemId: 'slime_jelly', rate: 5 },
      { itemId: 'slime_core',  rate: 1 },
      { itemId: 'slime_fluid', rate: 0.5 },
      { itemId: 'slime_sword', rate: 0.01 },
    ],
    killRewards: [
      { count: 100, itemId: 'purupuru_ring' },
      { count: 1000, itemId: 'slime_hammer' }
    ],
    actions    : [ { name: '体当たり', chance: 10, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 2 }); } } ],
  },
  { id: 'slime_angel',      name: 'エンジェルスライム',      
    stats      : { hp: 20, mp: 10, atk: 5, def: 5, matk: 5, mdef: 5, spd: 5 },
    elements   : { light: 50 },
    ailments   : { silence: 10 },
    rewards    : { exp: 5, jp: 2, gold: 10 },
    drops      : [
      { itemId: 'slime_angel_jelly', rate: 5 },
      { itemId: 'slime_angel_core', rate: 1 },
      { itemId: 'slime_angel_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_angel_ring' },
      { count: 500, itemId: 'slime_angel_armor' },
      { count: 1000, itemId: 'slime_angel_bow' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_angel_king', name: 'エンジェルキングスライム',
    stats      : { hp: 25, mp: 10, atk: 7, def: 6, matk: 7, mdef: 6, spd: 5 },
    elements   : { light: 50 },
    ailments   : { silence: 10 },
    rewards    : { exp: 6, jp: 2, gold: 12 },
    drops      : [
      { itemId: 'slime_angel_king_jelly', rate: 5 },
      { itemId: 'slime_angel_king_core', rate: 1 },
      { itemId: 'slime_angel_king_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_angel_king_ring' },
      { count: 500, itemId: 'slime_angel_king_shield' },
      { count: 1000, itemId: 'slime_angel_king_staff' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_blue',       name: 'ブルースライム',          
    stats      : { hp: 30, mp: 10, atk: 9, def: 7, matk: 9, mdef: 7, spd: 5 },
    elements   : { water: 50 },
    ailments   : { },
    rewards    : { exp: 7, jp: 2, gold: 14 },
    drops      : [
      { itemId: 'slime_blue_jelly', rate: 5 },
      { itemId: 'slime_blue_core', rate: 1 },
      { itemId: 'slime_blue_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_blue_ring' },
      { count: 500, itemId: 'slime_blue_armor' },
      { count: 1000, itemId: 'slime_blue_sword' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_dark',       name: 'ダークスライム',          
    stats      : { hp: 35, mp: 10, atk: 11, def: 8, matk: 11, mdef: 8, spd: 5 },
    elements   : { dark: 50 },
    ailments   : { curse: 10 },
    rewards    : { exp: 8, jp: 2, gold: 16 },
    drops      : [
      { itemId: 'slime_dark_jelly', rate: 5 },
      { itemId: 'slime_dark_core', rate: 1 },
      { itemId: 'slime_dark_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_dark_ring' },
      { count: 500, itemId: 'slime_dark_shield' },
      { count: 1000, itemId: 'slime_dark_bow' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_earth',      name: 'アーススライム',          
    stats      : { hp: 40, mp: 10, atk: 13, def: 9, matk: 13, mdef: 9, spd: 5 },
    elements   : { earth: 50 },
    ailments   : { },
    rewards    : { exp: 9, jp: 2, gold: 18 },
    drops      : [
      { itemId: 'slime_earth_jelly', rate: 5 },
      { itemId: 'slime_earth_core', rate: 1 },
      { itemId: 'slime_earth_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_earth_ring' },
      { count: 500, itemId: 'slime_earth_armor' },
      { count: 1000, itemId: 'slime_earth_staff' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_fire',       name: 'ファイヤースライム',      
    stats      : { hp: 45, mp: 10, atk: 15, def: 10, matk: 15, mdef: 10, spd: 5 },
    elements   : { fire: 50 },
    ailments   : { burn: 10 },
    rewards    : { exp: 10, jp: 2, gold: 20 },
    drops      : [
      { itemId: 'slime_fire_jelly', rate: 5 },
      { itemId: 'slime_fire_core', rate: 1 },
      { itemId: 'slime_fire_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_fire_ring' },
      { count: 500, itemId: 'slime_fire_shield' },
      { count: 1000, itemId: 'slime_fire_sword' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_flower',     name: 'フラワースライム',        
    stats      : { hp: 50, mp: 10, atk: 17, def: 11, matk: 17, mdef: 11, spd: 5 },
    elements   : { grass: 50 },
    ailments   : { sleep: 10 },
    rewards    : { exp: 11, jp: 2, gold: 22 },
    drops      : [
      { itemId: 'slime_flower_jelly', rate: 5 },
      { itemId: 'slime_flower_core', rate: 1 },
      { itemId: 'slime_flower_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_flower_ring' },
      { count: 500, itemId: 'slime_flower_armor' },
      { count: 1000, itemId: 'slime_flower_bow' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_grass',      name: 'グラススライム',          
    stats      : { hp: 55, mp: 10, atk: 19, def: 12, matk: 19, mdef: 12, spd: 5 },
    elements   : { grass: 50 },
    ailments   : { poison: 10 },
    rewards    : { exp: 12, jp: 2, gold: 24 },
    drops      : [
      { itemId: 'slime_grass_jelly', rate: 5 },
      { itemId: 'slime_grass_core', rate: 1 },
      { itemId: 'slime_grass_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_grass_ring' },
      { count: 500, itemId: 'slime_grass_shield' },
      { count: 1000, itemId: 'slime_grass_staff' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_green',      name: 'グリーンスライム',        
    stats      : { hp: 60, mp: 10, atk: 21, def: 13, matk: 21, mdef: 13, spd: 5 },
    elements   : { grass: 50 },
    ailments   : { poison: 10 },
    rewards    : { exp: 13, jp: 2, gold: 26 },
    drops      : [
      { itemId: 'slime_green_jelly', rate: 5 },
      { itemId: 'slime_green_core', rate: 1 },
      { itemId: 'slime_green_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_green_ring' },
      { count: 500, itemId: 'slime_green_armor' },
      { count: 1000, itemId: 'slime_green_sword' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_ice',        name: 'アイススライム',          
    stats      : { hp: 65, mp: 10, atk: 23, def: 14, matk: 23, mdef: 14, spd: 5 },
    elements   : { ice: 50 },
    ailments   : { paralysis: 10 },
    rewards    : { exp: 14, jp: 2, gold: 28 },
    drops      : [
      { itemId: 'slime_ice_jelly', rate: 5 },
      { itemId: 'slime_ice_core', rate: 1 },
      { itemId: 'slime_ice_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_ice_ring' },
      { count: 500, itemId: 'slime_ice_shield' },
      { count: 1000, itemId: 'slime_ice_bow' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_king',       name: 'キングスライム',          
    stats      : { hp: 70, mp: 10, atk: 25, def: 15, matk: 25, mdef: 15, spd: 5 },
    elements   : { },
    ailments   : { },
    rewards    : { exp: 15, jp: 2, gold: 30 },
    drops      : [
      { itemId: 'slime_king_jelly', rate: 5 },
      { itemId: 'slime_king_core', rate: 1 },
      { itemId: 'slime_king_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_king_ring' },
      { count: 500, itemId: 'slime_king_armor' },
      { count: 1000, itemId: 'slime_king_staff' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_red',        name: 'レッドスライム',          
    stats      : { hp: 75, mp: 10, atk: 27, def: 16, matk: 27, mdef: 16, spd: 5 },
    elements   : { fire: 50 },
    ailments   : { burn: 10 },
    rewards    : { exp: 16, jp: 2, gold: 32 },
    drops      : [
      { itemId: 'slime_red_jelly', rate: 5 },
      { itemId: 'slime_red_core', rate: 1 },
      { itemId: 'slime_red_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_red_ring' },
      { count: 500, itemId: 'slime_red_shield' },
      { count: 1000, itemId: 'slime_red_sword' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_thunder',    name: 'サンダースライム',        
    stats      : { hp: 80, mp: 10, atk: 29, def: 17, matk: 29, mdef: 17, spd: 5 },
    elements   : { thunder: 50 },
    ailments   : { paralysis: 10 },
    rewards    : { exp: 17, jp: 2, gold: 34 },
    drops      : [
      { itemId: 'slime_thunder_jelly', rate: 5 },
      { itemId: 'slime_thunder_core', rate: 1 },
      { itemId: 'slime_thunder_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_thunder_ring' },
      { count: 500, itemId: 'slime_thunder_armor' },
      { count: 1000, itemId: 'slime_thunder_bow' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_water',      name: 'ウォータースライム',      
    stats      : { hp: 85, mp: 10, atk: 31, def: 18, matk: 31, mdef: 18, spd: 5 },
    elements   : { water: 50 },
    ailments   : { },
    rewards    : { exp: 18, jp: 2, gold: 36 },
    drops      : [
      { itemId: 'slime_water_jelly', rate: 5 },
      { itemId: 'slime_water_core', rate: 1 },
      { itemId: 'slime_water_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_water_ring' },
      { count: 500, itemId: 'slime_water_shield' },
      { count: 1000, itemId: 'slime_water_staff' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
  { id: 'slime_wind',       name: 'ウインドスライム',        
    stats      : { hp: 90, mp: 10, atk: 33, def: 19, matk: 33, mdef: 19, spd: 5 },
    elements   : { wind: 50 },
    ailments   : { blind: 10 },
    rewards    : { exp: 19, jp: 2, gold: 38 },
    drops      : [
      { itemId: 'slime_wind_jelly', rate: 5 },
      { itemId: 'slime_wind_core', rate: 1 },
      { itemId: 'slime_wind_fluid', rate: 0.1 }
    ],
    killRewards: [
      { count: 100, itemId: 'slime_wind_ring' },
      { count: 500, itemId: 'slime_wind_armor' },
      { count: 1000, itemId: 'slime_wind_sword' }
    ],
    actions    : [ { name: '体当たり', chance: 20, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 1.5 }); } } ],
  },
].map(item => ({ ...item, image: `./assets/monster/${item.id}.webp` }));

