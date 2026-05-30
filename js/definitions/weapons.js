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
    id: 'wooden_staff',
    name: '木の棒',
    slot: 'rightHand',
    stats: { atk: 2, def: 0, matk: 5, mdef: 0, spd: 1 },
    elements: { fire: 0, water: 0, wind: 0, earth: 0, light: 0, dark: 0 },
    statusEffects: { poison: 0, paralyze: 0, sleep: 0, confusion: 0 },
    price: 60,
  }
].map(item => ({ ...item, image: `./assets/weapon/${item.id}.webp` }));

