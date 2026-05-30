/**

 * このファイルは盾（左手に装備する防具）のデータをまとめたファイルです。
 * 
 * 盾（防具の一種）のデータ定義ファイル
 * 
 * 左手に装備する防御用のアイテムです。
 * 新しい盾を追加する場合は一番下にコピーして追加してください。
 */

export const SHIELDS = [
  {
    id: 'wooden_shield',
    name: '木の盾',
    image: './assets/shield/wooden_shield.webp',
    slot: 'leftHand', // 装備する場所: 'leftHand' (左手)
    stats: {
      atk: 0,
      def: 2,   // 盾は主に物理防御力を上げます
      matk: 0,
      mdef: 1,
      spd: -1   // 少し重いので速度が下がる設定例
    },
    elements: { fire: 0, water: 0, wind: 0, earth: 0, light: 0, dark: 0 }, // 属性値（属性耐性）
    statusEffects: { poison: 0, paralyze: 0, sleep: 0, confusion: 0 }, // 状態異常値（耐性など）
    price: 30,
  }
  // ↓ 新しい盾を追加する場合はここから下にコピー＆ペーストしてください
  
];
