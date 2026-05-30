/**

 * このファイルは武器（右手に装備するアイテム）のデータをまとめたファイルです。
 * 
 * 武器のデータ定義ファイル
 * 
 * 新しい武器を追加する場合は、{ ... } のブロックをコピーして
 * 一番下に追加し、id や各パラメータの数値を変更してください。
 */

export const WEAPONS = [
  {
    id: 'copper_sword',
    name: '銅の剣',
    image: './assets/weapon/copper_sword.webp',
    slot: 'rightHand', // 装備する場所: 'rightHand' (右手)
    stats: {
      atk: 5,   // 物理攻撃力（Attack）
      def: 0,   // 物理防御力（Defense）
      matk: 0,  // 魔法攻撃力（Magic Attack）
      mdef: 0,  // 魔法防御力（Magic Defense）
      spd: 0    // 速度（Speed）
    },
    elements: { fire: 0, water: 0, wind: 0, earth: 0, light: 0, dark: 0 }, // 属性値（属性攻撃力）
    statusEffects: { poison: 0, paralyze: 0, sleep: 0, confusion: 0 }, // 状態異常値（付与確率など）
    price: 50,  // お店で買う時の値段（売る時は通常この半額）
  },
  {
    id: 'wooden_staff',
    name: '木の杖',
    image: './assets/weapon/wooden_staff.webp',
    slot: 'rightHand',
    stats: {
      atk: 2,
      def: 0,
      matk: 5,
      mdef: 0,
      spd: 1
    },
    elements: { fire: 0, water: 0, wind: 0, earth: 0, light: 0, dark: 0 }, // 属性値（属性攻撃力）
    statusEffects: { poison: 0, paralyze: 0, sleep: 0, confusion: 0 }, // 状態異常値（付与確率など）
    price: 60,
  }
  // ↓ 新しい武器を追加する場合はここから下にコピー＆ペーストしてください
  
];
