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
    slot: 'leftHand',
    stats: {
      atk: 0,
      def: 2,
      matk: 0,
      mdef: 1,
      spd: -1
    },
    elements: { fire: 0, water: 0, wind: 0, earth: 0, light: 0, dark: 0 },
    statusEffects: { poison: 0, paralyze: 0, sleep: 0, confusion: 0 },
    price: 30,
  }
].map(item => ({ ...item, image: `./assets/shield/${item.id}.webp` }));

