/**

 * このファイルはアクセサリー（指輪やネックレスなど）のデータをまとめたファイルです。
 * 
 * アクセサリーのデータ定義ファイル
 * 
 * ステータスを補助する指輪やネックレスなどです。
 */

export const ACCESSORIES = [
  {
    id: 'power_ring',
    name: '力の指輪',
    image: './assets/accessory/power_ring.webp',
    slot: 'accessory', 
    stats: {
      atk: 3,
      def: 0,
      matk: 0,
      mdef: 0,
      spd: 0
    },
    elements: { fire: 0, water: 0, wind: 0, earth: 0, light: 0, dark: 0 }, // 属性値（属性耐性など）
    statusEffects: { poison: 0, paralyze: 0, sleep: 0, confusion: 0 }, // 状態異常値（耐性など）
    price: 150,
  }
  // ↓ 新しいアクセサリーを追加する場合はここから下にコピー＆ペーストしてください
  
];
