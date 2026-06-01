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
  {
    id: 'slime',
    name: 'スライム',
    stats:   { hp: 15, atk: 4, matk: 1, mdef: 1, spd: 2 },
    rewards: { exp: 1, jp: 1,  gold: 1 },
    drops: [
      { itemId: 'slime_jelly', rate: 5 },
      { itemId: 'slime_core',  rate: 1 },
      { itemId: 'slime_fluid', rate: 0.5 },
      { itemId: 'slime_sword', rate: 0.01 },
    ],
    killRewards: [
      { count: 100, itemId: 'purupuru_ring' },
      { count: 1000, itemId: 'slime_hammer' }
    ],
    actions: [ { name: '体当たり', chance: 10, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: '体当たり', damageMultiplier: 2 }); } } ]
  }
].map(item => ({ ...item, image: `./assets/monster/${item.id}.webp` }));

