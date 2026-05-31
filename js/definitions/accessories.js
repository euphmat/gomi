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
    slot: 'accessory',
    stats:         { atk   : 3, def     : 0, matk: 0, mdef: 0, spd: 0 },
    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
    price: 150,
  }
].map(item => ({ ...item, image: `./assets/accessory/${item.id}.webp` }));

