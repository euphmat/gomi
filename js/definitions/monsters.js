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
    stats: {
      hp: 15,
      atk: 3,
      def: 2,
      matk: 0,
      mdef: 1,
      spd: 2
    },
    rewards: {
      exp: 2,
      gold: 5
    },
    drops: [
      { itemId: 'slime_jelly', rate: 0.5 }
    ]
  },
  {
    id: 'goblin',
    name: 'ゴブリン',
    stats: {
      hp: 25,
      atk: 6,
      def: 3,
      matk: 0,
      mdef: 2,
      spd: 4
    },
    rewards: {
      exp: 5,
      gold: 12
    },
    drops: [
      { itemId: 'goblin_fang', rate: 0.3 }
    ]
  }
].map(item => ({ ...item, image: `./assets/monster/${item.id}.webp` }));

