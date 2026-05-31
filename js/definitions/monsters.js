/**

 * このファイルは敵として登場するモンスターの強さや、落とすアイテムなどのデータをまとめたファイルです。
 * 
 * モンスターのデータ定義ファイル
 * 
 * 敵キャラクターとして出現するモンスターのステータスやドロップアイテムを定義します。
 */

export const MONSTERS = [
  {
    id: 'slime',
    name: 'スライム',
    stats:   { hp: 12, atk: 1, def: 0, matk: 1, mdef: 1, spd: 1 },
    rewards: { exp: 2, jp: 1,  gold: 1 },
    drops: [
      { itemId: 'slime_jelly', rate: 0.05 },
      { itemId: 'slime_core',  rate: 0.01 },
      { itemId: 'slime_fluid', rate: 0.005 },
      { itemId: 'slime_sword', rate: 0.001 },

    ]
  }
].map(item => ({ ...item, image: `./assets/monster/${item.id}.webp` }));

