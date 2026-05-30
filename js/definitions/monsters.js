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
      exp: 50,
      jp: 20,
      gold: 5
    },
    drops: [
      { itemId: 'slime_jelly', rate: 0.5 }
    ]
  }
].map(item => ({ ...item, image: `./assets/monster/${item.id}.webp` }));

