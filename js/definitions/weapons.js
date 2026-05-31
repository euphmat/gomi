/**
 * このファイルは武器（右手に装備するアイテム）のデータをまとめたファイルです。
 * 
 * 武器のデータ定義ファイル
 * 
 * テンプレート（各項目は省略可能、省略された値は 0 として扱われます）
 *    stats:         { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
 *    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
 *    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
 */

export const WEAPONS = [
  {
    id: 'wooden_stick', name: '木の棒',
    stats: { atk: 1, matk: 1 },
    price: 60,
  },
  {
    id: 'slime_sword', name: 'スライムソード',
    stats:   { atk: 8, matk: 5, spd: 2 },
    elements:{ water: 10 },
    price: 150,
    recipe: { price: 100, materials: [ { id: 'wooden_stock', amount: 1 }, { id: 'slime_jelly', amount: 10 } ]
    }
  },
  {
    id: 'slime_hammer', name: 'スライムハンマー',
    stats:         { atk: 30, matk: 10, spd: -2 },
    elements:      { water: 20 },
    price: 1000,
  }
].map(item => ({ ...item, slot: 'rightHand', image: `./assets/weapon/${item.id}.webp` }));
