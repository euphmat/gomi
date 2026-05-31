/**
 * このファイルは武器（右手に装備するアイテム）のデータをまとめたファイルです。
 * 
 * 武器のデータ定義ファイル
 */

export const WEAPONS = [
  {
    id: 'wooden_stick',
    name: '木の棒',
    slot: 'rightHand',
    stats:         { atk: 1, def: 0, matk: 1, mdef: 0, spd: 0 },
    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
    price: 60,
  },
  {
    id: 'slime_sword',
    name: 'スライムソード',
    slot: 'rightHand',
    stats:         { atk: 8, def: 0, matk: 5, mdef: 0, spd: 2 },
    elements:      { fire: 0, water: 10, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
    price: 150,
    recipe: {
      price: 100,
      materials: [
        { id: 'wooden_stock', amount: 1 },
        { id: 'slime_jelly', amount: 10 }
      ]
    }
  }
].map(item => ({ ...item, image: `./assets/weapon/${item.id}.webp` }));
