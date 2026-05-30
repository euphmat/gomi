/**

 * このファイルは鎧（体防具）のデータをまとめたファイルです。
 * 
 * 鎧（体防具）のデータ定義ファイル
 * 
 * 体に装備して防御力を高めるアイテムです。
 */

export const ARMORS = [
  {
    id: 'cloth_armor',
    name: '布の服',
    image: './assets/armor/cloth_armor.webp',
    slot: 'armor',
    stats: {
      atk: 0,
      def: 3,
      matk: 0,
      mdef: 1,
      spd: 0
    },
    elements: { fire: 0, water: 0, wind: 0, earth: 0, light: 0, dark: 0 },
    statusEffects: { poison: 0, paralyze: 0, sleep: 0, confusion: 0 },
    price: 40,
  },
  {
    id: 'leather_armor',
    name: '皮の鎧',
    image: './assets/armor/leather_armor.webp',
    slot: 'armor',
    stats: {
      atk: 0,
      def: 6,
      matk: 0,
      mdef: 2,
      spd: -1
    },
    elements: { fire: 0, water: 0, wind: 0, earth: 0, light: 0, dark: 0 }, // 属性値（属性耐性）
    statusEffects: { poison: 0, paralyze: 0, sleep: 0, confusion: 0 }, // 状態異常値（耐性など）
    price: 100,
  }
  // ↓ 新しい鎧を追加する場合はここから下にコピー＆ペーストしてください
  
];
