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
    slot: 'armor',
    stats: { atk: 0, def: 1, matk: 0, mdef: 1, spd: -1 },
    elements: { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
    ailments: { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
    price: 40,
  }
].map(item => ({ ...item, image: `./assets/armor/${item.id}.webp` }));

