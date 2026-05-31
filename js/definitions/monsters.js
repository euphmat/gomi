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
    stats:   { hp: 15, atk: 4, def: 0, matk: 1, mdef: 1, spd: 2 },
    rewards: { exp: 2, jp: 1,  gold: 1 },
    drops: [
      { itemId: 'slime_jelly', rate: 5 },
      { itemId: 'slime_core',  rate: 1 },
      { itemId: 'slime_fluid', rate: 0.5 },
      { itemId: 'slime_sword', rate: 0.01 },
    ],
    killRewards: [
      {
        count: 100,
        itemId: 'purupuru_ring'
      },
      {
        count: 1000,
        itemId: 'slime_hammer'
      }
    ]
  }
].map(item => ({ ...item, image: `./assets/monster/${item.id}.webp` }));

