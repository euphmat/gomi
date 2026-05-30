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
    image: './assets/monster/slime.webp',
    stats: {
      hp: 15,       // ヒットポイント（体力）
      mp: 0,        // マジックポイント（魔力）
      atk: 3,       // 攻撃力
      def: 2,       // 防御力
      matk: 0,      // 魔法攻撃力
      mdef: 1,      // 魔法防御力
      spd: 2        // 速度
    },
    // 倒した時に得られる経験値とゴールド
    rewards: {
      exp: 2,
      gold: 5
    },
    // 倒した時に落とす可能性のあるアイテム（素材など）
    // itemId: 落とすアイテムのID, rate: 落とす確率（0.0〜1.0）
    drops: [
      { itemId: 'slime_jelly', rate: 0.5 } // 50%の確率でスライムのゼリーを落とす
    ]
  },
  {
    id: 'goblin',
    name: 'ゴブリン',
    image: './assets/monster/goblin.webp',
    stats: {
      hp: 25,
      mp: 0,
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
  // ↓ 新しいモンスターを追加する場合はここから下にコピー＆ペーストしてください
  
];
